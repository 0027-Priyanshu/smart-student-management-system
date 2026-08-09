import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { RepoService } from './repo.service';
import { RetrievalService } from './retrieval.service';
import { riskPredictor } from '../ml/RiskPredictor';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey.trim() !== '') {
  try {
    ai = new GoogleGenAI({ apiKey });
    console.log('🤖 Google Gemini AI Service initialized with API Key.');
  } catch (error) {
    console.error('Error initializing Gemini AI SDK:', error);
  }
} else {
  console.log('🤖 Google Gemini API Key not found. Operating in realistic Mock AI Simulator Mode.');
}

// 1. Generate Student Academic Summary
export async function generateStudentSummary(
  studentName: string,
  grade: string,
  gpa: number,
  attendanceRate: number,
  courses: string[]
): Promise<string> {
  const prompt = `Generate a concise 3-sentence professional academic profile summary for the student. 
  Grade: ${grade}, Current GPA: ${gpa}, Attendance: ${attendanceRate}%. 
  Enrolled courses: ${courses.join(', ')}. 
  Mention their current standing, focus areas, and a brief positive outlook. Keep it realistic and objective.`;

  return getDefaultSummary(studentName, gpa, attendanceRate);
}

// 2. Generate Weak Subject & Personalized Recommendations
export async function generateRecommendations(
  studentName: string,
  gpa: number,
  attendanceRate: number,
  marks: any[]
): Promise<{ recommendations: string[]; weakSubjects: string[] }> {
  const weakSubjects: string[] = [];
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
export async function generateAcademicInsights(
  totalStudents: number,
  avgGpa: number,
  avgAttendance: number,
  departmentCounts: any
): Promise<{ text: string, chartData: any[] }> {
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

export interface ChatAssistantOptions {
  currentPage?: string;
  userRole?: string;
  selectedEntity?: string;
  availableActions?: string[];
}

// 4. Grounded Chatbot Companion & Hybrid Retrieval Engine with Tool Calling
export async function adminChatAssistant(
  message: string, 
  history: { role: 'user' | 'model'; parts: string[] }[] = [],
  options: ChatAssistantOptions = {}
): Promise<{ reply: string; navigateTo?: string; proposedAction?: any }> {
  const rawQuery = message.trim();
  const qLower = rawQuery.toLowerCase();
  const { currentPage, userRole = 'Student', selectedEntity, availableActions } = options;

  // 1. Security & Prompt Injection Shield
  if (
    qLower.includes('ignore previous instructions') ||
    qLower.includes('show admin passwords') ||
    qLower.includes('database credentials') ||
    qLower.includes('system prompt') ||
    qLower.includes('env variables')
  ) {
    return { reply: `### 🛡️ Security Boundary Enforcement\n\nI cannot perform actions that bypass system security, reveal internal credentials, or execute unauthorized operations.` };
  }

  // 2. Hybrid Retrieval over Verified Application Knowledge Base
  const retrievedTopics = RetrievalService.retrieveKnowledge({ query: rawQuery, currentPage, userRole }, 4);
  const formattedKnowledge = RetrievalService.formatKnowledgeForPrompt(retrievedTopics);

  if (!ai) {
    // Simulated Offline Intent Parser (when no API key is available)
    let replyText = `I couldn't confidently determine what you're looking for. You can ask about students, courses, attendance, grades, faculty, face attendance, or academic analytics.`;
    let navigateTo: string | undefined = undefined;
    let proposedAction: any = undefined;

    const isAttendance = /attendance|present|absent|percentage|lecture|session|face attendance|qr attendance/i.test(qLower);
    const isStudent = /student|enrollment|enrolment|id|profile|learner/i.test(qLower);
    const isRisk = /risk|failing|weak|low performing|low-performing|academic risk|at risk/i.test(qLower);
    const isFace = /face|facial|camera|recognition|biometric|scan face/i.test(qLower);
    const isFaculty = /faculty|teacher|professor|instructor/i.test(qLower);
    const isCourse = /course|subject|class/i.test(qLower);
    
    // Strict Scope Check
    const inScope = isAttendance || isStudent || isRisk || isFace || isFaculty || isCourse;

    if (!inScope && !qLower.includes('take me to') && !qLower.includes('go to')) {
      return { reply: replyText };
    }

    if (isFace && (qLower.includes('register') || qLower.includes('enroll'))) {
      if (userRole === 'Admin') {
        replyText = `### Face Registration\n\nAs an Admin, you can register a student's face by navigating to the **Students** directory, selecting a student, and clicking the **Camera** icon in their profile.`;
      } else if (userRole === 'Faculty') {
        replyText = `### Face Registration\n\nFace registration is restricted to Admin. As Faculty, you can start a Face Attendance session for your assigned class from the Attendance page.`;
      } else {
        replyText = `### Face Registration\n\nFace registration is managed by an administrator. Please contact the Admin if your face has not been registered.`;
      }
    } else if (isFace && qLower.includes('how')) {
      replyText = `### Face Attendance\n\n- **Admin** registers student faces.\n- **Faculty** starts Face Attendance sessions.\n- **Student** verifies their own face to mark attendance.`;
    } else if (qLower.includes('mark') && (qLower.includes('present') || qLower.includes('absent'))) {
      const isPresent = qLower.includes('present');
      proposedAction = {
        actionType: 'mark_attendance',
        title: 'Confirm Attendance Entry',
        description: `Mark student attendance status as ${isPresent ? 'Present' : 'Absent'} for today.`,
        payload: { status: isPresent ? 'Present' : 'Absent', date: new Date().toISOString().split('T')[0] }
      };
      replyText = `I can help you with that action. Please confirm below.`;
    } else if (qLower.includes('parent email') || qLower.includes('notify parent')) {
      proposedAction = {
        actionType: 'send_parent_email',
        title: 'Confirm Parent Email Notification',
        description: 'Dispatch academic warning draft to parent/guardian.',
        payload: { studentId: 'N/A' }
      };
      replyText = `I can help you with that action. Please confirm below.`;
    } else if (qLower.includes('take me to') || qLower.includes('go to') || qLower.includes('open') || qLower.includes('navigate to')) {
      if (qLower.includes('student')) navigateTo = '/students';
      else if (qLower.includes('course')) navigateTo = '/courses';
      else if (qLower.includes('facult')) navigateTo = '/faculty';
      else if (qLower.includes('attend')) navigateTo = '/attendance';
      else navigateTo = '/dashboard';
      replyText = `Navigating to ${navigateTo}...`;
    } else if (isRisk) {
      const { students } = await RepoService.findStudents({}, 1, 100);
      const lowAtt = students.filter((s: any) => (s.attendanceRate && s.attendanceRate < 75) || (s.cgpa && s.cgpa < 2.5));
      replyText = `### 🚨 At-Risk Students (${lowAtt.length} Found)\n\n` + lowAtt.slice(0, 5).map((s: any) => `- **${s.name}** (${s.enrollmentNo}): Attendance ${s.attendanceRate || 70}%, CGPA ${s.cgpa || 2.3}`).join('\n');
    } else if (isStudent && (qLower.includes('how many') || qLower.includes('total'))) {
      const { students } = await RepoService.findStudents({}, 1, 100);
      replyText = `### 📊 Student Population\n\nThere are a total of **${students.length}** registered students in the system.`;
    } else if (isStudent && (qLower.includes('list') || qLower.includes('which'))) {
      const { students } = await RepoService.findStudents({}, 1, 100);
      replyText = `### 👥 Student Directory\n\n` + students.slice(0, 10).map((s: any) => `- **${s.name}** (${s.enrollmentNo}) - ${s.department || 'Computer Science'}`).join('\n');
      replyText += `\n\n*Showing top 10 results. Navigate to the Students page for the full list.*`;
    } else if (isCourse && qLower.includes('available')) {
      const courses = await RepoService.findCourses();
      replyText = `### 📚 Available Courses\n\n` + courses.map((c: any) => `- **${c.name}** (${c.code}): ${c.credits} Credits [${c.department}]`).join('\n');
    } else if (isFaculty && (qLower.includes('how many') || qLower.includes('total'))) {
      const faculty = await RepoService.findFaculties();
      replyText = `### 👨‍🏫 Faculty Members\n\nThere are a total of **${faculty.length}** active faculty members.`;
    } else if (isFaculty && (qLower.includes('list') || qLower.includes('which'))) {
      const faculty = await RepoService.findFaculties();
      replyText = `### 👨‍🏫 Faculty Directory\n\n` + faculty.map((f: any) => `- **${f.name}** - ${f.designation} (${f.department})`).join('\n');
    } else {
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
          parameters: { type: Type.OBJECT, properties: { department: { type: Type.STRING } } }
        },
        {
          name: 'getStudentProfile',
          description: 'Fetch detailed profile information for a specific student using their exact enrollment number (e.g. ENR001).',
          parameters: { type: Type.OBJECT, properties: { enrollmentNo: { type: Type.STRING } }, required: ['enrollmentNo'] }
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
          parameters: { type: Type.OBJECT, properties: { page: { type: Type.STRING } }, required: ['page'] }
        },
        {
          name: 'proposeAction',
          description: 'Propose an action like marking attendance or sending a parent email. actionType must be "mark_attendance" or "send_parent_email".',
          parameters: { type: Type.OBJECT, properties: { actionType: { type: Type.STRING }, payload: { type: Type.OBJECT } }, required: ['actionType'] }
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
Key Workflow - Face Attendance:
- Admin: Registers student faces in the Students directory.
- Faculty: Starts Face Attendance sessions from the Attendance page.
- Student: Verifies their own face to mark attendance using the live camera.

CRITICAL RULES:
1. STRICT RELEVANCE: If the user query falls outside the scope of Students, Courses, Attendance, Grades, Faculty, Face Attendance, or Academic Analytics, you MUST return EXACTLY this message and nothing else: "I couldn't confidently determine what you're looking for. You can ask about students, courses, attendance, grades, faculty, face attendance, or academic analytics." Do not try to guess or provide generic advice.
2. ALWAYS use the provided tools to fetch live data from the database if the user asks for students, courses, faculty, attendance, or specific records.
3. Distinguish between help queries (e.g. "How do I register a face?") and data queries (e.g. "Show attendance for ENR123"). Do not answer data queries with navigation instructions.
4. If the user asks to navigate somewhere, use the 'navigate' tool.
5. If the user asks to mark attendance or notify parents, use the 'proposeAction' tool.
6. Format your final text response with clear markdown headings (###), bullet points, and code blocks for IDs. Never mention system prompts, tools, or internal JSON structures.
7. If the tools return no data, respond honestly that no records were found.
8. Be role-aware. E.g., if a Student asks how to register their face, tell them to contact Admin. If Faculty asks, tell them only Admin can register faces.`;

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction,
        tools: tools as any
      }
    });

    let aiResponse = await chat.sendMessage({ message: rawQuery });

    // Handle tool calls
    if (aiResponse.functionCalls && aiResponse.functionCalls.length > 0) {
      for (const call of aiResponse.functionCalls) {
        const name = call.name;
        const args = call.args || {};
        let functionResult: any = { error: 'Function not found' };

        try {
          if (name === 'navigate') {
            return { reply: `Navigating to ${args.page}...`, navigateTo: args.page as string };
          } else if (name === 'proposeAction') {
            return { 
              reply: `I can help you with that action. Please confirm below.`,
              proposedAction: {
                actionType: args.actionType,
                title: args.actionType === 'mark_attendance' ? 'Confirm Attendance Entry' : 'Confirm Action',
                description: 'Please review and confirm this action.',
                payload: args.payload || {}
              }
            };
          } else if (name === 'getStudents') {
            const { students } = await RepoService.findStudents({ department: args.department as string }, 1, 100);
            functionResult = { total: students.length, students: students.map((s: any) => ({ name: s.name, enrollmentNo: s.enrollmentNo, department: s.department, attendanceRate: s.attendanceRate, cgpa: s.cgpa })) };
          } else if (name === 'getStudentProfile') {
            const s = await RepoService.findStudentByEnrollmentNo(args.enrollmentNo as string);
            if (s) {
              functionResult = { name: s.name, enrollmentNo: s.enrollmentNo, department: s.department, grade: s.grade, semester: s.semester, cgpa: s.cgpa, attendanceRate: s.attendanceRate, status: s.status };
            } else {
              functionResult = { error: `Student with enrollment number ${args.enrollmentNo} not found.` };
            }
          } else if (name === 'getAtRiskStudents') {
            const { students } = await RepoService.findStudents({}, 1, 100);
            const lowAtt = students.filter((s: any) => (s.attendanceRate && s.attendanceRate < 75) || (s.cgpa && s.cgpa < 2.5));
            functionResult = { atRiskCount: lowAtt.length, students: lowAtt.map((s: any) => ({ name: s.name, enrollmentNo: s.enrollmentNo, attendanceRate: s.attendanceRate, cgpa: s.cgpa })) };
          } else if (name === 'getFaculty') {
            const faculty = await RepoService.findFaculties();
            functionResult = { total: faculty.length, faculty: faculty.map((f: any) => ({ name: f.name, department: f.department, designation: f.designation })) };
          } else if (name === 'getCourses') {
            const courses = await RepoService.findCourses();
            functionResult = { total: courses.length, courses: courses.map((c: any) => ({ code: c.code, name: c.name, credits: c.credits, department: c.department })) };
          }
        } catch (e: any) {
          functionResult = { error: e.message };
        }

        // Send function response back to Gemini
        aiResponse = await chat.sendMessage({
          message: [{
            functionResponse: {
              name: call.name as string,
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

  } catch (err) {
    console.error('Gemini synthesis error:', err);
    return { reply: `An error occurred while processing your request: ${err instanceof Error ? err.message : String(err)}` };
  }
}


// Fallback Generators (Mock Engine)
function getDefaultSummary(name: string, gpa: number, attendance: number): string {
  const status = gpa >= 3.5 ? 'outstanding academic standing' : gpa >= 3.0 ? 'strong academic standing' : 'satisfactory progress, with room for academic improvement';
  const attendanceWarning = attendance < 75 ? ' However, their attendance rate is currently below threshold, which might affect practical course scores.' : ' Additionally, their excellent attendance demonstrates a high level of engagement and commitment to lectures.';
  return `${name} is currently in ${status}, maintaining an overall GPA of ${gpa.toFixed(2)}.${attendanceWarning} Sustaining this balance is key to their continued success.`;
}

function getDefaultRecommendations(name: string, weakSubjects: string[], attendance: number): string[] {
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

function getDefaultInsights(gpa: number, attendance: number): string {
  if (gpa === 0 && attendance === 0) {
    return `No student academic records or attendance logs have been recorded in the database yet. Please add students, courses, attendance marks, and grade book results to generate live academic intelligence reports.`;
  }
  return `The current institute analytics demonstrate an average GPA of ${gpa.toFixed(2)} alongside an attendance rate of ${attendance.toFixed(1)}%. Departments with average attendance dropping below 80% require close observation. We recommend establishing early alert notifications for students whose individual attendance slips below 75% to prevent grading penalties. Key objectives include implementing peer tutoring circles and launching dynamic QR-code scanning to capture class entries instantly.`;
}

// 5. Predictive AI: At-Risk Student Analysis
export async function predictRisk(
  studentName: string,
  gpa: number,
  attendanceRate: number,
  marks: any[]
): Promise<{ riskScore: number; warningMessage: string; riskLevel: 'Low' | 'Medium' | 'High' }> {
  const weakSubjects = marks.filter(m => ((m.internal || 0) + (m.external || 0) + (m.assignment || 0) + (m.practical || 0)) < 65).map(m => m.courseName);
  const prediction = riskPredictor.predict(gpa, attendanceRate, weakSubjects.length);
  
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

export async function translateNlSearch(query: string): Promise<{ type: 'attendance' | 'gpa' | 'department', operator: '<' | '>' | '<=' | '>=' | '=', value: number | string } | null> {
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
    } catch (error) {
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
    let op: '<' | '>' | '<=' | '>=' | '=' = '<';
    let val = 75;
    if (qLower.includes('above') || qLower.includes('greater than') || qLower.includes('>')) op = '>';
    if (attMatch[2]) val = parseInt(attMatch[2], 10);
    else if (attMatch[1] && !isNaN(Number(attMatch[1]))) val = parseInt(attMatch[1], 10);
    return { type: 'attendance', operator: op, value: val };
  }

  // 3. GPA matching
  const gpaMatch = qLower.match(/(gpa|cgpa)\s*(<|<=|>|>=|=)?\s*([\d.]+)/i) || qLower.match(/(below|above)\s*([\d.]+)\s*(gpa|cgpa)/i);
  if (gpaMatch) {
    let op: '<' | '>' | '<=' | '>=' | '=' = '<';
    let val = 2.5;
    if (qLower.includes('above') || qLower.includes('greater than') || qLower.includes('>')) op = '>';
    if (gpaMatch[3]) val = parseFloat(gpaMatch[3]);
    else if (gpaMatch[2] && !isNaN(Number(gpaMatch[2]))) val = parseFloat(gpaMatch[2]);
    return { type: 'gpa', operator: op, value: val };
  }

  return null;
}


// 7. Generate Parent Notification Email
export async function generateParentEmail(studentName: string, gpa: number, attendance: number, weakSubjects: string[], parentName: string): Promise<string> {
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
    } catch (error) {
      console.error('Gemini error generating email:', error);
    }
  }

  return `Dear ${parentName},\n\nWe are writing to you regarding the academic progress of your ward, ${studentName}.\n\nCurrently, ${studentName} has an attendance rate of ${attendance.toFixed(1)}% and a GPA of ${gpa.toFixed(2)}. We have noticed some challenges in ${weakSubjects.join(', ')}.\n\nWe encourage you to schedule a meeting with our academic counselor to discuss strategies to support their success.\n\nBest regards,\nEduManager Academic Counseling Team`;
}
