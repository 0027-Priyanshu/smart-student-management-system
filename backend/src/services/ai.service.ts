import { RepoService } from './repo.service';
import { RetrievalService } from './retrieval.service';
import { AcademicMetricsService } from './metrics.service';
import { getAIProvider, AIChatMessage, ToolDeclaration } from './ai.provider';

// 1. Generate Student Academic Summary
export async function generateStudentSummary(
  studentName: string, 
  grade: string, 
  gpa: number | null, 
  attendanceRate: number | null, 
  courses: string[]
): Promise<string> {
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
    const provider = getAIProvider();
    const res = await provider.chat({ messages: [{ role: 'user', content: prompt }] });
    if (res.content) return res.content.trim();
  } catch (err) {
    console.error('[AI Summary Error]:', err);
  }
  return getDefaultSummary(studentName, gpa, attendanceRate);
}

// 2. Generate Weak Subject & Personalized Recommendations
export async function generateRecommendations(
  studentName: string, 
  gpa: number | null, 
  attendanceRate: number | null, 
  weakSubjectNames: string[]
): Promise<{ recommendations: string[]; weakSubjects: string[] }> {
  return {
    recommendations: getDefaultRecommendations(studentName, weakSubjectNames, attendanceRate),
    weakSubjects: weakSubjectNames
  };
}

// 3. Database-First + LLM-Interpretation Institutional Insights
export interface InstitutionalInsightResult {
  summary: string;
  observations: Array<{
    title: string;
    description: string;
    severity: 'positive' | 'neutral' | 'warning' | 'critical';
    metric?: string;
  }>;
  recommendations: Array<{
    title: string;
    action: string;
    priority: 'low' | 'medium' | 'high';
    targetArea?: string;
  }>;
}

