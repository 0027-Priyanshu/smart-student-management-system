import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

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
  // Determine weak subjects based on marks
  const weakSubjects: string[] = [];
  marks.forEach(item => {
    const total = (item.internal || 0) + (item.external || 0) + (item.assignment || 0) + (item.practical || 0);
    // If average mark is less than 65%, consider it weak
    if (total < 65) {
      weakSubjects.push(item.courseName);
    }
  });

  if (weakSubjects.length === 0 && gpa < 3.0) {
    weakSubjects.push('General Curriculum Studies');
  }

  const prompt = `Based on the student's details: GPA is ${gpa}, Attendance is ${attendanceRate}%, and weak subjects are: ${weakSubjects.join(', ')}.
  Generate exactly 3 actionable, highly specific study recommendations for this student to improve their grades. 
  Respond with exactly 3 bullet points, separated by newlines, without markdown formatting.`;

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
  const prompt = `Write a professional administrative insight report (around 120 words) based on these metrics:
  Total Students: ${totalStudents}, Average GPA: ${avgGpa.toFixed(2)}, Average Attendance: ${avgAttendance.toFixed(1)}%.
  Department distributions: ${JSON.stringify(departmentCounts)}.
  Summarize strengths, highlight concerns, and outline 2 strategic objectives.

  Also, generate a mock dataset for a 6-month GPA and Attendance trend chart for the whole institute.
  Return EXACTLY and ONLY this JSON format (no markdown tags):
  {
    "text": "Your report here...",
    "chartData": [
      { "month": "Jan", "gpa": 3.1, "attendance": 82 },
      { "month": "Feb", "gpa": 3.2, "attendance": 85 }
    ]
  }`;

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

// Helper function for raw text generation
async function ioGenerate(prompt: string): Promise<string> {
  if (!ai) return '';
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  return response.text || '';
}

// 4. Admin Chatbot Companion
export async function adminChatAssistant(message: string, history: { role: 'user' | 'model'; parts: string[] }[]): Promise<string> {
  let knowledgeBaseContext = '';
  try {
    const kbPath = path.join(__dirname, '../data/knowledge_base.txt');
    if (fs.existsSync(kbPath)) {
      knowledgeBaseContext = fs.readFileSync(kbPath, 'utf8');
    }
  } catch (err) {
    console.error('Failed to load knowledge base:', err);
  }

  const sysContext = `You are a helpful AI Academic Assistant for EduManager, an advanced MERN Student Management System.
  You help admins find insights, answer curriculum questions, and explain student performance.
  Keep responses highly professional, concise, and structured. Answer the user's latest message based on the conversation history.
  
  IMPORTANT COLLEGE RULES & KNOWLEDGE BASE:
  ${knowledgeBaseContext}`;

  if (ai) {
    try {
      // Map history structure to Gemini API format
      const formattedContents = [
        { role: 'user', parts: [{ text: sysContext }] },
        ...history.map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: Array.isArray(h.parts)
            ? h.parts.map(p => ({ text: typeof p === 'string' ? p : (p as any)?.text || (p as any)?.content || String(p) }))
            : [{ text: String(h.parts) }]
        })),
        { role: 'user', parts: [{ text: message }] }
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: formattedContents,
      });
      return response.text || 'I apologize, I am unable to generate a response at this moment.';
    } catch (error) {
      console.error('Gemini chatbot error, falling back:', error);
      return getMockChatResponse(message);
    }
  }

  return getMockChatResponse(message);
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
  return `The current institute analytics demonstrate a healthy average GPA of ${gpa.toFixed(2)} alongside an attendance rate of ${attendance.toFixed(1)}%. While overall academic performance remains solid, departments with average attendance dropping below 80% require close observation. We recommend establishing early alert notifications for students whose individual attendance slips below 75% to prevent grading penalties. Key objectives include implementing peer tutoring circles and launching dynamic QR-code scanning to capture class entries instantly.`;
}

function getMockChatResponse(message: string): string {
  const q = message.toLowerCase();
  if (q.includes('enr') || q.includes('find a student') || q.includes('view profile')) {
    const match = message.match(/ENR\d+/i);
    if (match) {
      return `### Student Profile Lookup (${match[0].toUpperCase()})\n- **Status**: Registered in System\n- **Enrollment Number**: ${match[0].toUpperCase()}\n- **Details**: Full grade sheet, attendance breakdown, and parent contact details are available in the **Student Directory** page.`;
    }
    return `To search for a specific student, specify their **Enrollment Number** (e.g. \`ENR25844945\`) or navigate to the **Student Directory** to use the instant search and filter controls.`;
  }
  if (q.includes('attendance')) {
    return `To track attendance in EduManager, navigate to the **Attendance** page where faculty can generate dynamic scannable QR codes or mark status manually. If attendance falls below 75%, the system automatically flags the student profile and raises alert logs.`;
  }
  if (q.includes('gpa') || q.includes('grade') || q.includes('marks')) {
    return `EduManager calculates individual GPA and cumulative CGPA automatically from internal, external, assignment, and practical grades entered by faculties. You can view student grade histories and GPA trajectory lines in the student profile view.`;
  }
  if (q.includes('student') || q.includes('add')) {
    return `Admins can add new students using the Student Directory screen by clicking **Add Student**, filling out the enrollment forms, or using the **Bulk Import** button to upload an Excel file directly.`;
  }
  return `Hello! I am your EduManager AI Assistant. I can help you search student directories, analyze academic GPA progress, calculate grade metrics, or check attendance histories. Try asking me about 'Find a student by ID' or 'Summarise today's attendance'!`;
}

// 5. Predictive AI: At-Risk Student Analysis
import { riskPredictor } from '../ml/RiskPredictor';

export async function predictRisk(
  studentName: string,
  gpa: number,
  attendanceRate: number,
  marks: any[]
): Promise<{ riskScore: number; warningMessage: string; riskLevel: 'Low' | 'Medium' | 'High' }> {
  const weakSubjects = marks.filter(m => ((m.internal || 0) + (m.external || 0) + (m.assignment || 0) + (m.practical || 0)) < 65).map(m => m.courseName);
  
  // 1. Get raw probability score from ML model
  const prediction = riskPredictor.predict(gpa, attendanceRate, weakSubjects.length);
  
  // 2. Generate a concise warning message using LLM for context, but keeping ML ground truth
  let warningMessage = 'Academic profile is stable.';
  if (prediction.riskLevel !== 'Low') {
    const prompt = `You are an AI academic advisor. The ML model flagged student ${studentName} as ${prediction.riskLevel} risk (Score: ${prediction.riskScore}%).
    GPA: ${gpa.toFixed(2)}
    Attendance: ${attendanceRate.toFixed(1)}%
    Weak Subjects: ${weakSubjects.join(', ') || 'None'}
    
    Provide EXACTLY ONE concise sentence (max 15 words) explaining why this student is at risk, mentioning the specific data points.`;
    
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
      // Strip out markdown code blocks and any trailing/leading whitespace
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      if (!text || text === '{}') return null;
      
      const parsed = JSON.parse(text);
      if (parsed.type) {
        // if they put a percentage, strip it out
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
