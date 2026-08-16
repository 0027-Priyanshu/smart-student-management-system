import mongoose from 'mongoose';
import User from '../models/User';
import Student from '../models/Student';
import Faculty from '../models/Faculty';
import Course from '../models/Course';
import Attendance from '../models/Attendance';
import Result from '../models/Result';
import { ChatHistory } from '../models/ChatHistory';
import QrSession from '../models/QrSession';
import FaceAttendanceSession from '../models/FaceAttendanceSession';
import Notification from '../models/Notification';
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

  static async findStudents(query: { search?: string; department?: string; courseId?: string; courseIds?: string[]; status?: string; isDeleted?: boolean }, page = 1, limit = 10): Promise<{ students: any[]; totalItems: number; totalPages: number }> {
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

      if (query.courseIds && query.courseIds.length > 0) {
        dbQuery.enrolledCourses = { $in: query.courseIds };
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

      if (query.courseIds && query.courseIds.length > 0) {
        filtered = filtered.filter((s: any) => 
          s.enrolledCourses?.some((cId: string) => query.courseIds?.includes(cId))
        );
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

  static async countFaculties(query: { isDeleted?: boolean } = { isDeleted: false }): Promise<number> {
    const isDeleted = query.isDeleted !== undefined ? query.isDeleted : false;
    if (isMongoConnected) {
      return await Faculty.countDocuments({ isDeleted });
    } else {
      const db = readJsonDb();
      return db.faculties.filter((f: any) => (f.isDeleted || false) === isDeleted).length;
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

  static async assignCourseToFaculty(facultyId: string, courseId: string): Promise<void> {
    if (isMongoConnected) {
      // 1. Find course
      const course = await Course.findById(courseId);
      if (!course) throw new Error('Course not found');

      // 2. Remove from previous faculty if assigned
      if (course.facultyId && course.facultyId.toString() !== facultyId) {
        await Faculty.findByIdAndUpdate(course.facultyId, {
          $pull: { assignedCourses: courseId }
        });
      }

      // 3. Add to new faculty
      await Faculty.findByIdAndUpdate(facultyId, {
        $addToSet: { assignedCourses: courseId }
      });

      // 4. Set course facultyId
      await Course.findByIdAndUpdate(courseId, { facultyId });
    } else {
      const db = readJsonDb();
      const courseIndex = db.courses.findIndex((c: any) => (c._id || c.id) === courseId);
      const newFacultyIndex = db.faculties.findIndex((f: any) => (f._id || f.id) === facultyId);

      if (courseIndex === -1) throw new Error('Course not found');
      if (newFacultyIndex === -1) throw new Error('Faculty not found');

      const course = db.courses[courseIndex];

      // Remove from previous faculty
      if (course.facultyId && course.facultyId !== facultyId) {
        const prevFacIndex = db.faculties.findIndex((f: any) => (f._id || f.id) === course.facultyId);
        if (prevFacIndex !== -1) {
          db.faculties[prevFacIndex].assignedCourses = (db.faculties[prevFacIndex].assignedCourses || []).filter((id: string) => id !== courseId);
        }
      }

      // Add to new faculty
      const assigned = db.faculties[newFacultyIndex].assignedCourses || [];
      if (!assigned.includes(courseId)) {
        assigned.push(courseId);
      }
      db.faculties[newFacultyIndex].assignedCourses = assigned;

      // Update course
      db.courses[courseIndex].facultyId = facultyId;

      writeJsonDb(db);
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

  static async findCourses(query: { isDeleted?: boolean; facultyId?: string } = { isDeleted: false }): Promise<any[]> {
    const isDeleted = query.isDeleted !== undefined ? query.isDeleted : false;
    const mongoQuery: any = { isDeleted };
    if (query.facultyId) {
      mongoQuery.facultyId = query.facultyId;
    }
    
    if (isMongoConnected) {
      return await Course.find(mongoQuery).sort({ code: 1 }).lean();
    } else {
      const db = readJsonDb();
      let filtered = db.courses.filter((c: any) => (c.isDeleted || false) === isDeleted);
      if (query.facultyId) {
        filtered = filtered.filter((c: any) => c.facultyId === query.facultyId);
      }
      return [...filtered].sort((a: any, b: any) => a.code.localeCompare(b.code));
    }
  }

  static async countCourses(query: { isDeleted?: boolean; facultyId?: string } = { isDeleted: false }): Promise<number> {
    const isDeleted = query.isDeleted !== undefined ? query.isDeleted : false;
    const mongoQuery: any = { isDeleted };
    if (query.facultyId) {
      mongoQuery.facultyId = query.facultyId;
    }
    
    if (isMongoConnected) {
      return await Course.countDocuments(mongoQuery);
    } else {
      const db = readJsonDb();
      let filtered = db.courses.filter((c: any) => (c.isDeleted || false) === isDeleted);
      if (query.facultyId) {
        filtered = filtered.filter((c: any) => c.facultyId === query.facultyId);
      }
      return filtered.length;
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
    sessionId?: string;
  }): Promise<any> {
    const dataToSave = {
      ...attendanceData,
      attendanceMethod: attendanceData.attendanceMethod || 'MANUAL'
    };
    if (isMongoConnected) {
      const query = attendanceData.sessionId
        ? { studentId: attendanceData.studentId, sessionId: attendanceData.sessionId }
        : { studentId: attendanceData.studentId, courseId: attendanceData.courseId, date: attendanceData.date, lectureTitle: attendanceData.lectureTitle || '' };

      return await Attendance.findOneAndUpdate(
        query,
        dataToSave,
        { upsert: true, new: true }
      );
    } else {
      const db = readJsonDb();
      const index = db.attendance.findIndex((a: any) => {
        if (attendanceData.sessionId && a.sessionId) {
          return a.studentId === attendanceData.studentId && a.sessionId === attendanceData.sessionId;
        }
        return a.studentId === attendanceData.studentId && 
               a.courseId === attendanceData.courseId && 
               a.date === attendanceData.date &&
               (a.lectureTitle || '') === (attendanceData.lectureTitle || '');
      });

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
      const history = await ChatHistory.find({ userId }).sort({ createdAt: 1 }).limit(limit).lean();
      return history.map((msg: any) => {
        if (msg.role === 'model' || msg.role === 'bot' || msg.role === 'ai') {
          msg.role = 'assistant';
        }
        return msg;
      });
    } else {
      const db = readJsonDb();
      if (!db.chatHistory) db.chatHistory = [];
      let history = db.chatHistory.filter((c: any) => c.userId === userId);
      history = history.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(-limit);
      return history.map((msg: any) => {
        if (msg.role === 'model' || msg.role === 'bot' || msg.role === 'ai') {
          msg.role = 'assistant';
        }
        return msg;
      });
    }
  }

  static async createChatMessage(chatData: { userId: string; role: 'user' | 'assistant'; content: string }): Promise<any> {
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

  // ==================== TIMED FACE ATTENDANCE SESSIONS & NOTIFICATIONS ====================

  static async createFaceSession(sessionData: {
    courseId: string;
    courseName: string;
    lectureTitle: string;
    facultyId: string;
    facultyName: string;
    durationMinutes: number;
  }): Promise<any> {
    const sessionId = 'FACE_' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const now = new Date();
    const duration = sessionData.durationMinutes || 10;
    const expiresAt = new Date(now.getTime() + duration * 60 * 1000);

    if (isMongoConnected) {
      // Close any previous active session for this course
      await FaceAttendanceSession.updateMany(
        { courseId: sessionData.courseId, status: 'ACTIVE' },
        { status: 'CLOSED' }
      );

      const newSession = await FaceAttendanceSession.create({
        sessionId,
        courseId: sessionData.courseId,
        courseName: sessionData.courseName,
        lectureTitle: sessionData.lectureTitle,
        facultyId: sessionData.facultyId,
        facultyName: sessionData.facultyName,
        durationMinutes: duration,
        startTime: now,
        expiresAt,
        status: 'ACTIVE',
        verifiedStudents: []
      });

      // P0-4: Find only actively enrolled students in this course
      const enrolledStudents = await Student.find({
        isDeleted: false,
        enrolledCourses: sessionData.courseId
      }).lean();

      if (enrolledStudents.length > 0) {
        const notifDocs = enrolledStudents.map(student => ({
          studentId: student._id,
          sessionId,
          courseId: sessionData.courseId,
          courseName: sessionData.courseName,
          lectureTitle: sessionData.lectureTitle,
          title: 'Attendance Session Open',
          message: `${sessionData.courseName} attendance is now open for "${sessionData.lectureTitle}". Please verify your face to mark Present.`,
          type: 'FACE_ATTENDANCE',
          durationMinutes: duration,
          expiresAt,
          isRead: false,
          createdAt: now
        }));
        await Notification.insertMany(notifDocs);
      }

      return { session: newSession, notificationsCount: enrolledStudents.length };
    } else {
      const newSession = {
        _id: generateId(),
        sessionId,
        courseId: sessionData.courseId,
        courseName: sessionData.courseName,
        lectureTitle: sessionData.lectureTitle,
        facultyId: sessionData.facultyId,
        facultyName: sessionData.facultyName,
        durationMinutes: duration,
        startTime: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        status: 'ACTIVE',
        verifiedStudents: [],
        createdAt: now.toISOString()
      };

      const db = readJsonDb();
      if (!db.faceSessions) db.faceSessions = [];
      
      // Close previous active sessions for course
      db.faceSessions.forEach((s: any) => {
        if (s.courseId === sessionData.courseId && s.status === 'ACTIVE') {
          s.status = 'CLOSED';
        }
      });

      db.faceSessions.push(newSession);

      // P0-4: Strict enrollment filter
      const enrolledStudents = db.students.filter((s: any) => {
        if (s.isDeleted) return false;
        const courses = (s.enrolledCourses || []).map((c: any) => (c._id || c.id || c).toString());
        return courses.includes(sessionData.courseId.toString());
      });

      if (!db.notifications) db.notifications = [];
      const createdNotifications: any[] = [];

      enrolledStudents.forEach((student: any) => {
        const studentId = student._id || student.id;
        const notif = {
          _id: generateId(),
          studentId,
          sessionId,
          courseId: sessionData.courseId,
          courseName: sessionData.courseName,
          lectureTitle: sessionData.lectureTitle,
          title: 'Attendance Session Open',
          message: `${sessionData.courseName} attendance is now open for "${sessionData.lectureTitle}". Please verify your face to mark Present.`,
          type: 'FACE_ATTENDANCE',
          durationMinutes: duration,
          expiresAt: expiresAt.toISOString(),
          isRead: false,
          createdAt: now.toISOString()
        };
        db.notifications.push(notif);
        createdNotifications.push(notif);
      });

      writeJsonDb(db);
      return { session: newSession, notificationsCount: createdNotifications.length };
    }
  }

  static async findFaceSessionById(sessionId: string): Promise<any> {
    if (isMongoConnected) {
      const session = await FaceAttendanceSession.findOne({ sessionId }).lean();
      if (!session) return null;

      if (new Date(session.expiresAt).getTime() < Date.now() && session.status === 'ACTIVE') {
        await FaceAttendanceSession.updateOne({ sessionId }, { status: 'CLOSED' });
        session.status = 'CLOSED';
      }
      return session;
    } else {
      const db = readJsonDb();
      if (!db.faceSessions) db.faceSessions = [];
      const session = db.faceSessions.find((s: any) => s.sessionId === sessionId);
      if (!session) return null;

      const isExpired = new Date(session.expiresAt).getTime() < Date.now();
      if (isExpired && session.status === 'ACTIVE') {
        session.status = 'CLOSED';
        writeJsonDb(db);
      }
      return session;
    }
  }

  static async getActiveFaceSessionForCourse(courseId: string): Promise<any> {
    if (isMongoConnected) {
      const session = await FaceAttendanceSession.findOne({
        courseId,
        status: 'ACTIVE',
        expiresAt: { $gt: new Date() }
      }).lean();
      return session || null;
    } else {
      const db = readJsonDb();
      if (!db.faceSessions) db.faceSessions = [];
      const session = db.faceSessions.find((s: any) => s.courseId === courseId && s.status === 'ACTIVE');
      if (!session) return null;

      if (new Date(session.expiresAt).getTime() < Date.now()) {
        session.status = 'CLOSED';
        writeJsonDb(db);
        return null;
      }
      return session;
    }
  }

  static async getActiveFaceSessionForStudent(userIdOrStudentId: string): Promise<any> {
    const student = await RepoService.findStudentByUserId(userIdOrStudentId) || await RepoService.findStudentById(userIdOrStudentId);
    if (!student) return null;

    const studentCourses: string[] = (student.enrolledCourses || []).map((c: any) => (c._id || c.id || c).toString());
    if (studentCourses.length === 0) {
      // P0-4: Student with zero courses is NOT eligible for arbitrary sessions
      return null;
    }

    if (isMongoConnected) {
      const session = await FaceAttendanceSession.findOne({
        courseId: { $in: studentCourses },
        status: 'ACTIVE',
        expiresAt: { $gt: new Date() }
      }).lean();
      return session || null;
    } else {
      const db = readJsonDb();
      if (!db.faceSessions) return null;
      const now = Date.now();

      const session = db.faceSessions.find((s: any) => {
        if (s.status !== 'ACTIVE') return false;
        if (new Date(s.expiresAt).getTime() < now) {
          s.status = 'CLOSED';
          return false;
        }
        return studentCourses.includes(s.courseId.toString());
      });

      writeJsonDb(db);
      return session || null;
    }
  }

  static async endFaceSession(sessionId: string): Promise<any> {
    if (isMongoConnected) {
      const session = await FaceAttendanceSession.findOneAndUpdate(
        { sessionId },
        { status: 'CLOSED' },
        { new: true }
      );
      if (!session) return null;

      const today = new Date(session.startTime).toISOString().split('T')[0];
      const enrolledStudents = await Student.find({
        isDeleted: false,
        enrolledCourses: session.courseId
      }).lean();

      const verifiedIds = (session.verifiedStudents || []).map((v: any) => v.studentId.toString());

      for (const st of enrolledStudents as any[]) {
        const stIdStr = (st._id || st.id).toString();
        if (!verifiedIds.includes(stIdStr)) {
          await RepoService.markAttendance({
            studentId: stIdStr,
            courseId: session.courseId.toString(),
            date: today,
            status: 'Absent',
            attendanceMethod: 'FACE',
            lectureTitle: session.lectureTitle,
            sessionId: session.sessionId,
            markedBy: session.facultyName || 'Faculty'
          });
        }
      }

      return session.toObject();
    } else {
      const db = readJsonDb();
      if (!db.faceSessions) return null;
      const session = db.faceSessions.find((s: any) => s.sessionId === sessionId);
      if (!session) return null;

      session.status = 'CLOSED';

      const today = session.startTime.split('T')[0];
      const enrolledStudents = db.students.filter((s: any) => {
        if (s.isDeleted) return false;
        const courses = (s.enrolledCourses || []).map((c: any) => (c._id || c.id || c).toString());
        return courses.includes(session.courseId.toString());
      });

      const verifiedIds = (session.verifiedStudents || []).map((v: any) => (v.studentId || '').toString());

      if (!db.attendance) db.attendance = [];

      enrolledStudents.forEach((st: any) => {
        const stId = (st._id || st.id).toString();
        if (!verifiedIds.includes(stId)) {
          const existing = db.attendance.find((a: any) => a.studentId === stId && a.sessionId === session.sessionId);
          if (!existing) {
            db.attendance.push({
              _id: generateId(),
              studentId: stId,
              courseId: session.courseId,
              date: today,
              sessionId: session.sessionId,
              status: 'Absent',
              attendanceMethod: 'FACE',
              lectureTitle: session.lectureTitle,
              markedBy: session.facultyName || 'Faculty',
              createdAt: new Date().toISOString()
            });
          }
        }
      });

      writeJsonDb(db);
      return session;
    }
  }

  static async verifyStudentFace1to1(params: {
    studentUserIdOrId: string;
    capturedDescriptor: number[];
    sessionId?: string;
  }): Promise<{
    success: boolean;
    status: number;
    error?: string;
    student?: any;
    confidence?: number;
    attendance?: any;
    session?: any;
  }> {
    const student = await RepoService.findStudentByUserId(params.studentUserIdOrId) || 
                    await RepoService.findStudentById(params.studentUserIdOrId);

    if (!student) {
      return { success: false, status: 404, error: 'Student record not found.' };
    }

    const actualStudentId = (student._id || student.id).toString();

    // Failure Case 1: Face Not Registered
    if (!student.isFaceRegistered || !student.faceDescriptor || student.faceDescriptor.length === 0) {
      return { 
        success: false, 
        status: 400, 
        error: 'Your face is not registered. Please contact the administrator to enroll your biometric descriptor.' 
      };
    }

    // P0-4: Check Student Course Enrollment Eligibility
    const studentCourses: string[] = (student.enrolledCourses || []).map((c: any) => (c._id || c.id || c).toString());
    if (studentCourses.length === 0) {
      return { success: false, status: 403, error: 'You are not enrolled in any academic courses.' };
    }

    // Determine Active Session
    let session: any = null;
    if (params.sessionId && params.sessionId !== 'self-directed') {
      session = await RepoService.findFaceSessionById(params.sessionId);
    } else {
      session = await RepoService.getActiveFaceSessionForStudent(actualStudentId);
    }

    // Failure Case: Session Expired / Not Found
    if (!session || session.status !== 'ACTIVE' || new Date(session.expiresAt).getTime() < Date.now()) {
      return { success: false, status: 400, error: 'This attendance session has ended or is invalid.' };
    }

    // P0-4: Strictly check enrollment in this session's course
    const sessionCourseStr = (session.courseId?._id || session.courseId?.id || session.courseId).toString();
    if (!studentCourses.includes(sessionCourseStr)) {
      return { success: false, status: 403, error: 'You are not enrolled in this course.' };
    }

    // Check duplicate check-in
    const alreadyVerifiedInSession = (session.verifiedStudents || []).some((v: any) => (v.studentId?.toString() === actualStudentId));
    if (alreadyVerifiedInSession) {
      return { success: false, status: 409, error: 'Attendance already recorded for this session! Duplicate entries are not allowed.' };
    }

    // Perform 1-to-1 Biometric Matching
    let sumSq = 0;
    const registered = student.faceDescriptor;
    const captured = params.capturedDescriptor;

    if (!Array.isArray(captured) || registered.length !== captured.length) {
      return { success: false, status: 400, error: 'Biometric descriptor format mismatch.' };
    }

    for (let i = 0; i < registered.length; i++) {
      const diff = registered[i] - captured[i];
      sumSq += diff * diff;
    }
    const distance = Math.sqrt(sumSq);

    // Failure Case: Face Does Not Match (Threshold 0.50)
    if (distance >= 0.50) {
      return { 
        success: false, 
        status: 400, 
        error: 'Face verification failed. Captured face does not match your registered biometric profile.' 
      };
    }

    const confidence = Math.round((1 - distance) * 100);
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Mark Attendance (P0-6: Session-based identity)
    const attendanceRecord = await RepoService.markAttendance({
      studentId: actualStudentId,
      courseId: sessionCourseStr,
      date: today,
      sessionId: session.sessionId,
      status: 'Present',
      attendanceMethod: 'FACE',
      recognitionConfidence: confidence,
      lectureTitle: session.lectureTitle,
      markedBy: session.facultyName || 'Faculty'
    });

    // Record in Session Verified List
    const verifiedEntry = {
      studentId: actualStudentId,
      studentName: student.name,
      enrollmentNo: student.enrollmentNo,
      timestamp: now,
      confidence
    };

    if (isMongoConnected) {
      await FaceAttendanceSession.updateOne(
        { sessionId: session.sessionId },
        { $addToSet: { verifiedStudents: verifiedEntry } }
      );
    } else {
      const db = readJsonDb();
      const s = db.faceSessions?.find((fs: any) => fs.sessionId === session.sessionId);
      if (s) {
        if (!s.verifiedStudents) s.verifiedStudents = [];
        s.verifiedStudents.push(verifiedEntry);
        writeJsonDb(db);
      }
    }

    return {
      success: true,
      status: 200,
      student,
      confidence,
      attendance: attendanceRecord,
      session
    };
  }

  static async getUserNotifications(userIdOrStudentId: string): Promise<any[]> {
    const student = await RepoService.findStudentByUserId(userIdOrStudentId) || await RepoService.findStudentById(userIdOrStudentId);
    const actualId = student ? (student._id || student.id) : userIdOrStudentId;

    if (isMongoConnected) {
      return await Notification.find({
        studentId: actualId,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 }).lean();
    } else {
      const db = readJsonDb();
      if (!db.notifications) return [];
      const now = Date.now();

      return db.notifications.filter((n: any) => 
        (n.studentId?.toString() === actualId?.toString() || n.studentId?.toString() === userIdOrStudentId?.toString()) &&
        new Date(n.expiresAt).getTime() > now
      ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  static async markNotificationRead(notificationId: string): Promise<boolean> {
    if (isMongoConnected) {
      const res = await Notification.findByIdAndUpdate(notificationId, { isRead: true });
      return !!res;
    } else {
      const db = readJsonDb();
      if (!db.notifications) return false;
      const notif = db.notifications.find((n: any) => n._id === notificationId || n.id === notificationId);
      if (notif) {
        notif.isRead = true;
        writeJsonDb(db);
        return true;
      }
      return false;
    }
  }
}


