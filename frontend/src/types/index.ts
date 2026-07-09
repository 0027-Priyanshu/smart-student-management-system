export interface User {
  userId: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Faculty' | 'Student';
  isVerified?: boolean;
  studentProfile?: Student;
  facultyProfile?: Faculty;
  createdAt?: string;
  updatedAt?: string;
}

export interface Student {
  _id?: string;
  id?: string;
  userId: string;
  name: string;
  email: string;
  enrollmentNo: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  grade: string;
  department: string;
  semester: number;
  parentName: string;
  parentPhone: string;
  address: string;
  avatarUrl?: string;
  enrolledCourses?: Course[] | string[];
  isDeleted?: boolean;
  academicHistory?: AcademicHistory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicHistory {
  school: string;
  board: string;
  percentage: number;
  passingYear: number;
}

export interface Faculty {
  _id?: string;
  id?: string;
  userId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  assignedCourses?: Course[] | string[];
  isDeleted?: boolean;
  createdAt?: string;
}

export interface Course {
  _id?: string;
  id?: string;
  name: string;
  code: string;
  description: string;
  credits: number;
  semester: number;
  department: string;
  capacity: number;
  prerequisites?: string[];
  isDeleted?: boolean;
  createdAt?: string;
}

export interface Attendance {
  _id?: string;
  id?: string;
  studentId: Student | string;
  courseId: Course | string;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  markedBy?: string;
  createdAt?: string;
}

export interface Result {
  _id?: string;
  id?: string;
  studentId: Student | string;
  courseId: Course | string;
  semester: number;
  internal: number;
  external: number;
  assignment: number;
  practical: number;
  grade: string;
  gpa: number;
  markedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Log {
  _id?: string;
  id?: string;
  userId?: string;
  userName: string;
  role: string;
  action: string;
  details: string;
  createdAt: string;
}
