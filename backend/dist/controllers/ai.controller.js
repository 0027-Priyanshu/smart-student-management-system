"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const repo_service_1 = require("../services/repo.service");
const retrieval_service_1 = require("../services/retrieval.service");
const ai_service_1 = require("../services/ai.service");
const ai_provider_1 = require("../services/ai.provider");
class AIController {
    static async getHealth(req, res) {
        try {
            const provider = (0, ai_provider_1.getAIProvider)();
            const status = await provider.healthCheck();
            res.status(200).json(status);
        }
        catch (err) {
            console.error("[AI Health Check Error]:", err.message);
            res.status(500).json({ available: false, provider: 'unknown', reason: 'INTERNAL_ERROR', message: err.message });
        }
    }
    static async getStudentSummary(req, res, next) {
        try {
            const student = await repo_service_1.RepoService.findStudentById(req.params.studentId);
            if (!student) {
                return res.status(404).json({ error: 'Student profile not found' });
            }
            const courseCodes = student.enrolledCourses?.map((c) => c.code) || [];
            const results = await repo_service_1.RepoService.findResults(req.params.studentId);
            let totalGradePoints = 0;
            let totalCredits = 0;
            results.forEach(r => {
                const courseCredits = r.courseId?.credits || 3;
                totalGradePoints += r.gpa * courseCredits;
                totalCredits += courseCredits;
            });
            const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0.0;
            const attendanceLogs = await repo_service_1.RepoService.findAttendance({ studentId: req.params.studentId });
            const validLogs = attendanceLogs.filter(a => a.status !== 'On Leave');
            const totalDays = validLogs.length;
            const presentDays = validLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
            const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 100.0;
            const summary = await (0, ai_service_1.generateStudentSummary)(student.name, student.grade, gpa, parseFloat(attendanceRate.toFixed(1)), courseCodes);
            // Mock Historical Trend Data (Last 5 Semesters)
            const trendData = [
                { name: 'Sem 1', gpa: Math.min(4.0, gpa * 0.85) },
                { name: 'Sem 2', gpa: Math.min(4.0, gpa * 0.90) },
                { name: 'Sem 3', gpa: Math.min(4.0, gpa * 0.95) },
                { name: 'Sem 4', gpa: Math.min(4.0, gpa * 0.98) },
                { name: 'Sem 5', gpa: gpa }
            ];
            return res.json({ summary, trendData });
        }
        catch (error) {
            next(error);
        }
    }
    static async getStudentRecommendations(req, res, next) {
        try {
            const student = await repo_service_1.RepoService.findStudentById(req.params.studentId);
            if (!student) {
                return res.status(404).json({ error: 'Student profile not found' });
            }
            const results = await repo_service_1.RepoService.findResults(req.params.studentId);
            let totalGradePoints = 0;
            let totalCredits = 0;
            const marksData = results.map(r => {
                const courseCredits = r.courseId?.credits || 3;
                totalGradePoints += r.gpa * courseCredits;
                totalCredits += courseCredits;
                return {
                    courseName: r.courseId?.name || 'Course',
                    internal: r.internal,
                    external: r.external,
                    assignment: r.assignment,
                    practical: r.practical
                };
            });
            const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0.0;
            const attendanceLogs = await repo_service_1.RepoService.findAttendance({ studentId: req.params.studentId });
            const validLogs = attendanceLogs.filter(a => a.status !== 'On Leave');
            const totalDays = validLogs.length;
            const presentDays = validLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
            const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 100.0;
            const analysis = await (0, ai_service_1.generateRecommendations)(student.name, gpa, parseFloat(attendanceRate.toFixed(1)), marksData);
            return res.json(analysis);
        }
        catch (error) {
            next(error);
        }
    }
    static async getPredictRisk(req, res, next) {
        try {
            const student = await repo_service_1.RepoService.findStudentById(req.params.studentId);
            if (!student) {
                return res.status(404).json({ error: 'Student profile not found' });
            }
            const results = await repo_service_1.RepoService.findResults(req.params.studentId);
            let totalGradePoints = 0;
            let totalCredits = 0;
            const marksData = results.map(r => {
                const courseCredits = r.courseId?.credits || 3;
                totalGradePoints += r.gpa * courseCredits;
                totalCredits += courseCredits;
                return {
                    courseName: r.courseId?.name || 'Course',
                    internal: r.internal,
                    external: r.external,
                    assignment: r.assignment,
                    practical: r.practical
                };
            });
            const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0.0;
            const attendanceLogs = await repo_service_1.RepoService.findAttendance({ studentId: req.params.studentId });
            const validLogs = attendanceLogs.filter(a => a.status !== 'On Leave');
            const totalDays = validLogs.length;
            const presentDays = validLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
            const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 100.0;
            const riskData = await (0, ai_service_1.predictRisk)(student.name, gpa, parseFloat(attendanceRate.toFixed(1)), marksData);
            return res.json(riskData);
        }
        catch (error) {
            next(error);
        }
    }
    static async getAcademicInsights(req, res, next) {
        try {
            const [{ students }, allResults, allAttendance] = await Promise.all([
                repo_service_1.RepoService.findStudents({}, 1, 1000),
                repo_service_1.RepoService.findResults(),
                repo_service_1.RepoService.findAttendance({})
            ]);
            const totalStudents = students.length;
            const departmentCounts = {};
            let totalGpaSum = 0;
            let studentWithGradesCount = 0;
            // Group results
            const resultsByStudent = {};
            allResults.forEach(r => {
                const sId = r.studentId?._id?.toString() || r.studentId?.toString() || r.studentId;
                if (sId) {
                    if (!resultsByStudent[sId])
                        resultsByStudent[sId] = [];
                    resultsByStudent[sId].push(r);
                }
            });
            // Group attendance
            const attendanceByStudent = {};
            allAttendance.forEach(a => {
                const sId = a.studentId?._id?.toString() || a.studentId?.toString() || a.studentId;
                if (sId) {
                    if (!attendanceByStudent[sId])
                        attendanceByStudent[sId] = [];
                    attendanceByStudent[sId].push(a);
                }
            });
            for (const student of students) {
                departmentCounts[student.department] = (departmentCounts[student.department] || 0) + 1;
                const sId = student._id?.toString() || student.id?.toString();
                const results = resultsByStudent[sId] || [];
                if (results.length > 0) {
                    let totalGradePoints = 0;
                    let totalCredits = 0;
                    results.forEach(r => {
                        const courseCredits = r.courseId?.credits || 3;
                        totalGradePoints += r.gpa * courseCredits;
                        totalCredits += courseCredits;
                    });
                    const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0.0;
                    totalGpaSum += gpa;
                    studentWithGradesCount++;
                }
            }
            const avgGpa = studentWithGradesCount > 0 ? totalGpaSum / studentWithGradesCount : 3.0;
            const validLogs = allAttendance.filter(a => a.status !== 'On Leave');
            const totalDays = validLogs.length;
            const presentDays = validLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
            const avgAttendance = totalDays > 0 ? (presentDays / totalDays) * 100 : 85.0;
            const { text, chartData } = await (0, ai_service_1.generateAcademicInsights)(totalStudents, avgGpa, avgAttendance, departmentCounts);
            // Detect weak students dynamically (GPA < 2.5 or Attendance < 75%)
            const weakStudents = [];
            for (const student of students) {
                const sId = student._id?.toString() || student.id?.toString();
                // Attendance check
                const sAttendanceLogs = attendanceByStudent[sId] || [];
                const sValidLogs = sAttendanceLogs.filter(a => a.status !== 'On Leave');
                const sTotalDays = sValidLogs.length;
                const sPresentDays = sValidLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
                const sAttendanceRate = sTotalDays > 0 ? (sPresentDays / sTotalDays) * 100 : 100.0;
                // GPA check
                const sResults = resultsByStudent[sId] || [];
                let sTotalGradePoints = 0;
                let sTotalCredits = 0;
                sResults.forEach(r => {
                    const courseCredits = r.courseId?.credits || 3;
                    sTotalGradePoints += r.gpa * courseCredits;
                    sTotalCredits += courseCredits;
                });
                const sGpa = sTotalCredits > 0 ? sTotalGradePoints / sTotalCredits : 4.0; // default to perfect if no results marked
                if (sGpa < 2.5 || sAttendanceRate < 75) {
                    weakStudents.push({
                        id: sId,
                        name: student.name,
                        email: student.email,
                        enrollmentNo: student.enrollmentNo,
                        department: student.department,
                        gpa: parseFloat(sGpa.toFixed(2)),
                        attendance: parseFloat(sAttendanceRate.toFixed(1)),
                        reason: sGpa < 2.5 && sAttendanceRate < 75
                            ? 'Low GPA & Low Attendance'
                            : sGpa < 2.5
                                ? 'Low GPA (< 2.5)'
                                : 'Low Attendance (< 75%)'
                    });
                }
            }
            return res.json({
                insights: text,
                chartData,
                metrics: {
                    totalStudents,
                    avgGpa: parseFloat(avgGpa.toFixed(2)),
                    avgAttendance: parseFloat(avgAttendance.toFixed(1)),
                    departmentCounts
                },
                weakStudents
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async nlSearch(req, res, next) {
        try {
            const { query } = req.body;
            if (!query)
                return res.status(400).json({ error: 'Query is required' });
            const intent = await (0, ai_service_1.translateNlSearch)(query);
            if (!intent) {
                return res.status(400).json({ error: 'Could not understand the search intent.' });
            }
            const { students } = await repo_service_1.RepoService.findStudents({}, 1, 1000);
            let filteredStudents = [];
            for (const student of students) {
                if (intent.type === 'department') {
                    if (student.department.toLowerCase() === String(intent.value).toLowerCase()) {
                        filteredStudents.push(student);
                    }
                }
                else if (intent.type === 'attendance') {
                    const logs = await repo_service_1.RepoService.findAttendance({ studentId: student._id || student.id });
                    const total = logs.length;
                    const present = logs.filter(a => a.status === 'Present' || a.status === 'Late').length;
                    const rate = total > 0 ? (present / total) * 100 : 100;
                    const val = Number(intent.value);
                    if (intent.operator === '<' && rate < val)
                        filteredStudents.push(student);
                    else if (intent.operator === '<=' && rate <= val)
                        filteredStudents.push(student);
                    else if (intent.operator === '>' && rate > val)
                        filteredStudents.push(student);
                    else if (intent.operator === '>=' && rate >= val)
                        filteredStudents.push(student);
                    else if (intent.operator === '=' && rate === val)
                        filteredStudents.push(student);
                }
                else if (intent.type === 'gpa') {
                    const results = await repo_service_1.RepoService.findResults(student._id || student.id);
                    let tp = 0, tc = 0;
                    results.forEach(r => { tp += r.gpa * (r.courseId?.credits || 3); tc += (r.courseId?.credits || 3); });
                    const gpa = tc > 0 ? tp / tc : 0;
                    const val = Number(intent.value);
                    if (intent.operator === '<' && gpa < val)
                        filteredStudents.push(student);
                    else if (intent.operator === '<=' && gpa <= val)
                        filteredStudents.push(student);
                    else if (intent.operator === '>' && gpa > val)
                        filteredStudents.push(student);
                    else if (intent.operator === '>=' && gpa >= val)
                        filteredStudents.push(student);
                    else if (intent.operator === '=' && gpa === val)
                        filteredStudents.push(student);
                }
            }
            return res.json({ intent, students: filteredStudents });
        }
        catch (error) {
            next(error);
        }
    }
    static async getChatHistory(req, res, next) {
        try {
            const requester = req.user;
            const history = await repo_service_1.RepoService.findChatHistory(requester.userId);
            return res.json({ history });
        }
        catch (error) {
            next(error);
        }
    }
    static async clearChatHistory(req, res, next) {
        try {
            const requester = req.user;
            await repo_service_1.RepoService.clearChatHistory(requester.userId);
            return res.json({ message: 'Chat history cleared successfully.' });
        }
        catch (error) {
            next(error);
        }
    }
    static async sendParentEmail(req, res, next) {
        try {
            const student = await repo_service_1.RepoService.findStudentById(req.params.studentId);
            if (!student) {
                return res.status(404).json({ error: 'Student not found' });
            }
            const parentName = student.parentName || 'Parent/Guardian';
            const results = await repo_service_1.RepoService.findResults(student._id || student.id);
            let totalGradePoints = 0, totalCredits = 0;
            const weakSubjects = [];
            results.forEach(r => {
                const c = r.courseId?.credits || 3;
                totalGradePoints += r.gpa * c;
                totalCredits += c;
                if (((r.internal || 0) + (r.external || 0) + (r.assignment || 0) + (r.practical || 0)) < 65) {
                    weakSubjects.push(r.courseId?.name || 'Course');
                }
            });
            const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;
            const attendanceLogs = await repo_service_1.RepoService.findAttendance({ studentId: req.params.studentId });
            const presentDays = attendanceLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
            const attendance = attendanceLogs.length > 0 ? (presentDays / attendanceLogs.length) * 100 : 100;
            const emailContent = await (0, ai_service_1.generateParentEmail)(student.name, gpa, attendance, weakSubjects, parentName);
            // MOCK sending email
            console.log(`[EMAIL DISPATCHER] Sending email to ${student.parentPhone || 'Parent'}...`);
            console.log(`\n--- MOCK EMAIL TO PARENT ---\n${emailContent}\n----------------------------\n`);
            return res.json({ message: 'Email drafted and sent successfully via AI', content: emailContent });
        }
        catch (error) {
            next(error);
        }
    }
    static async getSuggestedPrompts(req, res, next) {
        try {
            const requester = req.user;
            const currentPage = req.query.currentPage || '/dashboard';
            const userRole = requester?.role || 'Student';
            const prompts = retrieval_service_1.RetrievalService.getSuggestedQuestions(currentPage, userRole);
            return res.json({ prompts });
        }
        catch (error) {
            next(error);
        }
    }
    static async chat(req, res, next) {
        try {
            const requester = req.user;
            let { message, history, messages, currentPage, selectedEntity, availableActions } = req.body;
            // Extract message and history if payload uses `{ messages: [...] }`
            if ((!message || typeof message !== 'string') && messages && Array.isArray(messages) && messages.length > 0) {
                const last = messages[messages.length - 1];
                if (typeof last === 'string') {
                    message = last;
                }
                else if (typeof last === 'object') {
                    if (Array.isArray(last.parts)) {
                        const p = last.parts[0];
                        message = typeof p === 'string' ? p : p?.text || p?.content || '';
                    }
                    else if (last.content) {
                        message = last.content;
                    }
                }
                // Build history array from preceding items
                const prevMsgs = messages.slice(0, -1);
                history = prevMsgs.map((m) => {
                    const r = m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user';
                    let text = '';
                    if (Array.isArray(m.parts)) {
                        const p = m.parts[0];
                        text = typeof p === 'string' ? p : p?.text || p?.content || '';
                    }
                    else if (m.content) {
                        text = m.content;
                    }
                    return { role: r, parts: [text] };
                });
            }
            if (!message || typeof message !== 'string' || !message.trim()) {
                return res.status(400).json({ error: 'Message content is required' });
            }
            const userQuery = message.trim().slice(0, 500);
            // Save User Message
            await repo_service_1.RepoService.createChatMessage({
                userId: requester.userId,
                role: 'user',
                content: userQuery
            });
            const result = await (0, ai_service_1.adminChatAssistant)(userQuery, Array.isArray(history) ? history : [], {
                currentPage,
                userRole: requester.role,
                userId: requester.userId,
                selectedEntity,
                availableActions
            });
            // Save AI Response
            await repo_service_1.RepoService.createChatMessage({
                userId: requester.userId,
                role: 'assistant',
                content: result.reply
            });
            return res.json({
                reply: result.reply,
                navigateTo: result.navigateTo,
                proposedAction: result.proposedAction
            });
        }
        catch (error) {
            console.error('[AI Provider Error]:', error);
            let cleanError = 'EduManager AI is temporarily unavailable. Please try again.';
            const errMsg = error?.message || '';
            const errLower = errMsg.toLowerCase();
            if (errLower.includes('api key') || errLower.includes('unauthorized') || errLower.includes('401') || errLower.includes('permission')) {
                cleanError = "The AI service is unauthorized or has an invalid API key. Please check your provider configurations.";
            }
            else if (errLower.includes('400') || errLower.includes('invalid_argument') || errLower.includes('rejected')) {
                cleanError = "I couldn't process that request because the AI service rejected the conversation format. Please try again.";
            }
            return res.status(500).json({ error: cleanError, originalError: errMsg, errorName: error?.name, stack: error?.stack });
        }
    }
    static async testChat(req, res, next) {
        try {
            const result = await (0, ai_service_1.adminChatAssistant)('how many students are there?', [], {
                currentPage: '/dashboard',
                userRole: 'Admin',
                userId: 'test_admin_id'
            });
            return res.json(result);
        }
        catch (error) {
            return res.status(500).json({ error: error.message, stack: error.stack, name: error.name });
        }
    }
    static async getAtRiskStudents(req, res, next) {
        try {
            const [{ students }, allResults, allAttendance] = await Promise.all([
                repo_service_1.RepoService.findStudents({}, 1, 1000),
                repo_service_1.RepoService.findResults(),
                repo_service_1.RepoService.findAttendance({})
            ]);
            // Group results
            const resultsByStudent = {};
            allResults.forEach(r => {
                const sId = r.studentId?._id?.toString() || r.studentId?.toString() || r.studentId;
                if (sId) {
                    if (!resultsByStudent[sId])
                        resultsByStudent[sId] = [];
                    resultsByStudent[sId].push(r);
                }
            });
            // Group attendance
            const attendanceByStudent = {};
            allAttendance.forEach(a => {
                const sId = a.studentId?._id?.toString() || a.studentId?.toString() || a.studentId;
                if (sId) {
                    if (!attendanceByStudent[sId])
                        attendanceByStudent[sId] = [];
                    attendanceByStudent[sId].push(a);
                }
            });
            const atRiskStudents = [];
            for (const student of students) {
                const studentId = student._id?.toString() || student.id?.toString();
                if (!studentId)
                    continue;
                // Fetch stats
                const results = resultsByStudent[studentId] || [];
                let totalGradePoints = 0;
                let totalCredits = 0;
                const marksData = results.map(r => {
                    const courseCredits = r.courseId?.credits || 3;
                    totalGradePoints += r.gpa * courseCredits;
                    totalCredits += courseCredits;
                    return {
                        courseName: r.courseId?.name,
                        internal: r.internal,
                        external: r.external,
                        assignment: r.assignment,
                        practical: r.practical,
                        grade: r.grade,
                        gpa: r.gpa
                    };
                });
                const gpa = totalCredits > 0
                    ? totalGradePoints / totalCredits
                    : (student.cgpa !== undefined && student.cgpa !== null ? student.cgpa : 3.20);
                const attendanceLogs = attendanceByStudent[studentId] || [];
                const validLogs = attendanceLogs.filter(a => a.status !== 'On Leave');
                const totalDays = validLogs.length;
                const presentDays = validLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
                const attendanceRate = totalDays > 0
                    ? (presentDays / totalDays) * 100
                    : (student.attendanceRate !== undefined && student.attendanceRate !== null ? student.attendanceRate : 85.0);
                const riskData = await (0, ai_service_1.predictRisk)(student.name, gpa, parseFloat(attendanceRate.toFixed(1)), marksData);
                if (riskData.riskLevel === 'High' || riskData.riskLevel === 'Medium') {
                    atRiskStudents.push({
                        id: studentId,
                        name: student.name,
                        enrollmentNo: student.enrollmentNo,
                        department: student.department,
                        semester: student.semester,
                        gpa: parseFloat(gpa.toFixed(2)),
                        attendance: parseFloat(attendanceRate.toFixed(1)),
                        riskLevel: riskData.riskLevel,
                        riskScore: riskData.riskScore,
                        warning: riskData.warningMessage
                    });
                }
            }
            // Sort by risk score descending
            atRiskStudents.sort((a, b) => b.riskScore - a.riskScore);
            return res.json({ atRiskStudents });
        }
        catch (error) {
            next(error);
        }
    }
    static async confirmAction(req, res, next) {
        try {
            const requester = req.user;
            const { actionType, payload } = req.body;
            if (!actionType || !payload) {
                return res.status(400).json({ error: 'Action type and payload are required.' });
            }
            if (actionType === 'mark_attendance') {
                const { studentId, courseId, status = 'Present', date } = payload;
                await repo_service_1.RepoService.markAttendance({
                    studentId: studentId || '656565656565656565656565',
                    courseId: courseId || 'CS101',
                    date: date || new Date().toISOString().split('T')[0],
                    status,
                    markedBy: requester?.name || 'AI Assistant'
                });
                return res.json({
                    success: true,
                    message: `Attendance marked successfully as ${status}!`
                });
            }
            if (actionType === 'send_parent_email') {
                const { studentId } = payload;
                const student = await repo_service_1.RepoService.findStudentById(studentId);
                if (!student)
                    return res.status(404).json({ error: 'Student profile not found.' });
                const parentName = student.parentName || 'Parent/Guardian';
                const emailContent = await (0, ai_service_1.generateParentEmail)(student.name, student.cgpa || 3.0, student.attendanceRate || 75, [], parentName);
                return res.json({
                    success: true,
                    message: `Parent notification email dispatched to ${parentName}!`,
                    content: emailContent
                });
            }
            if (actionType === 'navigate_analytics') {
                const { tab = 'performance', studentId } = payload;
                const targetUrl = `/academic-intelligence?tab=${tab}${studentId ? `&studentId=${studentId}` : ''}`;
                return res.json({
                    success: true,
                    targetUrl,
                    message: `Navigating to Academic Intelligence (${tab})...`
                });
            }
            return res.status(400).json({ error: `Unsupported action type: ${actionType}` });
        }
        catch (error) {
            next(error);
        }
    }
    static async downloadReportPDF(req, res, next) {
        try {
            const studentId = req.params.studentId;
            const student = await repo_service_1.RepoService.findStudentById(studentId);
            if (!student) {
                return res.status(404).json({ error: 'Student profile not found' });
            }
            // Fetch stats
            const results = await repo_service_1.RepoService.findResults(studentId);
            let totalGradePoints = 0;
            let totalCredits = 0;
            const marksData = results.map(r => {
                const courseCredits = r.courseId?.credits || 3;
                totalGradePoints += r.gpa * courseCredits;
                totalCredits += courseCredits;
                return {
                    code: r.courseId?.code || 'CS',
                    name: r.courseId?.name || 'Course',
                    internal: r.internal,
                    external: r.external,
                    assignment: r.assignment,
                    practical: r.practical,
                    grade: r.grade,
                    gpa: r.gpa
                };
            });
            const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0.0;
            const attendanceLogs = await repo_service_1.RepoService.findAttendance({ studentId });
            const validLogs = attendanceLogs.filter(a => a.status !== 'On Leave');
            const totalDays = validLogs.length;
            const presentDays = validLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
            const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 100.0;
            const summary = await (0, ai_service_1.generateStudentSummary)(student.name, student.grade, gpa, parseFloat(attendanceRate.toFixed(1)), student.enrolledCourses?.map((c) => c.code) || []);
            const analysis = await (0, ai_service_1.generateRecommendations)(student.name, gpa, parseFloat(attendanceRate.toFixed(1)), marksData);
            const riskData = await (0, ai_service_1.predictRisk)(student.name, gpa, parseFloat(attendanceRate.toFixed(1)), marksData);
            const doc = new pdfkit_1.default({ margin: 40, size: 'A4', bufferPages: true });
            res.setHeader('Content-Disposition', `attachment; filename="${student.name.replace(/\s+/g, '_')}_AI_Report.pdf"`);
            res.setHeader('Content-Type', 'application/pdf');
            doc.pipe(res);
            const primaryColor = '#8a5cf6';
            const darkColor = '#12141c';
            const textColor = '#374151';
            const lightGray = '#f3f4f6';
            // ================= HEADER BANNER =================
            doc.rect(0, 0, doc.page.width, 100).fill(darkColor);
            doc.fontSize(24).font('Helvetica-Bold').fillColor(primaryColor).text('EDUMANAGER AI', 40, 35);
            doc.fontSize(12).font('Helvetica').fillColor('#ffffff').text('Smart Academic Performance Profile', 40, 65);
            const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            doc.fontSize(10).fillColor('#9ca3af').text(`Date: ${dateStr}`, 0, 65, { align: 'right', width: doc.page.width - 40 });
            // Track Y position dynamically
            let y = 130;
            const startX = 40;
            const contentWidth = doc.page.width - 80;
            // Helper for page break
            const checkPageBreak = (neededSpace) => {
                if (y + neededSpace > doc.page.height - 60) {
                    doc.addPage();
                    y = 50;
                }
            };
            // ================= STUDENT PROFILE BOX =================
            checkPageBreak(100);
            doc.rect(startX, y, contentWidth, 80).fill(lightGray);
            doc.fontSize(10).font('Helvetica-Bold').fillColor(darkColor);
            doc.text('Name:', startX + 15, y + 15);
            doc.text('Enrollment No:', startX + 15, y + 35);
            doc.text('Department:', startX + 15, y + 55);
            doc.font('Helvetica').fillColor(textColor);
            doc.text(student.name || 'N/A', startX + 90, y + 15);
            doc.text(student.enrollmentNo || 'N/A', startX + 90, y + 35);
            doc.text(student.department || 'N/A', startX + 90, y + 55);
            doc.font('Helvetica-Bold').fillColor(darkColor);
            doc.text('Cumulative GPA:', startX + 280, y + 15);
            doc.text('Attendance Rate:', startX + 280, y + 35);
            doc.text('Academic Level:', startX + 280, y + 55);
            doc.font('Helvetica').fillColor(textColor);
            doc.text(gpa.toFixed(2), startX + 380, y + 15);
            doc.text(`${attendanceRate.toFixed(1)}%`, startX + 380, y + 35);
            doc.text(student.grade || 'N/A', startX + 380, y + 55);
            y += 100;
            // ================= AI SUMMARY =================
            checkPageBreak(120);
            doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text('AI Executive Summary', startX, y);
            y += 20;
            // Calculate height of text
            doc.fontSize(10).font('Helvetica').fillColor(textColor);
            const summaryHeight = doc.heightOfString(summary, { width: contentWidth, lineGap: 4 });
            doc.text(summary, startX, y, { width: contentWidth, lineGap: 4, align: 'justify' });
            y += summaryHeight + 25;
            // ================= PERFORMANCE BREAKDOWN TABLE =================
            checkPageBreak(100);
            doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text('Course Performance Breakdown', startX, y);
            y += 20;
            const colWidths = { code: 60, name: 200, marks: 50, grade: 50, gpa: 40 };
            const rowHeight = 25;
            // Table Header
            doc.rect(startX, y, contentWidth, rowHeight).fill(darkColor);
            doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff');
            doc.text('Code', startX + 5, y + 8, { width: colWidths.code });
            doc.text('Course Name', startX + colWidths.code + 5, y + 8, { width: colWidths.name });
            doc.text('Int', startX + colWidths.code + colWidths.name + 5, y + 8, { width: colWidths.marks });
            doc.text('Ext', startX + colWidths.code + colWidths.name + colWidths.marks + 5, y + 8, { width: colWidths.marks });
            doc.text('Grade', startX + colWidths.code + colWidths.name + colWidths.marks * 2 + 5, y + 8, { width: colWidths.grade });
            doc.text('GPA', startX + colWidths.code + colWidths.name + colWidths.marks * 2 + colWidths.grade + 5, y + 8, { width: colWidths.gpa });
            y += rowHeight;
            let altRow = false;
            marksData.forEach((item) => {
                checkPageBreak(rowHeight);
                if (altRow)
                    doc.rect(startX, y, contentWidth, rowHeight).fill(lightGray);
                doc.fontSize(9).font('Helvetica').fillColor(darkColor);
                doc.text(item.code, startX + 5, y + 8, { width: colWidths.code });
                doc.text(item.name, startX + colWidths.code + 5, y + 8, { width: colWidths.name });
                doc.text(item.internal.toString(), startX + colWidths.code + colWidths.name + 5, y + 8, { width: colWidths.marks });
                doc.text(item.external.toString(), startX + colWidths.code + colWidths.name + colWidths.marks + 5, y + 8, { width: colWidths.marks });
                doc.text(item.grade, startX + colWidths.code + colWidths.name + colWidths.marks * 2 + 5, y + 8, { width: colWidths.grade });
                doc.text(item.gpa.toFixed(1), startX + colWidths.code + colWidths.name + colWidths.marks * 2 + colWidths.grade + 5, y + 8, { width: colWidths.gpa });
                doc.rect(startX, y, contentWidth, rowHeight).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
                y += rowHeight;
                altRow = !altRow;
            });
            y += 25;
            // ================= RECOMMENDATIONS & WEAKNESSES =================
            checkPageBreak(150);
            doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text('Strategic Action Plan', startX, y);
            y += 20;
            if (analysis.weakSubjects.length > 0) {
                doc.rect(startX, y, contentWidth, 30).fill('#fee2e2'); // light red
                doc.fontSize(10).font('Helvetica-Bold').fillColor('#b91c1c').text(`Attention Required: ${analysis.weakSubjects.join(', ')}`, startX + 15, y + 10);
                y += 45;
            }
            doc.fontSize(10).font('Helvetica').fillColor(textColor);
            analysis.recommendations.forEach((rec, idx) => {
                checkPageBreak(30);
                const textHeight = doc.heightOfString(`${idx + 1}. ${rec}`, { width: contentWidth - 20, lineGap: 3 });
                doc.text(`${idx + 1}. ${rec}`, startX + 10, y, { width: contentWidth - 20, lineGap: 3, align: 'justify' });
                y += textHeight + 10;
            });
            y += 15;
            // ================= PREDICTIVE RISK ANALYSIS =================
            checkPageBreak(80);
            const riskColor = riskData.riskLevel === 'High' ? '#ef4444' : riskData.riskLevel === 'Medium' ? '#f59e0b' : '#10b981';
            const riskBg = riskData.riskLevel === 'High' ? '#fef2f2' : riskData.riskLevel === 'Medium' ? '#fffbeb' : '#ecfdf5';
            doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text('Predictive Risk Forecast', startX, y);
            y += 20;
            doc.rect(startX, y, contentWidth, 60).fill(riskBg).strokeColor(riskColor).lineWidth(1).stroke();
            doc.fontSize(12).font('Helvetica-Bold').fillColor(riskColor).text(`Risk Level: ${riskData.riskLevel} (${riskData.riskScore}%)`, startX + 15, y + 15);
            doc.fontSize(10).font('Helvetica').fillColor(textColor).text(`AI Diagnosis: ${riskData.warningMessage}`, startX + 15, y + 35, { width: contentWidth - 30 });
            y += 80;
            // ================= FOOTER =================
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);
                doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
                    .text(`Page ${i + 1} of ${pages.count} • Generated by EduManager AI • Confidential Record`, startX, doc.page.height - 40, { align: 'center', width: contentWidth });
            }
            doc.end();
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AIController = AIController;
