"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityController = void 0;
const Activity_1 = __importDefault(require("../models/Activity"));
class ActivityController {
    // GET /api/activities
    // Fetch activities (Global + User's enrolled courses)
    static async getActivities(req, res, next) {
        try {
            const user = req.user;
            let query = { targetCourseId: null }; // Global activities by default
            // If student, we could fetch activities for their specific enrolled courses
            if (user.role === 'Student' && user.studentProfile?.enrolledCourses) {
                query = {
                    $or: [
                        { targetCourseId: null },
                        { targetCourseId: { $in: user.studentProfile.enrolledCourses } }
                    ]
                };
            }
            const activities = await Activity_1.default.find(query).sort({ date: 1 }).limit(10).lean();
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
        }
        catch (error) {
            next(error);
        }
    }
    // POST /api/activities (Admin/Faculty)
    static async createActivity(req, res, next) {
        try {
            const { title, date, type, description, targetCourseId } = req.body;
            const activity = new Activity_1.default({ title, date, type, description, targetCourseId });
            await activity.save();
            return res.status(201).json({ message: 'Activity created successfully', activity });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ActivityController = ActivityController;
