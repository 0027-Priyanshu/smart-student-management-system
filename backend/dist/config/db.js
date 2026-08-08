"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSON_DB_PATH = exports.isMongoConnected = void 0;
exports.connectDB = connectDB;
exports.readJsonDb = readJsonDb;
exports.writeJsonDb = writeJsonDb;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
dotenv_1.default.config();
exports.isMongoConnected = false;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-student-management';
const User_1 = __importDefault(require("../models/User"));
const Student_1 = __importDefault(require("../models/Student"));
const Faculty_1 = __importDefault(require("../models/Faculty"));
const Course_1 = __importDefault(require("../models/Course"));
async function connectDB() {
    if (!process.env.MONGODB_URI) {
        console.log('ℹ️  No MONGODB_URI set. Falling back immediately to local JSON File Database.');
        exports.isMongoConnected = false;
        initJsonDb();
        return;
    }
    try {
        mongoose_1.default.set('strictQuery', true);
        await mongoose_1.default.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 3000 // Timeout fast so we can fallback to JSON database quickly
        });
        exports.isMongoConnected = true;
        console.log('🚀 MongoDB connected successfully!');
        // Seed MongoDB if admin@sms.com is missing
        const adminExists = await User_1.default.findOne({ email: 'admin@sms.com' });
        if (!adminExists) {
            console.log('🌱 Seeding MongoDB database with admin@sms.com...');
            // Clean up previous seed entries to prevent duplicate key constraints
            await User_1.default.deleteMany({ email: { $in: ['admin@sms.com', 'faculty@sms.com', 'student@sms.com'] } });
            await Student_1.default.deleteMany({ email: 'student@sms.com' });
            await Faculty_1.default.deleteMany({ email: 'faculty@sms.com' });
            await Course_1.default.deleteMany({ code: { $in: ['CS101', 'CS202', 'CS303'] } });
            const salt = bcryptjs_1.default.genSaltSync(10);
            const adminHash = bcryptjs_1.default.hashSync('admin123', salt);
            await User_1.default.create([
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
                    password: bcryptjs_1.default.hashSync('faculty123', salt),
                    role: "Faculty",
                    isVerified: true
                },
                {
                    name: "Demo Student",
                    email: "student@sms.com",
                    password: bcryptjs_1.default.hashSync('student123', salt),
                    role: "Student",
                    isVerified: true
                }
            ]);
            const studentUser = await User_1.default.findOne({ email: 'student@sms.com' });
            const facultyUser = await User_1.default.findOne({ email: 'faculty@sms.com' });
            if (studentUser) {
                await Student_1.default.create({
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
                await Faculty_1.default.create({
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
    }
    catch (error) {
        exports.isMongoConnected = false;
        console.error('❌ MongoDB Connection/Seeding Error:', error);
        console.log('⚠️  MongoDB connection failed. Falling back to local JSON File Database.');
        initJsonDb();
    }
}
// Initialise the JSON mock database if MongoDB is not present
exports.JSON_DB_PATH = path_1.default.join(process.cwd(), 'data', 'db.json');
function initJsonDb() {
    const dir = path_1.default.dirname(exports.JSON_DB_PATH);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    if (!fs_1.default.existsSync(exports.JSON_DB_PATH) || fs_1.default.readFileSync(exports.JSON_DB_PATH, 'utf8').trim() === '') {
        const salt = bcryptjs_1.default.genSaltSync(10);
        const adminHash = bcryptjs_1.default.hashSync('admin123', salt);
        const facultyHash = bcryptjs_1.default.hashSync('faculty123', salt);
        const studentHash = bcryptjs_1.default.hashSync('student123', salt);
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
        fs_1.default.writeFileSync(exports.JSON_DB_PATH, JSON.stringify(defaultData, null, 2), 'utf8');
        console.log('📂 Local JSON file database initialized at: data/db.json with demo records!');
    }
}
function readJsonDb() {
    initJsonDb();
    try {
        const data = fs_1.default.readFileSync(exports.JSON_DB_PATH, 'utf8');
        const parsed = JSON.parse(data);
        if (!parsed.users)
            parsed.users = [];
        if (!parsed.students)
            parsed.students = [];
        if (!parsed.faculties)
            parsed.faculties = [];
        if (!parsed.courses)
            parsed.courses = [];
        if (!parsed.attendance)
            parsed.attendance = [];
        if (!parsed.results)
            parsed.results = [];
        if (!parsed.logs)
            parsed.logs = [];
        return parsed;
    }
    catch (error) {
        console.error('Error reading JSON DB:', error);
        return { users: [], students: [], faculties: [], courses: [], attendance: [], results: [], logs: [] };
    }
}
function writeJsonDb(data) {
    try {
        fs_1.default.writeFileSync(exports.JSON_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
        return true;
    }
    catch (error) {
        console.error('Error writing JSON DB:', error);
        return false;
    }
}
