import { Request, Response, NextFunction } from 'express';
import Activity from '../models/Activity';

export class ActivityController {
  // GET /api/activities
  // Fetch activities (Global + User's enrolled courses)
  static async getActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      
      let query: any = { targetCourseId: null }; // Global activities by default
      
      // If student, we could fetch activities for their specific enrolled courses
      if (user.role === 'Student' && user.studentProfile?.enrolledCourses) {
        query = {
          $or: [
            { targetCourseId: null },
            { targetCourseId: { $in: user.studentProfile.enrolledCourses } }
          ]
        };
      }

      const activities = await Activity.find(query).sort({ date: 1 }).limit(10).lean();
      
      // If empty, return some defaults for demonstration purposes since we just migrated
      if (activities.length === 0) {
        return res.json({
          activities: [
             { title: 'Mid-term Data Structures Exam', date: 'Oct 15, 2026', type: 'Exam' },
             { title: 'AI Assignment 3 Submission', date: 'Oct 18, 2026', type: 'Assignment' },
             { title: 'Guest Lecture: Future of Tech', date: 'Oct 20, 2026', type: 'Notice' }
          ]
        });
      }

      return res.json({ activities });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/activities (Admin/Faculty)
  static async createActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, date, type, description, targetCourseId } = req.body;
      const activity = new Activity({ title, date, type, description, targetCourseId });
      await activity.save();
      return res.status(201).json({ message: 'Activity created successfully', activity });
    } catch (error) {
      next(error);
    }
  }
}
