import mongoose from 'mongoose';
import User from '../models/User';
import Student from '../models/Student';
import Faculty from '../models/Faculty';
import Course from '../models/Course';
import Attendance from '../models/Attendance';
import Result from '../models/Result';
import { ChatHistory } from '../models/ChatHistory';
import QrSession from '../models/QrSession';
import { isMongoConnected, readJsonDb, writeJsonDb } from '../config/db';

const generateId = () => new mongoose.Types.ObjectId().toString();

export class RepoService {
  // ==================== USER OPERATIONS ====================
  
  static async findUsers(): Promise<any[]> {
    if (isMongoConnected) {
      return await User.find({}).lean();
    } else {
      const db = readJsonDb();
      return db.users;
    }
  }

  static async findUserById(id: string): Promise<any> {
    if (isMongoConnected) {
      return await User.findById(id).lean();
    } else {
      const db = readJsonDb();
      return db.users.find((u: any) => u._id === id || u.id === id) || null;
    }
  }

  static async findUserByEmail(email: string): Promise<any> {
    const cleanEmail = email.toLowerCase().trim();
    if (isMongoConnected) {
      return await User.findOne({ email: cleanEmail }).lean();
    } else {
      const db = readJsonDb();
      return db.users.find((u: any) => u.email === cleanEmail) || null;
    }
  }

