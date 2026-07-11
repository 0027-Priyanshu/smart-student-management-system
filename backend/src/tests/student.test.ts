import test from 'node:test';
import assert from 'node:assert';
import { RepoService } from '../services/repo.service';

test('🎓 Student Profile CRUD Test Suite', async (t) => {
  let studentId = '';
  const enrollmentNo = 'ENR_TEST_1001';

  await t.test('1. Create Student Profile Record', async () => {
    const student = await RepoService.createStudent({
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

    assert.ok(student._id || student.id);
    studentId = student._id || student.id;
    assert.strictEqual(student.name, 'John Doe Test');
    assert.strictEqual(student.enrollmentNo, enrollmentNo);
  });

  await t.test('2. Read Student Profile Details', async () => {
    const student = await RepoService.findStudentById(studentId);
    assert.ok(student);
    assert.strictEqual(student.email, 'john_doe@test.com');
  });

  await t.test('3. Update Student Record Info', async () => {
    const updated = await RepoService.updateStudent(studentId, {
      age: 21,
      grade: 'Junior'
    });

    assert.ok(updated);
    assert.strictEqual(updated.age, 21);
    assert.strictEqual(updated.grade, 'Junior');
  });

  await t.test('4. Soft-delete Student Record', async () => {
    // Soft delete student by setting isDeleted to true
    const deleted = await RepoService.updateStudent(studentId, {
      isDeleted: true
    });

    assert.ok(deleted);
    assert.strictEqual(deleted.isDeleted, true);
  });
});
