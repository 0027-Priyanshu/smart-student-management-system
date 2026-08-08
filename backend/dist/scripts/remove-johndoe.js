"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Student_1 = __importDefault(require("../models/Student"));
const Attendance_1 = __importDefault(require("../models/Attendance"));
const Result_1 = __importDefault(require("../models/Result"));
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI;
async function run() {
    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI is required in .env file to run this script.');
        process.exit(1);
    }
    try {
        mongoose_1.default.set('strictQuery', true);
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        // 1. Find John Doe
        // Use regex to case-insensitively match "john doe"
        const students = await Student_1.default.find({ name: { $regex: /john doe/i } });
        if (students.length === 0) {
            console.log('❌ No student found with the name "John Doe".');
            process.exit(0);
        }
        console.log(`Found ${students.length} student(s) matching "John Doe". Processing...`);
        for (const student of students) {
            const studentId = student._id;
            // 2. Delete Attendance
            const attendanceResult = await Attendance_1.default.deleteMany({ studentId });
            console.log(`🧹 Deleted ${attendanceResult.deletedCount} attendance records for ${student.name} (${student.enrollmentNo})`);
            // 3. Delete Marks/Results
            const marksResult = await Result_1.default.deleteMany({ studentId });
            console.log(`🧹 Deleted ${marksResult.deletedCount} marks/results records for ${student.name} (${student.enrollmentNo})`);
        }
        console.log('✅ Successfully removed all marks and attendance for John Doe.');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error during execution:', error);
        process.exit(1);
    }
}
run();