  static async createUser(userData: any): Promise<any> {
    if (isMongoConnected) {
      return await User.create(userData);
    } else {
      const db = readJsonDb();
      const newUser = {
        _id: generateId(),
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.users.push(newUser);
      writeJsonDb(db);
      return newUser;
    }
  }

  static async updateUser(id: string, updateData: any): Promise<any> {
    if (isMongoConnected) {
      return await User.findByIdAndUpdate(id, updateData, { new: true }).lean();
    } else {
      const db = readJsonDb();
      const index = db.users.findIndex((u: any) => u._id === id || u.id === id);
      if (index === -1) return null;
      db.users[index] = {
        ...db.users[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      writeJsonDb(db);
      return db.users[index];
    }
  }

  // ==================== STUDENT OPERATIONS ====================

  static async findStudents(query: { search?: string; department?: string; courseId?: string; status?: string; isDeleted?: boolean }, page = 1, limit = 10): Promise<{ students: any[]; totalItems: number; totalPages: number }> {
    const isDeleted = query.isDeleted !== undefined ? query.isDeleted : false;

    if (isMongoConnected) {
      const dbQuery: any = { isDeleted };
      
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

      const totalItems = await Student.countDocuments(dbQuery);
      const totalPages = Math.ceil(totalItems / limit);
      const students = await Student.find(dbQuery)
        .populate('enrolledCourses')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      return { students, totalItems, totalPages };
    } else {
      const db = readJsonDb();
      let filtered = db.students.filter((s: any) => (s.isDeleted || false) === isDeleted);

      if (query.search) {
        const q = query.search.toLowerCase();
        filtered = filtered.filter((s: any) => 
          s.name.toLowerCase().includes(q) || 
          s.email.toLowerCase().includes(q) || 
          s.enrollmentNo.toLowerCase().includes(q)
        );
      }

      if (query.department) {
        filtered = filtered.filter((s: any) => s.department === query.department);
      }

      if (query.courseId) {
        filtered = filtered.filter((s: any) => s.enrolledCourses?.includes(query.courseId));
      }

      // Populate courses manually
      const populated = filtered.map((s: any) => {
        const courses = (s.enrolledCourses || []).map((cid: string) => 
          db.courses.find((c: any) => c._id === cid || c.id === cid)
        ).filter(Boolean);
        return { ...s, enrolledCourses: courses };
      });

      // Pagination
      const totalItems = populated.length;
      const totalPages = Math.ceil(totalItems / limit);
      const paginated = populated.slice((page - 1) * limit, page * limit);

      return { students: paginated, totalItems, totalPages };
    }
  }

  static async findStudentById(id: string): Promise<any> {
    if (isMongoConnected) {
      return await Student.findById(id).populate('enrolledCourses').lean();
    } else {
      const db = readJsonDb();
      const student = db.students.find((s: any) => s._id === id || s.id === id);
      if (!student) return null;
      
      const courses = (student.enrolledCourses || []).map((cid: string) => 
        db.courses.find((c: any) => c._id === cid || c.id === cid)
      ).filter(Boolean);
      
      return { ...student, enrolledCourses: courses };
    }
  }

  static async findStudentByUserId(userId: string): Promise<any> {
    if (isMongoConnected) {
      return await Student.findOne({ userId }).populate('enrolledCourses').lean();
    } else {
      const db = readJsonDb();
      const student = db.students.find((s: any) => s.userId === userId);
      if (!student) return null;

      const courses = (student.enrolledCourses || []).map((cid: string) => 
        db.courses.find((c: any) => c._id === cid || c.id === cid)
      ).filter(Boolean);

      return { ...student, enrolledCourses: courses };
    }
  }

  static async findStudentByEnrollmentNo(enrollmentNo: string): Promise<any> {
    if (isMongoConnected) {
      return await Student.findOne({ enrollmentNo: { $regex: new RegExp(`^${enrollmentNo}$`, 'i') } }).populate('enrolledCourses').lean();
    } else {
      const db = readJsonDb();
      const student = db.students.find((s: any) => s.enrollmentNo && s.enrollmentNo.toLowerCase() === enrollmentNo.toLowerCase());
      if (!student) return null;

      const courses = (student.enrolledCourses || []).map((cid: string) => 
        db.courses.find((c: any) => c._id === cid || c.id === cid)
      ).filter(Boolean);

      return { ...student, enrolledCourses: courses };
    }
  }

  static async createStudent(studentData: any): Promise<any> {
    if (isMongoConnected) {
      return await Student.create(studentData);
    } else {
      const db = readJsonDb();
      const newStudent = {
        _id: generateId(),
        ...studentData,
        enrolledCourses: studentData.enrolledCourses || [],
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.students.push(newStudent);
      writeJsonDb(db);
      return newStudent;
    }
  }

  static async updateStudent(id: string, updateData: any): Promise<any> {
    if (isMongoConnected) {
      return await Student.findByIdAndUpdate(id, updateData, { new: true }).populate('enrolledCourses').lean();
    } else {
      const db = readJsonDb();
      const index = db.students.findIndex((s: any) => s._id === id || s.id === id);
      if (index === -1) return null;
      db.students[index] = {
        ...db.students[index],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      writeJsonDb(db);
      return db.students[index];
    }
  }

  // ==================== FACULTY OPERATIONS ====================

  static async findFaculties(query: { isDeleted?: boolean } = { isDeleted: false }): Promise<any[]> {
    const isDeleted = query.isDeleted !== undefined ? query.isDeleted : false;
    if (isMongoConnected) {
      return await Faculty.find({ isDeleted }).populate('assignedCourses').lean();
    } else {
      const db = readJsonDb();
      const filtered = db.faculties.filter((f: any) => (f.isDeleted || false) === isDeleted);
      return filtered.map((f: any) => {
        const courses = (f.assignedCourses || []).map((cid: string) => 
          db.courses.find((c: any) => c._id === cid || c.id === cid)
        ).filter(Boolean);
        return { ...f, assignedCourses: courses };
      });
    }
  }

  static async findFacultyById(id: string): Promise<any> {
    if (isMongoConnected) {
      return await Faculty.findById(id).populate('assignedCourses').lean();
    } else {
      const db = readJsonDb();
      const faculty = db.faculties.find((f: any) => f._id === id || f.id === id);
      if (!faculty) return null;
      
      const courses = (faculty.assignedCourses || []).map((cid: string) => 
        db.courses.find((c: any) => c._id === cid || c.id === cid)
      ).filter(Boolean);
      
      return { ...faculty, assignedCourses: courses };
    }
  }

  static async findFacultyByUserId(userId: string): Promise<any> {
    if (isMongoConnected) {
      return await Faculty.findOne({ userId }).populate('assignedCourses').lean();
    } else {
      const db = readJsonDb();
      const faculty = db.faculties.find((f: any) => f.userId === userId);
      if (!faculty) return null;

      const courses = (faculty.assignedCourses || []).map((cid: string) => 
        db.courses.find((c: any) => c._id === cid || c.id === cid)
      ).filter(Boolean);

      return { ...faculty, assignedCourses: courses };
    }
  }

  static async createFaculty(facultyData: any): Promise<any> {
    if (isMongoConnected) {
      return await Faculty.create({ ...facultyData, isDeleted: false });
    } else {
      const db = readJsonDb();
      const newFaculty = {
        _id: generateId(),
        ...facultyData,
        assignedCourses: facultyData.assignedCourses || [],
        isDeleted: false,
        createdAt: new Date().toISOString()
      };
      db.faculties.push(newFaculty);
      writeJsonDb(db);
      return newFaculty;
    }
  }

  static async updateFaculty(id: string, updateData: any): Promise<any> {
    if (isMongoConnected) {
      return await Faculty.findByIdAndUpdate(id, updateData, { new: true }).populate('assignedCourses').lean();
    } else {
      const db = readJsonDb();
      const index = db.faculties.findIndex((f: any) => f._id === id || f.id === id);
      if (index === -1) return null;
      db.faculties[index] = {
        ...db.faculties[index],
        ...updateData
      };
      writeJsonDb(db);
      return db.faculties[index];
    }
  }

  static async deleteFaculty(id: string): Promise<boolean> {
    if (isMongoConnected) {
      const res = await Faculty.findByIdAndUpdate(id, { isDeleted: true });
      return !!res;
    } else {
      const db = readJsonDb();
      const index = db.faculties.findIndex((f: any) => f._id === id || f.id === id);
      if (index === -1) return false;
      db.faculties[index].isDeleted = true;
      writeJsonDb(db);
      return true;
    }
  }

  static async restoreFaculty(id: string): Promise<boolean> {
    if (isMongoConnected) {
      const res = await Faculty.findByIdAndUpdate(id, { isDeleted: false });
      return !!res;
    } else {
      const db = readJsonDb();
      const index = db.faculties.findIndex((f: any) => f._id === id || f.id === id);
      if (index === -1) return false;
      db.faculties[index].isDeleted = false;
      writeJsonDb(db);
      return true;
    }
  }

  // ==================== COURSE OPERATIONS ====================

  static async findCourses(query: { isDeleted?: boolean } = { isDeleted: false }): Promise<any[]> {
    const isDeleted = query.isDeleted !== undefined ? query.isDeleted : false;
    if (isMongoConnected) {
      return await Course.find({ isDeleted }).sort({ code: 1 }).lean();
    } else {
      const db = readJsonDb();
      const filtered = db.courses.filter((c: any) => (c.isDeleted || false) === isDeleted);
      return [...filtered].sort((a: any, b: any) => a.code.localeCompare(b.code));
    }
  }

  static async findCourseById(id: string): Promise<any> {
    if (isMongoConnected) {
      return await Course.findById(id).lean();
    } else {
      const db = readJsonDb();
      return db.courses.find((c: any) => c._id === id || c.id === id) || null;
    }
  }

  static async findCourseByCode(code: string): Promise<any> {
    const cleanCode = code.toUpperCase().trim();
    if (isMongoConnected) {
      return await Course.findOne({ code: cleanCode }).lean();
    } else {
      const db = readJsonDb();
      return db.courses.find((c: any) => c.code === cleanCode) || null;
    }
  }

  static async createCourse(courseData: any): Promise<any> {
    if (isMongoConnected) {
      return await Course.create({ ...courseData, isDeleted: false });
    } else {
      const db = readJsonDb();
      const newCourse = {
        _id: generateId(),
        ...courseData,
        code: courseData.code.toUpperCase(),
        isDeleted: false,
        createdAt: new Date().toISOString()
      };
      db.courses.push(newCourse);
      writeJsonDb(db);
      return newCourse;
    }
  }

  static async updateCourse(id: string, updateData: any): Promise<any> {
    if (isMongoConnected) {
      return await Course.findByIdAndUpdate(id, updateData, { new: true }).lean();
    } else {
      const db = readJsonDb();
      const index = db.courses.findIndex((c: any) => c._id === id || c.id === id);
      if (index === -1) return null;
      db.courses[index] = {
        ...db.courses[index],
        ...updateData
      };
      writeJsonDb(db);
      return db.courses[index];
    }
  }

  static async deleteCourse(id: string): Promise<boolean> {
    if (isMongoConnected) {
      const res = await Course.findByIdAndUpdate(id, { isDeleted: true });
      return !!res;
    } else {
      const db = readJsonDb();
      const index = db.courses.findIndex((c: any) => c._id === id || c.id === id);
      if (index === -1) return false;
      db.courses[index].isDeleted = true;
      writeJsonDb(db);
      return true;
    }
  }

  static async restoreCourse(id: string): Promise<boolean> {
    if (isMongoConnected) {
      const res = await Course.findByIdAndUpdate(id, { isDeleted: false });
      return !!res;
    } else {
      const db = readJsonDb();
      const index = db.courses.findIndex((c: any) => c._id === id || c.id === id);
      if (index === -1) return false;
      db.courses[index].isDeleted = false;
      writeJsonDb(db);
      return true;
    }
  }

  // ==================== ATTENDANCE OPERATIONS ====================

  static async findAttendance(query: { studentId?: string; courseId?: string; date?: string }): Promise<any[]> {
    if (isMongoConnected) {
      return await Attendance.find(query).populate('studentId').populate('courseId').lean();
    } else {
      const db = readJsonDb();
      let filtered = [...db.attendance];

      if (query.studentId) {
        filtered = filtered.filter((a: any) => a.studentId === query.studentId);
      }
      if (query.courseId) {
        filtered = filtered.filter((a: any) => a.courseId === query.courseId);
      }
      if (query.date) {
        filtered = filtered.filter((a: any) => a.date === query.date);
      }

      return filtered.map((a: any) => {
        const student = db.students.find((s: any) => s._id === a.studentId || s.id === a.studentId);
        const course = db.courses.find((c: any) => c._id === a.courseId || c.id === a.courseId);
        return { ...a, studentId: student, courseId: course };
      });
    }
  }

  static async registerStudentFace(studentId: string, faceDescriptor: number[]): Promise<any> {
    const update = {
      faceDescriptor,
      isFaceRegistered: true,
      faceRegisteredAt: new Date().toISOString()
    };
    if (isMongoConnected) {
      return await Student.findByIdAndUpdate(studentId, update, { new: true }).lean();
    } else {
      const db = readJsonDb();
      const index = db.students.findIndex((s: any) => s._id === studentId || s.id === studentId);
      if (index === -1) return null;
      db.students[index] = {
        ...db.students[index],
        ...update,
        updatedAt: new Date().toISOString()
      };
      writeJsonDb(db);
      return db.students[index];
    }
  }

  static async removeStudentFace(studentId: string): Promise<any> {
    const update = {
      faceDescriptor: [],
      isFaceRegistered: false,
      faceRegisteredAt: null
    };
    if (isMongoConnected) {
      return await Student.findByIdAndUpdate(studentId, update, { new: true }).lean();
    } else {
      const db = readJsonDb();
      const index = db.students.findIndex((s: any) => s._id === studentId || s.id === studentId);
      if (index === -1) return null;
      db.students[index] = {
        ...db.students[index],
        ...update,
        updatedAt: new Date().toISOString()
      };
      writeJsonDb(db);
      return db.students[index];
    }
  }

  static async findRegisteredFaceEmbeddings(courseId?: string): Promise<any[]> {
    if (isMongoConnected) {
      const query: any = { isFaceRegistered: true, isDeleted: false };
      if (courseId) {
        query.enrolledCourses = courseId;
      }
      return await Student.find(query)
        .select('_id name enrollmentNo department faceDescriptor isFaceRegistered faceRegisteredAt')
        .lean();
    } else {
      const db = readJsonDb();
      let filtered = db.students.filter((s: any) => (s.isFaceRegistered || (s.faceDescriptor && s.faceDescriptor.length > 0)) && !s.isDeleted);
      if (courseId) {
        filtered = filtered.filter((s: any) => (s.enrolledCourses || []).includes(courseId));
      }
      return filtered.map((s: any) => ({
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

  static async markAttendance(attendanceData: {
    studentId: string;
    courseId: string;
    date: string;
    status: string;
    markedBy?: string;
    attendanceMethod?: 'MANUAL' | 'QR' | 'FACE';
    recognitionConfidence?: number;
    lectureTitle?: string;
  }): Promise<any> {
    const dataToSave = {
      ...attendanceData,
      attendanceMethod: attendanceData.attendanceMethod || 'MANUAL'
    };
    if (isMongoConnected) {
      return await Attendance.findOneAndUpdate(
        { studentId: attendanceData.studentId, courseId: attendanceData.courseId, date: attendanceData.date },
        dataToSave,
        { upsert: true, new: true }
      );
    } else {
      const db = readJsonDb();
      const index = db.attendance.findIndex((a: any) => 
        a.studentId === attendanceData.studentId && 
        a.courseId === attendanceData.courseId && 
        a.date === attendanceData.date
      );

      if (index !== -1) {
        db.attendance[index] = {
          ...db.attendance[index],
          ...dataToSave
        };
        writeJsonDb(db);
        return db.attendance[index];
      } else {
        const newRecord = {
          _id: generateId(),
          ...dataToSave,
          createdAt: new Date().toISOString()
        };
        db.attendance.push(newRecord);
        writeJsonDb(db);
        return newRecord;
      }
    }
  }

  // ==================== RESULT OPERATIONS ====================

  static async findResults(studentId?: string): Promise<any[]> {
    if (isMongoConnected) {
      const query = studentId ? { studentId } : {};
      return await Result.find(query).populate('courseId').lean();
    } else {
      const db = readJsonDb();
      const filtered = studentId ? db.results.filter((r: any) => r.studentId === studentId) : db.results;
      return filtered.map((r: any) => {
        const course = db.courses.find((c: any) => c._id === r.courseId || c.id === r.courseId);
        return { ...r, courseId: course };
      });
    }
  }

  static async saveResult(resultData: any): Promise<any> {
    if (isMongoConnected) {
      return await Result.findOneAndUpdate(
        { studentId: resultData.studentId, courseId: resultData.courseId, semester: resultData.semester },
        resultData,
        { upsert: true, new: true }
      );
    } else {
      const db = readJsonDb();
      const index = db.results.findIndex((r: any) => 
        r.studentId === resultData.studentId && 
        r.courseId === resultData.courseId && 
        r.semester === resultData.semester
      );

      if (index !== -1) {
        db.results[index] = {
          ...db.results[index],
          ...resultData,
          updatedAt: new Date().toISOString()
        };
        writeJsonDb(db);
        return db.results[index];
      } else {
        const newResult = {
          _id: generateId(),
          ...resultData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        db.results.push(newResult);
        writeJsonDb(db);
        return newResult;
      }
    }
  }

  // ==================== LOG OPERATIONS ====================

  static async findLogs(limit = 100): Promise<any[]> {
    return Promise.resolve([]);
  }

  static async createLog(logData: { userId?: string; userName: string; role: string; action: string; details: string }): Promise<any> {
    // Audit logs feature removed as requested by user.
    return Promise.resolve(null);
  }

  // ==================== CHAT HISTORY OPERATIONS ====================

  static async findChatHistory(userId: string, limit = 50): Promise<any[]> {
    if (isMongoConnected) {
      return await ChatHistory.find({ userId }).sort({ createdAt: 1 }).limit(limit).lean();
    } else {
      const db = readJsonDb();
      if (!db.chatHistory) db.chatHistory = [];
      const history = db.chatHistory.filter((c: any) => c.userId === userId);
      return history.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(-limit);
    }
  }

  static async createChatMessage(chatData: { userId: string; role: 'user' | 'model'; content: string }): Promise<any> {
    if (isMongoConnected) {
      return await ChatHistory.create(chatData);
    } else {
      const db = readJsonDb();
      if (!db.chatHistory) db.chatHistory = [];
      const newMessage = {
        _id: generateId(),
        ...chatData,
        createdAt: new Date().toISOString()
      };
      db.chatHistory.push(newMessage);
      writeJsonDb(db);
      return newMessage;
    }
  }

  static async clearChatHistory(userId: string): Promise<boolean> {
    if (isMongoConnected) {
      await ChatHistory.deleteMany({ userId });
      return true;
    } else {
      const db = readJsonDb();
      if (!db.chatHistory) db.chatHistory = [];
      db.chatHistory = db.chatHistory.filter((c: any) => c.userId !== userId);
      writeJsonDb(db);
      return true;
    }
  }

  // ==================== QR ATTENDANCE SESSION OPERATIONS ====================

  static async createQrSession(sessionData: any): Promise<any> {
    if (isMongoConnected) {
      return await QrSession.create(sessionData);
    } else {
      const db = readJsonDb();
      if (!db.qrSessions) db.qrSessions = [];
      const newSession = {
        _id: generateId(),
        ...sessionData,
        scannedStudents: [],
        createdAt: new Date().toISOString()
      };
      db.qrSessions.push(newSession);
      writeJsonDb(db);
      return newSession;
    }
  }

  static async findQrSessionById(sessionId: string): Promise<any> {
    if (isMongoConnected) {
      return await QrSession.findOne({ sessionId }).populate('scannedStudents').lean();
    } else {
      const db = readJsonDb();
      if (!db.qrSessions) db.qrSessions = [];
      return db.qrSessions.find((s: any) => s.sessionId === sessionId) || null;
    }
  }

  static async addStudentToQrSession(sessionId: string, studentId: string): Promise<any> {
    if (isMongoConnected) {
      return await QrSession.findOneAndUpdate(
        { sessionId },
        { $addToSet: { scannedStudents: studentId } },
        { new: true }
      );
    } else {
      const db = readJsonDb();
      if (!db.qrSessions) db.qrSessions = [];
      const session = db.qrSessions.find((s: any) => s.sessionId === sessionId);
      if (session) {
        if (!session.scannedStudents) session.scannedStudents = [];
        if (!session.scannedStudents.includes(studentId)) {
          session.scannedStudents.push(studentId);
          writeJsonDb(db);
        }
      }
      return session;
    }
  }
}
