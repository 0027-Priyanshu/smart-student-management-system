import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

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
  const prompt = `Generate a concise 3-sentence professional academic profile summary for student ${studentName}. 
  Grade: ${grade}, Current GPA: ${gpa}, Attendance: ${attendanceRate}%. 
  Enrolled courses: ${courses.join(', ')}. 
  Mention their current standing, focus areas, and a brief positive outlook. Keep it realistic and objective.`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text || getDefaultSummary(studentName, gpa, attendanceRate);
    } catch (error) {
      console.error('Gemini error generating summary, falling back:', error);
      return getDefaultSummary(studentName, gpa, attendanceRate);
    }
  }

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

  const prompt = `Based on student ${studentName}'s details: GPA is ${gpa}, Attendance is ${attendanceRate}%, and weak subjects are: ${weakSubjects.join(', ')}.
  Generate exactly 3 actionable, highly specific study recommendations for this student to improve their grades. 
  Respond with exactly 3 bullet points, separated by newlines, without markdown formatting.`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const text = response.text || '';
      const recommendations = text
        .split('\n')
        .map(line => line.replace(/^-\s*/, '').replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 3);
      
      return {
        recommendations: recommendations.length > 0 ? recommendations : getDefaultRecommendations(studentName, weakSubjects, attendanceRate),
        weakSubjects
      };
    } catch (error) {
      console.error('Gemini error generating recommendations, falling back:', error);
      return {
        recommendations: getDefaultRecommendations(studentName, weakSubjects, attendanceRate),
        weakSubjects
      };
    }
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
): Promise<string> {
  const prompt = `Write a professional administrative insight report (around 120 words) for a department head based on these institute-wide metrics:
  Total Students: ${totalStudents}, Average GPA: ${avgGpa.toFixed(2)}, Average Attendance: ${avgAttendance.toFixed(1)}%.
  Department distributions: ${JSON.stringify(departmentCounts)}.
  Summarize strengths, highlight area of concern (e.g. attendance or GPA drop), and outline 2 strategic objectives.`;

  if (ai) {
    try {
      const response = await ioGenerate(prompt);
      return response;
    } catch (err) {
      return getDefaultInsights(avgGpa, avgAttendance);
    }
  }
  return getDefaultInsights(avgGpa, avgAttendance);
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
  const sysContext = `You are a helpful AI Academic Assistant for EduManager, an advanced MERN Student Management System.
  You help admins find insights, answer curriculum questions, and explain student performance.
  Keep responses highly professional, concise, and structured. Answer the user's latest message based on the conversation history.`;

  if (ai) {
    try {
      // Map history structure to Gemini API format
      const formattedContents = [
        { role: 'user', parts: [{ text: sysContext }] },
        ...history.map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: h.parts.map(p => ({ text: p }))
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
  if (q.includes('attendance')) {
    return `To track attendance in EduManager, navigate to the "Attendance" page where faculty can mark status manually or students can scan dynamic QR codes. If attendance falls below 75%, the system automatically flags the student profile and raises alert logs for administrators. Let me know if you need help generating a report!`;
  }
  if (q.includes('gpa') || q.includes('grade') || q.includes('marks')) {
    return `EduManager calculates individual GPA and cumulative CGPA automatically from internal, external, assignment, and practical grades entered by faculties. You can view student grade histories and GPA trajectory lines in the student profile view.`;
  }
  if (q.includes('student') || q.includes('add')) {
    return `Admins can add new students using the Student Directory screen by clicking "Add Student", filling out the enrollment forms (including parent and contact info), and setting credentials. Alternatively, you can use the "Bulk Import" button to upload an Excel file directly.`;
  }
  return `Hello! I am your EduManager AI Assistant. I can help you search student directories, analyze academic GPA progress, calculate grade metrics, or check attendance histories. Try asking me about 'how to mark attendance', 'how GPA is computed', or 'bulk importing students'!`;
}
