"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const API_BASE = 'http://localhost:5001/api';
async function runE2EAudit() {
    console.log('🚀 Starting Full E2E API Audit for EduManager AI...\n');
    const auditResults = [];
    let adminToken = '';
    let facultyToken = '';
    let studentToken = '';
    // 1. LOGIN TESTS
    try {
        const adminRes = await axios_1.default.post(`${API_BASE}/auth/login`, { email: 'admin@sms.com', password: 'admin123' });
        adminToken = adminRes.data.accessToken;
        auditResults.push({ name: 'Auth - Admin Login', success: true });
    }
    catch (e) {
        auditResults.push({ name: 'Auth - Admin Login', success: false, details: e.response?.data?.error || e.message });
    }
    try {
        const facultyRes = await axios_1.default.post(`${API_BASE}/auth/login`, { email: 'faculty@sms.com', password: 'faculty123' });
        facultyToken = facultyRes.data.accessToken;
        auditResults.push({ name: 'Auth - Faculty Login', success: true });
    }
    catch (e) {
        auditResults.push({ name: 'Auth - Faculty Login', success: false, details: e.response?.data?.error || e.message });
    }
    try {
        const studentRes = await axios_1.default.post(`${API_BASE}/auth/login`, { email: 'student@sms.com', password: 'student123' });
        studentToken = studentRes.data.accessToken;
        auditResults.push({ name: 'Auth - Student Login', success: true });
    }
    catch (e) {
        auditResults.push({ name: 'Auth - Student Login', success: false, details: e.response?.data?.error || e.message });
    }
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const facultyHeaders = { Authorization: `Bearer ${facultyToken}` };
    const studentHeaders = { Authorization: `Bearer ${studentToken}` };
    // 2. AUTH ME ENDPOINTS
    try {
        await axios_1.default.get(`${API_BASE}/auth/me`, { headers: adminHeaders });
        auditResults.push({ name: 'Auth - GET /auth/me (Admin)', success: true });
    }
    catch (e) {
        auditResults.push({ name: 'Auth - GET /auth/me (Admin)', success: false, details: e.response?.data?.error || e.message });
    }
    try {
        await axios_1.default.get(`${API_BASE}/auth/me`, { headers: studentHeaders });
        auditResults.push({ name: 'Auth - GET /auth/me (Student)', success: true });
    }
    catch (e) {
        auditResults.push({ name: 'Auth - GET /auth/me (Student)', success: false, details: e.response?.data?.error || e.message });
    }
    // 3. DASHBOARD METRICS
    try {
        await axios_1.default.get(`${API_BASE}/dashboard/stats`, { headers: adminHeaders });
        auditResults.push({ name: 'Dashboard - GET /dashboard/stats', success: true });
    }
    catch (e) {
        auditResults.push({ name: 'Dashboard - GET /dashboard/stats', success: false, details: e.response?.data?.error || e.message });
    }
    // 4. STUDENTS API
    let createdStudentId = '';
    try {
        const res = await axios_1.default.get(`${API_BASE}/students`, { headers: adminHeaders });
        auditResults.push({ name: 'Students - GET /students', success: true, details: `Count: ${res.data.students?.length}` });
    }
    catch (e) {
        auditResults.push({ name: 'Students - GET /students', success: false, details: e.response?.data?.error || e.message });
    }
    try {
        const email = `audit_stu_${Date.now()}@sms.com`;
        const res = await axios_1.default.post(`${API_BASE}/students`, {
            name: 'Audit Test Student',
            email,
            age: 21,
            gender: 'Male',
            grade: 'Senior',
            department: 'CSE',
            semester: 6,
            parentName: 'Parent Test',
            parentPhone: '9876543210',
            address: 'Test Address'
        }, { headers: adminHeaders });
        createdStudentId = res.data.student?._id || res.data.student?.id;
        auditResults.push({ name: 'Students - POST /students (Create)', success: true, details: `ID: ${createdStudentId}` });
    }
    catch (e) {
        auditResults.push({ name: 'Students - POST /students (Create)', success: false, details: e.response?.data?.error || e.message });
    }
    if (createdStudentId) {
        try {
            await axios_1.default.get(`${API_BASE}/students/${createdStudentId}`, { headers: adminHeaders });
            auditResults.push({ name: 'Students - GET /students/:id', success: true });
        }
        catch (e) {
            auditResults.push({ name: 'Students - GET /students/:id', success: false, details: e.response?.data?.error || e.message });
        }
        try {
            await axios_1.default.put(`${API_BASE}/students/${createdStudentId}`, { grade: 'Senior Honor' }, { headers: adminHeaders });
            auditResults.push({ name: 'Students - PUT /students/:id (Update)', success: true });
        }
        catch (e) {
            auditResults.push({ name: 'Students - PUT /students/:id (Update)', success: false, details: e.response?.data?.error || e.message });
        }
        try {
            await axios_1.default.put(`${API_BASE}/students/${createdStudentId}/password`, { password: 'newStudentPass123' }, { headers: adminHeaders });
            auditResults.push({ name: 'Students - PUT /students/:id/password (Edit Password)', success: true });
        }
        catch (e) {
            auditResults.push({ name: 'Students - PUT /students/:id/password (Edit Password)', success: false, details: e.response?.data?.error || e.message });
        }
        try {
            await axios_1.default.delete(`${API_BASE}/students/${createdStudentId}`, { headers: adminHeaders });
            auditResults.push({ name: 'Students - DELETE /students/:id (Soft Delete)', success: true });
        }
        catch (e) {
            auditResults.push({ name: 'Students - DELETE /students/:id (Soft Delete)', success: false, details: e.response?.data?.error || e.message });
        }
        try {
            await axios_1.default.post(`${API_BASE}/students/${createdStudentId}/restore`, {}, { headers: adminHeaders });
            auditResults.push({ name: 'Students - POST /students/:id/restore', success: true });
        }
        catch (e) {
            auditResults.push({ name: 'Students - POST /students/:id/restore', success: false, details: e.response?.data?.error || e.message });
        }
    }
    // Exports
    try {
        await axios_1.default.get(`${API_BASE}/students/export/csv`, { headers: adminHeaders });
        auditResults.push({ name: 'Students - Export CSV', success: true });
    }
    catch (e) {
        auditResults.push({ name: 'Students - Export CSV', success: false, details: e.response?.data?.error || e.message });
    }
    try {
        await axios_1.default.get(`${API_BASE}/students/export/excel`, { headers: adminHeaders, responseType: 'arraybuffer' });
        auditResults.push({ name: 'Students - Export Excel', success: true });
    }
    catch (e) {
        auditResults.push({ name: 'Students - Export Excel', success: false, details: e.response?.data?.error || e.message });
    }
    try {
        await axios_1.default.get(`${API_BASE}/students/export/pdf`, { headers: adminHeaders, responseType: 'arraybuffer' });
        auditResults.push({ name: 'Students - Export PDF', success: true });
    }
    catch (e) {
        auditResults.push({ name: 'Students - Export PDF', success: false, details: e.response?.data?.error || e.message });
    }
    // 5. COURSES API
    let createdCourseId = '';
    try {
        const res = await axios_1.default.get(`${API_BASE}/courses`, { headers: adminHeaders });
        auditResults.push({ name: 'Courses - GET /courses', success: true, details: `Count: ${res.data.courses?.length}` });
    }
    catch (e) {
        auditResults.push({ name: 'Courses - GET /courses', success: false, details: e.response?.data?.error || e.message });
    }
    try {
        const code = `CS_${Date.now().toString().slice(-4)}`;
        const res = await axios_1.default.post(`${API_BASE}/courses`, {
            code,
            name: 'Audit Data Science 101',
            department: 'CSE',
            credits: 4,
            semester: 5
        }, { headers: adminHeaders });
        createdCourseId = res.data.course?._id || res.data.course?.id;
        auditResults.push({ name: 'Courses - POST /courses (Create)', success: true, details: `ID: ${createdCourseId}` });
    }
    catch (e) {
        auditResults.push({ name: 'Courses - POST /courses (Create)', success: false, details: e.response?.data?.error || e.message });
    }
    if (createdCourseId) {
        try {
            await axios_1.default.put(`${API_BASE}/courses/${createdCourseId}`, { name: 'Audit Data Science 101 Advanced' }, { headers: adminHeaders });
            auditResults.push({ name: 'Courses - PUT /courses/:id (Update)', success: true });
        }
        catch (e) {
            auditResults.push({ name: 'Courses - PUT /courses/:id (Update)', success: false, details: e.response?.data?.error || e.message });
        }
    }
    // 6. FACULTY API
    try {
        const res = await axios_1.default.get(`${API_BASE}/faculty`, { headers: adminHeaders });
        auditResults.push({ name: 'Faculty - GET /faculty', success: true, details: `Count: ${res.data.faculties?.length}` });
    }
    catch (e) {
        auditResults.push({ name: 'Faculty - GET /faculty', success: false, details: e.response?.data?.error || e.message });
    }
    // 7. ATTENDANCE API
    try {
        const res = await axios_1.default.get(`${API_BASE}/attendance`, { headers: adminHeaders });
        auditResults.push({ name: 'Attendance - GET /attendance', success: true, details: `Records: ${res.data.attendance?.length}` });
    }
    catch (e) {
        auditResults.push({ name: 'Attendance - GET /attendance', success: false, details: e.response?.data?.error || e.message });
    }
    try {
        await axios_1.default.get(`${API_BASE}/attendance/heatmap`, { headers: adminHeaders });
        auditResults.push({ name: 'Attendance - GET /attendance/heatmap', success: true });
    }
    catch (e) {
        auditResults.push({ name: 'Attendance - GET /attendance/heatmap', success: false, details: e.response?.data?.error || e.message });
    }
    if (createdStudentId && createdCourseId) {
        try {
            await axios_1.default.post(`${API_BASE}/attendance/mark`, {
                studentId: createdStudentId,
                courseId: createdCourseId,
                date: new Date().toISOString().slice(0, 10),
                status: 'Present'
            }, { headers: adminHeaders });
            auditResults.push({ name: 'Attendance - POST /attendance/mark', success: true });
        }
        catch (e) {
            auditResults.push({ name: 'Attendance - POST /attendance/mark', success: false, details: e.response?.data?.error || e.message });
        }
    }
    // 8. RESULTS API
    try {
        const res = await axios_1.default.get(`${API_BASE}/results`, { headers: adminHeaders });
        auditResults.push({ name: 'Results - GET /results', success: true, details: `Count: ${res.data.results?.length}` });
    }
    catch (e) {
        auditResults.push({ name: 'Results - GET /results', success: false, details: e.response?.data?.error || e.message });
    }
    if (createdStudentId && createdCourseId) {
        try {
            await axios_1.default.post(`${API_BASE}/results`, {
                studentId: createdStudentId,
                courseId: createdCourseId,
                semester: 5,
                internal: 18,
                external: 45,
                assignment: 14,
                practical: 13
            }, { headers: adminHeaders });
            auditResults.push({ name: 'Results - POST /results (Save Result)', success: true });
        }
        catch (e) {
            auditResults.push({ name: 'Results - POST /results (Save Result)', success: false, details: e.response?.data?.error || e.message });
        }
    }
    // 9. AI ASSISTANT & INTELLIGENCE API
    try {
        await axios_1.default.get(`${API_BASE}/ai/academic-insights`, { headers: adminHeaders });
        auditResults.push({ name: 'AI - GET /ai/academic-insights', success: true });
    }
    catch (e) {
        auditResults.push({ name: 'AI - GET /ai/academic-insights', success: false, details: e.response?.data?.error || e.message });
    }
    try {
        await axios_1.default.get(`${API_BASE}/ai/at-risk-students`, { headers: adminHeaders });
        auditResults.push({ name: 'AI - GET /ai/at-risk-students', success: true });
    }
    catch (e) {
        auditResults.push({ name: 'AI - GET /ai/at-risk-students', success: false, details: e.response?.data?.error || e.message });
    }
    try {
        await axios_1.default.get(`${API_BASE}/ai/suggested-prompts`, { headers: adminHeaders });
        auditResults.push({ name: 'AI - GET /ai/suggested-prompts', success: true });
    }
    catch (e) {
        auditResults.push({ name: 'AI - GET /ai/suggested-prompts', success: false, details: e.response?.data?.error || e.message });
    }
    try {
        await axios_1.default.get(`${API_BASE}/ai/chat-history`, { headers: adminHeaders });
        auditResults.push({ name: 'AI - GET /ai/chat-history', success: true });
    }
    catch (e) {
        auditResults.push({ name: 'AI - GET /ai/chat-history', success: false, details: e.response?.data?.error || e.message });
    }
    try {
        await axios_1.default.post(`${API_BASE}/ai/chat`, { message: 'How many students are enrolled?' }, { headers: adminHeaders });
        auditResults.push({ name: 'AI - POST /ai/chat (Grounded Chatbot)', success: true });
    }
    catch (e) {
        auditResults.push({ name: 'AI - POST /ai/chat (Grounded Chatbot)', success: false, details: e.response?.data?.error || e.message });
    }
    try {
        await axios_1.default.post(`${API_BASE}/ai/nl-search`, { query: 'students in CSE' }, { headers: adminHeaders });
        auditResults.push({ name: 'AI - POST /ai/nl-search', success: true });
    }
    catch (e) {
        auditResults.push({ name: 'AI - POST /ai/nl-search', success: false, details: e.response?.data?.error || e.message });
    }
    // 10. SUMMARY OF RESULTS
    console.log('\n=================== E2E AUDIT SUMMARY ===================');
    let passed = 0;
    let failed = 0;
    for (const res of auditResults) {
        if (res.success) {
            passed++;
            console.log(`✅ [PASS] ${res.name} ${res.details ? `(${res.details})` : ''}`);
        }
        else {
            failed++;
            console.log(`❌ [FAIL] ${res.name} - ${res.details}`);
        }
    }
    console.log(`\nTOTAL: ${auditResults.length} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('=========================================================\n');
}
runE2EAudit().catch(err => {
    console.error('Fatal E2E Audit runner error:', err);
});
