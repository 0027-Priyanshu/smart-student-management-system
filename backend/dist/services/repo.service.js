"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepoService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const Student_1 = __importDefault(require("../models/Student"));
const Faculty_1 = __importDefault(require("../models/Faculty"));
const Course_1 = __importDefault(require("../models/Course"));
const Attendance_1 = __importDefault(require("../models/Attendance"));
const Result_1 = __importDefault(require("../models/Result"));
const ChatHistory_1 = require("../models/ChatHistory");
const QrSession_1 = __importDefault(require("../models/QrSession"));
const db_1 = require("../config/db");
const generateId = () => new mongoose_1.default.Types.ObjectId().toString();
class RepoService {
    // ==================== USER OPERATIONS ====================
    static async findUsers() {
        if (db_1.isMongoConnected) {
            return await User_1.default.find({}).lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            return db.users;
        }
    }
    static async findUserById(id) {
        if (db_1.isMongoConnected) {
            return await User_1.default.findById(id).lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            return db.users.find((u) => u._id === id || u.id === id) || null;
        }
    }
    static async findUserByEmail(email) {
        const cleanEmail = email.toLowerCase().trim();
        if (db_1.isMongoConnected) {
            return await User_1.default.findOne({ email: cleanEmail }).lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            return db.users.find((u) => u.email === cleanEmail) || null;
        }
    }
    static async createUser(userData) {
        if (db_1.isMongoConnected) {
            return await User_1.default.create(userData);
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const newUser = {
                _id: generateId(),
                ...userData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            db.users.push(newUser);
            (0, db_1.writeJsonDb)(db);
            return newUser;
        }
    }
    static async updateUser(id, updateData) {
        if (db_1.isMongoConnected) {
            return await User_1.default.findByIdAndUpdate(id, updateData, { new: true }).lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const index = db.users.findIndex((u) => u._id === id || u.id === id);
            if (index === -1)
                return null;
            db.users[index] = {
                ...db.users[index],
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            (0, db_1.writeJsonDb)(db);
            return db.users[index];
        }
    }
    // ==================== STUDENT OPERATIONS ====================
    static async findStudents(query, page = 1, limit = 10) {
        const isDeleted = query.isDeleted !== undefined ? query.isDeleted : false;
        if (db_1.isMongoConnected) {
            const dbQuery = { isDeleted };
            if (query.search) {
                dbQuery.$or = [
                    { name: { $regex: query.search, $options: 'i' } },
                    { email: { $regex: query.search, $options: 'i' } },
                    { enrollmentNo: { $regex: query.search, $options: 'i' } }
                ];
            }
            if (query.department) {
                dbQuery.department = query.department;
            }
            if (query.courseId) {
                dbQuery.enrolledCourses = query.courseId;
            }
            const totalItems = await Student_1.default.countDocuments(dbQuery);
            const totalPages = Math.ceil(totalItems / limit);
            const students = await Student_1.default.find(dbQuery)
                .populate('enrolledCourses')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean();
            return { students, totalItems, totalPages };
        }
        else {
            const db = (0, db_1.readJsonDb)();
            let filtered = db.students.filter((s) => (s.isDeleted || false) === isDeleted);
            if (query.search) {
                const q = query.search.toLowerCase();
                filtered = filtered.filter((s) => s.name.toLowerCase().includes(q) ||
                    s.email.toLowerCase().includes(q) ||
                    s.enrollmentNo.toLowerCase().includes(q));
            }
            if (query.department) {
                filtered = filtered.filter((s) => s.department === query.department);
            }
            if (query.courseId) {
                filtered = filtered.filter((s) => s.enrolledCourses?.includes(query.courseId));
            }
            // Populate courses manually
            const populated = filtered.map((s) => {
                const courses = (s.enrolledCourses || []).map((cid) => db.courses.find((c) => c._id === cid || c.id === cid)).filter(Boolean);
                return { ...s, enrolledCourses: courses };
            });
            // Pagination
            const totalItems = populated.length;
            const totalPages = Math.ceil(totalItems / limit);
            const paginated = populated.slice((page - 1) * limit, page * limit);
            return { students: paginated, totalItems, totalPages };
        }
    }
    static async findStudentById(id) {
        if (db_1.isMongoConnected) {
            return await Student_1.default.findById(id).populate('enrolledCourses').lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const student = db.students.find((s) => s._id === id || s.id === id);
            if (!student)
                return null;
            const courses = (student.enrolledCourses || []).map((cid) => db.courses.find((c) => c._id === cid || c.id === cid)).filter(Boolean);
            return { ...student, enrolledCourses: courses };
        }
    }
    static async findStudentByUserId(userId) {
        if (db_1.isMongoConnected) {
            return await Student_1.default.findOne({ userId }).populate('enrolledCourses').lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const student = db.students.find((s) => s.userId === userId);
            if (!student)
                return null;
            const courses = (student.enrolledCourses || []).map((cid) => db.courses.find((c) => c._id === cid || c.id === cid)).filter(Boolean);
            return { ...student, enrolledCourses: courses };
        }
    }
    static async findStudentByEnrollmentNo(enrollmentNo) {
        if (db_1.isMongoConnected) {
            return await Student_1.default.findOne({ enrollmentNo: { $regex: new RegExp(`^${enrollmentNo}$`, 'i') } }).populate('enrolledCourses').lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const student = db.students.find((s) => s.enrollmentNo && s.enrollmentNo.toLowerCase() === enrollmentNo.toLowerCase());
            if (!student)
                return null;
            const courses = (student.enrolledCourses || []).map((cid) => db.courses.find((c) => c._id === cid || c.id === cid)).filter(Boolean);
            return { ...student, enrolledCourses: courses };
        }
    }
    static async createStudent(studentData) {
        if (db_1.isMongoConnected) {
            return await Student_1.default.create(studentData);
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const newStudent = {
                _id: generateId(),
                ...studentData,
                enrolledCourses: studentData.enrolledCourses || [],
                isDeleted: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            db.students.push(newStudent);
            (0, db_1.writeJsonDb)(db);
            return newStudent;
        }
    }
    static async updateStudent(id, updateData) {
        if (db_1.isMongoConnected) {
            return await Student_1.default.findByIdAndUpdate(id, updateData, { new: true }).populate('enrolledCourses').lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const index = db.students.findIndex((s) => s._id === id || s.id === id);
            if (index === -1)
                return null;
            db.students[index] = {
                ...db.students[index],
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            (0, db_1.writeJsonDb)(db);
            return db.students[index];
        }
    }
    // ==================== FACULTY OPERATIONS ====================
    static async findFaculties(query = { isDeleted: false }) {
        const isDeleted = query.isDeleted !== undefined ? query.isDeleted : false;
        if (db_1.isMongoConnected) {
            return await Faculty_1.default.find({ isDeleted }).populate('assignedCourses').lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const filtered = db.faculties.filter((f) => (f.isDeleted || false) === isDeleted);
            return filtered.map((f) => {
                const courses = (f.assignedCourses || []).map((cid) => db.courses.find((c) => c._id === cid || c.id === cid)).filter(Boolean);
                return { ...f, assignedCourses: courses };
            });
        }
    }
    static async findFacultyById(id) {
        if (db_1.isMongoConnected) {
            return await Faculty_1.default.findById(id).populate('assignedCourses').lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const faculty = db.faculties.find((f) => f._id === id || f.id === id);
            if (!faculty)
                return null;
            const courses = (faculty.assignedCourses || []).map((cid) => db.courses.find((c) => c._id === cid || c.id === cid)).filter(Boolean);
            return { ...faculty, assignedCourses: courses };
        }
    }
    static async findFacultyByUserId(userId) {
        if (db_1.isMongoConnected) {
            return await Faculty_1.default.findOne({ userId }).populate('assignedCourses').lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const faculty = db.faculties.find((f) => f.userId === userId);
            if (!faculty)
                return null;
            const courses = (faculty.assignedCourses || []).map((cid) => db.courses.find((c) => c._id === cid || c.id === cid)).filter(Boolean);
            return { ...faculty, assignedCourses: courses };
        }
    }
    static async createFaculty(facultyData) {
        if (db_1.isMongoConnected) {
            return await Faculty_1.default.create({ ...facultyData, isDeleted: false });
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const newFaculty = {
                _id: generateId(),
                ...facultyData,
                assignedCourses: facultyData.assignedCourses || [],
                isDeleted: false,
                createdAt: new Date().toISOString()
            };
            db.faculties.push(newFaculty);
            (0, db_1.writeJsonDb)(db);
            return newFaculty;
        }
    }
    static async updateFaculty(id, updateData) {
        if (db_1.isMongoConnected) {
            return await Faculty_1.default.findByIdAndUpdate(id, updateData, { new: true }).populate('assignedCourses').lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const index = db.faculties.findIndex((f) => f._id === id || f.id === id);
            if (index === -1)
                return null;
            db.faculties[index] = {
                ...db.faculties[index],
                ...updateData
            };
            (0, db_1.writeJsonDb)(db);
            return db.faculties[index];
        }
    }
    static async deleteFaculty(id) {
        if (db_1.isMongoConnected) {
            const res = await Faculty_1.default.findByIdAndUpdate(id, { isDeleted: true });
            return !!res;
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const index = db.faculties.findIndex((f) => f._id === id || f.id === id);
            if (index === -1)
                return false;
            db.faculties[index].isDeleted = true;
            (0, db_1.writeJsonDb)(db);
            return true;
        }
    }
    static async restoreFaculty(id) {
        if (db_1.isMongoConnected) {
            const res = await Faculty_1.default.findByIdAndUpdate(id, { isDeleted: false });
            return !!res;
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const index = db.faculties.findIndex((f) => f._id === id || f.id === id);
            if (index === -1)
                return false;
            db.faculties[index].isDeleted = false;
            (0, db_1.writeJsonDb)(db);
            return true;
        }
    }
    // ==================== COURSE OPERATIONS ====================
    static async findCourses(query = { isDeleted: false }) {
        const isDeleted = query.isDeleted !== undefined ? query.isDeleted : false;
        if (db_1.isMongoConnected) {
            return await Course_1.default.find({ isDeleted }).sort({ code: 1 }).lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const filtered = db.courses.filter((c) => (c.isDeleted || false) === isDeleted);
            return [...filtered].sort((a, b) => a.code.localeCompare(b.code));
        }
    }
    static async findCourseById(id) {
        if (db_1.isMongoConnected) {
            return await Course_1.default.findById(id).lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            return db.courses.find((c) => c._id === id || c.id === id) || null;
        }
    }
    static async findCourseByCode(code) {
        const cleanCode = code.toUpperCase().trim();
        if (db_1.isMongoConnected) {
            return await Course_1.default.findOne({ code: cleanCode }).lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            return db.courses.find((c) => c.code === cleanCode) || null;
        }
    }
    static async createCourse(courseData) {
        if (db_1.isMongoConnected) {
            return await Course_1.default.create({ ...courseData, isDeleted: false });
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const newCourse = {
                _id: generateId(),
                ...courseData,
                code: courseData.code.toUpperCase(),
                isDeleted: false,
                createdAt: new Date().toISOString()
            };
            db.courses.push(newCourse);
            (0, db_1.writeJsonDb)(db);
            return newCourse;
        }
    }
    static async updateCourse(id, updateData) {
        if (db_1.isMongoConnected) {
            return await Course_1.default.findByIdAndUpdate(id, updateData, { new: true }).lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const index = db.courses.findIndex((c) => c._id === id || c.id === id);
            if (index === -1)
                return null;
            db.courses[index] = {
                ...db.courses[index],
                ...updateData
            };
            (0, db_1.writeJsonDb)(db);
            return db.courses[index];
        }
    }
    static async deleteCourse(id) {
        if (db_1.isMongoConnected) {
            const res = await Course_1.default.findByIdAndUpdate(id, { isDeleted: true });
            return !!res;
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const index = db.courses.findIndex((c) => c._id === id || c.id === id);
            if (index === -1)
                return false;
            db.courses[index].isDeleted = true;
            (0, db_1.writeJsonDb)(db);
            return true;
        }
    }
    static async restoreCourse(id) {
        if (db_1.isMongoConnected) {
            const res = await Course_1.default.findByIdAndUpdate(id, { isDeleted: false });
            return !!res;
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const index = db.courses.findIndex((c) => c._id === id || c.id === id);
            if (index === -1)
                return false;
            db.courses[index].isDeleted = false;
            (0, db_1.writeJsonDb)(db);
            return true;
        }
    }
    // ==================== ATTENDANCE OPERATIONS ====================
    static async findAttendance(query) {
        if (db_1.isMongoConnected) {
            return await Attendance_1.default.find(query).populate('studentId').populate('courseId').lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            let filtered = [...db.attendance];
            if (query.studentId) {
                filtered = filtered.filter((a) => a.studentId === query.studentId);
            }
            if (query.courseId) {
                filtered = filtered.filter((a) => a.courseId === query.courseId);
            }
            if (query.date) {
                filtered = filtered.filter((a) => a.date === query.date);
            }
            return filtered.map((a) => {
                const student = db.students.find((s) => s._id === a.studentId || s.id === a.studentId);
                const course = db.courses.find((c) => c._id === a.courseId || c.id === a.courseId);
                return { ...a, studentId: student, courseId: course };
            });
        }
    }
    static async registerStudentFace(studentId, faceDescriptor) {
        const update = {
            faceDescriptor,
            isFaceRegistered: true,
            faceRegisteredAt: new Date().toISOString()
        };
        if (db_1.isMongoConnected) {
            return await Student_1.default.findByIdAndUpdate(studentId, update, { new: true }).lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const index = db.students.findIndex((s) => s._id === studentId || s.id === studentId);
            if (index === -1)
                return null;
            db.students[index] = {
                ...db.students[index],
                ...update,
                updatedAt: new Date().toISOString()
            };
            (0, db_1.writeJsonDb)(db);
            return db.students[index];
        }
    }
    static async removeStudentFace(studentId) {
        const update = {
            faceDescriptor: [],
            isFaceRegistered: false,
            faceRegisteredAt: null
        };
        if (db_1.isMongoConnected) {
            return await Student_1.default.findByIdAndUpdate(studentId, update, { new: true }).lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const index = db.students.findIndex((s) => s._id === studentId || s.id === studentId);
            if (index === -1)
                return null;
            db.students[index] = {
                ...db.students[index],
                ...update,
                updatedAt: new Date().toISOString()
            };
            (0, db_1.writeJsonDb)(db);
            return db.students[index];
        }
    }
    static async findRegisteredFaceEmbeddings(courseId) {
        if (db_1.isMongoConnected) {
            const query = { isFaceRegistered: true, isDeleted: false };
            if (courseId) {
                query.enrolledCourses = courseId;
            }
            return await Student_1.default.find(query)
                .select('_id name enrollmentNo department faceDescriptor isFaceRegistered faceRegisteredAt')
                .lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            let filtered = db.students.filter((s) => (s.isFaceRegistered || (s.faceDescriptor && s.faceDescriptor.length > 0)) && !s.isDeleted);
            if (courseId) {
                filtered = filtered.filter((s) => (s.enrolledCourses || []).includes(courseId));
            }
            return filtered.map((s) => ({
                _id: s._id || s.id,
                id: s._id || s.id,
                name: s.name,
                enrollmentNo: s.enrollmentNo,
                department: s.department,
                faceDescriptor: s.faceDescriptor,
                isFaceRegistered: !!s.isFaceRegistered,
                faceRegisteredAt: s.faceRegisteredAt
            }));
        }
    }
    static async markAttendance(attendanceData) {
        const dataToSave = {
            ...attendanceData,
            attendanceMethod: attendanceData.attendanceMethod || 'MANUAL'
        };
        if (db_1.isMongoConnected) {
            return await Attendance_1.default.findOneAndUpdate({ studentId: attendanceData.studentId, courseId: attendanceData.courseId, date: attendanceData.date }, dataToSave, { upsert: true, new: true });
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const index = db.attendance.findIndex((a) => a.studentId === attendanceData.studentId &&
                a.courseId === attendanceData.courseId &&
                a.date === attendanceData.date);
            if (index !== -1) {
                db.attendance[index] = {
                    ...db.attendance[index],
                    ...dataToSave
                };
                (0, db_1.writeJsonDb)(db);
                return db.attendance[index];
            }
            else {
                const newRecord = {
                    _id: generateId(),
                    ...dataToSave,
                    createdAt: new Date().toISOString()
                };
                db.attendance.push(newRecord);
                (0, db_1.writeJsonDb)(db);
                return newRecord;
            }
        }
    }
    // ==================== RESULT OPERATIONS ====================
    static async findResults(studentId) {
        if (db_1.isMongoConnected) {
            const query = studentId ? { studentId } : {};
            return await Result_1.default.find(query).populate('courseId').lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const filtered = studentId ? db.results.filter((r) => r.studentId === studentId) : db.results;
            return filtered.map((r) => {
                const course = db.courses.find((c) => c._id === r.courseId || c.id === r.courseId);
                return { ...r, courseId: course };
            });
        }
    }
    static async saveResult(resultData) {
        if (db_1.isMongoConnected) {
            return await Result_1.default.findOneAndUpdate({ studentId: resultData.studentId, courseId: resultData.courseId, semester: resultData.semester }, resultData, { upsert: true, new: true });
        }
        else {
            const db = (0, db_1.readJsonDb)();
            const index = db.results.findIndex((r) => r.studentId === resultData.studentId &&
                r.courseId === resultData.courseId &&
                r.semester === resultData.semester);
            if (index !== -1) {
                db.results[index] = {
                    ...db.results[index],
                    ...resultData,
                    updatedAt: new Date().toISOString()
                };
                (0, db_1.writeJsonDb)(db);
                return db.results[index];
            }
            else {
                const newResult = {
                    _id: generateId(),
                    ...resultData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                db.results.push(newResult);
                (0, db_1.writeJsonDb)(db);
                return newResult;
            }
        }
    }
    // ==================== LOG OPERATIONS ====================
    static async findLogs(limit = 100) {
        return Promise.resolve([]);
    }
    static async createLog(logData) {
        // Audit logs feature removed as requested by user.
        return Promise.resolve(null);
    }
    // ==================== CHAT HISTORY OPERATIONS ====================
    static async findChatHistory(userId, limit = 50) {
        if (db_1.isMongoConnected) {
            return await ChatHistory_1.ChatHistory.find({ userId }).sort({ createdAt: 1 }).limit(limit).lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            if (!db.chatHistory)
                db.chatHistory = [];
            const history = db.chatHistory.filter((c) => c.userId === userId);
            return history.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(-limit);
        }
    }
    static async createChatMessage(chatData) {
        if (db_1.isMongoConnected) {
            return await ChatHistory_1.ChatHistory.create(chatData);
        }
        else {
            const db = (0, db_1.readJsonDb)();
            if (!db.chatHistory)
                db.chatHistory = [];
            const newMessage = {
                _id: generateId(),
                ...chatData,
                createdAt: new Date().toISOString()
            };
            db.chatHistory.push(newMessage);
            (0, db_1.writeJsonDb)(db);
            return newMessage;
        }
    }
    static async clearChatHistory(userId) {
        if (db_1.isMongoConnected) {
            await ChatHistory_1.ChatHistory.deleteMany({ userId });
            return true;
        }
        else {
            const db = (0, db_1.readJsonDb)();
            if (!db.chatHistory)
                db.chatHistory = [];
            db.chatHistory = db.chatHistory.filter((c) => c.userId !== userId);
            (0, db_1.writeJsonDb)(db);
            return true;
        }
    }
    // ==================== QR ATTENDANCE SESSION OPERATIONS ====================
    static async createQrSession(sessionData) {
        if (db_1.isMongoConnected) {
            return await QrSession_1.default.create(sessionData);
        }
        else {
            const db = (0, db_1.readJsonDb)();
            if (!db.qrSessions)
                db.qrSessions = [];
            const newSession = {
                _id: generateId(),
                ...sessionData,
                scannedStudents: [],
                createdAt: new Date().toISOString()
            };
            db.qrSessions.push(newSession);
            (0, db_1.writeJsonDb)(db);
            return newSession;
        }
    }
    static async findQrSessionById(sessionId) {
        if (db_1.isMongoConnected) {
            return await QrSession_1.default.findOne({ sessionId }).populate('scannedStudents').lean();
        }
        else {
            const db = (0, db_1.readJsonDb)();
            if (!db.qrSessions)
                db.qrSessions = [];
            return db.qrSessions.find((s) => s.sessionId === sessionId) || null;
        }
    }
    static async addStudentToQrSession(sessionId, studentId) {
        if (db_1.isMongoConnected) {
            return await QrSession_1.default.findOneAndUpdate({ sessionId }, { $addToSet: { scannedStudents: studentId } }, { new: true });
        }
        else {
            const db = (0, db_1.readJsonDb)();
            if (!db.qrSessions)
                db.qrSessions = [];
            const session = db.qrSessions.find((s) => s.sessionId === sessionId);
            if (session) {
                if (!session.scannedStudents)
                    session.scannedStudents = [];
                if (!session.scannedStudents.includes(studentId)) {
                    session.scannedStudents.push(studentId);
                    (0, db_1.writeJsonDb)(db);
                }
            }
            return session;
        }
    }
}
exports.RepoService = RepoService;
