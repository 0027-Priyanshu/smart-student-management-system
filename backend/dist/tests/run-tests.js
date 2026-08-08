"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const node_test_1 = require("node:test");
const reporters_1 = require("node:test/reporters");
// Force local JSON DB fallback for fast, deterministic unit tests
const testDbPath = path_1.default.join(__dirname, '../../data/test_db.json');
process.env.JSON_DB_PATH = testDbPath;
process.env.MONGO_URI = '';
// Ensure the data directory exists
const dataDir = path_1.default.dirname(testDbPath);
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
// Reset/Initialize test database content
const initialDb = {
    users: [],
    students: [],
    faculties: [],
    courses: [],
    attendance: [],
    results: [],
    logs: []
};
fs_1.default.writeFileSync(testDbPath, JSON.stringify(initialDb, null, 2));
console.log('🧪 Starting EduManager Backend Test Suite...');
console.log(`📂 Using Temporary Database: ${testDbPath}\n`);
// List test files to execute
const testFiles = [
    path_1.default.join(__dirname, 'auth.test.ts'),
    path_1.default.join(__dirname, 'student.test.ts'),
    path_1.default.join(__dirname, 'course.test.ts')
];
(0, node_test_1.run)({
    files: testFiles,
})
    .on('test:fail', () => {
    process.exitCode = 1;
})
    .compose(reporters_1.spec)
    .pipe(process.stdout)
    .on('finish', () => {
    // Clean up temporary database
    try {
        if (fs_1.default.existsSync(testDbPath)) {
            fs_1.default.unlinkSync(testDbPath);
            console.log('\n🧹 Temporary test database cleaned up successfully.');
        }
    }
    catch (err) {
        console.error('Failed to clean up test database file:', err);
    }
});
