"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const xlsx_1 = __importDefault(require("xlsx"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const repo_service_1 = require("../services/repo.service");
const cloudinary_service_1 = require("../services/cloudinary.service");
const socket_1 = require("../config/socket");
const notification_service_1 = require("../services/notification.service");
const Student_1 = __importDefault(require("../models/Student"));
class StudentController {
    static async getStudents(req, res, next) {
        try {
            const requester = req.user;
            if (requester.role === 'Student') {
                return res.status(403).json({ error: 'Access denied: Students cannot view the global directory.' });
            }
            const search = req.query.search || '';
            const department = req.query.department || '';
            const courseId = req.query.courseId || '';
            const isDeleted = req.query.isDeleted === 'true';
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            let data;
            if (requester.role === 'Faculty') {
                // Find courses taught by this faculty
                const facultyCourses = await repo_service_1.RepoService.findCourses({ facultyId: requester.userId });
                const courseIds = facultyCourses.map((c) => c._id || c.id);
                // Find students enrolled in any of these courses
                // Wait, the findStudents method in RepoService might not support "courseIds" array directly.
                // We can just query Student directly or let RepoService handle it if it doesn't.
                // Let's check if courseId is provided in query, if not we can just fetch all students in their courses.
                // For simplicity, we can just pass an array of courseIds to RepoService.findStudents if we update RepoService,
                // or just fetch them here.
                data = await repo_service_1.RepoService.findStudents({ courseIds, isDeleted }, page, limit); // Assume RepoService supports courseIds
            }
            else {
                data = await repo_service_1.RepoService.findStudents({ search, department, courseId, isDeleted }, page, limit);
            }
            return res.json({
                students: data.students,
                pagination: {
                    totalItems: data.totalItems,
                    totalPages: data.totalPages,
                    currentPage: page,
                    limit
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getStudentById(req, res, next) {
        try {
            const requester = req.user;
            const student = await repo_service_1.RepoService.findStudentById(req.params.id);
            if (!student) {
                return res.status(404).json({ error: 'Student profile not found' });
            }
            // P0-9: Student role can ONLY view their own private student profile
            if (requester.role === 'Student') {
                const studentUserId = (student.userId?._id || student.userId?.id || student.userId || '').toString();
                const studentId = (student._id || student.id || '').toString();
                if (studentUserId !== requester.userId.toString() && studentId !== req.params.id) {
                    return res.status(403).json({ error: 'Access denied: You can only view your own student profile.' });
                }
            }
            return res.json({ student });
        }
        catch (error) {
            next(error);
        }
    }
    static async createStudent(req, res, next) {
        try {
            const { name, email, age, gender, grade, department, semester, parentName, parentPhone, address, enrolledCourses, academicHistory } = req.body;
            const requester = req.user;
            const cleanEmail = email.toLowerCase().trim();
            const existingUser = await repo_service_1.RepoService.findUserByEmail(cleanEmail);
            if (existingUser) {
                return res.status(400).json({ error: 'Email already registered' });
            }
            // Generate seed password from name
            const defaultPass = name.split(' ')[0].toLowerCase() + '123';
            const salt = bcryptjs_1.default.genSaltSync(10);
            const passwordHash = bcryptjs_1.default.hashSync(defaultPass, salt);
            // Create main login User account (Student accounts are marked verified by default when created by Admins)
            const user = await repo_service_1.RepoService.createUser({
                name,
                email: cleanEmail,
                password: passwordHash,
                role: 'Student',
                isVerified: true
            });
            const userId = user._id || user.id;
            const enrollmentNo = 'ENR' + Date.now().toString().slice(-8);
            const student = await repo_service_1.RepoService.createStudent({
                userId,
                name,
                email: cleanEmail,
                enrollmentNo,
                age,
                gender,
                grade,
                department,
                semester,
                parentName,
                parentPhone,
                address,
                enrolledCourses: enrolledCourses || [],
                academicHistory: academicHistory || [],
                isDeleted: false
            });
            // Send registration email notification and trigger stub alerts
            notification_service_1.NotificationService.sendStudentRegistrationNotification(cleanEmail, name, enrollmentNo).catch(err => console.error(err));
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Student Created',
                details: `Enrolled new student: ${name} (${enrollmentNo})`
            });
            (0, socket_1.emitLiveUpdate)('dashboard_update', { action: 'student_added' });
            return res.status(201).json({
                message: 'Student profile created successfully',
                student
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateStudent(req, res, next) {
        try {
            const { id } = req.params;
            const requester = req.user;
            const student = await repo_service_1.RepoService.findStudentById(id);
            if (!student) {
                return res.status(404).json({ error: 'Student profile not found' });
            }
            const updated = await repo_service_1.RepoService.updateStudent(id, req.body);
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Student Updated',
                details: `Updated student profile fields for: ${student.name} (${student.enrollmentNo})`
            });
            return res.json({ message: 'Student updated successfully', student: updated });
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteStudent(req, res, next) {
        try {
            const requester = req.user;
            const student = await repo_service_1.RepoService.findStudentById(req.params.id);
            if (!student) {
                return res.status(404).json({ error: 'Student profile not found' });
            }
            await repo_service_1.RepoService.updateStudent(req.params.id, { isDeleted: true });
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Student Deleted (Soft)',
                details: `Soft deleted student profile: ${student.name} (${student.enrollmentNo})`
            });
            (0, socket_1.emitLiveUpdate)('dashboard_update', { action: 'student_deleted' });
            return res.json({ message: 'Student profile soft-deleted successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async restoreStudent(req, res, next) {
        try {
            const requester = req.user;
            const student = await repo_service_1.RepoService.findStudentById(req.params.id);
            if (!student) {
                return res.status(404).json({ error: 'Student profile not found' });
            }
            await repo_service_1.RepoService.updateStudent(req.params.id, { isDeleted: false });
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Student Restored',
                details: `Restored student profile: ${student.name} (${student.enrollmentNo})`
            });
            (0, socket_1.emitLiveUpdate)('dashboard_update', { action: 'student_restored' });
            return res.json({ message: 'Student profile restored successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async exportCSV(req, res, next) {
        try {
            const { students } = await repo_service_1.RepoService.findStudents({}, 1, 1000);
            let csv = 'Name,Email,EnrollmentNo,Age,Gender,Grade,Department,Semester,ParentName,ParentPhone,Address\n';
            students.forEach((s) => {
                csv += `"${s.name}","${s.email}","${s.enrollmentNo}",${s.age},"${s.gender}","${s.grade}","${s.department}",${s.semester || 1},"${s.parentName}","${s.parentPhone}","${s.address}"\n`;
            });
            res.setHeader('Content-Disposition', 'attachment; filename="students_report.csv"');
            res.setHeader('Content-Type', 'text/csv');
            return res.send(csv);
        }
        catch (error) {
            next(error);
        }
    }
    static async exportExcel(req, res, next) {
        try {
            const { students } = await repo_service_1.RepoService.findStudents({}, 1, 1000);
            const formatted = students.map((s) => ({
                Name: s.name,
                Email: s.email,
                'Enrollment No': s.enrollmentNo,
                Age: s.age,
                Gender: s.gender,
                Grade: s.grade,
                Department: s.department,
                Semester: s.semester || 1,
                Parent: s.parentName,
                Phone: s.parentPhone,
                Address: s.address
            }));
            const wb = xlsx_1.default.utils.book_new();
            const ws = xlsx_1.default.utils.json_to_sheet(formatted);
            xlsx_1.default.utils.book_append_sheet(wb, ws, "Students");
            const buf = xlsx_1.default.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Disposition', 'attachment; filename="students_report.xlsx"');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            return res.send(buf);
        }
        catch (error) {
            next(error);
        }
    }
    static async exportPDF(req, res, next) {
        try {
            const { students } = await repo_service_1.RepoService.findStudents({}, 1, 1000);
            const doc = new pdfkit_1.default({ margin: 40, size: 'A4' });
            res.setHeader('Content-Disposition', 'attachment; filename="students_report.pdf"');
            res.setHeader('Content-Type', 'application/pdf');
            doc.pipe(res);
            // Header Section
            doc.rect(0, 0, doc.page.width, 100).fill('#12141c');
            doc.fontSize(24).font('Helvetica-Bold').fillColor('#8a5cf6').text('EduManager', 40, 35);
            doc.fontSize(12).font('Helvetica').fillColor('#ffffff').text('Student Enrollment Report', 40, 65);
            const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            doc.fontSize(10).fillColor('#9ca3af').text(`Generated: ${dateStr}`, 0, 65, { align: 'right', width: doc.page.width - 40 });
            // Table configuration
            const startX = 40;
            let y = 130;
            const rowHeight = 25;
            const colWidths = { enr: 90, name: 140, email: 160, dept: 70, grade: 50 };
            // Helper function for table header
            const drawTableHeader = (startY) => {
                doc.rect(startX, startY, doc.page.width - 80, rowHeight).fill('#f3f4f6');
                doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151');
                doc.text('Enrollment No', startX + 5, startY + 8, { width: colWidths.enr });
                doc.text('Name', startX + colWidths.enr + 5, startY + 8, { width: colWidths.name });
                doc.text('Email', startX + colWidths.enr + colWidths.name + 5, startY + 8, { width: colWidths.email });
                doc.text('Dept', startX + colWidths.enr + colWidths.name + colWidths.email + 5, startY + 8, { width: colWidths.dept });
                doc.text('Grade', startX + colWidths.enr + colWidths.name + colWidths.email + colWidths.dept + 5, startY + 8, { width: colWidths.grade });
            };
            drawTableHeader(y);
            y += rowHeight;
            let altRow = false;
            let pageNum = 1;
            students.forEach((s, index) => {
                if (y > doc.page.height - 80) {
                    // Footer
                    doc.fontSize(9).font('Helvetica').fillColor('#9ca3af').text(`Page ${pageNum}`, startX, doc.page.height - 40, { align: 'center', width: doc.page.width - 80 });
                    doc.addPage();
                    pageNum++;
                    y = 50;
                    drawTableHeader(y);
                    y += rowHeight;
                    altRow = false;
                }
                if (altRow) {
                    doc.rect(startX, y, doc.page.width - 80, rowHeight).fill('#f9fafb');
                }
                doc.fontSize(9).font('Helvetica').fillColor('#1f2937');
                doc.text(s.enrollmentNo || 'N/A', startX + 5, y + 8, { width: colWidths.enr, lineBreak: false });
                doc.text(s.name || 'N/A', startX + colWidths.enr + 5, y + 8, { width: colWidths.name, lineBreak: false });
                doc.text(s.email || 'N/A', startX + colWidths.enr + colWidths.name + 5, y + 8, { width: colWidths.email, lineBreak: false });
                doc.text(s.department || 'N/A', startX + colWidths.enr + colWidths.name + colWidths.email + 5, y + 8, { width: colWidths.dept, lineBreak: false });
                doc.text(s.grade || 'N/A', startX + colWidths.enr + colWidths.name + colWidths.email + colWidths.dept + 5, y + 8, { width: colWidths.grade, lineBreak: false });
                doc.rect(startX, y, doc.page.width - 80, rowHeight).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
                y += rowHeight;
                altRow = !altRow;
            });
            // Final Footer
            doc.fontSize(9).font('Helvetica').fillColor('#9ca3af').text(`Page ${pageNum} • Total Students: ${students.length}`, startX, doc.page.height - 40, { align: 'center', width: doc.page.width - 80 });
            doc.end();
        }
        catch (error) {
            next(error);
        }
    }
    static async importStudents(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Spreadsheet or CSV file is required' });
            }
            // Secure upload check (validate file type/extension for xlsx, xls, and csv)
            const allowedImageExtensions = ['xlsx', 'xls', 'csv'];
            const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();
            if (!allowedImageExtensions.includes(fileExt || '')) {
                return res.status(400).json({ error: 'Invalid file format! Only Excel spreadsheets (.xlsx, .xls) and CSV files (.csv) are allowed.' });
            }
            const requester = req.user;
            const workbook = xlsx_1.default.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx_1.default.utils.sheet_to_json(sheet);
            if (!data || data.length === 0) {
                return res.status(400).json({ error: 'The uploaded file contains no data rows.' });
            }
            // Helper function for case-insensitive and alias key lookups
            const getVal = (row, aliases) => {
                const rowKeys = Object.keys(row);
                for (const alias of aliases) {
                    const foundKey = rowKeys.find(rk => rk.trim().toLowerCase() === alias.toLowerCase());
                    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
                        return String(row[foundKey]).trim();
                    }
                }
                return undefined;
            };
            let count = 0;
            const errors = [];
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const rowNum = i + 2; // header is line 1
                const name = getVal(row, ['name', 'student name', 'full name', 'studentname']);
                const email = getVal(row, ['email', 'email address', 'student email', 'mail']);
                const age = getVal(row, ['age']);
                const gender = getVal(row, ['gender', 'sex']);
                const grade = getVal(row, ['grade', 'class', 'year']);
                const department = getVal(row, ['department', 'dept', 'stream', 'branch']);
                const semester = getVal(row, ['semester', 'sem']);
                const parentName = getVal(row, ['parent', 'parent name', 'guardian', 'parentname']);
                const parentPhone = getVal(row, ['phone', 'parent phone', 'mobile', 'contact', 'phone number']);
                const address = getVal(row, ['address', 'location']);
                const customEnrollment = getVal(row, ['enrollmentno', 'enrollment no', 'enrollment', 'id', 'student id']);
                if (!name || !email) {
                    errors.push(`Row ${rowNum}: Skipped due to missing required Name or Email.`);
                    continue;
                }
                const cleanEmail = email.toLowerCase().trim();
                const existingUser = await repo_service_1.RepoService.findUserByEmail(cleanEmail);
                if (existingUser) {
                    errors.push(`Row ${rowNum}: Skipped - Email '${cleanEmail}' already exists in system.`);
                    continue;
                }
                const pass = name.split(' ')[0].toLowerCase() + '123';
                const salt = bcryptjs_1.default.genSaltSync(10);
                const passwordHash = bcryptjs_1.default.hashSync(pass, salt);
                const user = await repo_service_1.RepoService.createUser({
                    name,
                    email: cleanEmail,
                    password: passwordHash,
                    role: 'Student',
                    isVerified: true
                });
                const userId = user._id || user.id;
                const enrollmentNo = customEnrollment || ('ENR' + (Date.now() + count).toString().slice(-8));
                await repo_service_1.RepoService.createStudent({
                    userId,
                    name,
                    email: cleanEmail,
                    enrollmentNo,
                    age: parseInt(age || '18', 10) || 18,
                    gender: gender || 'Male',
                    grade: grade || 'Freshman',
                    department: department || 'CSE',
                    semester: parseInt(semester || '1', 10) || 1,
                    parentName: parentName || 'Not Specified',
                    parentPhone: parentPhone || '0000000000',
                    address: address || 'Not Specified',
                    isDeleted: false
                });
                notification_service_1.NotificationService.sendStudentRegistrationNotification(cleanEmail, name, enrollmentNo).catch(err => {
                    console.error(`Failed to send bulk student notification:`, err);
                });
                count++;
            }
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Bulk Import',
                details: `Bulk imported ${count} students from spreadsheet`
            });
            (0, socket_1.emitLiveUpdate)('dashboard_update', { action: 'student_added' });
            return res.json({
                message: `Successfully imported ${count} out of ${data.length} student records!`,
                importedCount: count,
                totalParsed: data.length,
                errors
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async uploadAvatar(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Avatar image file is required' });
            }
            // File extension and mimetype verification
            const allowedImageExtensions = ['jpg', 'jpeg', 'png', 'webp'];
            const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();
            if (!req.file.mimetype.startsWith('image/') || !allowedImageExtensions.includes(fileExt || '')) {
                return res.status(400).json({ error: 'Unsupported file format! Only JPG, PNG, and WEBP image uploads are allowed.' });
            }
            const secureUrl = await (0, cloudinary_service_1.uploadFile)(req.file.path, 'avatars');
            return res.json({ url: secureUrl });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateStudentPassword(req, res, next) {
        try {
            const { id } = req.params;
            const { password } = req.body;
            const requester = req.user;
            const student = await repo_service_1.RepoService.findStudentById(id);
            if (!student) {
                return res.status(404).json({ error: 'Student profile not found' });
            }
            const rawUserId = student.userId;
            const userId = rawUserId?._id ? rawUserId._id.toString() : (rawUserId?.toString ? rawUserId.toString() : rawUserId);
            if (!userId) {
                return res.status(400).json({ error: 'Associated user account not found for this student' });
            }
            const user = await repo_service_1.RepoService.findUserById(userId);
            if (!user) {
                return res.status(404).json({ error: 'User account not found' });
            }
            const salt = bcryptjs_1.default.genSaltSync(10);
            const passwordHash = bcryptjs_1.default.hashSync(password, salt);
            await repo_service_1.RepoService.updateUser(userId, { password: passwordHash });
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Student Password Updated',
                details: `Updated password for student: ${student.name} (${student.enrollmentNo})`
            });
            return res.json({ message: `Password for ${student.name} updated successfully` });
        }
        catch (error) {
            next(error);
        }
    }
    static async getStudentFaces(req, res, next) {
        try {
            const students = await Student_1.default.find({ faceDescriptor: { $exists: true, $not: { $size: 0 } }, isDeleted: false })
                .select('_id name enrollmentNo faceDescriptor');
            return res.json({ students });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateStudentFace(req, res, next) {
        try {
            const { id } = req.params;
            const { faceDescriptor } = req.body;
            const requester = req.user;
            if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
                return res.status(400).json({ error: 'Valid face descriptor array is required' });
            }
            const student = await repo_service_1.RepoService.findStudentById(id);
            if (!student) {
                return res.status(404).json({ error: 'Student profile not found' });
            }
            await repo_service_1.RepoService.updateStudent(id, { faceDescriptor });
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Student Face Registered',
                details: `Registered face data for student: ${student.name} (${student.enrollmentNo})`
            });
            return res.json({ message: `Face registered successfully for ${student.name}` });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.StudentController = StudentController;
