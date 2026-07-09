import { Request, Response, NextFunction } from 'express';
import { RepoService } from '../services/repo.service';
import { emitLiveUpdate } from '../config/socket';

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
        if (log.status === 'Present' || log.status === 'Late') {
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
}
