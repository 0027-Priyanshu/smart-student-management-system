"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetrievalService = void 0;
const appKnowledge_1 = require("../knowledge/appKnowledge");
class RetrievalService {
    /**
     * Retrieves top-k most relevant knowledge topics matching user query, active route, and user role.
     */
    static retrieveKnowledge(context, topK = 4) {
        const { query, currentPage, userRole } = context;
        if (!query || query.trim() === '')
            return appKnowledge_1.APP_KNOWLEDGE_BASE.slice(0, topK);
        const qLower = query.toLowerCase().replace(/[^\w\s]/gi, ' ');
        const tokens = qLower.split(/\s+/).filter(t => t.length > 2);
        const scoredTopics = appKnowledge_1.APP_KNOWLEDGE_BASE.map(topic => {
            let score = 0;
            // 1. Keyword overlap scoring (BM25 weighted)
            topic.keywords.forEach(kw => {
                const kwLower = kw.toLowerCase();
                if (qLower.includes(kwLower)) {
                    score += 5; // Direct phrase match
                }
                else {
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
                if (topic.roles.includes(userRole)) {
                    score += 2;
                }
                else {
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
            const routeTopic = appKnowledge_1.APP_KNOWLEDGE_BASE.find(t => currentPage && t.routes?.includes(currentPage));
            const defaultOverview = appKnowledge_1.APP_KNOWLEDGE_BASE.find(t => t.id === 'overview-system');
            const fallbackList = [];
            if (routeTopic)
                fallbackList.push(routeTopic);
            if (defaultOverview)
                fallbackList.push(defaultOverview);
            return fallbackList.length > 0 ? fallbackList : appKnowledge_1.APP_KNOWLEDGE_BASE.slice(0, topK);
        }
        return ranked.slice(0, topK);
    }
    /**
     * Format retrieved topics into clean markdown context for LLM prompt injection
     */
    static formatKnowledgeForPrompt(topics) {
        if (!topics || topics.length === 0)
            return '';
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
    static getSuggestedQuestions(currentPage, userRole) {
        const role = userRole || 'Student';
        if (role === 'Admin') {
            return [
                "How do I register a student's face?",
                "Show students at academic risk.",
                "How does QR attendance work?",
                "How do I import students from Excel?",
                "Explain the Strategic Insight Report."
            ];
        }
        if (role === 'Faculty') {
            return [
                "How do I start Face Attendance?",
                "Show attendance for my class.",
                "Which students have low attendance?",
                "How do I start QR Attendance?",
                "Show students at academic risk."
            ];
        }
        // Student (default fallback)
        return [
            "How do I mark Face Attendance?",
            "Show my attendance.",
            "What is my attendance percentage?",
            "Show my courses.",
            "Why is my face verification failing?"
        ];
    }
}
exports.RetrievalService = RetrievalService;