export function generateDeterministicInstitutionalInsights(metrics: any): InstitutionalInsightResult {
  const gpa = metrics.academics?.averageGpa;
  const gpaSampleSize = metrics.academics?.gpaSampleSize || 0;
  const totalStudents = metrics.institution?.totalStudents || 0;
  const att = metrics.attendance?.averageAttendance;
  const attSampleSize = metrics.attendance?.attendanceSampleSize || 0;
  const atRiskCount = metrics.risk?.atRiskStudents || 0;
  const atRiskPct = metrics.risk?.atRiskPercentage || 0;
  const highRisk = metrics.risk?.highRisk || 0;
  const mediumRisk = metrics.risk?.mediumRisk || 0;

  // Executive summary
  let summary = '';
  if (totalStudents === 0) {
    summary = 'No student enrollments are currently registered in the database. As students enroll and academic sessions commence, institutional performance benchmarks will automatically calibrate.';
  } else {
    const gpaPart = gpa !== null 
      ? `an institutional average CGPA of **${gpa.toFixed(2)}** (evaluated across ${gpaSampleSize} of ${totalStudents} students)`
      : `grade evaluations currently pending across ${totalStudents} registered students`;
    
    const attPart = att !== null
      ? `an aggregate attendance compliance rate of **${att.toFixed(1)}%**`
      : `no attendance sessions logged yet`;

    const riskPart = atRiskCount > 0
      ? `**${atRiskCount} student(s)** (${atRiskPct}%) currently meet academic risk criteria requiring targeted counseling or monitoring`
      : `all currently evaluated students maintain satisfactory academic standing`;

    summary = `Database records reflect ${gpaPart} alongside ${attPart}. From an academic risk standpoint, ${riskPart}.`;
  }

  // Key Observations
  const observations: Array<{ title: string; description: string; severity: 'positive' | 'neutral' | 'warning' | 'critical'; metric?: string }> = [];

  // Attendance Observation
  if (att !== null) {
    if (att >= 85) {
      observations.push({
        title: 'Strong Attendance Compliance',
        description: `Institutional attendance stands at ${att.toFixed(1)}%, comfortably surpassing the 75% regulatory benchmark across ${attSampleSize} student record(s).`,
        severity: 'positive',
        metric: `${att.toFixed(1)}% Attendance`
      });
    } else if (att >= 75) {
      observations.push({
        title: 'Moderate Attendance Standing',
        description: `Institutional attendance averages ${att.toFixed(1)}%, meeting baseline requirements but requiring close monitoring to avoid drop-offs.`,
        severity: 'neutral',
        metric: `${att.toFixed(1)}% Attendance`
      });
    } else {
      observations.push({
        title: 'Attendance Below Target Benchmark',
        description: `Institutional attendance (${att.toFixed(1)}%) is below the mandatory 75% threshold, signaling absenteeism risks across class cohorts.`,
        severity: 'critical',
        metric: `${att.toFixed(1)}% Attendance`
      });
    }
  } else {
    observations.push({
      title: 'Attendance Data Collection in Progress',
      description: 'Zero attendance sessions have been logged to date. Institutional compliance indicators will activate once lectures record check-ins.',
      severity: 'neutral',
      metric: 'N/A'
    });
  }

  // Academic Performance Observation
  if (gpa !== null) {
    if (gpa >= 3.5) {
      observations.push({
        title: 'Superior Academic Achievement',
        description: `Cumulative grade point average of ${gpa.toFixed(2)} / 4.00 demonstrates robust course mastery across evaluated cohorts.`,
        severity: 'positive',
        metric: `${gpa.toFixed(2)} CGPA`
      });
    } else if (gpa >= 2.75) {
      observations.push({
        title: 'Consistent Academic Progress',
        description: `Average CGPA of ${gpa.toFixed(2)} reflects steady scholastic performance with opportunities for enrichment in foundational courses.`,
        severity: 'neutral',
        metric: `${gpa.toFixed(2)} CGPA`
      });
    } else {
      observations.push({
        title: 'Academic Performance Requires Reinforcement',
        description: `Average CGPA of ${gpa.toFixed(2)} is nearing probationary levels. Core prerequisite subject reinforcement is advised.`,
        severity: 'warning',
        metric: `${gpa.toFixed(2)} CGPA`
      });
    }
  } else {
    observations.push({
      title: 'Grade Evaluations Pending',
      description: 'Formal semester assessment marks have not yet been published for this academic term.',
      severity: 'neutral',
      metric: 'N/A'
    });
  }

  // Risk Distribution Observation
  if (atRiskCount > 0) {
    observations.push({
      title: `${atRiskCount} Student(s) Flagged for Academic Risk`,
      description: `${highRisk} student(s) exhibit high-risk indicators and ${mediumRisk} exhibit medium-risk indicators driven by attendance dips or lower GPA.`,
      severity: highRisk > 0 ? 'critical' : 'warning',
      metric: `${atRiskPct}% At-Risk`
    });
  } else if (totalStudents > 0) {
    observations.push({
      title: 'Zero Academic At-Risk Flags',
      description: 'No students currently breach critical attendance (<75%) or grade (<2.50 GPA) thresholds.',
      severity: 'positive',
      metric: '0 At-Risk'
    });
  }

  // Recommendations
  const recommendations: Array<{ title: string; action: string; priority: 'low' | 'medium' | 'high'; targetArea?: string }> = [];

  if (atRiskCount > 0) {
    recommendations.push({
      title: 'Initiate Academic Advising & Counseling',
      action: `Deploy faculty advisors to engage with the ${atRiskCount} flagged student(s) to address specific attendance or grade impediments.`,
      priority: 'high',
      targetArea: 'Student Retention'
    });
  }

  if (att !== null && att < 75) {
    recommendations.push({
      title: 'Activate Automated Attendance Alerts',
      action: 'Trigger parent notifications and direct student warnings for course sessions with recurring absence clusters.',
      priority: 'high',
      targetArea: 'Attendance Compliance'
    });
  }

  if (metrics.dataQuality?.studentsWithoutGpa > 0) {
    recommendations.push({
      title: 'Finalize Semester Grade Entry',
      action: `Coordinate with department instructors to submit pending assessment marks for ${metrics.dataQuality.studentsWithoutGpa} unevaluated student(s).`,
      priority: 'medium',
      targetArea: 'Assessment Administration'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Maintain Curriculum Delivery Standards',
      action: 'Continue active lecture delivery, formative weekly quizzes, and regular biometric attendance logging.',
      priority: 'low',
      targetArea: 'Academic Excellence'
    });
  }

  return {
    summary,
    observations,
    recommendations
  };
}

