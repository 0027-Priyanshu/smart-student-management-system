import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Student from '../models/Student';
import Faculty from '../models/Faculty';
import Course from '../models/Course';
import Attendance from '../models/Attendance';
import Result from '../models/Result';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/edumanager';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected for Seeding');
  } catch (err) {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  }
};

const hashPassword = async (password: string) => await bcrypt.hash(password, 10);

const seedDemoData = async () => {
  await connectDB();
  console.log('Starting Idempotent Demo Seed...');

  const demoFacultyEmails = [
    'faculty01@example.com',
    'faculty02@example.com',
    'faculty03@example.com',
    'faculty04@example.com',
    'faculty05@example.com'
  ];

  const demoStudentEmails = Array.from({ length: 15 }, (_, i) => `student${String(i + 1).padStart(2, '0')}@example.com`);
  const allDemoEmails = [...demoFacultyEmails, ...demoStudentEmails];

  console.log('Cleaning up existing demo records...');
  
  const existingDemoUsers = await User.find({ email: { $in: allDemoEmails } });
  const existingDemoUserIds = existingDemoUsers.map(u => u._id);

  if (existingDemoUserIds.length > 0) {
    const demoStudents = await Student.find({ userId: { $in: existingDemoUserIds } });
    const demoStudentIds = demoStudents.map(s => s._id);

    await Attendance.deleteMany({ studentId: { $in: demoStudentIds } });
    await Result.deleteMany({ studentId: { $in: demoStudentIds } });

    await Student.deleteMany({ userId: { $in: existingDemoUserIds } });
    await Faculty.deleteMany({ userId: { $in: existingDemoUserIds } });
    
    // Explicitly delete courses created by the demo seed to avoid orphans
    await Course.deleteMany({ name: { $in: ['Machine Learning for Intelligent Systems', 'Natural Language Processing', 'Mobile Application Development', 'Cloud Computing', 'Database Management Systems', 'Data Structures and Algorithms'] } });
    
    await User.deleteMany({ _id: { $in: existingDemoUserIds } });
  }

  const preservedStudent = await Student.findOne({ enrollmentNo: 'ENR27037739' });

  console.log('Creating demo Users & Faculty...');
  const defaultPassword = await hashPassword('password123');
  
  const facultyRecords = [];
  const facultyNames = ['Dr. Alan Turing', 'Dr. Grace Hopper', 'Prof. John McCarthy', 'Dr. Ada Lovelace', 'Prof. Tim Berners-Lee'];
  
  for (let i = 0; i < 5; i++) {
    const user = await User.create({
      name: facultyNames[i],
      email: demoFacultyEmails[i],
      password: defaultPassword,
      role: 'Faculty',
      isDemo: true
    });

    const faculty = await Faculty.create({
      userId: user._id,
      name: user.name,
      email: user.email,
      department: 'Computer Science',
      designation: 'Professor',
      assignedCourses: []
    });
    facultyRecords.push(faculty);
  }

  console.log('Creating demo Courses...');
  const courseData = [
    { name: 'Machine Learning for Intelligent Systems', code: 'MLIS', facultyIndex: 0 },
    { name: 'Natural Language Processing', code: 'NLP', facultyIndex: 1 },
    { name: 'Mobile Application Development', code: 'MAD', facultyIndex: 2 },
    { name: 'Cloud Computing', code: 'CC', facultyIndex: 3 },
    { name: 'Database Management Systems', code: 'DBMS', facultyIndex: 4 },
    { name: 'Data Structures and Algorithms', code: 'DSA', facultyIndex: 4 }
  ];

  const courses = [];
  for (const cData of courseData) {
    const course = await Course.create({
      name: cData.name,
      code: cData.code,
      description: `Demo course for ${cData.name}`,
      credits: 3,
      semester: 5,
      department: 'Computer Science',
      capacity: 60,
      facultyId: facultyRecords[cData.facultyIndex].userId
    });
    courses.push(course);

    await Faculty.findByIdAndUpdate(facultyRecords[cData.facultyIndex]._id, {
      $push: { assignedCourses: course._id }
    });
  }

  console.log('Creating demo Students & Enrollments...');
  const students = [];
  
  for (let i = 0; i < 15; i++) {
    const user = await User.create({
      name: `Demo Student ${i + 1}`,
      email: demoStudentEmails[i],
      password: defaultPassword,
      role: 'Student',
      isDemo: true
    });

    const shuffledCourses = courses.sort(() => 0.5 - Math.random());
    const enrolledCourses = shuffledCourses.slice(0, 3).map(c => c._id);

    const student = await Student.create({
      userId: user._id,
      name: user.name,
      email: user.email,
      enrollmentNo: `DEMO-ENR-${2026000 + i}`,
      age: 20 + (i % 3),
      gender: i % 2 === 0 ? 'Male' : 'Female',
      grade: 'Junior',
      department: 'Computer Science',
      semester: 5,
      parentName: `Parent of ${user.name}`,
      parentPhone: `555-010${i.toString().padStart(2, '0')}`,
      address: `${100 + i} Demo Street`,
      enrolledCourses
    });
    students.push(student);
  }

  if (preservedStudent) {
    console.log(`Linking preserved student ${preservedStudent.enrollmentNo} to demo courses for relational testing...`);
    const mlis = courses.find(c => c.code === 'MLIS');
    if (mlis && !preservedStudent.enrolledCourses.includes(mlis._id)) {
      preservedStudent.enrolledCourses.push(mlis._id);
      await preservedStudent.save();
    }
    students.push(preservedStudent);
  }

  console.log('Creating realistic Attendance Data...');
  const today = new Date();
  
  for (const student of students) {
    const enrolledCourseIds = student.enrolledCourses;
    
    let attendanceProbability = 0.85; 
    if (student.enrollmentNo.includes('0001') || student.enrollmentNo.includes('0005')) attendanceProbability = 0.95; 
    if (student.enrollmentNo.includes('0003') || student.enrollmentNo.includes('0007')) attendanceProbability = 0.72; 
    if (student.enrollmentNo.includes('0009') || student.enrollmentNo.includes('0011')) attendanceProbability = 0.60; 
    
    for (const courseId of enrolledCourseIds) {
      for (let dayOffset = 1; dayOffset <= 10; dayOffset++) {
        const d = new Date(today);
        d.setDate(today.getDate() - dayOffset);
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        
        const dateStr = d.toISOString().split('T')[0];
        const status = Math.random() < attendanceProbability ? 'Present' : 'Absent';
        
        await Attendance.create({
          studentId: student._id,
          courseId: courseId,
          date: dateStr,
          status: status,
          attendanceMethod: 'MANUAL',
          lectureTitle: `Lecture ${10 - dayOffset}`
        });
      }
    }
  }

  console.log('Creating realistic Grade/Result Data...');
  for (const student of students) {
    const enrolledCourseIds = student.enrolledCourses;
    
    let baseGPA = 3.0; 
    if (student.enrollmentNo.includes('0002') || student.enrollmentNo.includes('0005')) baseGPA = 3.8; 
    if (student.enrollmentNo.includes('0004') || student.enrollmentNo.includes('0007')) baseGPA = 2.2; 
    if (student.enrollmentNo.includes('0009')) baseGPA = 1.8; 

    for (const courseId of enrolledCourseIds) {
      const variance = (Math.random() * 0.4) - 0.2;
      const finalGpa = Math.max(0, Math.min(4.0, baseGPA + variance));
      
      let grade = 'C';
      if (finalGpa >= 3.7) grade = 'A';
      else if (finalGpa >= 3.0) grade = 'B';
      else if (finalGpa < 2.0) grade = 'F';

      await Result.create({
        studentId: student._id,
        courseId: courseId,
        semester: 5,
        internal: Math.round(finalGpa * 5),
        external: Math.round(finalGpa * 12.5),
        assignment: Math.round(finalGpa * 3.75),
        practical: Math.round(finalGpa * 3.75),
        grade: grade,
        gpa: parseFloat(finalGpa.toFixed(1))
      });
    }
  }

  console.log('Demo Data Seeding Complete!');
  process.exit(0);
};

seedDemoData();
