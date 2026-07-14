import { Request, Response, NextFunction } from 'express';
import { RepoService } from '../services/repo.service';

export class FacultyController {
  static async getFaculties(req: Request, res: Response, next: NextFunction) {
    try {
      const showDeleted = req.query.isDeleted === 'true';
      const faculties = await RepoService.findFaculties({ isDeleted: showDeleted });
      return res.json({ faculties });
    } catch (error) {
      next(error);
    }
  }

  static async assignCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const { facultyId, courseId } = req.body;

      const faculty = await RepoService.findFacultyById(facultyId);
      if (!faculty) {
        return res.status(404).json({ error: 'Faculty profile not found' });
      }

      const course = await RepoService.findCourseById(courseId);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const assigned: string[] = faculty.assignedCourses?.map((c: any) => c._id?.toString() || c.id?.toString()) || [];
      if (assigned.includes(courseId)) {
        return res.status(400).json({ error: 'Course is already assigned to this faculty' });
      }

      const updatedCourses = [...assigned, courseId];
      await RepoService.updateFaculty(facultyId, { assignedCourses: updatedCourses });

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Faculty Assigned',
        details: `Assigned course ${course.code} to faculty ${faculty.name}`
      });

      return res.json({ message: 'Course successfully assigned to faculty!' });
    } catch (error) {
      next(error);
    }
  }

  static async getFacultyStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const faculty = await RepoService.findFacultyById(req.params.id);
      if (!faculty) {
        return res.status(404).json({ error: 'Faculty profile not found' });
      }

      const courseIds: string[] = faculty.assignedCourses?.map((c: any) => c._id?.toString() || c.id?.toString()) || [];

      // Find all active students who are enrolled in any of these courses
      const { students } = await RepoService.findStudents({ isDeleted: false }, 1, 1000);
      
      const assignedStudents = students.filter((s: any) => {
        const studentCourses: string[] = s.enrolledCourses?.map((c: any) => c._id?.toString() || c.id?.toString()) || [];
        return studentCourses.some(cid => courseIds.includes(cid));
      });

      return res.json({ students: assignedStudents });
    } catch (error) {
      next(error);
    }
  }

  static async deleteFaculty(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const faculty = await RepoService.findFacultyById(req.params.id);
      if (!faculty) {
        return res.status(404).json({ error: 'Faculty profile not found' });
      }

      await RepoService.deleteFaculty(req.params.id);

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Faculty Deleted (Soft)',
        details: `Soft deleted faculty profile: ${faculty.name}`
      });

      return res.json({ message: 'Faculty profile soft-deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async restoreFaculty(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const faculty = await RepoService.findFacultyById(req.params.id);
      if (!faculty) {
        return res.status(404).json({ error: 'Faculty profile not found' });
      }

      await RepoService.restoreFaculty(req.params.id);

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Faculty Restored',
        details: `Restored faculty profile: ${faculty.name}`
      });

      return res.json({ message: 'Faculty profile restored successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async updateFaculty(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const { department, designation } = req.body;

      const faculty = await RepoService.findFacultyById(req.params.id);
      if (!faculty) {
        return res.status(404).json({ error: 'Faculty profile not found' });
      }

      const updateData: any = {};
      if (department) updateData.department = department;
      if (designation) updateData.designation = designation;

      await RepoService.updateFaculty(req.params.id, updateData);

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Faculty Updated',
        details: `Updated faculty profile: ${faculty.name} (${designation || faculty.designation})`
      });

      return res.json({ message: 'Faculty profile updated successfully' });
    } catch (error) {
      next(error);
    }
  }
}
