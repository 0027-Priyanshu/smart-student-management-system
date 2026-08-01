/**
 * EduManager AI Knowledge Base
 * Verified, comprehensive application knowledge registry for retrieval-augmented chatbot assistance.
 */

export interface KnowledgeTopic {
  id: string;
  category: 'overview' | 'page' | 'workflow' | 'role' | 'metric' | 'form' | 'troubleshooting' | 'limitation';
  title: string;
  keywords: string[];
  routes?: string[];
  roles?: ('Super Admin' | 'Admin' | 'Faculty' | 'Student')[];
  summary: string;
  details: string;
  stepByStep?: string[];
}

export const APP_KNOWLEDGE_BASE: KnowledgeTopic[] = [
  // 1. SYSTEM OVERVIEW & ARCHITECTURE
  {
    id: 'overview-system',
    category: 'overview',
    title: 'EduManager AI Application Overview',
    keywords: ['edumanager', 'overview', 'about', 'system', 'features', 'architecture', 'technology', 'stack', 'what is'],
    summary: 'EduManager AI is a modern Smart Student Management System designed for higher education institutions to manage students, faculty, courses, attendance, and academic grades with predictive AI analytics.',
    details: `EduManager AI provides a complete academic administration ecosystem with role-based access for Super Admins, Admins, Faculty members, and Students.
Key capabilities include:
- Student Directory Management with bulk CSV import and risk badges.
- Faculty Staff Directory with department and course assignments.
- Course Catalog & Enrollment management.
- Dynamic Live QR-Code Attendance System with automatic 75% low-attendance alerts.
- Automated Grade Book & Weighted GPA Transcripts (4.0 CGPA scale).
- ML Predictive Academic Risk Engine flagging students requiring intervention.
- AI Assistant with speech audio controls, natural language database search, and automated reporting.`
  },

  // 2. USER ROLES & PERMISSION MATRIX
  {
    id: 'roles-permissions',
    category: 'role',
    title: 'User Roles & Permission Boundaries',
    keywords: ['role', 'roles', 'permission', 'permissions', 'access', 'admin', 'faculty', 'student', 'super admin', 'allow', 'can i'],
    summary: 'EduManager enforces strict role-based access control (RBAC) across Super Admin, Admin, Faculty, and Student accounts.',
    details: `Role & Permission Breakdown:

1. Super Admin & Admin:
   - Full Administrative Control: Add, edit, or deactivate Students, Faculty, and Courses.
   - Bulk Operations: Import students via Excel/CSV files.
   - Academic Management: View and edit all student grade books and attendance logs.
   - AI & Analytics: Access institute-wide analytics, predictive dropout risk reports, and system activity logs.

2. Faculty:
   - Course Scope: Manage assigned courses, view enrolled students, and track class attendance.
   - Attendance Controls: Mark manual attendance or launch live 1-click dynamic QR Attendance sessions.
   - Grade Input: Enter and edit internal, external, assignment, and practical marks for assigned course sections.
   - AI Tools: Access predictive academic risk reports and AI Assistant.

3. Student:
   - Personal Portal: View personal profile, enrolled courses, attendance percentage, and GPA transcript.
   - Attendance Scanner: Scan live session QR codes using the device camera or enter session codes manually.
   - AI Study Advisor: View personalized AI weak-subject recommendations and study guidance.`
  },

  // 3. PAGES & ROUTES
  {
    id: 'page-dashboard',
    category: 'page',
    title: 'Dashboard Page Overview (/dashboard)',
    routes: ['/dashboard'],
    keywords: ['dashboard', 'home', 'main', 'metrics', 'overview', 'kpi', 'summary', '/dashboard'],
    summary: 'The Dashboard displays role-customized KPI cards, academic performance trend charts, and recent activity logs.',
    details: `Dashboard Views by Role:
- Admin Dashboard: Displays total enrolled student count, faculty count, active course count, average CGPA, overall attendance rate %, recent activity logs, and quick action shortcuts (Add Student, Bulk Import, Create Course).
- Faculty Dashboard: Displays assigned courses, total students taught, today's lecture schedule, and 1-click shortcuts to launch QR attendance sessions or enter grades.
- Student Dashboard: Displays cumulative CGPA meter, overall attendance rate %, enrolled course list, pending assignments count, academic trend line, and personalized AI study recommendations.`
  },

  {
    id: 'page-students',
    category: 'page',
    title: 'Student Directory Page (/students)',
    routes: ['/students'],
    keywords: ['student', 'students', 'directory', 'enrolment', 'enrollment', 'search', 'filter', 'add student', 'import', 'risk', '/students'],
    summary: 'The Student Directory allows searching, filtering, adding, importing, and managing student profiles.',
    details: `Student Directory Features:
- Instant Search: Search by Student Name or Enrollment Number (e.g. ENR25844945).
- Filter Controls: Filter by Department (Computer Science, IT, Electronics, Mathematics), Semester, Status (Active, Suspended, Graduated), or Risk Level (High Risk, Medium Risk, Low Risk).
- Add Student Modal: Create a new student record manually with contact and academic details.
- Bulk CSV Import Modal: Upload an Excel or CSV file to import multiple student profiles simultaneously.
- Student Drawer: Click any student row to view full contact details, attendance breakdown, GPA trend, and send parent notifications.`
  },

  {
    id: 'page-faculty',
    category: 'page',
    title: 'Faculty Directory Page (/faculty)',
    routes: ['/faculty'],
    keywords: ['faculty', 'teacher', 'professor', 'lecturer', 'staff', 'instructor', 'department', 'designation', '/faculty'],
    summary: 'The Faculty Directory manages teaching staff profiles, designations, and assigned course sections.',
    details: `Faculty Page Capabilities:
- View all active faculty members with department, designation (Professor, Associate Professor, Assistant Professor), email, phone, and assigned course codes.
- Filter faculty list by department or designation.
- Add Faculty Modal (Admin only): Register new faculty members with specialization and contact details.`
  },

  {
    id: 'page-courses',
    category: 'page',
    title: 'Course Catalog Page (/courses)',
    routes: ['/courses'],
    keywords: ['course', 'courses', 'catalog', 'syllabus', 'credits', 'instructor', 'enrolled', 'create course', '/courses'],
    summary: 'The Course Catalog lists academic course offerings, syllabus details, assigned instructors, and credit hours.',
    details: `Course Catalog Features:
- Course Cards: Displays Course Code (e.g. CS101), Name, Department, Credits, Semester, Capacity, Enrolled Student Count, and assigned Faculty Instructor.
- Create Course Modal (Admin/Faculty): Add new courses with code, credits, department, semester, capacity, and syllabus topics.
- Course Search & Department Filter.`
  },

  {
    id: 'page-attendance',
    category: 'page',
    title: 'Attendance Management Page (/attendance)',
    routes: ['/attendance'],
    keywords: ['attendance', 'present', 'absent', 'late', 'qr', 'scanner', 'camera', 'mark attendance', '75%', 'bunk', '/attendance'],
    summary: 'The Attendance page supports manual attendance logging, automatic 75% compliance alerts, and live QR code scanning.',
    details: `Attendance System Features:
- Manual Attendance Log: Select Date and Course to toggle student status (Present, Absent, Late, On Leave) or use Batch Actions (Mark All Present / Mark All Absent).
- Live Dynamic QR Attendance Generator (Faculty): Faculty selects course and session duration to display a scannable dynamic QR code with live countdown.
- Live Camera QR Scanner (Student): Students click "Scan & Mark Attendance" to activate device camera or type session code manually.
- Low Attendance Alert Threshold: Students dropping below 75% attendance are highlighted with red alerts and automated parent notification triggers.`
  },

  {
    id: 'page-marks',
    category: 'page',
    title: 'Grade Book & Marks Page (/marks)',
    routes: ['/marks'],
    keywords: ['marks', 'grade', 'grades', 'gpa', 'cgpa', 'transcript', 'exam', 'internal', 'external', 'score', '/marks'],
    summary: 'The Grade Book manages continuous evaluation scores, semester GPA calculation, and official student transcripts.',
    details: `Grade Book Features:
- Faculty Grade Entry: Select course section to input Internal Assessment (30%), Final External Exam (50%), Assignments (10%), and Practical Scores (10%).
- Automated GPA Calculation: Computes weighted GPA on a 4.0 scale and assigns letter grades (A, B, C, D, F).
- Student Grade Sheet: Students view semester grade breakdown, total credits earned, CGPA trajectory, and download PDF scorecards.`
  },

  {
    id: 'page-ai-assistant',
    category: 'page',
    title: 'AI Companion Page (/ai-assistant)',
    routes: ['/ai-assistant'],
    keywords: ['ai', 'assistant', 'chatbot', 'profiler', 'insights', 'speech', 'voice', 'mute', 'report', '/ai-assistant'],
    summary: 'The AI Assistant provides interactive Q&A, student academic profiling, predictive risk diagnostic reports, and speech audio controls.',
    details: `AI Assistant Page Features:
- Chatbot Assistant Tab: Ask questions about students, courses, attendance, grades, or application usage.
- Student Academic Profiler Tab: Select any student to generate an instant 3-sentence summary, weak subject analysis, and actionable study recommendations.
- Strategic Academic Insights Tab (Admin): Generate an AI administrative report with 6-month GPA/attendance trend charts and list of at-risk students.
- Speech Audio Controls: Toggle Mute/Unmute to listen to AI responses, or use speech recognition input.`
  },

  {
    id: 'page-auth',
    category: 'page',
    title: 'Authentication & Account Recovery (/login, /register, /verify-email)',
    routes: ['/login', '/register', '/verify-email'],
    keywords: ['login', 'register', 'signup', 'password', 'forgot password', 'otp', 'token', 'verify', 'email', '/login', '/register'],
    summary: 'Handles user authentication, role registration, email verification, and OTP password resets.',
    details: `Auth System Features:
- Login: Enter email and password. Redirects to role dashboard upon success.
- Password Visibility Toggle: Click eye icon to reveal or hide password input text.
- Registration: Sign up as Student, Faculty, or Admin. Automatically initializes corresponding role profile.
- Forgot Password Modal: Enter email to receive a 6-digit OTP code to reset password.`
  },

  // 4. STEP-BY-STEP WORKFLOWS
  {
    id: 'workflow-add-student',
    category: 'workflow',
    title: 'How to Add a New Student',
    keywords: ['how to add student', 'add new student', 'create student', 'register student', 'new student workflow'],
    summary: 'Step-by-step instructions for Admins to add a new student profile.',
    details: 'Admins can add a new student manually from the Student Directory page.',
    stepByStep: [
      'Navigate to the Student Directory page (/students) from the sidebar menu.',
      'Click the "+ Add Student" button located at the top right of the page.',
      'Fill in required fields: Full Name, Email Address, Department, Semester, Parent Name, Parent Phone Number, and Home Address.',
      'Click "Save Student Record".',
      'The system automatically generates a unique Enrollment ID (e.g. ENR25844945) and initializes the student profile in the database.'
    ]
  },

  {
    id: 'workflow-bulk-import',
    category: 'workflow',
    title: 'How to Bulk Import Students from Excel / CSV',
    keywords: ['bulk import', 'import excel', 'import csv', 'upload csv', 'import students', 'excel template'],
    summary: 'Step-by-step instructions to upload an Excel or CSV file containing multiple student records.',
    details: 'Admins can upload a formatted CSV or Excel file to register multiple students at once.',
    stepByStep: [
      'Navigate to the Student Directory page (/students).',
      'Click the "Bulk Import" button next to "Add Student".',
      'Download the sample CSV template to ensure headers match: name, email, department, semester, parentName, parentPhone.',
      'Choose your CSV or XLSX file and click "Upload & Process Import".',
      'The system validates each row, generates Enrollment IDs, and adds all valid records to the database.'
    ]
  },

  {
    id: 'workflow-qr-attendance',
    category: 'workflow',
    title: 'How to Use Live Dynamic QR Code Attendance System',
    keywords: ['qr attendance', 'scan qr', 'generate qr', 'camera scan', 'live attendance', 'dynamic qr'],
    summary: 'How faculty generate dynamic QR codes and students scan them to mark class attendance.',
    details: 'Faculty generate dynamic time-expiring QR codes during lectures; students scan them using their camera.',
    stepByStep: [
      'Faculty Workflow:',
      '1. Faculty opens Attendance page (/attendance) and clicks "Launch Live QR Session".',
      '2. Select Course, enter Session Title, set Expiry Timer (e.g. 5 minutes), and click "Generate Live QR".',
      '3. A dynamic QR code with a live countdown timer displays on screen.',
      'Student Workflow:',
      '1. Student opens Attendance page (/attendance) or clicks "Scan QR" on Student Dashboard.',
      '2. Click "Scan Live Session QR", allow browser camera access, and point camera at the faculty QR code.',
      '3. Alternatively, type the 6-digit Session Code manually.',
      '4. Upon scanning, attendance status is marked "Present" instantly in the database.'
    ]
  },

  {
    id: 'workflow-enter-marks',
    category: 'workflow',
    title: 'How Faculty Enter Marks & Generate Transcripts',
    keywords: ['enter marks', 'input grades', 'faculty grade book', 'submit marks', 'grade entry'],
    summary: 'Instructions for faculty to enter assessment marks for assigned courses.',
    details: 'Faculty enter continuous evaluation marks; the system computes final weighted GPA automatically.',
    stepByStep: [
      'Navigate to Grade Book (/marks).',
      'Select the Course from the dropdown list.',
      'For each student, input Internal Score (max 30), Final External Score (max 50), Assignment Score (max 10), and Practical Score (max 10).',
      'Click "Save Grade Book".',
      'The system calculates total score (out of 100), letter grade (A-F), and grade points (0.0 - 4.0) automatically.'
    ]
  },

  {
    id: 'workflow-reset-password',
    category: 'workflow',
    title: 'How to Reset Forgotten Password',
    keywords: ['forgot password', 'reset password', 'otp code', 'recover account', 'change password'],
    summary: 'How users reset forgotten passwords using 6-digit OTP codes.',
    details: 'Users request a password reset OTP on the Login screen and verify it to set a new password.',
    stepByStep: [
      'Go to Login page (/login) and click "Forgot Password?".',
      'Enter your registered email address and click "Send OTP Code".',
      'Check your email (or view Demo OTP code on screen) to obtain the 6-digit code.',
      'Enter the 6-digit OTP code and type your new password.',
      'Click "Update Password". Log in with your new password.'
    ]
  },

  // 5. METRICS, FORMULAS & CALCULATION RULES
  {
    id: 'metric-gpa-formula',
    category: 'metric',
    title: 'GPA & CGPA Calculation Formula',
    keywords: ['gpa formula', 'cgpa calculation', 'how gpa is calculated', 'grading scale', 'letter grade', 'weights'],
    summary: 'EduManager uses a 4.0 scale with weighted continuous assessments.',
    details: `Evaluation Assessment Weights (Total 100 Marks):
- Internal Mid-Term Exam: 30% (Max 30 Marks)
- External End-Semester Exam: 50% (Max 50 Marks)
- Assignments & Quizzes: 10% (Max 10 Marks)
- Practical / Laboratory: 10% (Max 10 Marks)

Grade Point Scale (out of 4.00):
- 85 - 100 Marks: Grade A (4.00 Grade Points) - Excellent
- 75 - 84 Marks: Grade B (3.00 Grade Points) - Good
- 65 - 74 Marks: Grade C (2.00 Grade Points) - Satisfactory
- 50 - 64 Marks: Grade D (1.00 Grade Points) - Pass
- Below 50 Marks: Grade F (0.00 Grade Points) - Fail

Cumulative CGPA Formula:
CGPA = Sum of (Course GPA * Course Credits) / Total Enrolled Credits.`
  },

  {
    id: 'metric-attendance-rules',
    category: 'metric',
    title: 'Attendance Rate & 75% Compliance Rule',
    keywords: ['attendance threshold', '75% rule', 'low attendance', 'attendance rate', 'compliance', 'bunk limit'],
    summary: 'Students must maintain a minimum 75% overall attendance rate to remain compliant.',
    details: `Attendance Compliance Rules:
- Attendance Rate = (Total Present Days + Late Days) / Total Conducted Days * 100.
- Compliant Status (🟢): Attendance Rate >= 75%.
- Critical Alert Status (🔴): Attendance Rate < 75%.
- Impact of Low Attendance: Students falling below 75% trigger automated alert badges in the Student Directory and notification reminders to parents.`
  },

  {
    id: 'metric-ml-risk-model',
    category: 'metric',
    title: 'Predictive ML Academic Risk Score',
    keywords: ['ml risk model', 'risk score', 'predict dropout', 'high risk', 'medium risk', 'low risk', 'at risk prediction'],
    summary: 'The system uses an ML predictive algorithm evaluating CGPA, attendance, and failed courses to identify at-risk students.',
    details: `Predictive Risk Assessment Factors:
- High Risk (🔴): CGPA < 2.50 OR Attendance < 75% with 2+ weak subjects. Risk Score 70-100%.
- Medium Risk (🟡): CGPA 2.50 - 2.99 OR Attendance 75-79%. Risk Score 40-69%.
- Low Risk (🟢): CGPA >= 3.00 AND Attendance >= 80%. Risk Score 0-39%.
- Action Trigger: Recommends parent counseling meetings, peer tutoring circles, and study schedule interventions.`
  },

  // 6. TROUBLESHOOTING & ERROR DIAGNOSTICS
  {
    id: 'troubleshoot-login-failure',
    category: 'troubleshooting',
    title: 'Troubleshooting Login & Authentication Errors',
    keywords: ['login failed', 'invalid credentials', 'cannot log in', 'account deactivated', 'unauthorized'],
    summary: 'Diagnostics for common login failures and account access issues.',
    details: `Common Login Errors & Solutions:
1. "Invalid credentials":
   - Verify that your email and password are correct. Use password eye toggle to inspect characters.
   - If password is forgotten, click "Forgot Password?" to request a reset OTP.

2. "This account has been deactivated or deleted":
   - Contact your institute Administrator to reactivate your profile.

3. "Session expired / Invalid refresh token":
   - Clear browser cache / localStorage and log in again.`
  },

  {
    id: 'troubleshoot-qr-camera-permission',
    category: 'troubleshooting',
    title: 'Troubleshooting QR Camera Scanner Errors',
    keywords: ['camera error', 'qr scanner not working', 'camera permission', 'cannot scan qr', 'scanner error'],
    summary: 'Solutions when camera scanner fails to open or capture QR codes.',
    details: `Camera Scanner Troubleshooting:
1. Browser Camera Permission Blocked:
   - Click the camera icon in your browser address bar and grant camera access permission to the site.
2. Camera occupied by another application:
   - Close other tabs or apps using your web camera and reload.
3. Manual Fallback:
   - If camera scanning is unavailable on your device, type the 6-digit Session Code into the manual input box in the QR modal.`
  },

  // 7. SYSTEM LIMITATIONS
  {
    id: 'limitation-boundaries',
    category: 'limitation',
    title: 'System Boundaries & Limitations',
    keywords: ['limitations', 'file size limit', 'max upload', 'csv format', 'browser support'],
    summary: 'Technical boundaries, supported file formats, and system limits.',
    details: `EduManager System Boundaries:
- Bulk Upload File Formats: .csv, .xlsx (Max 5MB file size).
- Password Security: Min 6 characters.
- Query Rate Limit: Max 30 requests/min on AI endpoints.
- Browser Compatibility: Modern evergreen browsers (Chrome, Firefox, Safari, Edge).`
  }
];
