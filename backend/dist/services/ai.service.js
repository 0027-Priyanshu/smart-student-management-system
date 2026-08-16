"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStudentSummary = generateStudentSummary;
exports.generateRecommendations = generateRecommendations;
exports.generateAcademicInsights = generateAcademicInsights;
exports.adminChatAssistant = adminChatAssistant;
exports.predictRisk = predictRisk;
exports.translateNlSearch = translateNlSearch;
exports.generateParentEmail = generateParentEmail;
const repo_service_1 = require("./repo.service");
const retrieval_service_1 = require("./retrieval.service");
const metrics_service_1 = require("./metrics.service");
const ai_provider_1 = require("./ai.provider");
// 1. Generate Student Academic Summary
async function generateStudentSummary(studentName, grade, gpa, attendanceRate, courses) {
    const gpaStr = gpa !== null ? gpa.toFixed(2) : 'N/A (Pending Results)';
    const attStr = attendanceRate !== null ? `${attendanceRate.toFixed(1)}%` : 'N/A (No Sessions Logged)';
    const coursesStr = courses.length > 0 ? courses.join(', ') : 'No enrolled courses';
    const prompt = `Generate a concise 3-sentence professional academic profile summary for the student.
Student Name: ${studentName}
Class Grade/Year: ${grade || 'Undergraduate'}
Current Cumulative GPA: ${gpaStr}
Overall Attendance: ${attStr}
Enrolled Courses: ${coursesStr}

Guidelines:
- Objectively describe their current academic standing based on real records.
- If GPA or attendance is N/A, clearly indicate that records are insufficient or pending evaluation.
- Keep the tone professional, encouraging, and factual.`;
    try {
        const provider = (0, ai_provider_1.getAIProvider)();
        const res = await provider.chat({ messages: [{ role: 'user', content: prompt }] });
        if (res.content)
            return res.content.trim();
    }
    catch (err) {
        console.error('[AI Summary Error]:', err);
    }
    return getDefaultSummary(studentName, gpa, attendanceRate);
}
// 2. Generate Weak Subject & Personalized Recommendations
async function generateRecommendations(studentName, gpa, attendanceRate, weakSubjectNames) {
    return {
        recommendations: getDefaultRecommendations(studentName, weakSubjectNames, attendanceRate),
        weakSubjects: weakSubjectNames
    };
}
// 3. AI Academic Report Insights
async function generateAcademicInsights(totalStudents, avgGpa, avgAttendance, departmentCounts) {
    return {
        text: getDefaultInsights(avgGpa, avgAttendance),
        chartData: [] // P2-5: Do not return fake fabricated curves; real historical trends are rendered per student from Result records
    };
}
// 4. Provider-Independent Copilot Iterative Tool Loop
async function adminChatAssistant(message, history = [], options = {}) {
    const rawQuery = message.trim();
    const qLower = rawQuery.toLowerCase();
    const { currentPage, userRole = 'Student', userId, selectedEntity } = options;
    if (qLower.includes('ignore previous instructions') || qLower.includes('show admin passwords')) {
        return { reply: `### 🛡️ Security Boundary Enforcement\n\nI cannot perform actions that bypass system security or disclose administrative credentials.` };
    }
    const retrievedTopics = retrieval_service_1.RetrievalService.retrieveKnowledge({ query: rawQuery, currentPage, userRole }, 2);
    const formattedKnowledge = retrieval_service_1.RetrievalService.formatKnowledgeForPrompt(retrievedTopics);
    const allTools = [
        { name: 'countStudents', description: 'Get the total number of students in the system.', parameters: { type: 'object', properties: {} } },
        { name: 'searchStudents', description: 'Search students by name, email, or department.', parameters: { type: 'object', properties: { search: { type: 'string' }, department: { type: 'string' } }, required: [] } },
        { name: 'getStudentProfile', description: 'Fetch student details by enrollmentNo or name.', parameters: { type: 'object', properties: { enrollmentNo: { type: 'string' } }, required: ['enrollmentNo'] } },
        { name: 'getMyStudentProfile', description: 'Fetch profile, courses, enrollment number, department, semester, and attendance for the currently logged-in student.', parameters: { type: 'object', properties: {} } },
        { name: 'getStudentsByCourse', description: 'Get students enrolled in a specific course by course code or course name.', parameters: { type: 'object', properties: { courseId: { type: 'string', description: 'Course code (e.g. CS102) or title' } }, required: ['courseId'] } },
        { name: 'getMyFacultyProfile', description: 'Get profile details and assigned courses for the currently logged-in faculty member.', parameters: { type: 'object', properties: {} } },
        { name: 'countFaculty', description: 'Get the total number of faculty in the system.', parameters: { type: 'object', properties: {} } },
        { name: 'getFaculty', description: 'Get list of faculty.', parameters: { type: 'object', properties: {} } },
        { name: 'countCourses', description: 'Get the total number of courses.', parameters: { type: 'object', properties: {} } },
        { name: 'getCourse', description: 'Get course details by course code or title.', parameters: { type: 'object', properties: { code: { type: 'string', description: 'Course code (e.g. CS102) or title' } }, required: ['code'] } },
        { name: 'getStudentAttendance', description: 'Get attendance records and percentage for a student.', parameters: { type: 'object', properties: { studentId: { type: 'string' } }, required: ['studentId'] } },
        { name: 'getLowAttendanceStudents', description: 'Get students with attendance below 75%.', parameters: { type: 'object', properties: {} } },
        { name: 'getStudentGrades', description: 'Get academic results and cumulative GPA for a student.', parameters: { type: 'object', properties: { studentId: { type: 'string' } }, required: ['studentId'] } },
        { name: 'getDashboardMetrics', description: 'Get high-level institutional analytics (Admin only).', parameters: { type: 'object', properties: {} } },
        { name: 'getAtRiskStudents', description: 'Fetch students who are at risk due to low attendance or low grades.', parameters: { type: 'object', properties: {} } },
        { name: 'navigate', description: 'Navigate the user to an application route.', parameters: { type: 'object', properties: { page: { type: 'string' } }, required: ['page'] } }
    ];
    // Role-based tool scope reduction
    let tools = allTools;
    if (userRole === 'Student') {
        tools = allTools.filter(t => ['getMyStudentProfile', 'getStudentAttendance', 'getStudentGrades', 'getCourse', 'navigate'].includes(t.name));
    }
    else if (userRole === 'Faculty') {
        tools = allTools.filter(t => t.name !== 'countFaculty' && t.name !== 'getFaculty' && t.name !== 'getDashboardMetrics');
    }
    const systemInstruction = `You are EduManager AI Copilot. You assist users with academic information using verified tool data.
Current Route: ${currentPage || '/dashboard'}
User Role: ${userRole}
Context Entity: ${selectedEntity || 'None'}

Application Knowledge: ${formattedKnowledge}

CRITICAL RULES:
1. Always call tools to retrieve live database values.
2. NO FABRICATED OR DEFAULT ACADEMIC METRICS: If a student has no grades or attendance records, state that records are "N/A" or "Insufficient Data".
3. NOT FOUND HANDLING: If a tool returns a NOT_FOUND error, DO NOT invent or hallucinate a record. State clearly that the requested student, course, or record was not found.
4. ROLE BOUNDARIES: Students can only view their own records. Faculty can only query courses they teach and students enrolled in those courses.
5. NATURAL LANGUAGE ONLY: Synthesize tool results into clear, well-structured natural language. NEVER output raw JSON to the user.`;
    const provider = (0, ai_provider_1.getAIProvider)();
    // Clean history
    const cleanHistory = history.filter(h => h.role !== 'system');
    const chatMessages = [
        ...cleanHistory.map(h => ({ role: (h.role === 'model' || h.role === 'assistant') ? 'assistant' : 'user', content: h.parts[0] })),
        { role: 'user', content: rawQuery }
    ];
    let maxIterations = 6;
    let iteration = 0;
    let navigateTo;
    let lastToolResult = null;
    let lastToolName = '';
    let currentProvider = provider;
    try {
        while (iteration < maxIterations) {
            let response;
            try {
                response = await currentProvider.chat({
                    systemInstruction,
                    messages: chatMessages,
                    tools
                });
            }
            catch (err) {
                if (iteration === 0 && currentProvider.constructor.name === 'FreeLLMProvider') {
                    const { MockProvider } = require('./ai.provider');
                    currentProvider = new MockProvider();
                    response = await currentProvider.chat({
                        systemInstruction,
                        messages: chatMessages,
                        tools
                    });
                }
                else {
                    throw err;
                }
            }
            chatMessages.push(response);
            if (!response.tool_calls || response.tool_calls.length === 0) {
                let finalReply = response.content || 'No response generated.';
                try {
                    if (finalReply.trim().startsWith('{') || finalReply.trim().startsWith('[')) {
                        const parsed = JSON.parse(finalReply);
                        if (typeof parsed === 'object' && lastToolName) {
                            finalReply = formatDeterministicFallback(lastToolName, parsed);
                        }
                    }
                }
                catch (e) { }
                return { reply: finalReply, navigateTo };
            }
            for (const call of response.tool_calls) {
                const name = call.function.name;
                let args = {};
                try {
                    args = JSON.parse(call.function.arguments);
                }
                catch (e) { }
                let functionResult = { error: 'Unknown tool or execution failed' };
                // Authorization helpers
                const requireAdmin = () => { if (userRole !== 'Super Admin' && userRole !== 'Admin')
                    throw new Error('UNAUTHORIZED: Admin access required'); };
                const requireAdminOrFaculty = () => { if (userRole === 'Student')
                    throw new Error('UNAUTHORIZED: Faculty or Admin access required'); };
                try {
                    if (name === 'navigate') {
                        navigateTo = args.page;
                        functionResult = { success: true, navigatedTo: navigateTo };
                    }
                    // ---------------- STUDENT TOOLS ----------------
                    else if (name === 'getMyStudentProfile') {
                        if (!userId) {
                            functionResult = { error: 'NOT_FOUND', message: 'You must be logged in to view your profile.' };
                        }
                        else {
                            const st = await repo_service_1.RepoService.findStudentByUserId(userId);
                            if (!st) {
                                functionResult = { error: 'NOT_FOUND', message: 'Student profile not found for this user.' };
                            }
                            else {
                                const sId = (st._id || st.id).toString();
                                const [gpaData, attData] = await Promise.all([
                                    metrics_service_1.AcademicMetricsService.calculateStudentGpa(sId),
                                    metrics_service_1.AcademicMetricsService.calculateStudentAttendance(sId)
                                ]);
                                functionResult = {
                                    name: st.name,
                                    enrollmentNo: st.enrollmentNo,
                                    department: st.department,
                                    semester: st.semester || 1,
                                    grade: st.grade || 'N/A',
                                    attendance: attData.attendanceRate !== null ? `${attData.attendanceRate}%` : 'N/A',
                                    gpa: gpaData.gpa !== null ? gpaData.gpa : 'N/A',
                                    enrolledCourses: (st.enrolledCourses || []).map((c) => ({ name: c.name || c, code: c.code || 'CODE' }))
                                };
                            }
                        }
                    }
                    else if (name === 'countStudents') {
                        requireAdminOrFaculty();
                        if (userRole === 'Faculty' && userId) {
                            const facData = await metrics_service_1.AcademicMetricsService.getFacultyAcademicOverview(userId);
                            functionResult = { totalStudents: facData.enrolledStudentsCount, scope: 'assigned courses' };
                        }
                        else {
                            const { totalItems } = await repo_service_1.RepoService.findStudents({ isDeleted: false }, 1, 1);
                            functionResult = { totalStudents: totalItems, scope: 'institution' };
                        }
                    }
                    else if (name === 'searchStudents') {
                        requireAdminOrFaculty();
                        const { students } = await repo_service_1.RepoService.findStudents({ isDeleted: false, search: args.search, department: args.department }, 1, 50);
                        // Faculty RBAC filtering
                        let filtered = students;
                        if (userRole === 'Faculty' && userId) {
                            const fac = await repo_service_1.RepoService.findFacultyByUserId(userId);
                            const assignedIds = (fac?.assignedCourses || []).map((c) => (c._id || c.id || c).toString());
                            filtered = students.filter((s) => {
                                const sCourses = (s.enrolledCourses || []).map((c) => (c._id || c.id || c).toString());
                                return sCourses.some((cid) => assignedIds.includes(cid));
                            });
                        }
                        if (filtered.length === 0) {
                            functionResult = { error: 'NOT_FOUND', message: 'No matching students found.' };
                        }
                        else {
                            functionResult = { students: filtered.map((s) => ({ name: s.name, enrollmentNo: s.enrollmentNo, department: s.department })) };
                        }
                    }
                    else if (name === 'getStudentProfile') {
                        const query = args.enrollmentNo || args.studentId || '';
                        const s = await repo_service_1.RepoService.findStudentByEnrollmentNo(query) || await repo_service_1.RepoService.findStudentById(query);
                        if (!s) {
                            functionResult = { error: 'NOT_FOUND', message: `No student found with enrollment ID or name "${query}".` };
                        }
                        else {
                            const sUserId = (s.userId?._id || s.userId?.id || s.userId || '').toString();
                            if (userRole === 'Student' && userId && sUserId !== String(userId)) {
                                throw new Error('UNAUTHORIZED: You can only view your own student profile.');
                            }
                            if (userRole === 'Faculty' && userId) {
                                const fac = await repo_service_1.RepoService.findFacultyByUserId(userId);
                                const assignedIds = (fac?.assignedCourses || []).map((c) => (c._id || c.id || c).toString());
                                const sCourses = (s.enrolledCourses || []).map((c) => (c._id || c.id || c).toString());
                                const teaches = sCourses.some((cid) => assignedIds.includes(cid));
                                if (!teaches) {
                                    throw new Error('UNAUTHORIZED: You can only query students enrolled in courses you teach.');
                                }
                            }
                            const sId = (s._id || s.id).toString();
                            const [gpaData, attData] = await Promise.all([
                                metrics_service_1.AcademicMetricsService.calculateStudentGpa(sId),
                                metrics_service_1.AcademicMetricsService.calculateStudentAttendance(sId)
                            ]);
                            functionResult = {
                                name: s.name,
                                enrollmentNo: s.enrollmentNo,
                                department: s.department,
                                semester: s.semester || 1,
                                grade: s.grade || 'N/A',
                                gpa: gpaData.gpa !== null ? gpaData.gpa : 'N/A',
                                attendance: attData.attendanceRate !== null ? `${attData.attendanceRate}%` : 'N/A',
                                enrolledCourses: (s.enrolledCourses || []).map((c) => c.name || c.code || c)
                            };
                        }
                    }
                    else if (name === 'getStudentsByCourse') {
                        requireAdminOrFaculty();
                        const query = args.courseId || args.code || args.courseName || '';
                        const allCourses = await repo_service_1.RepoService.findCourses({ isDeleted: false });
                        const course = allCourses.find((c) => c.code?.toLowerCase() === query.toLowerCase() || c.name?.toLowerCase().includes(query.toLowerCase()));
                        if (!course) {
                            functionResult = { error: 'NOT_FOUND', message: `Course "${query}" was not found in the catalog.` };
                        }
                        else {
                            const cId = (course._id || course.id).toString();
                            if (userRole === 'Faculty' && userId) {
                                const fac = await repo_service_1.RepoService.findFacultyByUserId(userId);
                                const assignedIds = (fac?.assignedCourses || []).map((c) => (c._id || c.id || c).toString());
                                if (!assignedIds.includes(cId)) {
                                    throw new Error('UNAUTHORIZED: You are not assigned to teach this course.');
                                }
                            }
                            const { students } = await repo_service_1.RepoService.findStudents({ isDeleted: false, courseId: cId }, 1, 100);
                            functionResult = {
                                courseName: course.name,
                                courseCode: course.code,
                                studentsCount: students.length,
                                students: students.map((s) => ({ name: s.name, enrollmentNo: s.enrollmentNo }))
                            };
                        }
                    }
                    // ---------------- FACULTY TOOLS ----------------
                    else if (name === 'getMyFacultyProfile') {
                        if (!userId) {
                            functionResult = { error: 'NOT_FOUND', message: 'You must be logged in to view faculty details.' };
                        }
                        else {
                            const fac = await repo_service_1.RepoService.findFacultyByUserId(userId);
                            if (!fac) {
                                functionResult = { error: 'NOT_FOUND', message: 'Faculty profile not found.' };
                            }
                            else {
                                functionResult = {
                                    name: fac.name,
                                    email: fac.email,
                                    department: fac.department,
                                    designation: fac.designation || 'Professor',
                                    assignedCourses: (fac.assignedCourses || []).map((c) => ({ name: c.name || c, code: c.code || 'CODE' }))
                                };
                            }
                        }
                    }
                    else if (name === 'countFaculty') {
                        requireAdmin();
                        const totalFaculty = await repo_service_1.RepoService.countFaculties();
                        functionResult = { totalFaculty };
                    }
                    else if (name === 'getFaculty') {
                        requireAdmin();
                        const facs = await repo_service_1.RepoService.findFaculties({ isDeleted: false });
                        functionResult = { faculty: facs.map((f) => ({ name: f.name, department: f.department, designation: f.designation })) };
                    }
                    // ---------------- COURSES TOOLS ----------------
                    else if (name === 'countCourses') {
                        const totalCourses = await repo_service_1.RepoService.countCourses();
                        functionResult = { totalCourses };
                    }
                    else if (name === 'getCourse') {
                        const query = args.code || args.name || '';
                        const allCourses = await repo_service_1.RepoService.findCourses({ isDeleted: false });
                        const c = allCourses.find((item) => item.code?.toLowerCase() === query.toLowerCase() || item.name?.toLowerCase().includes(query.toLowerCase()));
                        functionResult = c ? { name: c.name, code: c.code, credits: c.credits, description: c.description, capacity: c.capacity } : { error: 'NOT_FOUND', message: `Course "${query}" not found.` };
                    }
                    // ---------------- ATTENDANCE & GRADES ----------------
                    else if (name === 'getStudentAttendance') {
                        const query = args.studentId || '';
                        let s = query ? (await repo_service_1.RepoService.findStudentByEnrollmentNo(query) || await repo_service_1.RepoService.findStudentById(query)) : null;
                        if (!s && userId) {
                            s = await repo_service_1.RepoService.findStudentByUserId(userId);
                        }
                        if (!s) {
                            functionResult = { error: 'NOT_FOUND', message: `Student "${query}" was not found.` };
                        }
                        else {
                            const sUserId = (s.userId?._id || s.userId?.id || s.userId || '').toString();
                            if (userRole === 'Student' && userId && sUserId !== String(userId)) {
                                throw new Error('UNAUTHORIZED: You are only allowed to view your own attendance records.');
                            }
                            if (userRole === 'Faculty' && userId) {
                                const fac = await repo_service_1.RepoService.findFacultyByUserId(userId);
                                const assignedIds = (fac?.assignedCourses || []).map((c) => (c._id || c.id || c).toString());
                                const sCourses = (s.enrolledCourses || []).map((c) => (c._id || c.id || c).toString());
                                if (!sCourses.some((cid) => assignedIds.includes(cid))) {
                                    throw new Error('UNAUTHORIZED: You can only view attendance for students in courses you teach.');
                                }
                            }
                            const sId = (s._id || s.id).toString();
                            const attData = await metrics_service_1.AcademicMetricsService.calculateStudentAttendance(sId);
                            functionResult = {
                                name: s.name,
                                enrollmentNo: s.enrollmentNo,
                                attendanceRate: attData.attendanceRate !== null ? `${attData.attendanceRate}%` : 'N/A (No sessions logged)',
                                totalSessions: attData.totalSessions,
                                presentCount: attData.presentCount,
                                absentCount: attData.absentCount
                            };
                        }
                    }
                    else if (name === 'getLowAttendanceStudents') {
                        requireAdminOrFaculty();
                        if (userRole === 'Faculty' && userId) {
                            const facData = await metrics_service_1.AcademicMetricsService.getFacultyAcademicOverview(userId);
                            const lowAtt = facData.atRiskStudents.filter(s => s.attendanceRate !== null && s.attendanceRate < 75);
                            functionResult = { count: lowAtt.length, students: lowAtt.map(s => ({ name: s.name, enrollmentNo: s.enrollmentNo, attendance: `${s.attendanceRate}%` })) };
                        }
                        else {
                            const overview = await metrics_service_1.AcademicMetricsService.getInstitutionAcademicOverview();
                            const lowAtt = overview.atRiskStudents.filter(s => s.attendanceRate !== null && s.attendanceRate < 75);
                            functionResult = { count: lowAtt.length, students: lowAtt.map(s => ({ name: s.name, enrollmentNo: s.enrollmentNo, attendance: `${s.attendanceRate}%` })) };
                        }
                    }
                    else if (name === 'getStudentGrades') {
                        const query = args.studentId || '';
                        let s = query ? (await repo_service_1.RepoService.findStudentByEnrollmentNo(query) || await repo_service_1.RepoService.findStudentById(query)) : null;
                        if (!s && userId) {
                            s = await repo_service_1.RepoService.findStudentByUserId(userId);
                        }
                        if (!s) {
                            functionResult = { error: 'NOT_FOUND', message: `Student "${query}" was not found.` };
                        }
                        else {
                            const sUserId = (s.userId?._id || s.userId?.id || s.userId || '').toString();
                            if (userRole === 'Student' && userId && sUserId !== String(userId)) {
                                throw new Error('UNAUTHORIZED: You are only allowed to view your own grades.');
                            }
                            if (userRole === 'Faculty' && userId) {
                                const fac = await repo_service_1.RepoService.findFacultyByUserId(userId);
                                const assignedIds = (fac?.assignedCourses || []).map((c) => (c._id || c.id || c).toString());
                                const sCourses = (s.enrolledCourses || []).map((c) => (c._id || c.id || c).toString());
                                if (!sCourses.some((cid) => assignedIds.includes(cid))) {
                                    throw new Error('UNAUTHORIZED: You can only view grades for students in courses you teach.');
                                }
                            }
                            const sId = (s._id || s.id).toString();
                            const [gpaData, results] = await Promise.all([
                                metrics_service_1.AcademicMetricsService.calculateStudentGpa(sId),
                                repo_service_1.RepoService.findResults(sId)
                            ]);
                            functionResult = {
                                name: s.name,
                                enrollmentNo: s.enrollmentNo,
                                gpa: gpaData.gpa !== null ? gpaData.gpa : 'N/A (No results recorded)',
                                totalCoursesGraded: gpaData.totalCoursesGraded,
                                grades: results.map((r) => ({
                                    course: r.courseId?.name || r.courseId?.code || 'Course',
                                    grade: r.grade,
                                    gpa: r.gpa,
                                    totalScore: (r.internal || 0) + (r.external || 0) + (r.assignment || 0) + (r.practical || 0)
                                }))
                            };
                        }
                    }
                    // ---------------- ANALYTICS ----------------
                    else if (name === 'getAtRiskStudents') {
                        requireAdminOrFaculty();
                        if (userRole === 'Faculty' && userId) {
                            const facData = await metrics_service_1.AcademicMetricsService.getFacultyAcademicOverview(userId);
                            functionResult = { atRiskCount: facData.atRiskStudentsCount, students: facData.atRiskStudents };
                        }
                        else {
                            const overview = await metrics_service_1.AcademicMetricsService.getInstitutionAcademicOverview();
                            functionResult = { atRiskCount: overview.metrics.studentsAtRisk, students: overview.atRiskStudents };
                        }
                    }
                    else if (name === 'getDashboardMetrics') {
                        requireAdmin();
                        const overview = await metrics_service_1.AcademicMetricsService.getInstitutionAcademicOverview();
                        functionResult = overview.metrics;
                    }
                }
                catch (authError) {
                    functionResult = { error: 'UNAUTHORIZED', message: authError.message };
                }
                chatMessages.push({
                    role: 'tool',
                    name: name,
                    tool_call_id: call.id || name,
                    content: JSON.stringify(functionResult)
                });
                lastToolName = name;
                lastToolResult = functionResult;
            }
            iteration++;
        }
        return { reply: 'I exceeded the maximum number of iterations while processing your request.', navigateTo };
    }
    catch (err) {
        if (iteration > 0 && lastToolResult && lastToolName) {
            return { reply: formatDeterministicFallback(lastToolName, lastToolResult), navigateTo };
        }
        console.error('[EduManager AI Error]:', err.message);
        throw err;
    }
}
function formatDeterministicFallback(toolName, data) {
    if (data?.error) {
        return data.message || `Error executing ${toolName}: ${data.error}`;
    }
    switch (toolName) {
        case 'countStudents':
            return `There are currently ${data.totalStudents || 0} student(s) registered in the system (${data.scope || 'institution'}).`;
        case 'searchStudents':
        case 'getStudentsByCourse':
            if (!data.students || data.students.length === 0)
                return 'No students found matching your criteria.';
            return `I found ${data.students.length} student(s):\n` + data.students.map((s, i) => `${i + 1}. ${s.name} (ID: ${s.enrollmentNo || 'N/A'})${s.department ? ` - ${s.department}` : ''}`).join('\n');
        case 'getStudentProfile':
            return `Student Profile: ${data.name} (ID: ${data.enrollmentNo})\n- Department: ${data.department}\n- GPA: ${data.gpa}\n- Attendance: ${data.attendance}`;
        case 'countFaculty':
            return `There are currently ${data.totalFaculty || 0} faculty members registered in the institution.`;
        case 'getFaculty':
            if (!data.faculty || data.faculty.length === 0)
                return 'No faculty members found.';
            return `Faculty Directory:\n` + data.faculty.map((f, i) => `${i + 1}. ${f.name} (${f.department || 'N/A'})`).join('\n');
        case 'countCourses':
            return `There are currently ${data.totalCourses || 0} academic courses registered.`;
        case 'getCourse':
            return `Course Details: ${data.name} (${data.code})\n- Credits: ${data.credits}\n- Description: ${data.description || 'N/A'}`;
        case 'getStudentAttendance':
            return `Attendance Summary for ${data.name} (${data.enrollmentNo}):\n- Overall Rate: ${data.attendanceRate}\n- Total Sessions Logged: ${data.totalSessions}`;
        case 'getLowAttendanceStudents':
            if (!data.count || data.count === 0)
                return 'No students currently have attendance below the 75% threshold.';
            return `There are ${data.count} student(s) with low attendance:\n` + data.students.map((s, i) => `${i + 1}. ${s.name} (ID: ${s.enrollmentNo}) - ${s.attendance}`).join('\n');
        case 'getStudentGrades':
            return `Academic Grade Record for ${data.name} (${data.enrollmentNo}):\n- Cumulative GPA: ${data.gpa}\n- Graded Assessments: ${data.totalCoursesGraded}`;
        case 'getAtRiskStudents':
            if (!data.atRiskCount || data.atRiskCount === 0)
                return 'No students are currently flagged as at-risk.';
            return `There are ${data.atRiskCount} at-risk student(s):\n` + data.students.map((s, i) => `${i + 1}. ${s.name} (ID: ${s.enrollmentNo}) - GPA: ${s.gpa || 'N/A'}, Attendance: ${s.attendanceRate ? `${s.attendanceRate}%` : 'N/A'}`).join('\n');
        case 'getDashboardMetrics':
            return `Institutional Metrics Overview:\n- Total Students: ${data.totalStudents || 0}\n- Total Faculty: ${data.totalFaculty || 0}\n- Total Courses: ${data.totalCourses || 0}\n- Average GPA: ${data.averageGpa || 'N/A'}\n- Attendance Today: ${data.attendanceToday ? `${data.attendanceToday}%` : 'N/A'}`;
        case 'navigate':
            return `Navigating to ${data.navigatedTo}...`;
        default:
            return typeof data === 'string' ? data : JSON.stringify(data);
    }
}
function getDefaultSummary(name, gpa, attendance) {
    if (gpa === null && attendance === null) {
        return `${name} has recently enrolled. Academic standing will be generated once semester results and attendance records are logged.`;
    }
    const gpaStr = gpa !== null ? `cumulative GPA of ${gpa.toFixed(2)}` : 'grades pending evaluation';
    const attStr = attendance !== null ? `attendance rate of ${attendance.toFixed(1)}%` : 'attendance pending';
    return `${name} is currently enrolled with a ${gpaStr} and an ${attStr}. Continued engagement in course lectures and assignments will foster continued growth.`;
}
function getDefaultRecommendations(name, weakSubjects, attendance) {
    const recs = [];
    if (weakSubjects.length > 0) {
        recs.push(`Schedule peer review or dedicated tutoring for ${weakSubjects.join(', ')}.`);
    }
    if (attendance !== null && attendance < 75) {
        recs.push(`Prioritize lecture attendance to meet the mandatory 75% institutional threshold.`);
    }
    recs.push(`Maintain regular revision checkpoints prior to term examinations.`);
    return recs;
}
function getDefaultInsights(gpa, attendance) {
    const gpaText = gpa !== null ? `average GPA of ${gpa.toFixed(2)}` : 'insufficient graded results';
    const attText = attendance !== null ? `attendance rate of ${attendance.toFixed(1)}%` : 'no attendance sessions logged today';
    return `Current institutional analytics demonstrate an ${gpaText} alongside an ${attText}.`;
}
async function predictRisk(studentName, gpa, attendanceRate, weakSubjectsCount) {
    if (gpa === null && attendanceRate === null) {
        return {
            riskScore: null,
            riskLevel: 'Insufficient Data',
            warningMessage: 'Pending graded assessments and attendance records'
        };
    }
    let riskScore = 0;
    if (gpa !== null) {
        if (gpa < 2.0)
            riskScore += 50;
        else if (gpa < 2.5)
            riskScore += 30;
        else if (gpa < 3.0)
            riskScore += 15;
    }
    if (attendanceRate !== null) {
        if (attendanceRate < 60)
            riskScore += 40;
        else if (attendanceRate < 75)
            riskScore += 25;
        else if (attendanceRate < 85)
            riskScore += 10;
    }
    riskScore += Math.min(30, weakSubjectsCount * 10);
    riskScore = Math.min(100, Math.max(0, riskScore));
    const riskLevel = riskScore >= 50 ? 'High' : riskScore >= 25 ? 'Medium' : 'Low';
    const warningMessage = riskLevel === 'High'
        ? 'Immediate academic intervention required'
        : riskLevel === 'Medium'
            ? 'Student requires active monitoring'
            : 'Stable academic standing';
    return { riskScore, riskLevel, warningMessage };
}
async function translateNlSearch(query) {
    const qLower = query.toLowerCase().trim();
    const attMatch = qLower.match(/attendance\s*(<|<=|>|>=|=)?\s*(\d+)/i) || qLower.match(/(below|above)\s*(\d+)%/i);
    if (attMatch) {
        let op = '<';
        let val = 75;
        if (qLower.includes('above') || qLower.includes('>'))
            op = '>';
        if (attMatch[2])
            val = parseInt(attMatch[2], 10);
        return { type: 'attendance', operator: op, value: val };
    }
    return null;
}
async function generateParentEmail(studentName, gpa, attendance, weakSubjects, parentName) {
    const gpaStr = gpa !== null ? gpa.toFixed(2) : 'Pending';
    const attStr = attendance !== null ? `${attendance.toFixed(1)}%` : 'Pending';
    const weakStr = weakSubjects.length > 0 ? `\nAreas flagged for improvement: ${weakSubjects.join(', ')}.` : '';
    const draft = `Dear ${parentName || 'Parent / Guardian'},\n\nWe are sharing an update regarding the academic progress of your ward, ${studentName}.\n\n- Cumulative GPA: ${gpaStr}\n- Attendance Record: ${attStr}${weakStr}\n\nPlease feel free to contact the academic advisory office if you have any questions.\n\nBest regards,\nEduManager Academic Administration`;
    return {
        draft,
        status: 'DRAFT_GENERATED'
    };
}
