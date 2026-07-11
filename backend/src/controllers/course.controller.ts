import { Request, Response, NextFunction } from 'express';
import { RepoService } from '../services/repo.service';
import { emitLiveUpdate } from '../config/socket';
import { NotificationService } from '../services/notification.service';

export class CourseController {
  static async getCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const showDeleted = req.query.isDeleted === 'true';
      const courses = await RepoService.findCourses({ isDeleted: showDeleted });
      return res.json({ courses });
    } catch (error) {
      next(error);
    }
  }

  static async getCourseById(req: Request, res: Response, next: NextFunction) {
    try {
      const course = await RepoService.findCourseById(req.params.id);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      return res.json({ course });
    } catch (error) {
      next(error);
    }
  }

  static async createCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const { name, code, description, credits, semester, department, capacity, prerequisites } = req.body;

      const cleanCode = code.toUpperCase().trim();
      const existing = await RepoService.findCourseByCode(cleanCode);
      if (existing) {
        return res.status(400).json({ error: 'Course code already exists' });
      }

      const course = await RepoService.createCourse({
        name,
        code: cleanCode,
        description,
        credits: parseInt(credits, 10),
        semester: parseInt(semester, 10),
        department,
        capacity: parseInt(capacity, 10) || 40,
        prerequisites: prerequisites || []
      });

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Course Created',
        details: `Created new course: ${name} (${cleanCode})`
      });

      emitLiveUpdate('dashboard_update', { action: 'course_added' });

      return res.status(201).json({ message: 'Course created successfully', course });
    } catch (error) {
      next(error);
    }
  }

  static async updateCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const { name, description, credits, semester, department, capacity, prerequisites } = req.body;

      const course = await RepoService.findCourseById(req.params.id);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const updated = await RepoService.updateCourse(req.params.id, {
        name,
        description,
        credits: parseInt(credits, 10),
        semester: parseInt(semester, 10),
        department,
        capacity: parseInt(capacity, 10),
        prerequisites: prerequisites || []
      });

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Course Updated',
        details: `Updated course details: ${course.name} (${course.code})`
      });

      return res.json({ message: 'Course updated successfully', course: updated });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const course = await RepoService.findCourseById(req.params.id);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      await RepoService.deleteCourse(req.params.id);

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Course Deleted (Soft)',
        details: `Soft deleted course: ${course.name} (${course.code})`
      });

      emitLiveUpdate('dashboard_update', { action: 'course_deleted' });

      return res.json({ message: 'Course soft-deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async restoreCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const course = await RepoService.findCourseById(req.params.id);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      await RepoService.restoreCourse(req.params.id);

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Course Restored',
        details: `Restored course: ${course.name} (${course.code})`
      });

      emitLiveUpdate('dashboard_update', { action: 'course_restored' });

      return res.json({ message: 'Course restored successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async assignCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const { studentId, courseId } = req.body;

      const student = await RepoService.findStudentById(studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const course = await RepoService.findCourseById(courseId);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const studentCourses: string[] = student.enrolledCourses?.map((c: any) => c._id?.toString() || c.id?.toString()) || [];
      if (studentCourses.includes(courseId)) {
        return res.status(400).json({ error: 'Student is already enrolled in this course' });
      }

      const updatedCourses = [...studentCourses, courseId];
      await RepoService.updateStudent(studentId, { enrolledCourses: updatedCourses });

      // Send course assignment email notification
      NotificationService.sendCourseAssignmentNotification(
        student.email,
        student.name,
        course.name,
        course.code
      ).catch(err => console.error(err));

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Course Enrollment',
        details: `Assigned course ${course.code} to student ${student.name}`
      });

      emitLiveUpdate('dashboard_update', { action: 'course_assigned' });

      return res.json({ message: 'Student successfully enrolled in course!' });
    } catch (error) {
      next(error);
    }
  }
}
