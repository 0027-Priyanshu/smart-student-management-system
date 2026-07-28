import { Request, Response, NextFunction } from 'express';
import { RepoService } from '../services/repo.service';
import { emitLiveUpdate } from '../config/socket';
import { NotificationService } from '../services/notification.service';

export class AttendanceController {
  static async getAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.query.studentId as string;
      const courseId = req.query.courseId as string;
      const date = req.query.date as string;

      const query: any = {};
      if (studentId) query.studentId = studentId;
      if (courseId) query.courseId = courseId;
      if (date) query.date = date;

      const logs = await RepoService.findAttendance(query);
      return res.json({ attendance: logs });
    } catch (error) {
      next(error);
    }
  }

  static async markAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const { studentId, courseId, date, status } = req.body;

      const log = await RepoService.markAttendance({
        studentId,
        courseId,
        date,
        status,
        markedBy: requester.userId
      });

      const student = await RepoService.findStudentById(studentId);

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Attendance Updated',
        details: `Marked student ${student?.name || studentId} as ${status} on ${date}`
      });

      // Notify real-time counters
      emitLiveUpdate('attendance_update', { studentId, courseId, date, status });

      // Trigger stub alert hook for attendance
      if (student) {
        const course = await RepoService.findCourseById(courseId);
        NotificationService.triggerAttendanceAlert(
          student.email,
          student.name,
          date,
          course?.name || 'Academic Course',
          status
        ).catch(err => console.error(err));
      }

      return res.json({ message: 'Attendance marked successfully', attendance: log });
    } catch (error) {
      next(error);
    }
  }

  static async scanQR(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const { courseId } = req.body;

      // Get student profile
      const student = await RepoService.findStudentByUserId(requester.userId);
      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      const today = new Date().toISOString().split('T')[0];

      // Check if enrolled
      const studentCourses: string[] = student.enrolledCourses?.map((c: any) => c._id?.toString() || c.id?.toString()) || [];
      if (!studentCourses.includes(courseId)) {
        return res.status(400).json({ error: 'You are not enrolled in this course.' });
      }

      const log = await RepoService.markAttendance({
        studentId: student._id || student.id,
        courseId,
        date: today,
        status: 'Present',
        markedBy: requester.userId
      });

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'QR Scan Attendance',
        details: `Self-scanned present for course ID: ${courseId} on date: ${today}`
      });

      emitLiveUpdate('attendance_update', { studentId: student._id || student.id, courseId, date: today, status: 'Present' });

      // Trigger stub alert hook for attendance
      if (student) {
        const course = await RepoService.findCourseById(courseId);
        NotificationService.triggerAttendanceAlert(
          student.email,
          student.name,
          today,
          course?.name || 'Academic Course',
          'Present'
        ).catch(err => console.error(err));
      }

      return res.json({ 
        message: 'Attendance scanned & recorded successfully!', 
        attendance: log 
      });
    } catch (error) {
      next(error);
    }
  }

  static async getHeatmap(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.query.studentId as string;
      const query: any = {};
      if (studentId) query.studentId = studentId;

      const logs = await RepoService.findAttendance(query);
      
      // Group logs by date
      const dateCounts: { [key: string]: number } = {};
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
    } catch (error) {
      next(error);
    }
  }

  static async generateQrSession(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const { courseId, lectureTitle, date, durationMinutes } = req.body;

      if (!courseId || !lectureTitle) {
        return res.status(400).json({ error: 'Course and Lecture Title are required.' });
      }

      const course = await RepoService.findCourseById(courseId);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const duration = parseInt(durationMinutes || '10', 10);
      const sessionId = 'QR_' + Math.random().toString(36).substring(2, 9).toUpperCase();
      const expiresAt = new Date(Date.now() + duration * 60 * 1000);
      const sessionDate = date || new Date().toISOString().split('T')[0];

      const qrSession = await RepoService.createQrSession({
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
    } catch (error) {
      next(error);
    }
  }

  static async getQrSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const session = await RepoService.findQrSessionById(sessionId);
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
    } catch (error) {
      next(error);
    }
  }

  static async confirmQrAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required.' });
      }

      const session = await RepoService.findQrSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Invalid or expired QR session token.' });
      }

      if (new Date(session.expiresAt).getTime() < Date.now()) {
        return res.status(400).json({ error: 'This QR Code session has expired. Please ask your instructor for a new QR code.' });
      }

      let student = await RepoService.findStudentByUserId(requester.userId);
      if (!student) {
        const { students } = await RepoService.findStudents({}, 1, 1);
        if (students && students.length > 0) {
          student = students[0];
        }
      }

      if (!student) {
        return res.status(404).json({ error: 'Student profile not found. Please create a student profile first.' });
      }

      const studentIdStr = (student._id || student.id).toString();
      const scannedList = (session.scannedStudents || []).map((s: any) => (s._id || s.id || s).toString());
      if (scannedList.includes(studentIdStr)) {
        return res.status(400).json({ error: 'Attendance already recorded for this session! Duplicate entries are not allowed.' });
      }

      // Mark Attendance
      const log = await RepoService.markAttendance({
        studentId: student._id || student.id,
        courseId: session.courseId,
        date: session.date,
        status: 'Present',
        markedBy: requester.userId
      });

      // Add to QR session
      await RepoService.addStudentToQrSession(sessionId, student._id || student.id);

      // Notify real-time counters
      emitLiveUpdate('attendance_update', { studentId: student._id || student.id, courseId: session.courseId, date: session.date, status: 'Present' });

      return res.json({
        message: `Attendance confirmed successfully for ${session.courseName} - ${session.lectureTitle}!`,
        attendance: log
      });
    } catch (error) {
      next(error);
    }
  }
}
