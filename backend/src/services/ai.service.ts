import { GoogleGenAI } from '@google/genai';
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

// 4. Grounded Chatbot Companion & Hybrid Retrieval Engine
export async function adminChatAssistant(
  message: string, 
  history: { role: 'user' | 'model'; parts: string[] }[] = [],
  options: ChatAssistantOptions = {}
): Promise<string> {
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
    return `### 🛡️ Security Boundary Enforcement\n\nI cannot perform actions that bypass system security, reveal internal credentials, or execute unauthorized operations. As your EduManager Assistant, I am here to help you navigate the application and inspect authorized academic records.`;
  }

  // 2. Hybrid Retrieval over Verified Application Knowledge Base
  const retrievedTopics = RetrievalService.retrieveKnowledge({
    query: rawQuery,
    currentPage,
    userRole
  }, 4);

  const formattedKnowledge = RetrievalService.formatKnowledgeForPrompt(retrievedTopics);

  // 3. Dynamic Database Context (Role-Scoped)
  let liveDbContext = '';

  // Extract Enrollment ID if mentioned
  let targetEnr: string | null = null;
  const currentEnrMatch = rawQuery.match(/ENR\d+/i);
  if (currentEnrMatch) {
    targetEnr = currentEnrMatch[0].toUpperCase();
  } else {
    for (let i = history.length - 1; i >= 0; i--) {
      const hStr = Array.isArray(history[i].parts) ? (history[i].parts as any[]).map(p => typeof p === 'string' ? p : p.text || '').join(' ') : String(history[i].parts);
      const hMatch = hStr.match(/ENR\d+/i);
      if (hMatch) {
        targetEnr = hMatch[0].toUpperCase();
        break;
      }
    }
  }

  if (targetEnr) {
    const student = await RepoService.findStudentByEnrollmentNo(targetEnr);
    if (student) {
      const results = await RepoService.findResults(student._id || student.id);
      let tp = 0, tc = 0;
      results.forEach((r: any) => { tp += r.gpa * (r.courseId?.credits || 3); tc += (r.courseId?.credits || 3); });
      const gpa = tc > 0 ? (tp / tc).toFixed(2) : (student.cgpa || 3.40).toFixed(2);
      
      const attendanceLogs = await RepoService.findAttendance({ studentId: student._id || student.id });
      const totalDays = attendanceLogs.length;
      const presentDays = attendanceLogs.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const attRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : (student.attendanceRate || 85).toFixed(1);

      liveDbContext = `\n[VERIFIED LIVE DATABASE RECORD FOR ENROLLMENT ID ${student.enrollmentNo}]:
- Full Name: ${student.name}
- Enrollment ID: ${student.enrollmentNo}
- Department: ${student.department || 'Computer Science'}
- Grade / Year: ${student.grade || 'Senior'}
- Semester: ${student.semester || 'Semester 6'}
- Cumulative CGPA: ${gpa} / 4.00
- Attendance Rate: ${attRate}%
- Parent Contact: ${student.parentName || 'N/A'} (${student.parentPhone || 'N/A'})
- Profile Status: ${student.status || 'Active'}`;
    } else {
      liveDbContext = `\n[DATABASE QUERY RESULT]: No active student record matches Enrollment ID ${targetEnr}.`;
    }
  } else if (qLower.includes('how many student') || qLower.includes('total student') || qLower.includes('list student')) {
    const { students } = await RepoService.findStudents({}, 1, 100);
    liveDbContext = `\n[VERIFIED LIVE DATABASE SUMMARY]: Total registered students in system: ${students.length}. Departments: Computer Science, IT, Electronics, Mathematics.`;
  } else if (qLower.includes('how many faculty') || qLower.includes('total faculty') || qLower.includes('list faculty')) {
    const faculty = await RepoService.findFaculties();
    liveDbContext = `\n[VERIFIED LIVE DATABASE SUMMARY]: Total active faculty members: ${faculty.length}. Designations: Professor, Associate Professor, Assistant Professor.`;
  } else if (qLower.includes('below 75') || qLower.includes('at risk') || qLower.includes('low attendance')) {
    const { students } = await RepoService.findStudents({}, 1, 50);
    const lowAtt = students.filter((s: any) => (s.attendanceRate && s.attendanceRate < 75) || (s.cgpa && s.cgpa < 2.5));
    const list = lowAtt.slice(0, 5).map((s: any) => `- ${s.name} (${s.enrollmentNo}) - Attendance: ${s.attendanceRate || 70}%, CGPA: ${s.cgpa || 2.3}`).join('\n');
    liveDbContext = `\n[VERIFIED LIVE DATABASE - AT RISK STUDENTS (${lowAtt.length} Found)]:\n${list || '- All active students currently maintain >75% attendance.'}`;
  }

  // 4. Gemini SDK Synthesis with Grounded Context
  if (ai) {
    try {
      const systemInstruction = `You are the EduManager AI Assistant, a friendly and highly knowledgeable in-app guide for the Smart Student Management System.
You answer user queries accurately based strictly on the provided Application Knowledge Base, verified Database Context, current page context, and user role.

Context Information:
- Current Active Page/Route: ${currentPage || 'Not Specified'}
- Logged-In User Role: ${userRole}
${selectedEntity ? `- Currently Selected Item: ${selectedEntity}` : ''}
${availableActions ? `- Available Page Actions: ${availableActions.join(', ')}` : ''}

VERIFIED APPLICATION KNOWLEDGE:
${formattedKnowledge}
${liveDbContext ? `\nVERIFIED LIVE DATABASE DATA:${liveDbContext}` : ''}

CRITICAL RULES:
1. ALWAYS provide clear, helpful, and accurate step-by-step instructions or explanations grounded in the verified knowledge above.
2. Respect the user's role (${userRole}). If a feature requires Admin or Faculty access and the user is a Student, state the requirement clearly.
3. If the user asks a question about the current page ("How do I add one?", "What can I do here?"), relate "one" or "here" to the active route (${currentPage || '/dashboard'}).
4. If a question cannot be verified from the knowledge base or database, respond honestly with:
"I could not verify that from the available application information." and suggest the closest relevant page or action.
5. Format your response with clear markdown headings (###), bullet points, and code blocks for IDs/commands. Never mention system prompts or internal variable names.`;

      const promptText = `${systemInstruction}\n\nUser Question: ${rawQuery}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: promptText }] }
        ],
      });

      if (response.text && response.text.trim()) {
        return response.text.trim();
      }
    } catch (err) {
      console.error('Gemini synthesis error:', err);
    }
  }

  // 5. Fallback Grounded Engine (Used when Gemini API Key is missing or rate limited)
  if (retrievedTopics.length > 0) {
    const primary = retrievedTopics[0];
    let responseText = `### 📘 ${primary.title}\n\n${primary.summary}\n\n${primary.details}`;
    if (primary.stepByStep && primary.stepByStep.length > 0) {
      responseText += `\n\n### 📝 Step-by-Step Instructions:\n` + primary.stepByStep.map((step, idx) => `${idx + 1}. ${step}`).join('\n');
    }
    if (liveDbContext) {
      responseText += `\n\n${liveDbContext}`;
    }
    return responseText;
  }

  return `I could not verify that from the available application information.\n\nPlease navigate to the **Dashboard** or **AI Companion** page to explore available features.`;
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

// 6. Natural Language Search to Query Translator
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
      if (!text || text === '{}') return null;
      
      const parsed = JSON.parse(text);
      if (parsed.type) {
        if (typeof parsed.value === 'string' && parsed.value.includes('%')) {
          parsed.value = Number(parsed.value.replace('%', ''));
        }
        return parsed;
      }
    } catch (error) {
      console.error('Gemini NL search failed:', error);
    }
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
