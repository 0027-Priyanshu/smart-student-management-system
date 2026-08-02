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
      return [
        "Summarize the selected student",
        "Find students with low attendance",
        "Show recently added students",
        "Which students are at academic risk?"
      ];
    }

    if (path === '/attendance') {
      return [
        "Who is absent today?",
        "Show students below 75% attendance",
        "Explain the attendance trend",
        "How to launch live QR attendance?"
      ];
    }

    if (path === '/marks') {
      return [
        "Find low-performing students",
        "Compare semester performance",
        "Explain this GPA trend",
        "How is CGPA calculated?"
      ];
    }

    if (path === '/courses') {
      return [
        "Show courses with weak performance",
        "Summarize course enrollment",
        "Identify difficult subjects",
        "How do course credits work?"
      ];
    }

    if (path === '/faculty') {
      return [
        "Summarize faculty workload",
        "Show assigned courses",
        "Find scheduling conflicts",
        "How do I add a new faculty member?"
      ];
    }

    // Default / Dashboard / Academic Intelligence
    return [
      "Summarize today's academic activity",
      "Show urgent issues",
      "Which students need attention?",
      "Open detailed academic intelligence"
    ];
  }
}
