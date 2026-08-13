import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://priyanshuch2412:wY4B4O0GvUo0j0jW@cluster0.zox2e.mongodb.net/edumanager?retryWrites=true&w=majority&appName=Cluster0';

async function extractGroundTruth() {
  await mongoose.connect(MONGO_URI);
  
  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error("No db");
    
    const studentsCount = await db.collection('users').countDocuments({ role: 'Student' });
    const facultyCount = await db.collection('users').countDocuments({ role: 'Faculty' });
    const coursesCount = await db.collection('courses').countDocuments();
    
    const students = await db.collection('users').find({ role: 'Student' }).project({ name: 1, enrollmentNo: 1, department: 1, attendanceRate: 1, cgpa: 1 }).toArray();
    const faculties = await db.collection('users').find({ role: 'Faculty' }).project({ name: 1, department: 1 }).toArray();
    const courses = await db.collection('courses').find().project({ name: 1, code: 1, facultyId: 1 }).toArray();
    
    const truth = {
      counts: {
        students: studentsCount,
        faculty: facultyCount,
        courses: coursesCount
      },
      students: students.map(s => ({
        id: s._id.toString(),
        name: s.name,
        enrollmentNo: s.enrollmentNo,
        department: s.department,
        attendanceRate: s.attendanceRate,
        cgpa: s.cgpa
      })),
      faculty: faculties.map(f => ({
        id: f._id.toString(),
        name: f.name,
        department: f.department
      })),
      courses: courses.map(c => ({
        id: c._id.toString(),
        name: c.name,
        code: c.code,
        facultyId: c.facultyId?.toString()
      }))
    };
    
    console.log(JSON.stringify(truth, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

extractGroundTruth().catch(console.error);
