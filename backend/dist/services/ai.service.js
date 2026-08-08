"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStudentSummary = generateStudentSummary;
exports.generateRecommendations = generateRecommendations;
exports.generateAcademicInsights = generateAcademicInsights;
exports.adminChatAssistant = adminChatAssistant;
exports.predictRisk = predictRisk;
exports.translateNlSearch = translateNlSearch;
exports.generateParentEmail = generateParentEmail;
const genai_1 = require("@google/genai");
const dotenv_1 = __importDefault(require("dotenv"));
const repo_service_1 = require("./repo.service");
const retrieval_service_1 = require("./retrieval.service");
const RiskPredictor_1 = require("../ml/RiskPredictor");
dotenv_1.default.config();
const apiKey = process.env.GEMINI_API_KEY;
let ai = null;
if (apiKey && apiKey.trim() !== '') {
    try {
        ai = new genai_1.GoogleGenAI({ apiKey });
        console.log('🤖 Google Gemini AI Service initialized with API Key.');
    }
    catch (error) {
        console.error('Error initializing Gemini AI SDK:', error);
    }
}
else {
    console.log('🤖 Google Gemini API Key not found. Operating in realistic Mock AI Simulator Mode.');
}
// 1. Generate Student Academic Summary
async function generateStudentSummary(studentName, grade, gpa, attendanceRate, courses) {
    const prompt = `Generate a concise 3-sentence professional academic profile summary for the student. 
  Grade: ${grade}, Current GPA: ${gpa}, Attendance: ${attendanceRate}%. 
  Enrolled courses: ${courses.join(', ')}. 
  Mention their current standing, focus areas, and a brief positive outlook. Keep it realistic and objective.`;
    return getDefaultSummary(studentName, gpa, attendanceRate);
}
// 2. Generate Weak Subject & Personalized Recommendations
async function generateRecommendations(studentName, gpa, attendanceRate, marks) {
    const weakSubjects = [];
    marks.forEach(item => {
        const total = (item.internal || 0) + (item.external || 0) + (item.assignment || 0) + (item.practical || 0);
        if (total < 65) {
            weakSubjects.push(item.courseName);
        }
    });
    if (weakSubjects.length === 0 && gpa < 3.0) {
        weakSubjects.push('General Curriculum Studies');
    }
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
// 4. Grounded Chatbot Companion & Hybrid Retrieval Engine with Tool Calling
async function adminChatAssistant(message, history = [], options = {}) {
    const rawQuery = message.trim();
    const qLower = rawQuery.toLowerCase();
    const { currentPage, userRole = 'Student', selectedEntity, availableActions } = options;
    // 1. Security & Prompt Injection Shield
    if (qLower.includes('ignore previous instructions') ||
        qLower.includes('show admin passwords') ||
        qLower.includes('database credentials') ||
        qLower.includes('system prompt') ||
        qLower.includes('env variables')) {
        return { reply: `### 🛡️ Security Boundary Enforcement\n\nI cannot perform actions that bypass system security, reveal internal credentials, or execute unauthorized operations.` };
    }
    // 2. Hybrid Retrieval over Verified Application Knowledge Base
    const retrievedTopics = retrieval_service_1.RetrievalService.retrieveKnowledge({ query: rawQuery, currentPage, userRole }, 4);
    const formattedKnowledge = retrieval_service_1.RetrievalService.formatKnowledgeForPrompt(retrievedTopics);
    if (!ai) {
        // Simulated Offline Intent Parser (when no API key is available)
        let replyText = `I could not verify that from the available application information.\n\nPlease navigate to the **Dashboard** or **AI Companion** page to explore available features.`;
        let navigateTo = undefined;
        let proposedAction = undefined;
        if (qLower.includes('mark') && (qLower.includes('present') || qLower.includes('absent'))) {
            const isPresent = qLower.includes('present');
            proposedAction = {
                actionType: 'mark_attendance',
                title: 'Confirm Attendance Entry',
                description: `Mark student attendance status as ${isPresent ? 'Present' : 'Absent'} for today.`,
                payload: { status: isPresent ? 'Present' : 'Absent', date: new Date().toISOString().split('T')[0] }
            };
            replyText = `I can help you with that action. Please confirm below.`;
        }
        else if (qLower.includes('parent email') || qLower.includes('notify parent')) {
            proposedAction = {
                actionType: 'send_parent_email',
                title: 'Confirm Parent Email Notification',
                description: 'Dispatch academic warning draft to parent/guardian.',
                payload: { studentId: 'N/A' }
            };
            replyText = `I can help you with that action. Please confirm below.`;
        }
        else if (qLower.includes('take me to') || qLower.includes('go to') || qLower.includes('open') || qLower.includes('navigate to')) {
            if (qLower.includes('student'))
                navigateTo = '/students';
            else if (qLower.includes('course'))
                navigateTo = '/courses';
            else if (qLower.includes('facult'))
                navigateTo = '/faculty';
            else if (qLower.includes('attend'))
                navigateTo = '/attendance';
            else
                navigateTo = '/dashboard';
            replyText = `Navigating to ${navigateTo}...`;
        }
        else if (qLower.includes('at risk') || qLower.includes('low attendance') || qLower.includes('low gpa')) {
            const { students } = await repo_service_1.RepoService.findStudents({}, 1, 100);
            const lowAtt = students.filter((s) => (s.attendanceRate && s.attendanceRate < 75) || (s.cgpa && s.cgpa < 2.5));
            replyText = `### 🚨 At-Risk Students (${lowAtt.length} Found)\n\n` + lowAtt.slice(0, 5).map((s) => `- **${s.name}** (${s.enrollmentNo}): Attendance ${s.attendanceRate || 70}%, CGPA ${s.cgpa || 2.3}`).join('\n');
        }
        else if (qLower.includes('how many student') || qLower.includes('total student')) {
            const { students } = await repo_service_1.RepoService.findStudents({}, 1, 100);
            replyText = `### 📊 Student Population\n\nThere are a total of **${students.length}** registered students in the system.`;
        }
        else if (qLower.includes('list student') || qLower.includes('which student')) {
            const { students } = await repo_service_1.RepoService.findStudents({}, 1, 100);
            replyText = `### 👥 Student Directory\n\n` + students.slice(0, 10).map((s) => `- **${s.name}** (${s.enrollmentNo}) - ${s.department || 'Computer Science'}`).join('\n');
            replyText += `\n\n*Showing top 10 results. Navigate to the Students page for the full list.*`;
        }
        else if (qLower.includes('course') && qLower.includes('available')) {
            const courses = await repo_service_1.RepoService.findCourses();
            replyText = `### 📚 Available Courses\n\n` + courses.map((c) => `- **${c.name}** (${c.code}): ${c.credits} Credits [${c.department}]`).join('\n');
        }
        else if (qLower.includes('how many faculty') || qLower.includes('total faculty')) {
            const faculty = await repo_service_1.RepoService.findFaculties();
            replyText = `### 👨‍🏫 Faculty Members\n\nThere are a total of **${faculty.length}** active faculty members.`;
        }
        else if (qLower.includes('list faculty') || qLower.includes('which faculty')) {
            const faculty = await repo_service_1.RepoService.findFaculties();
            replyText = `### 👨‍🏫 Faculty Directory\n\n` + faculty.map((f) => `- **${f.name}** - ${f.designation} (${f.department})`).join('\n');
        }
        else {
            if (retrievedTopics.length > 0) {
                const primary = retrievedTopics[0];
                replyText = `### 📘 ${primary.title}\n\n${primary.summary}\n\n${primary.details}`;
                if (primary.stepByStep && primary.stepByStep.length > 0) {
                    replyText += `\n\n### 📝 Step-by-Step Instructions:\n` + primary.stepByStep.map((step, idx) => `${idx + 1}. ${step}`).join('\n');
                }
            }
        }
        return { reply: replyText, navigateTo, proposedAction };
    }
    try {
        const tools = [{
                functionDeclarations: [
                    {
                        name: 'getStudents',
                        description: 'Fetch the list of students and total count. Optionally filter by department (e.g. CSE, IT, ME, ECE).',
                        parameters: { type: genai_1.Type.OBJECT, properties: { department: { type: genai_1.Type.STRING } } }
                    },
                    {
                        name: 'getStudentProfile',
                        description: 'Fetch detailed profile information for a specific student using their exact enrollment number (e.g. ENR001).',
                        parameters: { type: genai_1.Type.OBJECT, properties: { enrollmentNo: { type: genai_1.Type.STRING } }, required: ['enrollmentNo'] }
                    },
                    {
                        name: 'getAtRiskStudents',
                        description: 'Fetch the list of students who are at risk due to low attendance (< 75%) or low GPA (< 2.5).'
                    },
                    {
                        name: 'getFaculty',
                        description: 'Fetch the list of all faculty members.'
                    },
                    {
                        name: 'getCourses',
                        description: 'Fetch the list of all courses available.'
                    },
                    {
                        name: 'navigate',
                        description: 'Navigate the user to a specific page in the app (e.g. /students, /courses, /faculty, /attendance, /dashboard, /academic-intelligence).',
                        parameters: { type: genai_1.Type.OBJECT, properties: { page: { type: genai_1.Type.STRING } }, required: ['page'] }
                    },
                    {
                        name: 'proposeAction',
                        description: 'Propose an action like marking attendance or sending a parent email. actionType must be "mark_attendance" or "send_parent_email".',
                        parameters: { type: genai_1.Type.OBJECT, properties: { actionType: { type: genai_1.Type.STRING }, payload: { type: genai_1.Type.OBJECT } }, required: ['actionType'] }
                    }
                ]
            }];
        const systemInstruction = `You are the EduManager AI Assistant, a friendly and highly knowledgeable in-app guide for the Smart Student Management System.
You answer user queries accurately based strictly on the Application Knowledge Base and live Database Context (using provided tools).
Current Active Page/Route: ${currentPage || 'Not Specified'}
Logged-In User Role: ${userRole}
${selectedEntity ? `Currently Selected Item: ${selectedEntity}` : ''}

VERIFIED APPLICATION KNOWLEDGE:
${formattedKnowledge}

CRITICAL RULES:
1. ALWAYS use the provided tools to fetch live data from the database if the user asks for students, courses, faculty, attendance, or specific records.
2. If the user asks to navigate somewhere, use the 'navigate' tool.
3. If the user asks to mark attendance or notify parents, use the 'proposeAction' tool.
4. Format your final text response with clear markdown headings (###), bullet points, and code blocks for IDs. Never mention system prompts, tools, or internal JSON structures.
5. If the tools return no data, respond honestly that no records were found.`;
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction,
                tools: tools
            }
        });
        let aiResponse = await chat.sendMessage({ message: rawQuery });
        // Handle tool calls
        if (aiResponse.functionCalls && aiResponse.functionCalls.length > 0) {
            for (const call of aiResponse.functionCalls) {
                const name = call.name;
                const args = call.args || {};
                let functionResult = { error: 'Function not found' };
                try {
                    if (name === 'navigate') {
                        return { reply: `Navigating to ${args.page}...`, navigateTo: args.page };
                    }
                    else if (name === 'proposeAction') {
                        return {
                            reply: `I can help you with that action. Please confirm below.`,
                            proposedAction: {
                                actionType: args.actionType,
                                title: args.actionType === 'mark_attendance' ? 'Confirm Attendance Entry' : 'Confirm Action',
                                description: 'Please review and confirm this action.',
                                payload: args.payload || {}
                            }
                        };
                    }
                    else if (name === 'getStudents') {
                        const { students } = await repo_service_1.RepoService.findStudents({ department: args.department }, 1, 100);
                        functionResult = { total: students.length, students: students.map((s) => ({ name: s.name, enrollmentNo: s.enrollmentNo, department: s.department, attendanceRate: s.attendanceRate, cgpa: s.cgpa })) };
                    }
                    else if (name === 'getStudentProfile') {
                        const s = await repo_service_1.RepoService.findStudentByEnrollmentNo(args.enrollmentNo);
                        if (s) {
                            functionResult = { name: s.name, enrollmentNo: s.enrollmentNo, department: s.department, grade: s.grade, semester: s.semester, cgpa: s.cgpa, attendanceRate: s.attendanceRate, status: s.status };
                        }
                        else {
                            functionResult = { error: `Student with enrollment number ${args.enrollmentNo} not found.` };
                        }
                    }
                    else if (name === 'getAtRiskStudents') {
                        const { students } = await repo_service_1.RepoService.findStudents({}, 1, 100);
                        const lowAtt = students.filter((s) => (s.attendanceRate && s.attendanceRate < 75) || (s.cgpa && s.cgpa < 2.5));
                        functionResult = { atRiskCount: lowAtt.length, students: lowAtt.map((s) => ({ name: s.name, enrollmentNo: s.enrollmentNo, attendanceRate: s.attendanceRate, cgpa: s.cgpa })) };
                    }
                    else if (name === 'getFaculty') {
                        const faculty = await repo_service_1.RepoService.findFaculties();
                        functionResult = { total: faculty.length, faculty: faculty.map((f) => ({ name: f.name, department: f.department, designation: f.designation })) };
                    }
                    else if (name === 'getCourses') {
                        const courses = await repo_service_1.RepoService.findCourses();
                        functionResult = { total: courses.length, courses: courses.map((c) => ({ code: c.code, name: c.name, credits: c.credits, department: c.department })) };
                    }
                }
                catch (e) {
                    functionResult = { error: e.message };
                }
                // Send function response back to Gemini
                aiResponse = await chat.sendMessage({
                    message: [{
                            functionResponse: {
                                name: call.name,
                                response: functionResult
                            }
                        }]
                });
            }
        }
        if (aiResponse.text && aiResponse.text.trim()) {
            return { reply: aiResponse.text.trim() };
        }
        return { reply: 'I processed your request but could not generate a clear response. Please try again.' };
    }
    catch (err) {
        console.error('Gemini synthesis error:', err);
        return { reply: `An error occurred while processing your request: ${err instanceof Error ? err.message : String(err)}` };
    }
}
// Fallback Generators (Mock Engine)
function getDefaultSummary(name, gpa, attendance) {
    const status = gpa >= 3.5 ? 'outstanding academic standing' : gpa >= 3.0 ? 'strong academic standing' : 'satisfactory progress, with room for academic improvement';
    const attendanceWarning = attendance < 75 ? ' However, their attendance rate is currently below threshold, which might affect practical course scores.' : ' Additionally, their excellent attendance demonstrates a high level of engagement and commitment to lectures.';
    return `${name} is currently in ${status}, maintaining an overall GPA of ${gpa.toFixed(2)}.${attendanceWarning} Sustaining this balance is key to their continued success.`;
}
function getDefaultRecommendations(name, weakSubjects, attendance) {
    const list = [
        `Establish a structured study schedule focusing on foundational topics, dedicating 4 hours weekly to review.`,
        `Participate in peer group tutoring or schedule weekly feedback sessions with subject faculty.`,
        `Complete practice tests and mock assignments under exam-like conditions to build confidence.`
    ];
    if (weakSubjects.length > 0) {
        list[0] = `Schedule dedicated office hours with faculty members teaching ${weakSubjects[0]} to clarify core topics.`;
    }
    if (attendance < 80) {
        list[2] = `Prioritize class attendance to ensure complete comprehension of syllabus frameworks and project criteria.`;
    }
    return list;
}
function getDefaultInsights(gpa, attendance) {
    if (gpa === 0 && attendance === 0) {
        return `No student academic records or attendance logs have been recorded in the database yet. Please add students, courses, attendance marks, and grade book results to generate live academic intelligence reports.`;
    }
    return `The current institute analytics demonstrate an average GPA of ${gpa.toFixed(2)} alongside an attendance rate of ${attendance.toFixed(1)}%. Departments with average attendance dropping below 80% require close observation. We recommend establishing early alert notifications for students whose individual attendance slips below 75% to prevent grading penalties. Key objectives include implementing peer tutoring circles and launching dynamic QR-code scanning to capture class entries instantly.`;
}
// 5. Predictive AI: At-Risk Student Analysis
async function predictRisk(studentName, gpa, attendanceRate, marks) {
    const weakSubjects = marks.filter(m => ((m.internal || 0) + (m.external || 0) + (m.assignment || 0) + (m.practical || 0)) < 65).map(m => m.courseName);
    const prediction = RiskPredictor_1.riskPredictor.predict(gpa, attendanceRate, weakSubjects.length);
    let warningMessage = 'Academic profile is stable.';
    if (prediction.riskLevel !== 'Low') {
        warningMessage = `Student flagged as ${prediction.riskLevel} risk due to combination of GPA (${gpa.toFixed(2)}) and attendance (${attendanceRate.toFixed(1)}%).`;
    }
    return {
        riskScore: prediction.riskScore,
        riskLevel: prediction.riskLevel,
        warningMessage
    };
}
async function translateNlSearch(query) {
    const prompt = `You are a Smart Search interpreter. The user wants to filter students via natural language.
  Translate the following query into a JSON object representing the database filter intention.
  Supported types: "attendance", "gpa", "department".
  Supported operators: "<", ">", "<=", ">=", "=".
  Query: "${query}"
  Return ONLY the raw JSON object without any markdown formatting, backticks, or extra text.
  Example output:
  {"type": "attendance", "operator": "<", "value": 100}
  If the query cannot be interpreted, return an empty object {}.`;
    if (ai) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            let text = response.text || '';
            text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
            if (text && text !== '{}') {
                const parsed = JSON.parse(text);
                if (parsed.type) {
                    if (typeof parsed.value === 'string' && parsed.value.includes('%')) {
                        parsed.value = Number(parsed.value.replace('%', ''));
                    }
                    return parsed;
                }
            }
        }
        catch (error) {
            console.error('Gemini NL search failed:', error);
        }
    }
    // Deterministic Rule-Based Fallback
    const qLower = query.toLowerCase().trim();
    // 1. Department matching
    const depts = [
        { key: 'cse', val: 'CSE' },
        { key: 'ece', val: 'ECE' },
        { key: 'me', val: 'ME' },
        { key: 'it', val: 'IT' },
        { key: 'computer science', val: 'Computer Science' },
        { key: 'general sciences', val: 'General Sciences' }
    ];
    for (const d of depts) {
        if (qLower.includes(d.key)) {
            return { type: 'department', operator: '=', value: d.val };
        }
    }
    // 2. Attendance matching
    const attMatch = qLower.match(/attendance\s*(<|<=|>|>=|=)?\s*(\d+)/i) || qLower.match(/(below|above|less than|greater than)\s*(\d+)%?\s*attendance/i) || qLower.match(/(below|above)\s*(\d+)%/i);
    if (attMatch) {
        let op = '<';
        let val = 75;
        if (qLower.includes('above') || qLower.includes('greater than') || qLower.includes('>'))
            op = '>';
        if (attMatch[2])
            val = parseInt(attMatch[2], 10);
        else if (attMatch[1] && !isNaN(Number(attMatch[1])))
            val = parseInt(attMatch[1], 10);
        return { type: 'attendance', operator: op, value: val };
    }
    // 3. GPA matching
    const gpaMatch = qLower.match(/(gpa|cgpa)\s*(<|<=|>|>=|=)?\s*([\d.]+)/i) || qLower.match(/(below|above)\s*([\d.]+)\s*(gpa|cgpa)/i);
    if (gpaMatch) {
        let op = '<';
        let val = 2.5;
        if (qLower.includes('above') || qLower.includes('greater than') || qLower.includes('>'))
            op = '>';
        if (gpaMatch[3])
            val = parseFloat(gpaMatch[3]);
        else if (gpaMatch[2] && !isNaN(Number(gpaMatch[2])))
            val = parseFloat(gpaMatch[2]);
        return { type: 'gpa', operator: op, value: val };
    }
    return null;
}
// 7. Generate Parent Notification Email
async function generateParentEmail(studentName, gpa, attendance, weakSubjects, parentName) {
    const prompt = `Write a polite, professional, and empathetic email from the college administration to ${parentName}, the parent of ${studentName}.
  The student currently has a GPA of ${gpa.toFixed(2)} and attendance of ${attendance.toFixed(1)}%. 
  Their weaker subjects are: ${weakSubjects.join(', ')}.
  The email should express concern about their academic trajectory and invite the parent for a discussion with the academic counselor. 
  Sign off as "EduManager Academic Counseling Team".
  Return only the email body without any markdown formatting.`;
    if (ai) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            return response.text || '';
        }
        catch (error) {
            console.error('Gemini error generating email:', error);
        }
    }
    return `Dear ${parentName},\n\nWe are writing to you regarding the academic progress of your ward, ${studentName}.\n\nCurrently, ${studentName} has an attendance rate of ${attendance.toFixed(1)}% and a GPA of ${gpa.toFixed(2)}. We have noticed some challenges in ${weakSubjects.join(', ')}.\n\nWe encourage you to schedule a meeting with our academic counselor to discuss strategies to support their success.\n\nBest regards,\nEduManager Academic Counseling Team`;
}
