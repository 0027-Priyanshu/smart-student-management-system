import { APP_KNOWLEDGE_BASE, KnowledgeTopic } from '../knowledge/appKnowledge';

export interface RetrievalQueryContext {
  query: string;
  currentPage?: string;
  userRole?: string;
}

export class RetrievalService {
  /**
   * Retrieves top-k most relevant knowledge topics matching user query, active route, and user role.
   */
  static retrieveKnowledge(context: RetrievalQueryContext, topK = 4): KnowledgeTopic[] {
    const { query, currentPage, userRole } = context;
    if (!query || query.trim() === '') return APP_KNOWLEDGE_BASE.slice(0, topK);

    const qLower = query.toLowerCase().replace(/[^\w\s]/gi, ' ');
    const tokens = qLower.split(/\s+/).filter(t => t.length > 2);

    const scoredTopics = APP_KNOWLEDGE_BASE.map(topic => {
      let score = 0;

      // 1. Keyword overlap scoring (BM25 weighted)
      topic.keywords.forEach(kw => {
        const kwLower = kw.toLowerCase();
        if (qLower.includes(kwLower)) {
          score += 5; // Direct phrase match
        } else {
          const kwTokens = kwLower.split(/\s+/);
          kwTokens.forEach(kt => {
            if (tokens.includes(kt)) {
              score += 2;
            }
          });
        }
      });

      // 2. Active Route Boosting
      if (currentPage && topic.routes && topic.routes.includes(currentPage)) {
        score += 4;
      }

      // 3. User Role Filtering / Boosting
      if (userRole && topic.roles) {
        if (topic.roles.includes(userRole as any)) {
          score += 2;
        } else {
          score -= 5; // Deprioritize topics not applicable to role
        }
      }

      // 4. Exact Title Matching
      if (qLower.includes(topic.title.toLowerCase())) {
        score += 8;
      }

      return { topic, score };
    });

    // Sort by score descending and take topK
    const ranked = scoredTopics
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.topic);

    // Fallback: If no topic matched keyword scoring, return default overview + route topic
    if (ranked.length === 0) {
      const routeTopic = APP_KNOWLEDGE_BASE.find(t => currentPage && t.routes?.includes(currentPage));
      const defaultOverview = APP_KNOWLEDGE_BASE.find(t => t.id === 'overview-system');
      const fallbackList = [];
      if (routeTopic) fallbackList.push(routeTopic);
      if (defaultOverview) fallbackList.push(defaultOverview);
      return fallbackList.length > 0 ? fallbackList : APP_KNOWLEDGE_BASE.slice(0, topK);
    }

    return ranked.slice(0, topK);
  }

  /**
   * Format retrieved topics into clean markdown context for LLM prompt injection
   */
  static formatKnowledgeForPrompt(topics: KnowledgeTopic[]): string {
    if (!topics || topics.length === 0) return '';

    return topics.map(t => {
      let text = `[KNOWLEDGE SOURCE: ${t.title}]\nSummary: ${t.summary}\nDetails:\n${t.details}`;
      if (t.stepByStep && t.stepByStep.length > 0) {
        text += `\nStep-by-Step Guide:\n${t.stepByStep.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
      }
      return text;
    }).join('\n\n');
  }

  /**
   * Generates dynamic suggested questions tailored to the active page & user role
   */
  static getSuggestedQuestions(currentPage?: string, userRole?: string): string[] {
    const role = userRole || 'Student';
    const path = currentPage || '/dashboard';

    if (path === '/students') {
      if (role === 'Admin' || role === 'Super Admin') {
        return [
          "How do I add a new student?",
          "How do I bulk import students from CSV?",
          "Which students are at academic risk?",
          "How do I filter students by department?"
        ];
      }
      return [
        "How do I search for a student?",
        "What does High Risk status mean?",
        "Where can I view parent phone numbers?",
        "How do I check student CGPA?"
      ];
    }

    if (path === '/attendance') {
      if (role === 'Faculty') {
        return [
          "How do I launch a live QR attendance session?",
          "How do I mark manual class attendance?",
          "Which students are below 75% attendance?",
          "How does the QR timer expiration work?"
        ];
      }
      if (role === 'Student') {
        return [
          "How do I scan the QR code to mark attendance?",
          "What happens if my attendance drops below 75%?",
          "How is my overall attendance rate calculated?",
          "What if camera scanning fails?"
        ];
      }
      return [
        "How does the dynamic QR attendance system work?",
        "What is the low attendance threshold?",
        "How to view attendance reports?",
        "How to mark attendance manually?"
      ];
    }

    if (path === '/marks') {
      if (role === 'Faculty') {
        return [
          "How do I enter grade book scores for my course?",
          "What are the assessment weights for GPA?",
          "How is letter grade assigned?",
          "How do I update internal assessment marks?"
        ];
      }
      return [
        "How is my CGPA calculated?",
        "What are the assessment weight percentages?",
        "Where can I download my transcript?",
        "What is the GPA scale limit?"
      ];
    }

    if (path === '/courses') {
      return [
        "How do I create a new course?",
        "What information is required for a course?",
        "How to view assigned faculty instructors?",
        "How do course credits affect CGPA?"
      ];
    }

    if (path === '/faculty') {
      return [
        "How do I add a new faculty member?",
        "What designations are available for faculty?",
        "How to view assigned courses per teacher?",
        "How do I filter faculty by department?"
      ];
    }

    // Default / Dashboard
    return [
      "What features are available in this application?",
      "How do I use the live QR attendance system?",
      "How do I add a student?",
      "What does the ML risk score mean?"
    ];
  }
}
