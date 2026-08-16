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

export async function connectDB() {
  if (!process.env.MONGODB_URI) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ FATAL: MONGODB_URI environment variable is required in production.');
      process.exit(1);
    }
    console.log('ℹ️  No MONGODB_URI set. Falling back immediately to local JSON File Database.');
    isMongoConnected = false;
    initJsonDb();
    return;
  }
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: process.env.NODE_ENV === 'production' ? 10000 : 3000
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

      await User.create([
        {
          name: "System Admin",
          email: "admin@sms.com",
          password: adminHash,
          role: "Admin",
          isVerified: true
        },
        {
          name: "Dr. Faculty",
          email: "faculty@sms.com",
          password: bcrypt.hashSync('faculty123', salt),
          role: "Faculty",
          isVerified: true
        },
        {
          name: "Demo Student",
          email: "student@sms.com",
          password: bcrypt.hashSync('student123', salt),
          role: "Student",
          isVerified: true
        }
      ]);

      const studentUser = await User.findOne({ email: 'student@sms.com' });
      const facultyUser = await User.findOne({ email: 'faculty@sms.com' });

      if (studentUser) {
        await Student.create({
          userId: studentUser._id,
          name: "Demo Student",
          email: "student@sms.com",
          enrollmentNo: "ENR12345678",
          age: 20,
          gender: "Male",
          grade: "Junior",
          department: "Computer Science",
          semester: 5,
          parentName: "John Doe",
          parentPhone: "9999999999",
          address: "Demo City",
          isDeleted: false
        });
      }

      if (facultyUser) {
        await Faculty.create({
          userId: facultyUser._id,
          name: "Dr. Faculty",
          email: "faculty@sms.com",
          department: "Computer Science",
          designation: "Professor",
          isDeleted: false
        });
      }

      console.log('🌱 MongoDB initialized with Admin, Faculty, and Student demo accounts!');
    }
  } catch (error) {
    isMongoConnected = false;
    console.error('❌ MongoDB Connection/Seeding Error:', error);
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ FATAL: MongoDB connection failed in production mode. Process exiting.');
      process.exit(1);
    }
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
          isVerified: true,
          createdAt: new Date('2026-06-01T10:00:00Z').toISOString(),
          updatedAt: new Date('2026-06-01T10:00:00Z').toISOString()
        },
        {
          _id: "654c1a5f4f89ef1234567891",
          name: "Dr. Faculty",
          email: "faculty@sms.com",
          password: facultyHash,
          role: "Faculty",
          isVerified: true,
          createdAt: new Date('2026-06-01T10:00:00Z').toISOString(),
          updatedAt: new Date('2026-06-01T10:00:00Z').toISOString()
        },
        {
          _id: "654c1a5f4f89ef1234567892",
          name: "Demo Student",
          email: "student@sms.com",
          password: studentHash,
          role: "Student",
          isVerified: true,
          createdAt: new Date('2026-06-01T10:00:00Z').toISOString(),
          updatedAt: new Date('2026-06-01T10:00:00Z').toISOString()
        }
      ],
      students: [
        {
          _id: "654c1a5f4f89ef1234567992",
          userId: "654c1a5f4f89ef1234567892",
          name: "Demo Student",
          email: "student@sms.com",
          enrollmentNo: "ENR12345678",
          age: 20,
          gender: "Male",
          grade: "Junior",
          department: "Computer Science",
          semester: 5,
          parentName: "John Doe",
          parentPhone: "9999999999",
          address: "Demo City",
          isDeleted: false,
          createdAt: new Date('2026-06-01T10:00:00Z').toISOString(),
          updatedAt: new Date('2026-06-01T10:00:00Z').toISOString()
        }
      ],
      faculties: [
        {
          _id: "654c1a5f4f89ef1234567991",
          userId: "654c1a5f4f89ef1234567891",
          name: "Dr. Faculty",
          email: "faculty@sms.com",
          department: "Computer Science",
          designation: "Professor",
          isDeleted: false,
          createdAt: new Date('2026-06-01T10:00:00Z').toISOString(),
          updatedAt: new Date('2026-06-01T10:00:00Z').toISOString()
        }
      ],
      courses: [],
      attendance: [],
      results: [],
      logs: []
    };
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(defaultData, null, 2), 'utf8');
    console.log('📂 Local JSON file database initialized at: data/db.json with demo records!');
  }
}

export function readJsonDb() {
  initJsonDb();
  try {
    const data = fs.readFileSync(JSON_DB_PATH, 'utf8');
    const parsed = JSON.parse(data);

    if (!parsed.users) parsed.users = [];
    if (!parsed.students) parsed.students = [];
    if (!parsed.faculties) parsed.faculties = [];
    if (!parsed.courses) parsed.courses = [];
    if (!parsed.attendance) parsed.attendance = [];
    if (!parsed.results) parsed.results = [];
    if (!parsed.logs) parsed.logs = [];
    if (!parsed.faceSessions) parsed.faceSessions = [];
    if (!parsed.notifications) parsed.notifications = [];

    return parsed;
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