export async function generateInstitutionalInsights(metrics: any): Promise<{ insights: InstitutionalInsightResult; insightSource: 'AI' | 'DETERMINISTIC_FALLBACK' }> {
  try {
    const provider = getAIProvider();
    
    const systemInstruction = `You are an academic analytics executive advisor for EduManager.
The following quantitative institutional metrics were calculated directly from MongoDB database records.
Treat these metrics as the immutable single source of truth.
CRITICAL RULES:
1. DO NOT calculate, modify, estimate, or invent academic numbers.
2. DO NOT introduce student counts, percentages, GPA values, attendance values, or risk counts that are not present in the provided metrics.
3. Your job is strictly to interpret the verified metrics and provide strategic observations and actionable recommendations.
4. If data is partial (e.g. some students lack GPA or attendance), note data limits honestly.
5. Return ONLY a valid JSON object matching this schema:
{
  "summary": "Concise 1-2 paragraph executive strategic summary",
  "observations": [
    { "title": "string", "description": "string", "severity": "positive"|"neutral"|"warning"|"critical", "metric": "string" }
  ],
  "recommendations": [
    { "title": "string", "action": "string", "priority": "high"|"medium"|"low", "targetArea": "string" }
  ]
}`;

    const userPrompt = `Institutional Metrics (Source of Truth):\n${JSON.stringify({
      institution: metrics.institution,
      academics: metrics.academics,
      attendance: metrics.attendance,
      risk: metrics.risk,
      dataQuality: metrics.dataQuality,
      departmentDistribution: metrics.departmentDistribution
    }, null, 2)}`;

    // Call LLM with 8-second timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI_INSIGHTS_TIMEOUT')), 8000);
    });

    const aiPromise = provider.chat({
      systemInstruction,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const response = await Promise.race([aiPromise, timeoutPromise]);
    const rawContent = response.content.trim();

    // Clean JSON markdown wraps if present
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, rawContent];
    const parsed = JSON.parse(jsonMatch[1] || rawContent);

    if (parsed && typeof parsed.summary === 'string' && Array.isArray(parsed.observations) && Array.isArray(parsed.recommendations)) {
      return {
        insights: {
          summary: parsed.summary,
          observations: parsed.observations.map((o: any) => ({
            title: String(o.title || 'Observation'),
            description: String(o.description || ''),
            severity: ['positive', 'neutral', 'warning', 'critical'].includes(o.severity) ? o.severity : 'neutral',
            metric: o.metric ? String(o.metric) : undefined
          })),
          recommendations: parsed.recommendations.map((r: any) => ({
            title: String(r.title || 'Recommendation'),
            action: String(r.action || ''),
            priority: ['high', 'medium', 'low'].includes(r.priority) ? r.priority : 'medium',
            targetArea: r.targetArea ? String(r.targetArea) : undefined
          }))
        },
        insightSource: 'AI'
      };
    }
  } catch (err: any) {
    console.warn(`[AcademicInsights] LLM generation failed (${err?.message || err}). Engaging deterministic fallback.`);
  }

  return {
    insights: generateDeterministicInstitutionalInsights(metrics),
    insightSource: 'DETERMINISTIC_FALLBACK'
  };
}

// Backwards-compatible legacy signature
export async function generateAcademicInsights(
  totalStudents: number, 
  avgGpa: number | null, 
  avgAttendance: number | null, 
  departmentCounts: any
): Promise<{ text: string; chartData: any[] }> {
  const fallback = generateDeterministicInstitutionalInsights({
    institution: { totalStudents },
    academics: { averageGpa: avgGpa, gpaSampleSize: totalStudents },
    attendance: { averageAttendance: avgAttendance, attendanceSampleSize: totalStudents },
    risk: { atRiskStudents: 0, atRiskPercentage: 0 }
  });
  return { 
    text: fallback.summary, 
    chartData: [] 
  };
}

export interface ChatAssistantOptions {
  currentPage?: string;
  userRole?: string;
  userId?: string;
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
  const { currentPage, userRole = 'Student', userId, selectedEntity } = options;

  if (qLower.includes('ignore previous instructions') || qLower.includes('show admin passwords')) {
    return { reply: `### 🛡️ Security Boundary Enforcement\n\nI cannot perform actions that bypass system security or disclose administrative credentials.` };
  }

  const retrievedTopics = RetrievalService.retrieveKnowledge({ query: rawQuery, currentPage, userRole }, 2);
  const formattedKnowledge = RetrievalService.formatKnowledgeForPrompt(retrievedTopics);

