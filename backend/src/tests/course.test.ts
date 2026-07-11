import test from 'node:test';
import assert from 'node:assert';
import { RepoService } from '../services/repo.service';

test('📚 Course Allocation Test Suite', async (t) => {
  let studentId = '';
  let courseId = '';

  await t.test('1. Initialize Student and Course record', async () => {
    // Create course
    const course = await RepoService.createCourse({
      name: 'Introduction to Algorithms',
      code: 'CS-301',
      credits: 4,
      department: 'CSE',
      description: 'Core DSA course'
    });
    courseId = course._id || course.id;
    assert.ok(courseId);

    // Create student
    const student = await RepoService.createStudent({
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
    assert.ok(studentId);
  });

  await t.test('2. Allocate Course to Student', async () => {
    const student = await RepoService.findStudentById(studentId);
    assert.ok(student);
    
    const studentCourses: string[] = student.enrolledCourses?.map((c: any) => c._id?.toString() || c.id?.toString()) || [];
    assert.strictEqual(studentCourses.includes(courseId), false);

    const updatedCourses = [...studentCourses, courseId];
    const updated = await RepoService.updateStudent(studentId, { enrolledCourses: updatedCourses });
    assert.ok(updated);
    
    const doubleCheck = await RepoService.findStudentById(studentId);
    const updatedIds: string[] = doubleCheck.enrolledCourses?.map((c: any) => c._id?.toString() || c.id?.toString()) || [];
    assert.strictEqual(updatedIds.includes(courseId), true);
  });
});
