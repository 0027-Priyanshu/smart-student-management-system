import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import bcrypt from 'bcryptjs';

dotenv.config();

export let isMongoConnected = false;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-student-management';

import User from '../models/User';
import Student from '../models/Student';
import Faculty from '../models/Faculty';
import Course from '../models/Course';
import Attendance from '../models/Attendance';
import Result from '../models/Result';
import Log from '../models/Log';

export async function connectDB() {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000 // Timeout fast so we can fallback to JSON database quickly
    });
    isMongoConnected = true;
    console.log('🚀 MongoDB connected successfully!');

    // Seed MongoDB if admin@sms.com is missing
    const adminExists = await User.findOne({ email: 'admin@sms.com' });
    if (!adminExists) {
      console.log('🌱 Seeding MongoDB database with admin@sms.com...');
      
      // Clean up previous seed entries to prevent duplicate key constraints
      await User.deleteMany({ email: { $in: ['admin@sms.com', 'faculty@sms.com', 'student@sms.com'] } });
      await Student.deleteMany({ email: 'student@sms.com' });
      await Faculty.deleteMany({ email: 'faculty@sms.com' });
      await Course.deleteMany({ code: { $in: ['CS101', 'CS202', 'CS303'] } });

      const salt = bcrypt.genSaltSync(10);
      const adminHash = bcrypt.hashSync('admin123', salt);
      const facultyHash = bcrypt.hashSync('faculty123', salt);
      const studentHash = bcrypt.hashSync('student123', salt);

      const users = await User.insertMany([
        {
          name: "System Admin",
          email: "admin@sms.com",
          password: adminHash,
          role: "Admin"
        },
        {
          name: "Dr. Robert Carter",
          email: "faculty@sms.com",
          password: facultyHash,
          role: "Faculty"
        },
        {
          name: "John Doe",
          email: "student@sms.com",
          password: studentHash,
          role: "Student"
        }
      ]);

      const courses = await Course.insertMany([
        {
          name: "Introduction to Programming",
          code: "CS101",
          description: "Fundamental programming constructs using Python and basic problem solving.",
          credits: 3,
          semester: 1,
          department: "CSE",
          capacity: 40,
          prerequisites: []
        },
        {
          name: "Database Management Systems",
          code: "CS202",
          description: "Relational database concepts, schema normalization, and SQL query design.",
          credits: 4,
          semester: 2,
          department: "CSE",
          capacity: 45,
          prerequisites: ["CS101"]
        },
        {
          name: "Machine Learning Frameworks",
          code: "CS303",
          description: "Supervised and unsupervised models using standard scikit-learn interfaces.",
          credits: 4,
          semester: 3,
          department: "CSE",
          capacity: 30,
          prerequisites: ["CS202"]
        }
      ]);

      const adminUser = users.find(u => u.role === 'Admin');
      const facultyUser = users.find(u => u.role === 'Faculty');
      const studentUser = users.find(u => u.role === 'Student');

      const student = await Student.create({
        userId: studentUser?._id,
        name: "John Doe",
        email: "student@sms.com",
        enrollmentNo: "ENR78294021",
        age: 20,
        gender: "Male",
        grade: "Sophomore",
        department: "CSE",
        semester: 2,
        parentName: "Richard Doe",
        parentPhone: "9876543210",
        address: "123 Science Dr, Tech City",
        enrolledCourses: [courses[0]._id, courses[1]._id],
        isDeleted: false,
        academicHistory: [
          { school: "Tech High", board: "State Board", percentage: 88, passingYear: 2024 }
        ]
      });

      await Faculty.create({
        userId: facultyUser?._id,
        name: "Dr. Robert Carter",
        email: "faculty@sms.com",
        department: "CSE",
        designation: "Professor",
        assignedCourses: [courses[0]._id]
      });

      await Attendance.create({
        studentId: student._id,
        courseId: courses[0]._id,
        date: new Date().toISOString().split('T')[0],
        status: "Present",
        markedBy: adminUser?._id
      });

      await Result.create({
        studentId: student._id,
        courseId: courses[0]._id,
        semester: 1,
        internal: 18,
        external: 43,
        assignment: 13,
        practical: 14,
        grade: "A+",
        gpa: 4.0,
        markedBy: facultyUser?._id
      });

      await Log.create({
        userId: adminUser?._id,
        userName: "System Admin",
        role: "Admin",
        action: "Database Seeding",
        details: "Initialized MongoDB with seed registries and default profiles"
      });

      console.log('🌱 MongoDB seeded successfully with default records!');
    }
  } catch (error) {
    isMongoConnected = false;
    console.error('❌ MongoDB Connection/Seeding Error:', error);
    console.log('⚠️  MongoDB connection failed. Falling back to local JSON File Database.');
    initJsonDb();
  }
}



// Initialise the JSON mock database if MongoDB is not present
export const JSON_DB_PATH = path.join(process.cwd(), 'data', 'db.json');

