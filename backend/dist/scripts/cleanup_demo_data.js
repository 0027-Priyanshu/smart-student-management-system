"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupDemoData = cleanupDemoData;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const User_1 = __importDefault(require("../models/User"));
const Student_1 = __importDefault(require("../models/Student"));
const Faculty_1 = __importDefault(require("../models/Faculty"));
const Course_1 = __importDefault(require("../models/Course"));
const Attendance_1 = __importDefault(require("../models/Attendance"));
const Result_1 = __importDefault(require("../models/Result"));
const Activity_1 = __importDefault(require("../models/Activity"));
dotenv_1.default.config();
/**
 * Safe One-Time Database Cleanup Script
 * Clears demo records from MongoDB and local JSON database while preserving System Admin account.
 */
async function cleanupDemoData() {
    console.log('🧹 Starting safe database cleanup...');
    let removedCounts = {
        students: 0,
        faculties: 0,
        courses: 0,
        attendance: 0,
        results: 0,
        activities: 0,
        nonAdminUsers: 0
    };
    // 1. Clean MongoDB if connected
    const MONGODB_URI = process.env.MONGODB_URI;
    if (MONGODB_URI) {
        try {
            await mongoose_1.default.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
            console.log('🔗 Connected to MongoDB for cleanup...');
            const sRes = await Student_1.default.deleteMany({});
            removedCounts.students += sRes.deletedCount || 0;
            const fRes = await Faculty_1.default.deleteMany({});
            removedCounts.faculties += fRes.deletedCount || 0;
            const cRes = await Course_1.default.deleteMany({});
            removedCounts.courses += cRes.deletedCount || 0;
            const aRes = await Attendance_1.default.deleteMany({});
            removedCounts.attendance += aRes.deletedCount || 0;
            const rRes = await Result_1.default.deleteMany({});
            removedCounts.results += rRes.deletedCount || 0;
            const actRes = await Activity_1.default.deleteMany({});
            removedCounts.activities += actRes.deletedCount || 0;
            // Keep only admin@sms.com or Super Admin / Admin roles
            const uRes = await User_1.default.deleteMany({ role: { $nin: ['Admin', 'Super Admin'] }, email: { $ne: 'admin@sms.com' } });
            removedCounts.nonAdminUsers += uRes.deletedCount || 0;
            await mongoose_1.default.disconnect();
            console.log('✅ MongoDB demo records removed safely.');
        }
        catch (err) {
            console.log('ℹ️  MongoDB connection skipped or not active during cleanup script.');
        }
    }
    // 2. Clean JSON file database
    const jsonDbPath = path_1.default.join(process.cwd(), 'data', 'db.json');
    if (fs_1.default.existsSync(jsonDbPath)) {
        try {
            const content = fs_1.default.readFileSync(jsonDbPath, 'utf8');
            const db = JSON.parse(content);
            removedCounts.students += db.students?.length || 0;
            removedCounts.faculties += db.faculties?.length || 0;
            removedCounts.courses += db.courses?.length || 0;
            removedCounts.attendance += db.attendance?.length || 0;
            removedCounts.results += db.results?.length || 0;
            const adminUsers = (db.users || []).filter((u) => u.role === 'Admin' || u.role === 'Super Admin' || u.email === 'admin@sms.com');
            const cleanDb = {
                users: adminUsers,
                students: [],
                faculties: [],
                courses: [],
                attendance: [],
                results: [],
                qr_sessions: [],
                chat_history: [],
                activities: [],
                logs: []
            };
            fs_1.default.writeFileSync(jsonDbPath, JSON.stringify(cleanDb, null, 2), 'utf8');
            console.log('✅ Local JSON database db.json cleared safely.');
        }
        catch (err) {
            console.error('❌ Failed to clean db.json:', err);
        }
    }
    console.log('📊 Cleanup Summary:');
    console.log(`   - Students removed: ${removedCounts.students}`);
    console.log(`   - Faculties removed: ${removedCounts.faculties}`);
    console.log(`   - Courses removed: ${removedCounts.courses}`);
    console.log(`   - Attendance logs removed: ${removedCounts.attendance}`);
    console.log(`   - Grade results removed: ${removedCounts.results}`);
    console.log(`   - Non-admin user accounts removed: ${removedCounts.nonAdminUsers}`);
    console.log('🎉 Cleanup finished safely! System is clean and ready for real records.');
}
if (require.main === module) {
    cleanupDemoData().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
