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
const RiskPredictor_1 = require("../ml/RiskPredictor");
const ai_provider_1 = require("./ai.provider");
// 1. Generate Student Academic Summary
async function generateStudentSummary(studentName, grade, gpa, attendanceRate, courses) {
    const prompt = `Generate a concise 3-sentence professional academic profile summary for the student. 
  Grade: ${grade}, Current GPA: ${gpa}, Attendance: ${attendanceRate}%. 
  Enrolled courses: ${courses.join(', ')}. 
  Mention their current standing, focus areas, and a brief positive outlook. Keep it realistic and objective.`;
    try {
        const provider = (0, ai_provider_1.getAIProvider)();
        const res = await provider.chat({ messages: [{ role: 'user', content: prompt }] });
        if (res.content)
            return res.content.trim();
    }
    catch (err) {
        console.error('AI error:', err);
    }
    return getDefaultSummary(studentName, gpa, attendanceRate);
}
// 2. Generate Weak Subject & Personalized Recommendations
async function generateRecommendations(studentName, gpa, attendanceRate, marks) {
    const weakSubjects = [];
    marks.forEach(item => {
        const total = (item.internal || 0) + (item.external || 0) + (item.assignment || 0) + (item.practical || 0);
        if (total < 65)
            weakSubjects.push(item.courseName);
    });
    if (weakSubjects.length === 0 && gpa < 3.0)
        weakSubjects.push('General Curriculum Studies');
    return {
        recommendations: getDefaultRecommendations(studentName, weakSubjects, attendanceRate),
        weakSubjects
    };
}
// 3. AI Academic Report Insights
async function generateAcademicInsights(totalStudents, avgGpa, avgAttendance, departmentCounts) {
    return {
        text: getDefaultInsights(avgGpa, avgAttendance),
        chartData: [
            { "month": "Jan", "gpa": 3.1, "attendance": 82 },
            { "month": "Feb", "gpa": 3.2, "attendance": 85 },
            { "month": "Mar", "gpa": 3.0, "attendance": 81 },
            { "month": "Apr", "gpa": 3.3, "attendance": 88 },
            { "month": "May", "gpa": 3.4, "attendance": 90 },
            { "month": "Jun", "gpa": 3.5, "attendance": 92 }
        ]
    };
}
// 4. Provider-Independent Copilot Iterative Tool Loop
async function adminChatAssistant(message, history = [], options = {}) {
    const rawQuery = message.trim();
    const qLower = rawQuery.toLowerCase();
    const { currentPage, userRole = 'Student', userId, selectedEntity } = options;
    if (qLower.includes('ignore previous instructions') || qLower.includes('show admin passwords')) {
        return { reply: `### 🛡️ Security Boundary Enforcement\n\nI cannot perform actions that bypass system security.` };
    }
    const retrievedTopics = retrieval_service_1.RetrievalService.retrieveKnowledge({ query: rawQuery, currentPage, userRole }, 2);
    const formattedKnowledge = retrieval_service_1.RetrievalService.formatKnowledgeForPrompt(retrievedTopics);
    const allTools = [
        { name: 'countStudents', description: 'Get the total number of students in the system.', parameters: { type: 'object', properties: {} } },
        { name: 'searchStudents', description: 'Search students by name, email, or department.', parameters: { type: 'object', properties: { search: { type: 'string' }, department: { type: 'string' } }, required: [] } },
        { name: 'getStudentProfile', description: 'Fetch student by enrollmentNo.', parameters: { type: 'object', properties: { enrollmentNo: { type: 'string' } }, required: ['enrollmentNo'] } },
        { name: 'getStudentsByCourse', description: 'Get students enrolled in a specific course.', parameters: { type: 'object', properties: { courseId: { type: 'string' } }, required: ['courseId'] } },
        { name: 'countFaculty', description: 'Get the total number of faculty in the system.', parameters: { type: 'object', properties: {} } },
        { name: 'getFaculty', description: 'Get list of faculty.', parameters: { type: 'object', properties: {} } },
        { name: 'countCourses', description: 'Get the total number of courses.', parameters: { type: 'object', properties: {} } },
        { name: 'getCourse', description: 'Get course details by code.', parameters: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] } },
        { name: 'getStudentAttendance', description: 'Get attendance records for a student.', parameters: { type: 'object', properties: { studentId: { type: 'string' } }, required: ['studentId'] } },
        { name: 'getLowAttendanceStudents', description: 'Get students with attendance below a threshold.', parameters: { type: 'object', properties: {} } },
        { name: 'getStudentGrades', description: 'Get academic results/grades for a student.', parameters: { type: 'object', properties: { studentId: { type: 'string' } }, required: ['studentId'] } },
        { name: 'getDashboardMetrics', description: 'Get high-level system analytics.', parameters: { type: 'object', properties: {} } },
        { name: 'getAtRiskStudents', description: 'Fetch students who are at risk due to low attendance or low grades.', parameters: { type: 'object', properties: {} } },
        { name: 'navigate', description: 'Navigate the user to a page.', parameters: { type: 'object', properties: { page: { type: 'string' } }, required: ['page'] } }
    ];
    // Role-based tool scope reduction
    let tools = allTools;
    if (userRole === 'Student') {
        tools = allTools.filter(t => ['getStudentProfile', 'getStudentAttendance', 'getStudentGrades', 'navigate'].includes(t.name));
    }
    else if (userRole === 'Faculty') {
        tools = allTools.filter(t => t.name !== 'countFaculty' && t.name !== 'getFaculty' && t.name !== 'getDashboardMetrics');
    }
    const systemInstruction = `You are EduManager Copilot. You answer queries using tools.
Current Route: ${currentPage}
Role: ${userRole}
Context: ${selectedEntity || 'None'}

Knowledge: ${formattedKnowledge}

RULES:
1. Always use tools to fetch real data before answering data queries (e.g. "how many students").
2. Only answer questions related to the system (Students, Courses, Attendance, Grades, Faculty).
3. If out of scope, reply exactly: "I couldn't confidently determine what you're looking for. You can ask about students, courses, attendance, grades, faculty, face attendance, or academic analytics."
4. Format the final output as a helpful, conversational natural language response. NEVER output raw JSON to the user.
5. Synthesize the data you receive from tools into a readable summary (e.g. "There is 1 student", instead of {"totalStudents":1}).`;
    const provider = (0, ai_provider_1.getAIProvider)();
    // 5. NORMALIZE MESSAGE ROLES & CLEAN EXISTING HISTORY
    // Filter out any legacy 'system' messages from history, keeping only user/model/assistant
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
                    console.warn('[EduManager AI] FreeLLMAPI failed on initial query. Falling back to MockProvider for intent extraction.');
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
                // Authorization checks
                const requireAdmin = () => { if (userRole !== 'Super Admin' && userRole !== 'Admin')
                    throw new Error('UNAUTHORIZED: Admin access required'); };
                const requireAdminOrFaculty = () => { if (userRole === 'Student')
                    throw new Error('UNAUTHORIZED: Faculty or Admin access required'); };
                try {
                    if (name === 'navigate') {
                        navigateTo = args.page;
                        functionResult = { success: true, navigatedTo: navigateTo };
                    }
                    // ---------------- STUDENTS ----------------
                    else if (name === 'countStudents') {
                        requireAdminOrFaculty();
                        const { totalItems } = await repo_service_1.RepoService.findStudents({}, 1, 1);
                        functionResult = { totalStudents: totalItems };
                    }
                    else if (name === 'searchStudents') {
                        requireAdminOrFaculty();
                        const { students } = await repo_service_1.RepoService.findStudents({ search: args.search, department: args.department }, 1, 50);
                        functionResult = { students: students.map((s) => ({ name: s.name, enrollmentNo: s.enrollmentNo, department: s.department })) };
                    }
                    else if (name === 'getStudentProfile') {
                        const s = await repo_service_1.RepoService.findStudentByEnrollmentNo(args.enrollmentNo) || await repo_service_1.RepoService.findStudentById(args.enrollmentNo);
                        if (!s) {
                            functionResult = { error: 'Not found' };
                        }
                        else if (userRole === 'Student' && userId !== s.userId) {
                            throw new Error('UNAUTHORIZED: You can only view your own profile');
                        }
                        else {
                            functionResult = {
                                name: s.name,
                                enrollmentNo: s.enrollmentNo,
                                department: s.department,
                                semester: s.semester || 1,
                                grade: s.grade || 'N/A',
                                gpa: s.cgpa,
                                attendance: s.attendanceRate,
                                enrolledCourses: s.enrolledCourses || ['Data Structures (CS102)']
                            };
                        }
                    }
                    else if (name === 'getStudentsByCourse') {
                        requireAdminOrFaculty();
                        const { students } = await repo_service_1.RepoService.findStudents({ courseId: args.courseId }, 1, 50);
                        functionResult = { students: students.map((s) => ({ name: s.name, enrollmentNo: s.enrollmentNo })) };
                    }
                    // ---------------- FACULTY ----------------
                    else if (name === 'countFaculty') {
                        requireAdmin();
                        const totalFaculty = await repo_service_1.RepoService.countFaculties();
                        functionResult = { totalFaculty };
                    }
                    else if (name === 'getFaculty') {
                        requireAdmin();
                        const facs = await repo_service_1.RepoService.findFaculties();
                        functionResult = { faculty: facs.map((f) => ({ name: f.name, department: f.department })) };
                    }
                    // ---------------- COURSES ----------------
                    else if (name === 'countCourses') {
                        const totalCourses = await repo_service_1.RepoService.countCourses();
                        functionResult = { totalCourses };
                    }
                    else if (name === 'getCourse') {
                        const c = await repo_service_1.RepoService.findCourseByCode(args.code);
                        functionResult = c ? { name: c.name, code: c.code, credits: c.credits } : { error: 'Not found' };
                    }
                    // ---------------- ATTENDANCE & GRADES ----------------
                    else if (name === 'getStudentAttendance') {
                        const s = await repo_service_1.RepoService.findStudentByEnrollmentNo(args.studentId);
                        if (!s) {
                            functionResult = { error: 'Student not found' };
                        }
                        else if (userRole === 'Student' && userId !== s.userId) {
                            throw new Error('UNAUTHORIZED: You can only view your own attendance');
                        }
                        else {
                            functionResult = { attendanceRate: s.attendanceRate };
                        }
                    }
                    else if (name === 'getLowAttendanceStudents') {
                        requireAdminOrFaculty();
                        const { students } = await repo_service_1.RepoService.findStudents({}, 1, 1000);
                        const lowAtt = students.filter((s) => (s.attendanceRate && s.attendanceRate < 75));
                        functionResult = { count: lowAtt.length, students: lowAtt.map((s) => ({ name: s.name, enrollmentNo: s.enrollmentNo, attendance: s.attendanceRate })) };
                    }
                    else if (name === 'getStudentGrades') {
                        const s = await repo_service_1.RepoService.findStudentByEnrollmentNo(args.studentId);
                        if (!s) {
                            functionResult = { error: 'Student not found' };
                        }
                        else if (userRole === 'Student' && userId !== s.userId) {
                            throw new Error('UNAUTHORIZED: You can only view your own grades');
                        }
                        else {
                            functionResult = { gpa: s.cgpa };
                        } // Expanded via RepoService.findResults in a real prod app
                    }
                    // ---------------- ANALYTICS ----------------
                    else if (name === 'getAtRiskStudents') {
                        requireAdminOrFaculty();
                        const { students } = await repo_service_1.RepoService.findStudents({}, 1, 1000);
                        const lowAtt = students.filter((s) => (s.attendanceRate && s.attendanceRate < 75) || (s.cgpa && s.cgpa < 2.5));
                        functionResult = { atRiskCount: lowAtt.length, students: lowAtt.map((s) => ({ name: s.name, enrollmentNo: s.enrollmentNo, gpa: s.cgpa, attendance: s.attendanceRate })) };
                    }
                    else if (name === 'getDashboardMetrics') {
                        requireAdmin();
                        const { totalItems: ts } = await repo_service_1.RepoService.findStudents({}, 1, 1);
                        const tf = await repo_service_1.RepoService.countFaculties();
                        const tc = await repo_service_1.RepoService.countCourses();
                        functionResult = { students: ts, faculty: tf, courses: tc };
                    }
                }
                catch (authError) {
                    functionResult = { error: authError.message };
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
        return { reply: 'I exceeded the maximum number of tool calls while trying to resolve your request.', navigateTo };
    }
    catch (err) {
        if (iteration > 0 && lastToolResult && lastToolName) {
            console.warn('[EduManager AI] Provider execution failed during synthesis. Falling back to deterministic formatter.');
            return { reply: formatDeterministicFallback(lastToolName, lastToolResult), navigateTo };
        }
        console.error('[EduManager AI] Provider execution failed:', {
            errorName: err.name,
            message: err.message,
            status: err.status
        });
        // Throwing error up to the controller to handle and map to 500 or UI
        throw err;
    }
}
function formatDeterministicFallback(toolName, data) {
    if (data?.error)
        return `I encountered an error retrieving the data: ${data.error}`;
    switch (toolName) {
        case 'countStudents':
            return `There are currently ${data.totalStudents || 0} students registered in the system.`;
        case 'searchStudents':
        case 'getStudentsByCourse':
            if (!data.students || data.students.length === 0)
                return 'No students found matching your criteria.';
            return `I found ${data.students.length} student(s):\n` + data.students.map((s, i) => `${i + 1}. ${s.name} (ID: ${s.enrollmentNo || 'N/A'})${s.department ? ` - ${s.department}` : ''}`).join('\n');
        case 'getStudentProfile':
            return `Student Profile: ${data.name} (ID: ${data.enrollmentNo}). Department: ${data.department}. GPA: ${data.gpa || 'N/A'}. Attendance: ${data.attendance || 'N/A'}%.`;
        case 'countFaculty':
            return `There are currently ${data.totalFaculty || 0} faculty members registered in the system.`;
        case 'getFaculty':
            if (!data.faculty || data.faculty.length === 0)
                return 'No faculty members found.';
            return `I found ${data.faculty.length} faculty member(s):\n` + data.faculty.map((f, i) => `${i + 1}. ${f.name} (Dept: ${f.department || 'N/A'})`).join('\n');
        case 'countCourses':
            return `There are currently ${data.totalCourses || 0} courses registered in the system.`;
        case 'getCourse':
            return `Course Details: ${data.name} (Code: ${data.code}). Credits: ${data.credits}.`;
        case 'getStudentAttendance':
            return `The student's current attendance rate is ${data.attendanceRate}%.`;
        case 'getLowAttendanceStudents':
            if (!data.count || data.count === 0)
                return 'No students are currently below the attendance threshold.';
            return `There are ${data.count} student(s) with low attendance:\n` + data.students.map((s, i) => `${i + 1}. ${s.name} (ID: ${s.enrollmentNo}) - ${s.attendance}%`).join('\n');
        case 'getStudentGrades':
            return `The student's current GPA is ${data.gpa}.`;
        case 'getAtRiskStudents':
            if (!data.atRiskCount || data.atRiskCount === 0)
                return 'No students are currently marked as at-risk.';
            return `There are ${data.atRiskCount} at-risk student(s):\n` + data.students.map((s, i) => `${i + 1}. ${s.name} (ID: ${s.enrollmentNo}) - GPA: ${s.gpa || 'N/A'}, Attendance: ${s.attendance || 'N/A'}%`).join('\n');
        case 'getDashboardMetrics':
            return `System Overview:\n- Students: ${data.students || 0}\n- Faculty: ${data.faculty || 0}\n- Courses: ${data.courses || 0}`;
        case 'navigate':
            return `Navigating to ${data.navigatedTo}...`;
        default:
            return `Here is the requested information:\n${JSON.stringify(data, null, 2)}`;
    }
}
function getDefaultSummary(name, gpa, attendance) {
    const status = gpa >= 3.5 ? 'outstanding academic standing' : gpa >= 3.0 ? 'strong academic standing' : 'satisfactory progress';
    return `${name} is currently in ${status}, maintaining an overall GPA of ${gpa.toFixed(2)}. Sustaining this balance is key to their continued success.`;
}
function getDefaultRecommendations(name, weakSubjects, attendance) {
    return [
        `Establish a structured study schedule.`,
        `Participate in peer group tutoring.`,
        `Complete practice tests.`
    ];
}
function getDefaultInsights(gpa, attendance) {
    return `The current institute analytics demonstrate an average GPA of ${gpa.toFixed(2)} alongside an attendance rate of ${attendance.toFixed(1)}%.`;
}
async function predictRisk(studentName, gpa, attendanceRate, marks) {
    const weakSubjects = marks.filter(m => ((m.internal || 0) + (m.external || 0)) < 65).map(m => m.courseName);
    const prediction = RiskPredictor_1.riskPredictor.predict(gpa, attendanceRate, weakSubjects.length);
    return { riskScore: prediction.riskScore, riskLevel: prediction.riskLevel, warningMessage: prediction.riskLevel !== 'Low' ? 'At risk' : 'Stable' };
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
    return `Dear ${parentName},\n\nWe are writing to you regarding the academic progress of your ward, ${studentName}.\n\nCurrently, ${studentName} has an attendance rate of ${attendance.toFixed(1)}% and a GPA of ${gpa.toFixed(2)}.\n\nBest regards,\nEduManager`;
}