  const allTools: ToolDeclaration[] = [
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
  } else if (userRole === 'Faculty') {
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

  const provider = getAIProvider();
  
  // Clean history
  const cleanHistory = history.filter(h => (h.role as any) !== 'system');
  
  const chatMessages: AIChatMessage[] = [
    ...cleanHistory.map(h => ({ role: (h.role === 'model' || h.role === 'assistant') ? 'assistant' : 'user', content: h.parts[0] } as AIChatMessage)),
    { role: 'user', content: rawQuery }
  ];

  let maxIterations = 6;
  let iteration = 0;
  let navigateTo: string | undefined;
  let lastToolResult: any = null;
  let lastToolName: string = '';
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
      } catch (err: any) {
        if (iteration === 0 && currentProvider.constructor.name === 'FreeLLMProvider') {
          const { MockProvider } = require('./ai.provider');
          currentProvider = new MockProvider();
          response = await currentProvider.chat({
            systemInstruction,
            messages: chatMessages,
            tools
          });
        } else {
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
        } catch (e) {}
        return { reply: finalReply, navigateTo };
      }

      for (const call of response.tool_calls) {
        const name = call.function.name;
        let args: any = {};
        try { args = JSON.parse(call.function.arguments); } catch (e) {}
        
        let functionResult: any = { error: 'Unknown tool or execution failed' };

        // Authorization helpers
        const requireAdmin = () => { if (userRole !== 'Super Admin' && userRole !== 'Admin') throw new Error('UNAUTHORIZED: Admin access required'); };
        const requireAdminOrFaculty = () => { if (userRole === 'Student') throw new Error('UNAUTHORIZED: Faculty or Admin access required'); };

        try {
          if (name === 'navigate') {
            navigateTo = args.page;
            functionResult = { success: true, navigatedTo: navigateTo };
          } 
          // ---------------- STUDENT TOOLS ----------------
          else if (name === 'getMyStudentProfile') {
            if (!userId) {
              functionResult = { error: 'NOT_FOUND', message: 'You must be logged in to view your profile.' };
            } else {
              const st = await RepoService.findStudentByUserId(userId);
              if (!st) {
                functionResult = { error: 'NOT_FOUND', message: 'Student profile not found for this user.' };
              } else {
                const sId = (st._id || st.id).toString();
                const [gpaData, attData] = await Promise.all([
                  AcademicMetricsService.calculateStudentGpa(sId),
                  AcademicMetricsService.calculateStudentAttendance(sId)
                ]);
                functionResult = {
                  name: st.name,
                  enrollmentNo: st.enrollmentNo,
                  department: st.department,
                  semester: st.semester || 1,
                  grade: st.grade || 'N/A',
                  attendance: attData.attendanceRate !== null ? `${attData.attendanceRate}%` : 'N/A',
                  gpa: gpaData.gpa !== null ? gpaData.gpa : 'N/A',
                  enrolledCourses: (st.enrolledCourses || []).map((c: any) => ({ name: c.name || c, code: c.code || 'CODE' }))
                };
              }
            }
          } else if (name === 'countStudents') {
            requireAdminOrFaculty();
            if (userRole === 'Faculty' && userId) {
              const facData = await AcademicMetricsService.getFacultyAcademicOverview(userId);
              functionResult = { totalStudents: facData.enrolledStudentsCount, scope: 'assigned courses' };
            } else {
              const { totalItems } = await RepoService.findStudents({ isDeleted: false }, 1, 1);
              functionResult = { totalStudents: totalItems, scope: 'institution' };
            }
          } else if (name === 'searchStudents') {
            requireAdminOrFaculty();
            const { students } = await RepoService.findStudents({ isDeleted: false, search: args.search, department: args.department }, 1, 50);
            
            // Faculty RBAC filtering
            let filtered = students;
            if (userRole === 'Faculty' && userId) {
              const fac = await RepoService.findFacultyByUserId(userId);
              const assignedIds = (fac?.assignedCourses || []).map((c: any) => (c._id || c.id || c).toString());
              filtered = students.filter((s: any) => {
                const sCourses = (s.enrolledCourses || []).map((c: any) => (c._id || c.id || c).toString());
                return sCourses.some((cid: string) => assignedIds.includes(cid));
              });
            }

            if (filtered.length === 0) {
              functionResult = { error: 'NOT_FOUND', message: 'No matching students found.' };
            } else {
              functionResult = { students: filtered.map((s: any) => ({ name: s.name, enrollmentNo: s.enrollmentNo, department: s.department })) };
            }
          } else if (name === 'getStudentProfile') {
            const query = args.enrollmentNo || args.studentId || '';
            const s = await RepoService.findStudentByEnrollmentNo(query) || await RepoService.findStudentById(query);
            if (!s) { 
              functionResult = { error: 'NOT_FOUND', message: `No student found with enrollment ID or name "${query}".` }; 
            } else {
              const sUserId = (s.userId?._id || s.userId?.id || s.userId || '').toString();
              if (userRole === 'Student' && userId && sUserId !== String(userId)) {
                throw new Error('UNAUTHORIZED: You can only view your own student profile.');
              }
              if (userRole === 'Faculty' && userId) {
                const fac = await RepoService.findFacultyByUserId(userId);
                const assignedIds = (fac?.assignedCourses || []).map((c: any) => (c._id || c.id || c).toString());
                const sCourses = (s.enrolledCourses || []).map((c: any) => (c._id || c.id || c).toString());
                const teaches = sCourses.some((cid: string) => assignedIds.includes(cid));
                if (!teaches) {
                  throw new Error('UNAUTHORIZED: You can only query students enrolled in courses you teach.');
                }
              }

              const sId = (s._id || s.id).toString();
              const [gpaData, attData] = await Promise.all([
                AcademicMetricsService.calculateStudentGpa(sId),
                AcademicMetricsService.calculateStudentAttendance(sId)
              ]);

              functionResult = { 
                name: s.name, 
                enrollmentNo: s.enrollmentNo, 
                department: s.department, 
                semester: s.semester || 1,
                grade: s.grade || 'N/A',
                gpa: gpaData.gpa !== null ? gpaData.gpa : 'N/A', 
                attendance: attData.attendanceRate !== null ? `${attData.attendanceRate}%` : 'N/A',
                enrolledCourses: (s.enrolledCourses || []).map((c: any) => c.name || c.code || c)
              }; 
            }
          } else if (name === 'getStudentsByCourse') {
            requireAdminOrFaculty();
            const query = args.courseId || args.code || args.courseName || '';
            const allCourses = await RepoService.findCourses({ isDeleted: false });
            const course = allCourses.find((c: any) => c.code?.toLowerCase() === query.toLowerCase() || c.name?.toLowerCase().includes(query.toLowerCase()));
            
            if (!course) {
              functionResult = { error: 'NOT_FOUND', message: `Course "${query}" was not found in the catalog.` };
            } else {
              const cId = (course._id || course.id).toString();
              if (userRole === 'Faculty' && userId) {
                const fac = await RepoService.findFacultyByUserId(userId);
                const assignedIds = (fac?.assignedCourses || []).map((c: any) => (c._id || c.id || c).toString());
                if (!assignedIds.includes(cId)) {
                  throw new Error('UNAUTHORIZED: You are not assigned to teach this course.');
                }
              }

              const { students } = await RepoService.findStudents({ isDeleted: false, courseId: cId }, 1, 100);
              functionResult = { 
                courseName: course.name, 
                courseCode: course.code, 
                studentsCount: students.length, 
                students: students.map((s: any) => ({ name: s.name, enrollmentNo: s.enrollmentNo })) 
              };
            }
          }
          // ---------------- FACULTY TOOLS ----------------
          else if (name === 'getMyFacultyProfile') {
            if (!userId) {
              functionResult = { error: 'NOT_FOUND', message: 'You must be logged in to view faculty details.' };
            } else {
              const fac = await RepoService.findFacultyByUserId(userId);
              if (!fac) {
                functionResult = { error: 'NOT_FOUND', message: 'Faculty profile not found.' };
              } else {
                functionResult = { 
                  name: fac.name, 
                  email: fac.email, 
                  department: fac.department, 
                  designation: fac.designation || 'Professor', 
                  assignedCourses: (fac.assignedCourses || []).map((c: any) => ({ name: c.name || c, code: c.code || 'CODE' }))
                };
              }
            }
          } else if (name === 'countFaculty') {
            requireAdmin();
            const totalFaculty = await RepoService.countFaculties();
            functionResult = { totalFaculty };
          } else if (name === 'getFaculty') {
            requireAdmin();
            const facs = await RepoService.findFaculties({ isDeleted: false });
            functionResult = { faculty: facs.map((f: any) => ({ name: f.name, department: f.department, designation: f.designation })) };
          }
          // ---------------- COURSES TOOLS ----------------
          else if (name === 'countCourses') {
            const totalCourses = await RepoService.countCourses();
            functionResult = { totalCourses };
          } else if (name === 'getCourse') {
            const query = args.code || args.name || '';
            const allCourses = await RepoService.findCourses({ isDeleted: false });
            const c = allCourses.find((item: any) => item.code?.toLowerCase() === query.toLowerCase() || item.name?.toLowerCase().includes(query.toLowerCase()));
            functionResult = c ? { name: c.name, code: c.code, credits: c.credits, description: c.description, capacity: c.capacity } : { error: 'NOT_FOUND', message: `Course "${query}" not found.` };
          }
          // ---------------- ATTENDANCE & GRADES ----------------
          else if (name === 'getStudentAttendance') {
            const query = args.studentId || '';
            let s = query ? (await RepoService.findStudentByEnrollmentNo(query) || await RepoService.findStudentById(query)) : null;
            if (!s && userId) { s = await RepoService.findStudentByUserId(userId); }
            
            if (!s) { 
              functionResult = { error: 'NOT_FOUND', message: `Student "${query}" was not found.` }; 
            } else {
              const sUserId = (s.userId?._id || s.userId?.id || s.userId || '').toString();
              if (userRole === 'Student' && userId && sUserId !== String(userId)) {
                throw new Error('UNAUTHORIZED: You are only allowed to view your own attendance records.');
              }
              if (userRole === 'Faculty' && userId) {
                const fac = await RepoService.findFacultyByUserId(userId);
                const assignedIds = (fac?.assignedCourses || []).map((c: any) => (c._id || c.id || c).toString());
                const sCourses = (s.enrolledCourses || []).map((c: any) => (c._id || c.id || c).toString());
                if (!sCourses.some((cid: string) => assignedIds.includes(cid))) {
                  throw new Error('UNAUTHORIZED: You can only view attendance for students in courses you teach.');
                }
              }

              const sId = (s._id || s.id).toString();
              const attData = await AcademicMetricsService.calculateStudentAttendance(sId);
              functionResult = { 
                name: s.name, 
                enrollmentNo: s.enrollmentNo, 
                attendanceRate: attData.attendanceRate !== null ? `${attData.attendanceRate}%` : 'N/A (No sessions logged)',
                totalSessions: attData.totalSessions,
                presentCount: attData.presentCount,
                absentCount: attData.absentCount
              };
            }
          } else if (name === 'getLowAttendanceStudents') {
            requireAdminOrFaculty();
            if (userRole === 'Faculty' && userId) {
              const facData = await AcademicMetricsService.getFacultyAcademicOverview(userId);
              const lowAtt = facData.atRiskStudents.filter(s => s.attendanceRate !== null && s.attendanceRate < 75);
              functionResult = { count: lowAtt.length, students: lowAtt.map(s => ({ name: s.name, enrollmentNo: s.enrollmentNo, attendance: `${s.attendanceRate}%` })) };
            } else {
              const overview = await AcademicMetricsService.getInstitutionAcademicOverview();
              const lowAtt = overview.atRiskStudents.filter(s => s.attendanceRate !== null && s.attendanceRate < 75);
              functionResult = { count: lowAtt.length, students: lowAtt.map(s => ({ name: s.name, enrollmentNo: s.enrollmentNo, attendance: `${s.attendanceRate}%` })) };
            }
          } else if (name === 'getStudentGrades') {
            const query = args.studentId || '';
            let s = query ? (await RepoService.findStudentByEnrollmentNo(query) || await RepoService.findStudentById(query)) : null;
            if (!s && userId) { s = await RepoService.findStudentByUserId(userId); }
            
            if (!s) { 
              functionResult = { error: 'NOT_FOUND', message: `Student "${query}" was not found.` }; 
            } else {
              const sUserId = (s.userId?._id || s.userId?.id || s.userId || '').toString();
              if (userRole === 'Student' && userId && sUserId !== String(userId)) {
                throw new Error('UNAUTHORIZED: You are only allowed to view your own grades.');
              }
              if (userRole === 'Faculty' && userId) {
                const fac = await RepoService.findFacultyByUserId(userId);
                const assignedIds = (fac?.assignedCourses || []).map((c: any) => (c._id || c.id || c).toString());
                const sCourses = (s.enrolledCourses || []).map((c: any) => (c._id || c.id || c).toString());
                if (!sCourses.some((cid: string) => assignedIds.includes(cid))) {
                  throw new Error('UNAUTHORIZED: You can only view grades for students in courses you teach.');
                }
              }

              const sId = (s._id || s.id).toString();
              const [gpaData, results] = await Promise.all([
                AcademicMetricsService.calculateStudentGpa(sId),
                RepoService.findResults(sId)
              ]);

              functionResult = { 
                name: s.name, 
                enrollmentNo: s.enrollmentNo, 
                gpa: gpaData.gpa !== null ? gpaData.gpa : 'N/A (No results recorded)',
                totalCoursesGraded: gpaData.totalCoursesGraded,
                grades: results.map((r: any) => ({
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
              const facData = await AcademicMetricsService.getFacultyAcademicOverview(userId);
              functionResult = { atRiskCount: facData.atRiskStudentsCount, students: facData.atRiskStudents };
            } else {
              const overview = await AcademicMetricsService.getInstitutionAcademicOverview();
              functionResult = { atRiskCount: overview.metrics.studentsAtRisk, students: overview.atRiskStudents };
            }
          } else if (name === 'getDashboardMetrics') {
            requireAdmin();
            const overview = await AcademicMetricsService.getInstitutionAcademicOverview();
            functionResult = overview.metrics;
          }
        } catch (authError: any) {
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
  } catch (err: any) {
    if (iteration > 0 && lastToolResult && lastToolName) {
      return { reply: formatDeterministicFallback(lastToolName, lastToolResult), navigateTo };
    }
    console.error('[EduManager AI Error]:', err.message);
    throw err;
  }
}

function formatDeterministicFallback(toolName: string, data: any): string {
  if (data?.error) {
    return data.message || `Error executing ${toolName}: ${data.error}`;
  }
  
  switch (toolName) {
    case 'countStudents':
      return `There are currently ${data.totalStudents || 0} student(s) registered in the system (${data.scope || 'institution'}).`;
    case 'searchStudents':
    case 'getStudentsByCourse':
      if (!data.students || data.students.length === 0) return 'No students found matching your criteria.';
      return `I found ${data.students.length} student(s):\n` + data.students.map((s: any, i: number) => `${i + 1}. ${s.name} (ID: ${s.enrollmentNo || 'N/A'})${s.department ? ` - ${s.department}` : ''}`).join('\n');
    case 'getStudentProfile':
      return `Student Profile: ${data.name} (ID: ${data.enrollmentNo})\n- Department: ${data.department}\n- GPA: ${data.gpa}\n- Attendance: ${data.attendance}`;
    case 'countFaculty':
      return `There are currently ${data.totalFaculty || 0} faculty members registered in the institution.`;
    case 'getFaculty':
      if (!data.faculty || data.faculty.length === 0) return 'No faculty members found.';
      return `Faculty Directory:\n` + data.faculty.map((f: any, i: number) => `${i + 1}. ${f.name} (${f.department || 'N/A'})`).join('\n');
    case 'countCourses':
      return `There are currently ${data.totalCourses || 0} academic courses registered.`;
    case 'getCourse':
      return `Course Details: ${data.name} (${data.code})\n- Credits: ${data.credits}\n- Description: ${data.description || 'N/A'}`;
    case 'getStudentAttendance':
      return `Attendance Summary for ${data.name} (${data.enrollmentNo}):\n- Overall Rate: ${data.attendanceRate}\n- Total Sessions Logged: ${data.totalSessions}`;
    case 'getLowAttendanceStudents':
      if (!data.count || data.count === 0) return 'No students currently have attendance below the 75% threshold.';
      return `There are ${data.count} student(s) with low attendance:\n` + data.students.map((s: any, i: number) => `${i + 1}. ${s.name} (ID: ${s.enrollmentNo}) - ${s.attendance}`).join('\n');
    case 'getStudentGrades':
      return `Academic Grade Record for ${data.name} (${data.enrollmentNo}):\n- Cumulative GPA: ${data.gpa}\n- Graded Assessments: ${data.totalCoursesGraded}`;
    case 'getAtRiskStudents':
      if (!data.atRiskCount || data.atRiskCount === 0) return 'No students are currently flagged as at-risk.';
      return `There are ${data.atRiskCount} at-risk student(s):\n` + data.students.map((s: any, i: number) => `${i + 1}. ${s.name} (ID: ${s.enrollmentNo}) - GPA: ${s.gpa || 'N/A'}, Attendance: ${s.attendanceRate ? `${s.attendanceRate}%` : 'N/A'}`).join('\n');
    case 'getDashboardMetrics':
      return `Institutional Metrics Overview:\n- Total Students: ${data.totalStudents || 0}\n- Total Faculty: ${data.totalFaculty || 0}\n- Total Courses: ${data.totalCourses || 0}\n- Average GPA: ${data.averageGpa || 'N/A'}\n- Attendance Today: ${data.attendanceToday ? `${data.attendanceToday}%` : 'N/A'}`;
    case 'navigate':
      return `Navigating to ${data.navigatedTo}...`;
    default:
      return typeof data === 'string' ? data : JSON.stringify(data);
  }
}

function getDefaultSummary(name: string, gpa: number | null, attendance: number | null): string {
  if (gpa === null && attendance === null) {
    return `${name} has recently enrolled. Academic standing will be generated once semester results and attendance records are logged.`;
  }
  const gpaStr = gpa !== null ? `cumulative GPA of ${gpa.toFixed(2)}` : 'grades pending evaluation';
  const attStr = attendance !== null ? `attendance rate of ${attendance.toFixed(1)}%` : 'attendance pending';
  return `${name} is currently enrolled with a ${gpaStr} and an ${attStr}. Continued engagement in course lectures and assignments will foster continued growth.`;
}

function getDefaultRecommendations(name: string, weakSubjects: string[], attendance: number | null): string[] {
  const recs: string[] = [];
  if (weakSubjects.length > 0) {
    recs.push(`Schedule peer review or dedicated tutoring for ${weakSubjects.join(', ')}.`);
  }
  if (attendance !== null && attendance < 75) {
    recs.push(`Prioritize lecture attendance to meet the mandatory 75% institutional threshold.`);
  }
  recs.push(`Maintain regular revision checkpoints prior to term examinations.`);
  return recs;
}

function getDefaultInsights(gpa: number | null, attendance: number | null): string {
  const gpaText = gpa !== null ? `average GPA of ${gpa.toFixed(2)}` : 'insufficient graded results';
  const attText = attendance !== null ? `attendance rate of ${attendance.toFixed(1)}%` : 'no attendance sessions logged today';
  return `Current institutional analytics demonstrate an ${gpaText} alongside an ${attText}.`;
}

export async function predictRisk(studentName: string, gpa: number | null, attendanceRate: number | null, weakSubjectsCount: number) {
  if (gpa === null && attendanceRate === null) {
    return { 
      riskScore: null, 
      riskLevel: 'Insufficient Data', 
      warningMessage: 'Pending graded assessments and attendance records' 
    };
  }

  let riskScore = 0;
  if (gpa !== null) {
    if (gpa < 2.0) riskScore += 50;
    else if (gpa < 2.5) riskScore += 30;
    else if (gpa < 3.0) riskScore += 15;
  }
  if (attendanceRate !== null) {
    if (attendanceRate < 60) riskScore += 40;
    else if (attendanceRate < 75) riskScore += 25;
    else if (attendanceRate < 85) riskScore += 10;
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

export async function generateParentEmail(
  studentName: string, 
  gpa: number | null, 
  attendance: number | null, 
  weakSubjects: string[], 
  parentName: string
): Promise<{ draft: string; status: 'DRAFT_GENERATED' }> {
  const gpaStr = gpa !== null ? gpa.toFixed(2) : 'Pending';
  const attStr = attendance !== null ? `${attendance.toFixed(1)}%` : 'Pending';
  const weakStr = weakSubjects.length > 0 ? `\nAreas flagged for improvement: ${weakSubjects.join(', ')}.` : '';

  const draft = `Dear ${parentName || 'Parent / Guardian'},\n\nWe are sharing an update regarding the academic progress of your ward, ${studentName}.\n\n- Cumulative GPA: ${gpaStr}\n- Attendance Record: ${attStr}${weakStr}\n\nPlease feel free to contact the academic advisory office if you have any questions.\n\nBest regards,\nEduManager Academic Administration`;
  
  return {
    draft,
    status: 'DRAFT_GENERATED'
  };
}
