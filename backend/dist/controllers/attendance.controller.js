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
            // Faculty RBAC: only allow marking attendance for assigned courses
            if (requester.role === 'Faculty') {
                const facultyProfile = await repo_service_1.RepoService.findFacultyByUserId(requester.userId);
                if (facultyProfile) {
                    const assignedCourses = facultyProfile.assignedCourses?.map((c) => (c._id || c.id || c).toString()) || [];
                    if (!assignedCourses.includes(courseId)) {
                        return res.status(403).json({ error: 'Access denied: You are not assigned to this course.' });
                    }
                }
            }
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
            // Faculty RBAC: only allow QR session for assigned courses
            if (requester.role === 'Faculty') {
                const facultyProfile = await repo_service_1.RepoService.findFacultyByUserId(requester.userId);
                if (facultyProfile) {
                    const assignedCourses = facultyProfile.assignedCourses?.map((c) => (c._id || c.id || c).toString()) || [];
                    if (!assignedCourses.includes(courseId)) {
                        return res.status(403).json({ error: 'Access denied: You are not assigned to this course.' });
                    }
                }
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
            const student = await repo_service_1.RepoService.findStudentByUserId(requester.userId);
            if (!student) {
                return res.status(404).json({ error: 'Student profile not found. Please create a student profile first.' });
            }
            // Verify student is enrolled in the course
            const studentCourses = student.enrolledCourses?.map((c) => (c._id || c.id || c).toString()) || [];
            const sessionCourseStr = (session.courseId?._id || session.courseId?.id || session.courseId).toString();
            if (!studentCourses.includes(sessionCourseStr)) {
                return res.status(403).json({ error: 'You are not enrolled in this course.' });
            }
            const studentIdStr = (student._id || student.id).toString();
            const scannedList = (session.scannedStudents || []).map((s) => (s._id || s.id || s).toString());
            if (scannedList.includes(studentIdStr)) {
                return res.status(400).json({ error: 'Attendance already recorded for this session! Duplicate entries are not allowed.' });
            }
            // Mark Attendance (P0-6: Session-based identity)
            const log = await repo_service_1.RepoService.markAttendance({
                studentId: student._id || student.id,
                courseId: session.courseId,
                date: session.date,
                sessionId: session.sessionId,
                attendanceMethod: 'QR',
                lectureTitle: session.lectureTitle,
                status: 'Present',
                markedBy: requester.userId
            });
            // Add to QR session
            await repo_service_1.RepoService.addStudentToQrSession(sessionId, student._id || student.id);
            // Notify real-time counters
            (0, socket_1.emitLiveUpdate)('attendance_update', {
                studentId: student._id || student.id,
                courseId: session.courseId,
                date: session.date,
                sessionId: session.sessionId,
                status: 'Present'
            });
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
    // ==================== TIMED FACE SESSION & 1-TO-1 SELF VERIFICATION ====================
    static async startFaceSession(req, res, next) {
        try {
            const requester = req.user;
            const { courseId, courseName, lectureTitle, durationMinutes } = req.body;
            if (!courseId || !lectureTitle) {
                return res.status(400).json({ error: 'Course ID and Lecture Title are required.' });
            }
            // P0-5: If Faculty, verify they are assigned to teach this course
            if (requester.role === 'Faculty') {
                const facultyProfile = await repo_service_1.RepoService.findFacultyByUserId(requester.userId);
                if (!facultyProfile) {
                    return res.status(404).json({ error: 'Faculty profile not found.' });
                }
                const assignedCourses = (facultyProfile.assignedCourses || []).map((c) => (c._id || c.id || c).toString());
                if (!assignedCourses.includes(courseId.toString())) {
                    return res.status(403).json({ error: 'Access denied: You are not assigned to teach this course.' });
                }
            }
            let name = courseName;
            if (!name) {
                const courseObj = await repo_service_1.RepoService.findCourseById(courseId);
                name = courseObj ? courseObj.name : 'Academic Class';
            }
            const result = await repo_service_1.RepoService.createFaceSession({
                courseId,
                courseName: name,
                lectureTitle,
                facultyId: requester.userId,
                facultyName: requester.name,
                durationMinutes: Number(durationMinutes) || 10
            });
            // Socket broadcast to all students
            (0, socket_1.emitLiveUpdate)('face_attendance_opened', {
                sessionId: result.session.sessionId,
                courseId,
                courseName: name,
                lectureTitle,
                durationMinutes: result.session.durationMinutes,
                expiresAt: result.session.expiresAt
            });
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Start Face Attendance Session',
                details: `Started ${result.session.durationMinutes}-min face attendance window for course: ${name} (${lectureTitle})`
            });
            return res.status(201).json({
                message: `Face Attendance session initialized successfully! ${result.notificationsCount} students notified.`,
                session: result.session
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getFaceSession(req, res, next) {
        try {
            const { sessionId } = req.params;
            const session = await repo_service_1.RepoService.findFaceSessionById(sessionId);
            if (!session) {
                return res.status(404).json({ error: 'Face Attendance session not found.' });
            }
            return res.json({ session });
        }
        catch (error) {
            next(error);
        }
    }
    static async getActiveFaceSession(req, res, next) {
        try {
            const requester = req.user;
            const courseId = req.query.courseId;
            if (requester.role === 'Student') {
                const session = await repo_service_1.RepoService.getActiveFaceSessionForStudent(requester.userId);
                return res.json({ session });
            }
            if (courseId) {
                const session = await repo_service_1.RepoService.getActiveFaceSessionForCourse(courseId);
                return res.json({ session });
            }
            return res.status(400).json({ error: 'Course ID is required for Faculty/Admin query.' });
        }
        catch (error) {
            next(error);
        }
    }
    static async endFaceSession(req, res, next) {
        try {
            const requester = req.user;
            const { sessionId } = req.body;
            if (!sessionId) {
                return res.status(400).json({ error: 'Session ID is required.' });
            }
            // P0-5: Verify session exists and requester has ownership
            const existingSession = await repo_service_1.RepoService.findFaceSessionById(sessionId);
            if (!existingSession) {
                return res.status(404).json({ error: 'Session not found.' });
            }
            if (requester.role === 'Faculty') {
                const sessionFacultyId = (existingSession.facultyId?._id || existingSession.facultyId?.id || existingSession.facultyId || '').toString();
                if (sessionFacultyId && sessionFacultyId !== requester.userId.toString()) {
                    return res.status(403).json({ error: 'Access denied: You can only end attendance sessions created by you.' });
                }
            }
            const closed = await repo_service_1.RepoService.endFaceSession(sessionId);
            if (!closed) {
                return res.status(404).json({ error: 'Session not found.' });
            }
            (0, socket_1.emitLiveUpdate)('face_attendance_closed', { sessionId });
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'End Face Attendance Session',
                details: `Closed face attendance session: ${sessionId}`
            });
            return res.json({ message: 'Attendance session ended successfully.', session: closed });
        }
        catch (error) {
            next(error);
        }
    }
    static async verifySelfFace(req, res, next) {
        try {
            const requester = req.user;
            const { capturedDescriptor, sessionId } = req.body;
            if (!capturedDescriptor || !Array.isArray(capturedDescriptor) || capturedDescriptor.length === 0) {
                return res.status(400).json({ error: 'Valid captured face descriptor is required.' });
            }
            const result = await repo_service_1.RepoService.verifyStudentFace1to1({
                studentUserIdOrId: requester.userId,
                capturedDescriptor,
                sessionId
            });
            if (!result.success) {
                return res.status(result.status || 400).json({ error: result.error });
            }
            // Notify Faculty via socket live update
            (0, socket_1.emitLiveUpdate)('face_attendance_marked', {
                sessionId: result.session.sessionId,
                courseId: result.session.courseId,
                studentId: result.student._id || result.student.id,
                studentName: result.student.name,
                enrollmentNo: result.student.enrollmentNo,
                confidence: result.confidence,
                timestamp: new Date().toLocaleTimeString()
            });
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Self Face Attendance Verified',
                details: `Verified 1-to-1 face match with ${result.confidence}% confidence for ${result.student.name} (${result.student.enrollmentNo})`
            });
            return res.status(200).json({
                message: `Face Verified ✓ Attendance marked PRESENT for ${result.student.name}`,
                student: {
                    name: result.student.name,
                    enrollmentNo: result.student.enrollmentNo
                },
                confidence: result.confidence,
                attendance: result.attendance,
                session: result.session
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getNotifications(req, res, next) {
        try {
            const requester = req.user;
            const notifications = await repo_service_1.RepoService.getUserNotifications(requester.userId);
            return res.json({ notifications });
        }
        catch (error) {
            next(error);
        }
    }
    static async markNotificationRead(req, res, next) {
        try {
            const { id } = req.params;
            await repo_service_1.RepoService.markNotificationRead(id);
            return res.json({ message: 'Notification marked as read.' });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AttendanceController = AttendanceController;
