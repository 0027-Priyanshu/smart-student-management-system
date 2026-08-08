"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const repo_service_1 = require("../services/repo.service");
(0, node_test_1.default)('📚 Course Allocation Test Suite', async (t) => {
    let studentId = '';
    let courseId = '';
    await t.test('1. Initialize Student and Course record', async () => {
        // Create course
        const course = await repo_service_1.RepoService.createCourse({
            name: 'Introduction to Algorithms',
            code: 'CS-301',
            credits: 4,
            department: 'CSE',
            description: 'Core DSA course'
        });
        courseId = course._id || course.id;
        node_assert_1.default.ok(courseId);
        // Create student
        const student = await repo_service_1.RepoService.createStudent({
            userId: 'mock-user-student-200',
            name: 'Jane DSA Student',
            email: 'jane_dsa@test.com',
            enrollmentNo: 'ENR_DSA_2026',
            age: 20,
            gender: 'Female',
            grade: 'Sophomore',
            department: 'CSE',
            semester: 3,
            parentName: 'Guardian',
            parentPhone: '0000000000',
            address: 'Main Campus',
            enrolledCourses: []
        });
        studentId = student._id || student.id;
        node_assert_1.default.ok(studentId);
    });
    await t.test('2. Allocate Course to Student', async () => {
        const student = await repo_service_1.RepoService.findStudentById(studentId);
        node_assert_1.default.ok(student);
        const studentCourses = student.enrolledCourses?.map((c) => c._id?.toString() || c.id?.toString()) || [];
        node_assert_1.default.strictEqual(studentCourses.includes(courseId), false);
        const updatedCourses = [...studentCourses, courseId];
        const updated = await repo_service_1.RepoService.updateStudent(studentId, { enrolledCourses: updatedCourses });
        node_assert_1.default.ok(updated);
        const doubleCheck = await repo_service_1.RepoService.findStudentById(studentId);
        const updatedIds = doubleCheck.enrolledCourses?.map((c) => c._id?.toString() || c.id?.toString()) || [];
        node_assert_1.default.strictEqual(updatedIds.includes(courseId), true);
    });
});
