import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import xlsx from 'xlsx';
import PDFDocument from 'pdfkit';
import { RepoService } from '../services/repo.service';
import { uploadFile } from '../services/cloudinary.service';
import { emitLiveUpdate } from '../config/socket';
import { NotificationService } from '../services/notification.service';

export class StudentController {
  static async getStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const search = (req.query.search as string) || '';
      const department = (req.query.department as string) || '';
      const courseId = (req.query.courseId as string) || '';
      const isDeleted = req.query.isDeleted === 'true';
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;

      const data = await RepoService.findStudents({ search, department, courseId, isDeleted }, page, limit);
      return res.json({
        students: data.students,
        pagination: {
          totalItems: data.totalItems,
          totalPages: data.totalPages,
          currentPage: page,
          limit
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getStudentById(req: Request, res: Response, next: NextFunction) {
    try {
      const student = await RepoService.findStudentById(req.params.id);
      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }
      return res.json({ student });
    } catch (error) {
      next(error);
    }
  }

  static async createStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, age, gender, grade, department, semester, parentName, parentPhone, address, enrolledCourses, academicHistory } = req.body;
      const requester = (req as any).user;
      
      const cleanEmail = email.toLowerCase().trim();
      const existingUser = await RepoService.findUserByEmail(cleanEmail);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Generate seed password from name
      const defaultPass = name.split(' ')[0].toLowerCase() + '123';
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(defaultPass, salt);

      // Create main login User account (Student accounts are marked verified by default when created by Admins)
      const user = await RepoService.createUser({
        name,
        email: cleanEmail,
        password: passwordHash,
        role: 'Student',
        isVerified: true
      });

      const userId = user._id || user.id;
      const enrollmentNo = 'ENR' + Date.now().toString().slice(-8);

      const student = await RepoService.createStudent({
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
      NotificationService.sendStudentRegistrationNotification(cleanEmail, name, enrollmentNo).catch(err => console.error(err));
      NotificationService.triggerFeeReminderAlert(cleanEmail, name, 2500, '2026-08-01').catch(err => console.error(err));

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Student Created',
        details: `Enrolled new student: ${name} (${enrollmentNo})`
      });

      emitLiveUpdate('dashboard_update', { action: 'student_added' });

      return res.status(201).json({
        message: 'Student profile created successfully',
        student
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const requester = (req as any).user;

      const student = await RepoService.findStudentById(id);
      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      const updated = await RepoService.updateStudent(id, req.body);

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Student Updated',
        details: `Updated student profile fields for: ${student.name} (${student.enrollmentNo})`
      });

      return res.json({ message: 'Student updated successfully', student: updated });
    } catch (error) {
      next(error);
    }
  }

  static async deleteStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const student = await RepoService.findStudentById(req.params.id);
      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      await RepoService.updateStudent(req.params.id, { isDeleted: true });

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Student Deleted (Soft)',
        details: `Soft deleted student profile: ${student.name} (${student.enrollmentNo})`
      });

      emitLiveUpdate('dashboard_update', { action: 'student_deleted' });

      return res.json({ message: 'Student profile soft-deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async restoreStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const student = await RepoService.findStudentById(req.params.id);
      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      await RepoService.updateStudent(req.params.id, { isDeleted: false });

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Student Restored',
        details: `Restored student profile: ${student.name} (${student.enrollmentNo})`
      });

      emitLiveUpdate('dashboard_update', { action: 'student_restored' });

      return res.json({ message: 'Student profile restored successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async exportCSV(req: Request, res: Response, next: NextFunction) {
    try {
      const { students } = await RepoService.findStudents({}, 1, 1000);
      let csv = 'Name,Email,EnrollmentNo,Age,Gender,Grade,Department,Semester,ParentName,ParentPhone,Address\n';
      
      students.forEach((s: any) => {
        csv += `"${s.name}","${s.email}","${s.enrollmentNo}",${s.age},"${s.gender}","${s.grade}","${s.department}",${s.semester || 1},"${s.parentName}","${s.parentPhone}","${s.address}"\n`;
      });

      res.setHeader('Content-Disposition', 'attachment; filename="students_report.csv"');
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  static async exportExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const { students } = await RepoService.findStudents({}, 1, 1000);
      const formatted = students.map((s: any) => ({
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

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(formatted);
      xlsx.utils.book_append_sheet(wb, ws, "Students");
      
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Disposition', 'attachment; filename="students_report.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buf);
    } catch (error) {
      next(error);
    }
  }

  static async exportPDF(req: Request, res: Response, next: NextFunction) {
    try {
      const { students } = await RepoService.findStudents({}, 1, 1000);
      const doc = new PDFDocument({ margin: 30 });

      res.setHeader('Content-Disposition', 'attachment; filename="students_report.pdf"');
      res.setHeader('Content-Type', 'application/pdf');
      doc.pipe(res);

      doc.fontSize(22).fillColor('#8a5cf6').text('EduManager Student Enrollment Report', { align: 'center' });
      doc.fontSize(10).fillColor('#6b7280').text(`Report Generated On: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);

      // Simple Table layout
      doc.fontSize(10).fillColor('#12141c');
      doc.text('Enrollment No', 30, 110, { width: 90, bold: true } as any);
      doc.text('Name', 120, 110, { width: 140, bold: true } as any);
      doc.text('Email', 260, 110, { width: 150, bold: true } as any);
      doc.text('Department', 410, 110, { width: 80, bold: true } as any);
      doc.text('Grade', 490, 110, { width: 70, bold: true } as any);

      doc.moveTo(30, 125).lineTo(560, 125).strokeColor('#e5e7eb').stroke();

      let y = 135;
      students.forEach((s: any) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        doc.fillColor('#374151');
        doc.text(s.enrollmentNo, 30, y, { width: 90 });
        doc.text(s.name, 120, y, { width: 140 });
        doc.text(s.email, 260, y, { width: 150 });
        doc.text(s.department, 410, y, { width: 80 });
        doc.text(s.grade, 490, y, { width: 70 });
        y += 20;
      });

      doc.end();
    } catch (error) {
      next(error);
    }
  }

  static async importStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      if (!req.file) {
        return res.status(400).json({ error: 'Excel file is required' });
      }

      // Secure upload check (validate file type/extension)
      const allowedMimeTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
      const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();
      if (!allowedMimeTypes.includes(req.file.mimetype) || (fileExt !== 'xlsx' && fileExt !== 'xls')) {
        return res.status(400).json({ error: 'Invalid file format! Only Excel spreadsheets (.xlsx, .xls) are allowed.' });
      }

      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data: any[] = xlsx.utils.sheet_to_json(sheet);

      let count = 0;
      for (const row of data) {
        const { Name, Email, Age, Gender, Grade, Department, Semester, Parent, Phone, Address } = row;
        
        if (!Name || !Email) continue;

        const cleanEmail = Email.toLowerCase().trim();
        const existingUser = await RepoService.findUserByEmail(cleanEmail);
        if (existingUser) continue;

        const pass = Name.split(' ')[0].toLowerCase() + '123';
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(pass, salt);

        const user = await RepoService.createUser({
          name: Name,
          email: cleanEmail,
          password: passwordHash,
          role: 'Student',
          isVerified: true
        });

        const userId = user._id || user.id;
        const enrollmentNo = 'ENR' + (Date.now() + count).toString().slice(-8);

        await RepoService.createStudent({
          userId,
          name: Name,
          email: cleanEmail,
          enrollmentNo,
          age: parseInt(Age, 10) || 18,
          gender: Gender || 'Male',
          grade: Grade || 'Freshman',
          department: Department || 'CSE',
          semester: parseInt(Semester, 10) || 1,
          parentName: Parent || 'Not Specified',
          parentPhone: Phone?.toString() || '0000000000',
          address: Address || 'Not Specified',
          isDeleted: false
        });

        // Send registration email notification asynchronously to avoid blocking the loop
        NotificationService.sendStudentRegistrationNotification(cleanEmail, Name, enrollmentNo).catch(err => {
          console.error(`Failed to send bulk student notification:`, err);
        });

        count++;
      }

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Bulk Import',
        details: `Bulk imported ${count} students from Excel worksheet`
      });

      emitLiveUpdate('dashboard_update', { action: 'student_added' });

      return res.json({ message: `Successfully imported ${count} student records!` });
    } catch (error) {
      next(error);
    }
  }

  static async uploadAvatar(req: Request, res: Response, next: NextFunction) {
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

      const secureUrl = await uploadFile(req.file.path, 'avatars');
      return res.json({ url: secureUrl });
    } catch (error) {
      next(error);
    }
  }
}
