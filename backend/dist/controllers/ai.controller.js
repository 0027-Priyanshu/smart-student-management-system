"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const repo_service_1 = require("../services/repo.service");
const retrieval_service_1 = require("../services/retrieval.service");
const metrics_service_1 = require("../services/metrics.service");
const notification_service_1 = require("../services/notification.service");
const ai_service_1 = require("../services/ai.service");
const ai_provider_1 = require("../services/ai.provider");
async function authorizeStudentAccess(requester, student) {
    if (!requester || !student)
        return false;
    if (requester.role === 'Super Admin' || requester.role === 'Admin')
        return true;
    const sUserId = (student.userId?._id || student.userId?.id || student.userId || '').toString();
    if (requester.role === 'Student') {
        return sUserId === requester.userId.toString();
    }
    if (requester.role === 'Faculty') {
        const fac = await repo_service_1.RepoService.findFacultyByUserId(requester.userId);
        if (!fac)
            return false;
        const assignedIds = (fac.assignedCourses || []).map((c) => (c._id || c.id || c).toString());
        const sCourses = (student.enrolledCourses || []).map((c) => (c._id || c.id || c).toString());
        return sCourses.some((cid) => assignedIds.includes(cid));
    }
    return false;
}
class AIController {
    static async getHealth(req, res) {
        try {
            const provider = (0, ai_provider_1.getAIProvider)();
            const status = await provider.healthCheck();
            res.status(200).json(status);
        }
        catch (err) {
            console.error("[AI Health Check Error]:", err.message);
            res.status(500).json({ available: false, provider: 'unknown', reason: 'INTERNAL_ERROR', message: 'AI service is temporarily unavailable.' });
        }
    }
    static async getStudentSummary(req, res, next) {
        try {
            const requester = req.user;
            const student = await repo_service_1.RepoService.findStudentById(req.params.studentId);
            if (!student) {
                return res.status(404).json({ error: 'Student profile not found' });
            }
            const isAuthorized = await authorizeStudentAccess(requester, student);
            if (!isAuthorized) {
                return res.status(403).json({ error: 'Access denied: You do not have permission to view this student AI summary.' });
            }
            const sId = (student._id || student.id).toString();
            const [gpaData, attData] = await Promise.all([
                metrics_service_1.AcademicMetricsService.calculateStudentGpa(sId),
                metrics_service_1.AcademicMetricsService.calculateStudentAttendance(sId)
            ]);
            const courseCodes = (student.enrolledCourses || []).map((c) => c.code || c.name || c);
            const summary = await (0, ai_service_1.generateStudentSummary)(student.name, student.grade, gpaData.gpa, attData.attendanceRate, courseCodes);
            // Real historical trend data (empty array if no historical semesters exist - NO fake curves)
            const trendData = gpaData.semesterTrend.map(st => ({
                name: `Sem ${st.semester}`,
                gpa: st.gpa
            }));
            return res.json({ summary, trendData });
        }
        catch (error) {
            next(error);
        }
    }
    static async getStudentRecommendations(req, res, next) {
        try {
            const requester = req.user;
            const student = await repo_service_1.RepoService.findStudentById(req.params.studentId);
            if (!student) {
                return res.status(404).json({ error: 'Student profile not found' });
            }
            const isAuthorized = await authorizeStudentAccess(requester, student);
            if (!isAuthorized) {
                return res.status(403).json({ error: 'Access denied: You do not have permission to view recommendations for this student.' });
            }
            const sId = (student._id || student.id).toString();
            const [gpaData, attData, weakSubjects] = await Promise.all([
                metrics_service_1.AcademicMetricsService.calculateStudentGpa(sId),
                metrics_service_1.AcademicMetricsService.calculateStudentAttendance(sId),
                metrics_service_1.AcademicMetricsService.calculateWeakSubjects(sId)
            ]);
            const weakSubjectNames = weakSubjects.map(w => `${w.courseName} (${w.courseCode})`);
            const analysis = await (0, ai_service_1.generateRecommendations)(student.name, gpaData.gpa, attData.attendanceRate, weakSubjectNames);
            return res.json(analysis);
        }
        catch (error) {
            next(error);
        }
    }
    static async getPredictRisk(req, res, next) {
        try {
            const requester = req.user;
            const student = await repo_service_1.RepoService.findStudentById(req.params.studentId);
            if (!student) {
                return res.status(404).json({ error: 'Student profile not found' });
            }
            const isAuthorized = await authorizeStudentAccess(requester, student);
            if (!isAuthorized) {
                return res.status(403).json({ error: 'Access denied: You do not have permission to predict risk for this student.' });
            }
            const sId = (student._id || student.id).toString();
            const riskData = await metrics_service_1.AcademicMetricsService.calculateStudentRisk(sId);
            return res.json(riskData);
        }
        catch (error) {
            next(error);
        }
    }
    static async getAcademicInsights(req, res, next) {
        try {
            const requester = req.user;
            // Calculate database-first verified metrics
            const metrics = requester?.role === 'Faculty'
                ? await metrics_service_1.AcademicMetricsService.getStructuredFacultyMetrics(requester.userId)
                : await metrics_service_1.AcademicMetricsService.getStructuredInstitutionalMetrics();
            // Pass verified metrics to LLM for strategic interpretation with deterministic fallback
            const { insights, insightSource } = await (0, ai_service_1.generateInstitutionalInsights)(metrics);
            return res.json({
                metrics,
                insights,
                // Legacy compatibility fields
                text: insights.summary,
                chartData: metrics.departmentDistribution || [],
                insightSource,
                generatedAt: metrics.generatedAt
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
            const { students } = await repo_service_1.RepoService.findStudents({ isDeleted: false }, 1, 1000);
            const filteredStudents = [];
            for (const student of students) {
                const sId = (student._id || student.id).toString();
                if (intent.type === 'attendance') {
                    const attData = await metrics_service_1.AcademicMetricsService.calculateStudentAttendance(sId);
                    if (attData.attendanceRate !== null) {
                        const val = Number(intent.value);
                        const rate = attData.attendanceRate;
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
            const requester = req.user;
            const student = await repo_service_1.RepoService.findStudentById(req.params.studentId);
            if (!student) {
                return res.status(404).json({ error: 'Student not found' });
            }
            const isAuthorized = await authorizeStudentAccess(requester, student);
            if (!isAuthorized) {
                return res.status(403).json({ error: 'Access denied: You do not have permission to draft or send parent emails for this student.' });
            }
            const sId = (student._id || student.id).toString();
            const [gpaData, attData, weakSubjects] = await Promise.all([
                metrics_service_1.AcademicMetricsService.calculateStudentGpa(sId),
                metrics_service_1.AcademicMetricsService.calculateStudentAttendance(sId),
                metrics_service_1.AcademicMetricsService.calculateWeakSubjects(sId)
            ]);
            const parentName = student.parentName || 'Parent / Guardian';
            const weakSubjectNames = weakSubjects.map(w => w.courseName);
            const emailDraft = await (0, ai_service_1.generateParentEmail)(student.name, gpaData.gpa, attData.attendanceRate, weakSubjectNames, parentName);
            const shouldSend = req.body?.send === true;
            if (shouldSend && student.email) {
                const sendResult = await notification_service_1.NotificationService.sendEmail(student.email, `Academic Performance Update for ${student.name}`, `<p>${emailDraft.draft.replace(/\n/g, '<br/>')}</p>`, emailDraft.draft);
                return res.json({
                    status: sendResult.success ? 'SENT' : 'SIMULATED',
                    message: sendResult.success ? 'Email successfully transmitted to parent.' : 'Email transmission simulated (SMTP credentials pending).',
                    content: emailDraft.draft,
                    messageId: sendResult.messageId
                });
            }
            return res.json({
                status: 'DRAFT_GENERATED',
                message: 'Parent communication draft generated successfully.',
                content: emailDraft.draft
            });
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
    static async getAtRiskStudents(req, res, next) {
        try {
            const requester = req.user;
            if (requester?.role === 'Faculty') {
                const facData = await metrics_service_1.AcademicMetricsService.getFacultyAcademicOverview(requester.userId);
                return res.json({ atRiskStudents: facData.atRiskStudents });
            }
            const overview = await metrics_service_1.AcademicMetricsService.getInstitutionAcademicOverview();
            return res.json({ atRiskStudents: overview.atRiskStudents });
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
            // P0-8: AI Assistant is strictly read-only / advisory for academic safety
            if (actionType === 'mark_attendance') {
                return res.status(403).json({
                    error: 'Attendance mutations cannot be executed via AI Assistant. Please use the official Attendance portal.'
                });
            }
            if (actionType === 'send_parent_email') {
                if (!['Super Admin', 'Admin', 'Faculty'].includes(requester.role)) {
                    return res.status(403).json({ error: 'Access denied: Only Faculty and Administrators can dispatch parent emails.' });
                }
                const { studentId } = payload;
                if (!studentId) {
                    return res.status(400).json({ error: 'Student ID is required.' });
                }
                const student = await repo_service_1.RepoService.findStudentById(studentId);
                if (!student)
                    return res.status(404).json({ error: 'Student profile not found.' });
                const isAuthorized = await authorizeStudentAccess(requester, student);
                if (!isAuthorized)
                    return res.status(403).json({ error: 'Access denied: You cannot dispatch emails for this student.' });
                const sId = (student._id || student.id).toString();
                const [gpaData, attData, weakSubjects] = await Promise.all([
                    metrics_service_1.AcademicMetricsService.calculateStudentGpa(sId),
                    metrics_service_1.AcademicMetricsService.calculateStudentAttendance(sId),
                    metrics_service_1.AcademicMetricsService.calculateWeakSubjects(sId)
                ]);
                const parentName = student.parentName || 'Parent/Guardian';
                const weakSubjectNames = weakSubjects.map(w => w.courseName);
                const emailDraft = await (0, ai_service_1.generateParentEmail)(student.name, gpaData.gpa, attData.attendanceRate, weakSubjectNames, parentName);
                return res.json({
                    success: true,
                    status: 'DRAFT_GENERATED',
                    message: `Parent notification draft prepared for ${parentName}.`,
                    content: emailDraft.draft
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
            const requester = req.user;
            const studentId = req.params.studentId;
            const student = await repo_service_1.RepoService.findStudentById(studentId);
            if (!student) {
                return res.status(404).json({ error: 'Student profile not found' });
            }
            const isAuthorized = await authorizeStudentAccess(requester, student);
            if (!isAuthorized) {
                return res.status(403).json({ error: 'Access denied: You do not have permission to download the AI report for this student.' });
            }
            const sId = (student._id || student.id).toString();
            const [gpaData, attData, weakSubjects, results, riskData] = await Promise.all([
                metrics_service_1.AcademicMetricsService.calculateStudentGpa(sId),
                metrics_service_1.AcademicMetricsService.calculateStudentAttendance(sId),
                metrics_service_1.AcademicMetricsService.calculateWeakSubjects(sId),
                repo_service_1.RepoService.findResults(sId),
                metrics_service_1.AcademicMetricsService.calculateStudentRisk(sId)
            ]);
            const gpa = gpaData.gpa;
            const attendanceRate = attData.attendanceRate;
            const courseCodes = (student.enrolledCourses || []).map((c) => c.code || c.name || c);
            const summary = await (0, ai_service_1.generateStudentSummary)(student.name, student.grade, gpa, attendanceRate, courseCodes);
            const weakSubjectNames = weakSubjects.map(w => `${w.courseName} (${w.courseCode})`);
            const analysis = await (0, ai_service_1.generateRecommendations)(student.name, gpa, attendanceRate, weakSubjectNames);
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
            doc.text(gpa !== null ? gpa.toFixed(2) : 'N/A', startX + 380, y + 15);
            doc.text(attendanceRate !== null ? `${attendanceRate.toFixed(1)}%` : 'N/A', startX + 380, y + 35);
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
            const marksData = results.map((r) => ({
                code: r.courseId?.code || 'CRS',
                name: r.courseId?.name || 'Course',
                internal: r.internal || 0,
                external: r.external || 0,
                grade: r.grade || 'N/A',
                gpa: r.gpa || 0.0
            }));
            if (marksData.length > 0) {
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
                    y += rowHeight;
                    altRow = !altRow;
                });
                y += 25;
            }
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
