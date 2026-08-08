"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const repo_service_1 = require("../services/repo.service");
(0, node_test_1.default)('🎓 Student Profile CRUD Test Suite', async (t) => {
    let studentId = '';
    const enrollmentNo = 'ENR_TEST_1001';
    await t.test('1. Create Student Profile Record', async () => {
        const student = await repo_service_1.RepoService.createStudent({
            userId: 'mock-user-student-99',
            name: 'John Doe Test',
            email: 'john_doe@test.com',
            enrollmentNo,
            age: 20,
            gender: 'Male',
            grade: 'Sophomore',
            department: 'CSE',
            semester: 3,
            parentName: 'Jane Doe Senior',
            parentPhone: '9876543210',
            address: 'Hostel Block A',
            isDeleted: false
        });
        node_assert_1.default.ok(student._id || student.id);
        studentId = student._id || student.id;
        node_assert_1.default.strictEqual(student.name, 'John Doe Test');
        node_assert_1.default.strictEqual(student.enrollmentNo, enrollmentNo);
    });
    await t.test('2. Read Student Profile Details', async () => {
        const student = await repo_service_1.RepoService.findStudentById(studentId);
        node_assert_1.default.ok(student);
        node_assert_1.default.strictEqual(student.email, 'john_doe@test.com');
    });
    await t.test('3. Update Student Record Info', async () => {
        const updated = await repo_service_1.RepoService.updateStudent(studentId, {
            age: 21,
            grade: 'Junior'
        });
        node_assert_1.default.ok(updated);
        node_assert_1.default.strictEqual(updated.age, 21);
        node_assert_1.default.strictEqual(updated.grade, 'Junior');
    });
    await t.test('4. Update Associated User Password', async () => {
        // Create associated user
        const user = await repo_service_1.RepoService.createUser({
            name: 'John Doe Test',
            email: 'john_doe@test.com',
            password: 'oldPassword123',
            role: 'Student',
            isVerified: true
        });
        const userId = user._id || user.id;
        await repo_service_1.RepoService.updateStudent(studentId, { userId });
        const newPass = 'newSecurePassword456';
        const salt = bcryptjs_1.default.genSaltSync(10);
        const passwordHash = bcryptjs_1.default.hashSync(newPass, salt);
        const updatedUser = await repo_service_1.RepoService.updateUser(userId, { password: passwordHash });
        node_assert_1.default.ok(updatedUser);
        node_assert_1.default.strictEqual(bcryptjs_1.default.compareSync(newPass, updatedUser.password), true);
    });
    await t.test('5. Soft-delete Student Record', async () => {
        // Soft delete student by setting isDeleted to true
        const deleted = await repo_service_1.RepoService.updateStudent(studentId, {
            isDeleted: true
        });
        node_assert_1.default.ok(deleted);
        node_assert_1.default.strictEqual(deleted.isDeleted, true);
    });
});
