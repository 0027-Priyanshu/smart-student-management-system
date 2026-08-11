"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FreeLLMProvider = exports.MockProvider = exports.GeminiProvider = exports.OllamaProvider = void 0;
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
    async healthCheck() {
        try {
            const res = await fetch(`${this.baseUrl}/api/tags`, { method: 'GET' });
            if (!res.ok)
                return { available: false, provider: 'ollama', reason: `SERVER_ERROR_${res.status}` };
            return { available: true, provider: 'ollama', model: this.model };
        }
        catch (e) {
            return { available: false, provider: 'ollama', reason: 'SERVER_UNREACHABLE' };
        }
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
    async healthCheck() {
        try {
            // Just a quick ping to see if the model is reachable and key is valid
            const res = await this.ai.models.generateContent({
                model: this.model,
                contents: 'Reply exactly with OK'
            });
            if (res.text && res.text.includes('OK')) {
                return { available: true, provider: 'gemini', model: this.model };
            }
            return { available: false, provider: 'gemini', reason: 'UNEXPECTED_RESPONSE' };
        }
        catch (e) {
            return { available: false, provider: 'gemini', reason: e.message || 'API_UNREACHABLE' };
        }
    }
    async chat(input) {
        const config = {};
        if (input.systemInstruction) {
            config.systemInstruction = input.systemInstruction;
        }
        // Note: Gemini SDK formatting is slightly different, adapting minimally
        const formattedMessages = input.messages
            .filter(m => m.role !== 'system') // Ensure no stray system messages
            .map(m => {
            if (m.role === 'tool') {
                return {
                    role: 'function',
                    parts: [{ functionResponse: { name: m.name || m.tool_call_id || 'unknown_tool', response: { result: m.content } } }]
                };
            }
            return {
                role: m.role === 'assistant' ? 'model' : m.role,
                parts: m.tool_calls ? [] : [{ text: m.content || ' ' }]
            };
        });
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
    async healthCheck() {
        return { available: true, provider: 'mock', model: 'mock-local-1.0' };
    }
    async chat(input) {
        const lastMsg = input.messages[input.messages.length - 1];
        // If we just received a tool result, force an error to trigger the deterministic fallback formatter
        if (lastMsg.role === 'tool') {
            throw new Error("MockProvider cannot synthesize tool results. Falling back to deterministic formatter.");
        }
        const query = lastMsg.content.toLowerCase();
        // Parse tool calls based on user intent
        if (query.includes('how many students') || query === 'students' || query.includes('total students')) {
            return { role: 'assistant', content: '', tool_calls: [{ function: { name: 'countStudents', arguments: '{}' } }] };
        }
        if (query.includes('show all students') || query.includes('search students')) {
            return { role: 'assistant', content: '', tool_calls: [{ function: { name: 'searchStudents', arguments: '{}' } }] };
        }
        if (query.includes('how many courses')) {
            return { role: 'assistant', content: '', tool_calls: [{ function: { name: 'countCourses', arguments: '{}' } }] };
        }
        if (query.includes('who teaches')) {
            return { role: 'assistant', content: '', tool_calls: [{ function: { name: 'getFaculty', arguments: '{}' } }] };
        }
        if (query.includes('students enrolled in') || query.includes('students in mlis') || query === 'show students') {
            return { role: 'assistant', content: '', tool_calls: [{ function: { name: 'getStudentsByCourse', arguments: '{"courseId":"MLIS"}' } }] };
        }
        if (query.includes('attendance below 75') || query.includes('low attendance')) {
            return { role: 'assistant', content: '', tool_calls: [{ function: { name: 'getLowAttendanceStudents', arguments: '{}' } }] };
        }
        if (query.includes('show their grades') || query.includes('show grades')) {
            return { role: 'assistant', content: '', tool_calls: [{ function: { name: 'getStudentGrades', arguments: '{"studentId":"ENR27037739"}' } }] };
        }
        if (query.includes('attendance of')) {
            return { role: 'assistant', content: '', tool_calls: [{ function: { name: 'getStudentAttendance', arguments: '{"studentId":"ENR27037739"}' } }] };
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
class FreeLLMProvider {
    baseUrl;
    apiKey;
    model;
    constructor(baseUrl, apiKey, model) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.model = model;
    }
    async healthCheck() {
        try {
            const res = await fetch(`${this.baseUrl}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok)
                return { available: false, provider: 'freellmapi', reason: `SERVER_ERROR_${res.status}` };
            return { available: true, provider: 'freellmapi', model: this.model };
        }
        catch (e) {
            return { available: false, provider: 'freellmapi', reason: 'SERVER_UNREACHABLE' };
        }
    }
    async chat(input) {
        const formattedMessages = [];
        if (input.systemInstruction) {
            formattedMessages.push({ role: 'system', content: input.systemInstruction });
        }
        formattedMessages.push(...input.messages.map(m => {
            const msg = { role: m.role, content: m.content || '' };
            if (m.role === 'tool') {
                msg.tool_call_id = m.tool_call_id || m.name || 'unknown';
                // DO NOT send name inside tool message for strictly typed providers, tool_call_id is enough, but name is allowed by some.
                // OpenAI says tool message MUST have `tool_call_id` and `content`.
            }
            else {
                if (m.tool_calls && m.tool_calls.length > 0) {
                    msg.tool_calls = m.tool_calls;
                }
            }
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
            const res = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(payload)
            });
            if (!res.ok)
                throw new Error(`FreeLLMAPI error: ${res.statusText}`);
            const data = await res.json();
            const message = data.choices[0].message;
            return {
                role: 'assistant',
                content: message.content || '',
                tool_calls: message.tool_calls
            };
        }
        catch (err) {
            console.error('FreeLLMAPI Error:', err.message);
            throw err;
        }
    }
}
exports.FreeLLMProvider = FreeLLMProvider;
function getAIProvider() {
    const provider = process.env.AI_PROVIDER || 'freellmapi';
    if (provider.toLowerCase() === 'freellmapi') {
        if (!process.env.FREELLM_API_KEY) {
            throw new Error("FREELLM_API_KEY is required when AI_PROVIDER=freellmapi");
        }
        return new FreeLLMProvider(process.env.FREELLM_BASE_URL || 'https://edumanager-ai.duckdns.org/v1', process.env.FREELLM_API_KEY, process.env.FREELLM_MODEL || 'auto');
    }
    if (provider.toLowerCase() === 'ollama') {
        return new OllamaProvider(process.env.OLLAMA_BASE_URL || 'http://localhost:11434', process.env.OLLAMA_MODEL || 'qwen2.5:7b');
    }
    if (provider.toLowerCase() === 'gemini') {
        if (!process.env.GEMINI_API_KEY)
            throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini");
        return new GeminiProvider(process.env.GEMINI_API_KEY);
    }
    return new MockProvider();
}
