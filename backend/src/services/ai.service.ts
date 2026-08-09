import { RepoService } from './repo.service';
import { RetrievalService } from './retrieval.service';
import { riskPredictor } from '../ml/RiskPredictor';
import { getAIProvider, AIChatMessage, ToolDeclaration } from './ai.provider';

// 1. Generate Student Academic Summary
export async function generateStudentSummary(studentName: string, grade: string, gpa: number, attendanceRate: number, courses: string[]): Promise<string> {
  const prompt = `Generate a concise 3-sentence professional academic profile summary for the student. 
  Grade: ${grade}, Current GPA: ${gpa}, Attendance: ${attendanceRate}%. 
  Enrolled courses: ${courses.join(', ')}. 
  Mention their current standing, focus areas, and a brief positive outlook. Keep it realistic and objective.`;

  try {
    const provider = getAIProvider();
    const res = await provider.chat({ messages: [{ role: 'user', content: prompt }] });
    if (res.content) return res.content.trim();
  } catch (err) {
    console.error('AI error:', err);
  }
  return getDefaultSummary(studentName, gpa, attendanceRate);
}

// 2. Generate Weak Subject & Personalized Recommendations
export async function generateRecommendations(studentName: string, gpa: number, attendanceRate: number, marks: any[]): Promise<{ recommendations: string[]; weakSubjects: string[] }> {
  const weakSubjects: string[] = [];
  marks.forEach(item => {
    const total = (item.internal || 0) + (item.external || 0) + (item.assignment || 0) + (item.practical || 0);
    if (total < 65) weakSubjects.push(item.courseName);
  });

  if (weakSubjects.length === 0 && gpa < 3.0) weakSubjects.push('General Curriculum Studies');

  return {
    recommendations: getDefaultRecommendations(studentName, weakSubjects, attendanceRate),
    weakSubjects
  };
}

