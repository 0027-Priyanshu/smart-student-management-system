import { Request, Response, NextFunction } from 'express';
import { RepoService } from '../services/repo.service';
import { NotificationService } from '../services/notification.service';

export class ResultController {
  static async getResults(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      let targetStudentId = req.params.studentId;

      if (requester.role === 'Student') {
        const studentProfile = await RepoService.findStudentByUserId(requester.userId);
        if (!studentProfile) return res.status(404).json({ error: 'Student profile not found.' });
        
        // Ensure student can only query their own results
        if (targetStudentId && targetStudentId !== (studentProfile._id || studentProfile.id).toString()) {
          return res.status(403).json({ error: 'Access denied: You can only view your own grades.' });
        }
        targetStudentId = studentProfile._id || studentProfile.id;
      }

      let results = await RepoService.findResults(targetStudentId);
      
      if (requester.role === 'Faculty') {
        const facultyProfile = await RepoService.findFacultyByUserId(requester.userId);
        if (facultyProfile) {
          const facultyCourses = (facultyProfile.assignedCourses || []).map((c: any) => (c._id || c.id || c).toString());
          results = results.filter((r: any) => {
            const courseIdStr = (r.courseId?._id || r.courseId?.id || r.courseId || '').toString();
            return facultyCourses.includes(courseIdStr);
          });
        }
      }

      let totalGradePoints = 0;
      let totalCredits = 0;
      
      const formattedResults = results.map(r => {
        const courseCredits = r.courseId?.credits || 3;
        totalGradePoints += r.gpa * courseCredits;
        totalCredits += courseCredits;
        return r;
      });

      const cgpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0.0;

      return res.json({ 
        results: formattedResults,
        cgpa: parseFloat(cgpa.toFixed(2)) 
      });
    } catch (error) {
      next(error);
    }
  }

  static async saveResult(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const { studentId, courseId, semester, internal, external, assignment, practical } = req.body;

      const intVal = parseFloat(internal) || 0;
      const extVal = parseFloat(external) || 0;
      const assignVal = parseFloat(assignment) || 0;
      const pracVal = parseFloat(practical) || 0;

      if (requester.role === 'Faculty') {
        const facultyProfile = await RepoService.findFacultyByUserId(requester.userId);
        if (!facultyProfile) return res.status(404).json({ error: 'Faculty profile not found.' });
        const facultyCourses = facultyProfile.assignedCourses?.map((c: any) => (c._id || c.id || c).toString()) || [];
        
        if (!facultyCourses.includes(courseId)) {
           return res.status(403).json({ error: 'Access denied: You can only grade courses you teach.' });
        }
      }

      // P1-22: Verify student exists and is enrolled in this course
      const student = await RepoService.findStudentById(studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student profile not found.' });
      }

      const studentCourses = (student.enrolledCourses || []).map((c: any) => (c._id || c.id || c).toString());
      if (!studentCourses.includes(courseId.toString())) {
        return res.status(400).json({ error: 'Cannot record grade: Student is not enrolled in this course.' });
      }

      const total = intVal + extVal + assignVal + pracVal;

      // Grade calculation mapping
      let grade = 'F';
      let gpa = 0.0;

      if (total >= 90) {
        grade = 'A+';
        gpa = 4.0;
      } else if (total >= 80) {
        grade = 'A';
        gpa = 3.7;
      } else if (total >= 70) {
        grade = 'B';
        gpa = 3.0;
      } else if (total >= 60) {
        grade = 'C';
        gpa = 2.3;
      } else if (total >= 50) {
        grade = 'D';
        gpa = 1.5;
      } else {
        grade = 'F';
        gpa = 0.0;
      }

      const logResult = await RepoService.saveResult({
        studentId,
        courseId,
        semester: parseInt(semester, 10),
        internal: intVal,
        external: extVal,
        assignment: assignVal,
        practical: pracVal,
        grade,
        gpa,
        markedBy: requester.userId
      });

      // Log Activity
      await RepoService.createLog({
        userId: requester.userId,
        userName: requester.name,
        role: requester.role,
        action: 'Marks Entered',
        details: `Entered marks for student ${student.name || studentId} in course ID: ${courseId}. Total: ${total} (Grade: ${grade})`
      });
      // Trigger stub alert hook for published marks
      if (student) {
        const course = await RepoService.findCourseById(courseId);
        NotificationService.triggerMarksPublishedAlert(
          student.email,
          student.name,
          course?.name || 'Academic Course',
          grade,
          gpa
        ).catch(err => console.error(err));
      }
      return res.json({ message: 'Student grades saved successfully', result: logResult });
    } catch (error) {
      next(error);
    }
  }
}
