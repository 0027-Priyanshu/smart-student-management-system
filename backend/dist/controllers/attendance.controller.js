"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceController = void 0;
const repo_service_1 = require("../services/repo.service");
const socket_1 = require("../config/socket");
const notification_service_1 = require("../services/notification.service");
class AttendanceController {
    static async getAttendance(req, res, next) {
        try {
            const requester = req.user;
            let studentId = req.query.studentId;
            const courseId = req.query.courseId;
            const date = req.query.date;
            if (requester.role === 'Student') {
                const studentProfile = await repo_service_1.RepoService.findStudentByUserId(requester.userId);
                if (!studentProfile)
                    return res.status(404).json({ error: 'Student profile not found.' });
                // Force the query to only fetch this student's records
                studentId = studentProfile._id || studentProfile.id;
            }
            if (requester.role === 'Faculty') {
                const facultyProfile = await repo_service_1.RepoService.findFacultyByUserId(requester.userId);
                if (!facultyProfile)
                    return res.status(404).json({ error: 'Faculty profile not found.' });
                const facultyCourses = facultyProfile.assignedCourses?.map((c) => (c._id || c.id || c).toString()) || [];
                if (courseId && !facultyCourses.includes(courseId)) {
                    return res.status(403).json({ error: 'Access denied: You are not assigned to this course.' });
                }
            }
            const query = {};
            if (studentId)
                query.studentId = studentId;
            if (courseId)
                query.courseId = courseId;
            if (date)
                query.date = date;
            const logs = await repo_service_1.RepoService.findAttendance(query);
            return res.json({ attendance: logs });
        }
        catch (error) {
            next(error);
        }
    }
    static async markAttendance(req, res, next) {
        try {
            const requester = req.user;
            const { studentId, courseId, date, status } = req.body;
            const log = await repo_service_1.RepoService.markAttendance({
                studentId,
                courseId,
                date,
                status,
                markedBy: requester.userId
            });
            const student = await repo_service_1.RepoService.findStudentById(studentId);
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Attendance Updated',
                details: `Marked student ${student?.name || studentId} as ${status} on ${date}`
            });
            // Notify real-time counters
            (0, socket_1.emitLiveUpdate)('attendance_update', { studentId, courseId, date, status });
            // Trigger stub alert hook for attendance
            if (student) {
                const course = await repo_service_1.RepoService.findCourseById(courseId);
                notification_service_1.NotificationService.triggerAttendanceAlert(student.email, student.name, date, course?.name || 'Academic Course', status).catch(err => console.error(err));
            }
            return res.json({ message: 'Attendance marked successfully', attendance: log });
        }
        catch (error) {
            next(error);
        }
    }
    static async scanQR(req, res, next) {
        try {
            const requester = req.user;
            const { courseId } = req.body;
            // Get student profile
            const student = await repo_service_1.RepoService.findStudentByUserId(requester.userId);
            if (!student) {
                return res.status(404).json({ error: 'Student profile not found' });
            }
            const today = new Date().toISOString().split('T')[0];
            // Check if enrolled
            const studentCourses = student.enrolledCourses?.map((c) => c._id?.toString() || c.id?.toString()) || [];
            if (!studentCourses.includes(courseId)) {
                return res.status(400).json({ error: 'You are not enrolled in this course.' });
            }
            const log = await repo_service_1.RepoService.markAttendance({
                studentId: student._id || student.id,
                courseId,
                date: today,
                status: 'Present',
                markedBy: requester.userId
            });
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'QR Scan Attendance',
                details: `Self-scanned present for course ID: ${courseId} on date: ${today}`
            });
            (0, socket_1.emitLiveUpdate)('attendance_update', { studentId: student._id || student.id, courseId, date: today, status: 'Present' });
            // Trigger stub alert hook for attendance
            if (student) {
                const course = await repo_service_1.RepoService.findCourseById(courseId);
                notification_service_1.NotificationService.triggerAttendanceAlert(student.email, student.name, today, course?.name || 'Academic Course', 'Present').catch(err => console.error(err));
            }
            return res.json({
                message: 'Attendance scanned & recorded successfully!',
                attendance: log
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getHeatmap(req, res, next) {
        try {
            const studentId = req.query.studentId;
            const query = {};
            if (studentId)
                query.studentId = studentId;
            const logs = await repo_service_1.RepoService.findAttendance(query);
            // Group logs by date
            const dateCounts = {};
            logs.forEach(log => {
                if (log.status === 'Present' || log.status === 'On Leave') {
                    dateCounts[log.date] = (dateCounts[log.date] || 0) + 1;
                }
            });
            const heatmapData = Object.keys(dateCounts).map(date => ({
                date,
                count: dateCounts[date]
            }));
            return res.json({ heatmap: heatmapData });
        }
        catch (error) {
            next(error);
        }
    }
    static async generateQrSession(req, res, next) {
        try {
            const requester = req.user;
            const { courseId, lectureTitle, date, durationMinutes } = req.body;
            if (!courseId || !lectureTitle) {
                return res.status(400).json({ error: 'Course and Lecture Title are required.' });
            }
            const course = await repo_service_1.RepoService.findCourseById(courseId);
            if (!course) {
                return res.status(404).json({ error: 'Course not found' });
            }
            const duration = parseInt(durationMinutes || '10', 10);
            const sessionId = 'QR_' + Math.random().toString(36).substring(2, 9).toUpperCase();
            const expiresAt = new Date(Date.now() + duration * 60 * 1000);
            const sessionDate = date || new Date().toISOString().split('T')[0];
            const qrSession = await repo_service_1.RepoService.createQrSession({
                sessionId,
                courseId: course._id || course.id,
                courseName: course.name,
                lectureTitle,
                date: sessionDate,
                facultyId: requester.userId,
                expiresAt,
                durationMinutes: duration
            });
            return res.status(201).json({
                message: 'Dynamic QR Attendance session created successfully',
                sessionId,
                expiresAt,
                session: qrSession
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getQrSession(req, res, next) {
        try {
            const { sessionId } = req.params;
            const session = await repo_service_1.RepoService.findQrSessionById(sessionId);
            if (!session) {
                return res.status(404).json({ error: 'QR Attendance session not found or invalid' });
            }
            const isExpired = new Date(session.expiresAt).getTime() < Date.now();
            const scannedCount = session.scannedStudents ? session.scannedStudents.length : 0;
            return res.json({
                session,
                isExpired,
                scannedCount
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async confirmQrAttendance(req, res, next) {
        try {
            const requester = req.user;
            const { sessionId } = req.body;
            if (!sessionId) {
                return res.status(400).json({ error: 'Session ID is required.' });
            }
            const session = await repo_service_1.RepoService.findQrSessionById(sessionId);
            if (!session) {
                return res.status(404).json({ error: 'Invalid or expired QR session token.' });
            }
            if (new Date(session.expiresAt).getTime() < Date.now()) {
                return res.status(400).json({ error: 'This QR Code session has expired. Please ask your instructor for a new QR code.' });
            }
            let student = await repo_service_1.RepoService.findStudentByUserId(requester.userId);
            if (!student) {
                const { students } = await repo_service_1.RepoService.findStudents({}, 1, 1);
                if (students && students.length > 0) {
                    student = students[0];
                }
            }
            if (!student) {
                return res.status(404).json({ error: 'Student profile not found. Please create a student profile first.' });
            }
            const studentIdStr = (student._id || student.id).toString();
            const scannedList = (session.scannedStudents || []).map((s) => (s._id || s.id || s).toString());
            if (scannedList.includes(studentIdStr)) {
                return res.status(400).json({ error: 'Attendance already recorded for this session! Duplicate entries are not allowed.' });
            }
            // Mark Attendance
            const log = await repo_service_1.RepoService.markAttendance({
                studentId: student._id || student.id,
                courseId: session.courseId,
                date: session.date,
                status: 'Present',
                markedBy: requester.userId
            });
            // Add to QR session
            await repo_service_1.RepoService.addStudentToQrSession(sessionId, student._id || student.id);
            // Notify real-time counters
            (0, socket_1.emitLiveUpdate)('attendance_update', { studentId: student._id || student.id, courseId: session.courseId, date: session.date, status: 'Present' });
            return res.json({
                message: `Attendance confirmed successfully for ${session.courseName} - ${session.lectureTitle}!`,
                attendance: log
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async registerFace(req, res, next) {
        try {
            const { studentId, faceDescriptor } = req.body;
            if (!studentId || !faceDescriptor || !Array.isArray(faceDescriptor)) {
                return res.status(400).json({ error: 'Valid Student ID and face descriptor vector are required.' });
            }
            const student = await repo_service_1.RepoService.findStudentById(studentId);
            if (!student) {
                return res.status(404).json({ error: 'Student not found.' });
            }
            const updated = await repo_service_1.RepoService.registerStudentFace(studentId, faceDescriptor);
            await repo_service_1.RepoService.createLog({
                userId: req.user.userId,
                userName: req.user.name,
                role: req.user.role,
                action: 'Face Biometric Enrolled',
                details: `Enrolled face biometric descriptor for student: ${student.name} (${student.enrollmentNo})`
            });
            return res.json({
                message: `Face biometric descriptor registered successfully for ${student.name}!`,
                student: updated
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async removeFace(req, res, next) {
        try {
            const { studentId } = req.params;
            const student = await repo_service_1.RepoService.findStudentById(studentId);
            if (!student) {
                return res.status(404).json({ error: 'Student not found.' });
            }
            await repo_service_1.RepoService.removeStudentFace(studentId);
            await repo_service_1.RepoService.createLog({
                userId: req.user.userId,
                userName: req.user.name,
                role: req.user.role,
                action: 'Face Biometric Removed',
                details: `Removed face biometric registration for student: ${student.name} (${student.enrollmentNo})`
            });
            return res.json({
                message: `Face registration removed for ${student.name}.`
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getFaceEmbeddings(req, res, next) {
        try {
            const courseId = req.query.courseId;
            const registeredFaces = await repo_service_1.RepoService.findRegisteredFaceEmbeddings(courseId);
            // Return sanitized embeddings for recognition matching
            const sanitized = registeredFaces.map(s => ({
                studentId: s._id || s.id,
                name: s.name,
                enrollmentNo: s.enrollmentNo,
                department: s.department,
                faceDescriptor: s.faceDescriptor,
                isFaceRegistered: !!s.isFaceRegistered,
                faceRegisteredAt: s.faceRegisteredAt
            }));
            return res.json({ registeredFaces: sanitized });
        }
        catch (error) {
            next(error);
        }
    }
    static async markFaceAttendance(req, res, next) {
        try {
            const requester = req.user;
            const { studentId, courseId, date, lectureTitle, recognitionConfidence } = req.body;
            if (!studentId || !courseId || !date) {
                return res.status(400).json({ error: 'Student ID, Course ID, and Date are required.' });
            }
            const student = await repo_service_1.RepoService.findStudentById(studentId);
            if (!student) {
                return res.status(404).json({ error: 'Student not found.' });
            }
            // Check if attendance already recorded for this lecture / date
            const existingLogs = await repo_service_1.RepoService.findAttendance({ studentId, courseId, date });
            if (existingLogs && existingLogs.length > 0) {
                return res.status(409).json({
                    error: `Attendance already recorded for ${student.name} (${student.enrollmentNo}) on ${date}!`,
                    alreadyMarked: true,
                    attendance: existingLogs[0]
                });
            }
            const log = await repo_service_1.RepoService.markAttendance({
                studentId,
                courseId,
                date,
                status: 'Present',
                attendanceMethod: 'FACE',
                recognitionConfidence: recognitionConfidence || 90,
                lectureTitle: lectureTitle || 'Face Recognition Lecture',
                markedBy: requester.userId
            });
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Face Recognition Attendance',
                details: `Face recognized & marked present: ${student.name} (${student.enrollmentNo}) with ${recognitionConfidence || 90}% confidence on ${date}`
            });
            // Socket live update
            (0, socket_1.emitLiveUpdate)('attendance_update', { studentId, courseId, date, status: 'Present', attendanceMethod: 'FACE' });
            // Trigger notification alert
            if (student.email) {
                const course = await repo_service_1.RepoService.findCourseById(courseId);
                notification_service_1.NotificationService.triggerAttendanceAlert(student.email, student.name, date, course?.name || 'Academic Course', 'Present').catch(err => console.error(err));
            }
            return res.status(201).json({
                message: `Student Recognized ✓ Attendance marked PRESENT for ${student.name} (${student.enrollmentNo})`,
                studentName: student.name,
                enrollmentNo: student.enrollmentNo,
                confidence: recognitionConfidence || 90,
                attendance: log
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AttendanceController = AttendanceController;