function initJsonDb() {
  const dir = path.dirname(JSON_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(JSON_DB_PATH) || fs.readFileSync(JSON_DB_PATH, 'utf8').trim() === '') {
    const salt = bcrypt.genSaltSync(10);
    const adminHash = bcrypt.hashSync('admin123', salt);
    const facultyHash = bcrypt.hashSync('faculty123', salt);
    const studentHash = bcrypt.hashSync('student123', salt);

    const defaultData = {
      users: [
        {
          _id: "654c1a5f4f89ef1234567890",
          name: "System Admin",
          email: "admin@sms.com",
          password: adminHash,
          role: "Admin",
          createdAt: new Date('2026-06-01T10:00:00Z').toISOString(),
          updatedAt: new Date('2026-06-01T10:00:00Z').toISOString()
        },
        {
          _id: "654c1a5f4f89ef1234567891",
          name: "Dr. Robert Carter",
          email: "faculty@sms.com",
          password: facultyHash,
          role: "Faculty",
          createdAt: new Date('2026-06-02T11:00:00Z').toISOString(),
          updatedAt: new Date('2026-06-02T11:00:00Z').toISOString()
        },
        {
          _id: "654c1a5f4f89ef1234567892",
          name: "John Doe",
          email: "student@sms.com",
          password: studentHash,
          role: "Student",
          createdAt: new Date('2026-07-01T09:30:00Z').toISOString(),
          updatedAt: new Date('2026-07-01T09:30:00Z').toISOString()
        }
      ],
      students: [
        {
          _id: "654c1a5f4f89ef1234567893",
          userId: "654c1a5f4f89ef1234567892",
          name: "John Doe",
          email: "student@sms.com",
          enrollmentNo: "ENR78294021",
          age: 20,
          gender: "Male",
          grade: "Sophomore",
          department: "CSE",
          semester: 2,
          parentName: "Richard Doe",
          parentPhone: "9876543210",
          address: "123 Science Dr, Tech City",
          enrolledCourses: ["654c1a5f4f89ef1234567895", "654c1a5f4f89ef1234567896"],
          isDeleted: false,
          academicHistory: [
            { school: "Tech High", board: "State Board", percentage: 88, passingYear: 2024 }
          ],
          createdAt: new Date('2026-07-01T09:30:00Z').toISOString(),
          updatedAt: new Date('2026-07-01T09:30:00Z').toISOString()
        }
      ],
      faculties: [
        {
          _id: "654c1a5f4f89ef1234567894",
          userId: "654c1a5f4f89ef1234567891",
          name: "Dr. Robert Carter",
          email: "faculty@sms.com",
          department: "CSE",
          designation: "Professor",
          assignedCourses: ["654c1a5f4f89ef1234567895"],
          createdAt: new Date('2026-06-02T11:00:00Z').toISOString()
        }
      ],
      courses: [
        {
          _id: "654c1a5f4f89ef1234567895",
          name: "Introduction to Programming",
          code: "CS101",
          description: "Fundamental programming constructs using Python and basic problem solving.",
          credits: 3,
          semester: 1,
          department: "CSE",
          capacity: 40,
          prerequisites: [],
          createdAt: new Date('2026-06-01T10:30:00Z').toISOString()
        },
        {
          _id: "654c1a5f4f89ef1234567896",
          name: "Database Management Systems",
          code: "CS202",
          description: "Relational database concepts, schema normalization, and SQL query design.",
          credits: 4,
          semester: 2,
          department: "CSE",
          capacity: 45,
          prerequisites: ["CS101"],
          createdAt: new Date('2026-06-01T10:45:00Z').toISOString()
        },
        {
          _id: "654c1a5f4f89ef1234567897",
          name: "Machine Learning Frameworks",
          code: "CS303",
          description: "Supervised and unsupervised models using standard scikit-learn interfaces.",
          credits: 4,
          semester: 3,
          department: "CSE",
          capacity: 30,
          prerequisites: ["CS202"],
          createdAt: new Date('2026-06-01T11:00:00Z').toISOString()
        }
      ],
      attendance: [
        {
          _id: "654c1a5f4f89ef1234567898",
          studentId: "654c1a5f4f89ef1234567893",
          courseId: "654c1a5f4f89ef1234567895",
          date: new Date().toISOString().split('T')[0],
          status: "Present",
          markedBy: "654c1a5f4f89ef1234567890",
          createdAt: new Date().toISOString()
        }
      ],
      results: [
        {
          _id: "654c1a5f4f89ef1234567899",
          studentId: "654c1a5f4f89ef1234567893",
          courseId: "654c1a5f4f89ef1234567895",
          semester: 1,
          internal: 18,
          external: 43,
          assignment: 13,
          practical: 14,
          grade: "A+",
          gpa: 4.0,
          markedBy: "654c1a5f4f89ef1234567891",
          createdAt: new Date('2026-06-25T15:00:00Z').toISOString(),
          updatedAt: new Date('2026-06-25T15:00:00Z').toISOString()
        }
      ],
      logs: [
        {
          _id: "654c1a5f4f89ef1234567900",
          userId: "654c1a5f4f89ef1234567890",
          userName: "System Admin",
          role: "Admin",
          action: "Database Seeding",
          details: "Initialized database with seed course registries and default profiles",
          createdAt: new Date('2026-06-01T10:05:00Z').toISOString()
        }
      ]
    };
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(defaultData, null, 2), 'utf8');
    console.log('📂 Local JSON file database initialized at: data/db.json with demo records!');
  }
}

export function readJsonDb() {
  initJsonDb();
  try {
    const data = fs.readFileSync(JSON_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON DB:', error);
    return { users: [], students: [], faculties: [], courses: [], attendance: [], results: [], logs: [] };
  }
}

export function writeJsonDb(data: any) {
  try {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing JSON DB:', error);
    return false;
  }
}
