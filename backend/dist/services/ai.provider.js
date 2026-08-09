"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockProvider = exports.GeminiProvider = exports.OllamaProvider = void 0;
exports.getAIProvider = getAIProvider;
const dotenv_1 = __importDefault(require("dotenv"));
const genai_1 = require("@google/genai");
dotenv_1.default.config();
class OllamaProvider {
    baseUrl;
    model;
    constructor(baseUrl, model) {
        this.baseUrl = baseUrl;
        this.model = model;
    }
    async chat(input) {
        const formattedMessages = [];
        if (input.systemInstruction) {
            formattedMessages.push({ role: 'system', content: input.systemInstruction });
        }
        formattedMessages.push(...input.messages.map(m => {
            // Ollama expects specific format
            const msg = { role: m.role, content: m.content || '' };
            if (m.tool_calls)
                msg.tool_calls = m.tool_calls;
            return msg;
        }));
        const payload = {
            model: this.model,
            messages: formattedMessages,
            stream: false,
        };
        if (input.tools && input.tools.length > 0) {
            payload.tools = input.tools.map(t => ({
                type: 'function',
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters
                }
            }));
        }
        try {
            const res = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok)
                throw new Error(`Ollama error: ${res.statusText}`);
            const data = await res.json();
            const message = data.message;
            return {
                role: 'assistant',
                content: message.content || '',
                tool_calls: message.tool_calls
            };
        }
        catch (err) {
            console.error('Ollama Error:', err.message);
            throw err;
        }
    }
}
exports.OllamaProvider = OllamaProvider;
class GeminiProvider {
    ai;
    model = 'gemini-2.5-flash';
    constructor(apiKey) {
        this.ai = new genai_1.GoogleGenAI({ apiKey });
    }
    async chat(input) {
        const config = {};
        if (input.systemInstruction) {
            config.systemInstruction = input.systemInstruction;
        }
        // Note: Gemini SDK formatting is slightly different, adapting minimally
        const formattedMessages = input.messages
            .filter(m => m.role !== 'system') // Ensure no stray system messages
            .map(m => ({
            role: m.role === 'assistant' ? 'model' : m.role === 'tool' ? 'function' : m.role,
            parts: m.tool_calls ? [] : [{ text: m.content || ' ' }]
        }));
        try {
            const res = await this.ai.models.generateContent({
                model: this.model,
                contents: formattedMessages,
                config: Object.keys(config).length > 0 ? config : undefined
            });
            return {
                role: 'assistant',
                content: res.text || ''
            };
        }
        catch (err) {
            console.error('Gemini Error:', err.message);
            throw err;
        }
    }
}
exports.GeminiProvider = GeminiProvider;
class MockProvider {
    async chat(input) {
        const lastMsg = input.messages[input.messages.length - 1];
        // If we just received a tool result, formulate a human response
        if (lastMsg.role === 'tool') {
            const toolData = lastMsg.content;
            try {
                const parsed = JSON.parse(toolData);
                if (parsed.count !== undefined)
                    return { role: 'assistant', content: `There are ${parsed.count} records matching your query.` };
                if (Array.isArray(parsed))
                    return { role: 'assistant', content: `I found ${parsed.length} results. Here is the data: ${JSON.stringify(parsed.slice(0, 3))}...` };
                return { role: 'assistant', content: `Here is the requested information: ${toolData}` };
            }
            catch (e) {
                return { role: 'assistant', content: `Here is the data: ${toolData}` };
            }
        }
        const query = lastMsg.content.toLowerCase();
        // Parse tool calls based on user intent
        if (query.includes('how many students') || query === 'students') {
            return { role: 'assistant', content: '', tool_calls: [{ function: { name: 'countStudents', arguments: '{}' } }] };
        }
        if (query.includes('students in mlis') || query === 'show students') {
            return { role: 'assistant', content: '', tool_calls: [{ function: { name: 'getStudents', arguments: '{"department":"MLIS"}' } }] };
        }
        if (query.includes('attendance below 75') || query.includes('low attendance')) {
            return { role: 'assistant', content: '', tool_calls: [{ function: { name: 'getAtRiskStudents', arguments: '{}' } }] };
        }
        if (query.includes('find enr')) {
            const match = query.match(/enr\d+/i);
            const enr = match ? match[0].toUpperCase() : 'ENR27037739';
            return { role: 'assistant', content: '', tool_calls: [{ function: { name: 'getStudentProfile', arguments: `{"enrollmentNo":"${enr}"}` } }] };
        }
        // Handle scope bounds explicitly for QA
        if (query.includes('superbowl')) {
            return { role: 'assistant', content: "I couldn't confidently determine what you're looking for. You can ask about students, courses, attendance, grades, faculty, face attendance, or academic analytics." };
        }
        return {
            role: 'assistant',
            content: 'AI service is currently unavailable. Application data and standard management features remain accessible.'
        };
    }
}
exports.MockProvider = MockProvider;
function getAIProvider() {
    const provider = process.env.AI_PROVIDER || 'mock';
    if (provider.toLowerCase() === 'ollama') {
        return new OllamaProvider(process.env.OLLAMA_BASE_URL || 'http://localhost:11434', process.env.OLLAMA_MODEL || 'qwen2.5:7b');
    }
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
        return new GeminiProvider(process.env.GEMINI_API_KEY);
    }
    return new MockProvider();
}
