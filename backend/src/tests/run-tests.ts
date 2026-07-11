import fs from 'fs';
import path from 'path';
import { run } from 'node:test';
import { spec } from 'node:test/reporters';

// Force local JSON DB fallback for fast, deterministic unit tests
const testDbPath = path.join(__dirname, '../../data/test_db.json');
process.env.JSON_DB_PATH = testDbPath;
process.env.MONGO_URI = ''; 

// Ensure the data directory exists
const dataDir = path.dirname(testDbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
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
fs.writeFileSync(testDbPath, JSON.stringify(initialDb, null, 2));

console.log('🧪 Starting EduManager Backend Test Suite...');
console.log(`📂 Using Temporary Database: ${testDbPath}\n`);

// List test files to execute
const testFiles = [
  path.join(__dirname, 'auth.test.ts'),
  path.join(__dirname, 'student.test.ts'),
  path.join(__dirname, 'course.test.ts')
];

run({
  files: testFiles,
})
  .on('test:fail', () => {
    process.exitCode = 1;
  })
  .compose(spec)
  .pipe(process.stdout)
  .on('finish', () => {
    // Clean up temporary database
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
        console.log('\n🧹 Temporary test database cleaned up successfully.');
      }
    } catch (err) {
      console.error('Failed to clean up test database file:', err);
    }
  });