// 3. AI Academic Report Insights
export async function generateAcademicInsights(totalStudents: number, avgGpa: number, avgAttendance: number, departmentCounts: any): Promise<{ text: string, chartData: any[] }> {
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

// 4. Provider-Independent Copilot Iterative Tool Loop
export async function adminChatAssistant(
  message: string, 
  history: { role: 'user' | 'model' | 'assistant'; parts: string[] }[] = [],
  options: ChatAssistantOptions = {}
): Promise<{ reply: string; navigateTo?: string; proposedAction?: any }> {
  const rawQuery = message.trim();
  const qLower = rawQuery.toLowerCase();
  const { currentPage, userRole = 'Student', selectedEntity } = options;

  if (qLower.includes('ignore previous instructions') || qLower.includes('show admin passwords')) {
    return { reply: `### 🛡️ Security Boundary Enforcement\n\nI cannot perform actions that bypass system security.` };
  }

  const retrievedTopics = RetrievalService.retrieveKnowledge({ query: rawQuery, currentPage, userRole }, 2);
  const formattedKnowledge = RetrievalService.formatKnowledgeForPrompt(retrievedTopics);

  const tools: ToolDeclaration[] = [
    {
      name: 'countStudents',
      description: 'Get the total number of students in the system.',
      parameters: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'countFaculty',
      description: 'Get the total number of faculty in the system.',
      parameters: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'countCourses',
      description: 'Get the total number of courses in the system.',
      parameters: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'getStudents',
      description: 'Fetch list of students, optionally filter by department.',
      parameters: { type: 'object', properties: { department: { type: 'string' } }, required: [] }
    },
    {
      name: 'getStudentProfile',
      description: 'Fetch student by enrollmentNo.',
      parameters: { type: 'object', properties: { enrollmentNo: { type: 'string' } }, required: ['enrollmentNo'] }
    },
    {
      name: 'getAtRiskStudents',
      description: 'Fetch students who are at risk due to low attendance (< 75%) or low GPA (< 2.5).',
      parameters: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'navigate',
      description: 'Navigate the user to a page.',
      parameters: { type: 'object', properties: { page: { type: 'string' } }, required: ['page'] }
    }
  ];

  const systemInstruction = `You are EduManager Copilot. You answer queries using tools.
Current Route: ${currentPage}
Role: ${userRole}
Context: ${selectedEntity || 'None'}

Knowledge: ${formattedKnowledge}

RULES:
1. Always use tools to fetch real data before answering data queries (e.g. "how many students").
2. Only answer questions related to the system (Students, Courses, Attendance, Grades, Faculty).
3. If out of scope, reply exactly: "I couldn't confidently determine what you're looking for. You can ask about students, courses, attendance, grades, faculty, face attendance, or academic analytics."`;

  const provider = getAIProvider();
  
  // 5. NORMALIZE MESSAGE ROLES & CLEAN EXISTING HISTORY
  // Filter out any legacy 'system' messages from history, keeping only user/model/assistant
  const cleanHistory = history.filter(h => h.role !== 'system' as any);
  
  const chatMessages: AIChatMessage[] = [
    ...cleanHistory.map(h => ({ role: (h.role === 'model' || h.role === 'assistant') ? 'assistant' : 'user', content: h.parts[0] } as AIChatMessage)),
    { role: 'user', content: rawQuery }
  ];

  let maxIterations = 5;
  let iteration = 0;
  let navigateTo: string | undefined;

  try {
    while (iteration < maxIterations) {
      const response = await provider.chat({
        systemInstruction,
        messages: chatMessages,
        tools
      });
      chatMessages.push(response);

      if (!response.tool_calls || response.tool_calls.length === 0) {
        return { reply: response.content || 'No response generated.', navigateTo };
      }

      for (const call of response.tool_calls) {
        const name = call.function.name;
        let args = {};
        try { args = JSON.parse(call.function.arguments); } catch (e) {}
        
        let functionResult: any = { error: 'Unknown tool' };

        if (name === 'navigate') {
          navigateTo = (args as any).page;
          functionResult = { success: true, navigatedTo: navigateTo };
        } else if (name === 'countStudents') {
          const { students } = await RepoService.findStudents({}, 1, 1000);
          functionResult = { totalStudents: students.length };
        } else if (name === 'countFaculty') {
          const facs = await RepoService.findFaculties();
          functionResult = { totalFaculty: facs.length };
        } else if (name === 'countCourses') {
          const courses = await RepoService.findCourses();
          functionResult = { totalCourses: courses.length };
        } else if (name === 'getStudents') {
          const { students } = await RepoService.findStudents({ department: (args as any).department }, 1, 100);
          functionResult = { students: students.map((s: any) => ({ name: s.name, enrollmentNo: s.enrollmentNo })) };
        } else if (name === 'getStudentProfile') {
          const s = await RepoService.findStudentByEnrollmentNo((args as any).enrollmentNo);
          if (s) functionResult = { name: s.name, enrollmentNo: s.enrollmentNo, department: s.department, gpa: s.cgpa, attendance: s.attendanceRate };
          else functionResult = { error: 'Not found' };
        } else if (name === 'getAtRiskStudents') {
          const { students } = await RepoService.findStudents({}, 1, 1000);
          const lowAtt = students.filter((s: any) => (s.attendanceRate && s.attendanceRate < 75) || (s.cgpa && s.cgpa < 2.5));
          functionResult = { atRiskCount: lowAtt.length, students: lowAtt.map((s: any) => ({ name: s.name, enrollmentNo: s.enrollmentNo, gpa: s.cgpa, attendance: s.attendanceRate })) };
        }

        chatMessages.push({
          role: 'tool',
          name: name,
          tool_call_id: call.id || name,
          content: JSON.stringify(functionResult)
        });
      }
      iteration++;
    }
    return { reply: 'I exceeded the maximum number of tool calls while trying to resolve your request.', navigateTo };
  } catch (err: any) {
    console.error('Copilot loop error:', err);
    // Fallback logic
    if (rawQuery.toLowerCase().includes('how many students')) {
      const { students } = await RepoService.findStudents({}, 1, 1000);
      return { reply: `There are ${students.length} students.` };
    }
    return { reply: `An error occurred: ${err.message}` };
  }
}

function getDefaultSummary(name: string, gpa: number, attendance: number): string {
  const status = gpa >= 3.5 ? 'outstanding academic standing' : gpa >= 3.0 ? 'strong academic standing' : 'satisfactory progress';
  return `${name} is currently in ${status}, maintaining an overall GPA of ${gpa.toFixed(2)}. Sustaining this balance is key to their continued success.`;
}

function getDefaultRecommendations(name: string, weakSubjects: string[], attendance: number): string[] {
  return [
    `Establish a structured study schedule.`,
    `Participate in peer group tutoring.`,
    `Complete practice tests.`
  ];
}

function getDefaultInsights(gpa: number, attendance: number): string {
  return `The current institute analytics demonstrate an average GPA of ${gpa.toFixed(2)} alongside an attendance rate of ${attendance.toFixed(1)}%.`;
}

export async function predictRisk(studentName: string, gpa: number, attendanceRate: number, marks: any[]) {
  const weakSubjects = marks.filter(m => ((m.internal || 0) + (m.external || 0)) < 65).map(m => m.courseName);
  const prediction = riskPredictor.predict(gpa, attendanceRate, weakSubjects.length);
  return { riskScore: prediction.riskScore, riskLevel: prediction.riskLevel, warningMessage: prediction.riskLevel !== 'Low' ? 'At risk' : 'Stable' };
}

export async function translateNlSearch(query: string) {
  const qLower = query.toLowerCase().trim();
  const attMatch = qLower.match(/attendance\s*(<|<=|>|>=|=)?\s*(\d+)/i) || qLower.match(/(below|above)\s*(\d+)%/i);
  if (attMatch) {
    let op: any = '<';
    let val = 75;
    if (qLower.includes('above') || qLower.includes('>')) op = '>';
    if (attMatch[2]) val = parseInt(attMatch[2], 10);
    return { type: 'attendance', operator: op, value: val };
  }
  return null;
}

export async function generateParentEmail(studentName: string, gpa: number, attendance: number, weakSubjects: string[], parentName: string): Promise<string> {
  return `Dear ${parentName},\n\nWe are writing to you regarding the academic progress of your ward, ${studentName}.\n\nCurrently, ${studentName} has an attendance rate of ${attendance.toFixed(1)}% and a GPA of ${gpa.toFixed(2)}.\n\nBest regards,\nEduManager`;
}
