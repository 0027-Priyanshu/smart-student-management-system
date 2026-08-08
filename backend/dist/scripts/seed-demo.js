"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
const Student_1 = __importDefault(require("../models/Student"));
const Faculty_1 = __importDefault(require("../models/Faculty"));
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-student-management';
async function seedDemoUsers() {
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEMO_ACCOUNTS !== 'true') {
        console.error('❌ Demo seeding is restricted to non-production environments with ENABLE_DEMO_ACCOUNTS=true');
        process.exit(1);
    }
    try {
        mongoose_1.default.set('strictQuery', true);
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        const salt = bcryptjs_1.default.genSaltSync(10);
        // 1. Admin
        const adminEmail = 'admin@sms.com';
        const adminHash = bcryptjs_1.default.hashSync('admin123', salt);
        await User_1.default.findOneAndUpdate({ email: adminEmail }, { $set: { name: 'System Admin', password: adminHash, role: 'Admin' } }, { upsert: true, new: true });
        // 2. Faculty
        const facultyEmail = 'faculty@sms.com';
        const facultyHash = bcryptjs_1.default.hashSync('faculty123', salt);
        const facultyUser = await User_1.default.findOneAndUpdate({ email: facultyEmail }, { $set: { name: 'Demo Faculty', password: facultyHash, role: 'Faculty' } }, { upsert: true, new: true });
        await Faculty_1.default.findOneAndUpdate({ userId: facultyUser._id }, { $set: { name: 'Demo Faculty', email: facultyEmail, department: 'Computer Science', designation: 'Professor', isDeleted: false } }, { upsert: true, new: true });
        // 3. Student
        const studentEmail = 'student@sms.com';
        const studentHash = bcryptjs_1.default.hashSync('student123', salt);
        const studentUser = await User_1.default.findOneAndUpdate({ email: studentEmail }, { $set: { name: 'Demo Student', password: studentHash, role: 'Student' } }, { upsert: true, new: true });
        await Student_1.default.findOneAndUpdate({ userId: studentUser._id }, { $set: { name: 'Demo Student', email: studentEmail, enrollmentNo: 'ENR2026001', department: 'Computer Science', semester: 1, age: 20, gender: 'Other', grade: 'Sophomore', parentName: 'Parent', parentPhone: '1234567890', address: 'Demo Address', isDeleted: false } }, { upsert: true, new: true });
        console.log('🌱 Mongo DB Demo Credentials Seeded Successfully');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Failed to seed MongoDB demo users:', error);
        process.exit(1);
    }
}
seedDemoUsers();
