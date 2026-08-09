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
    async chat(messages, tools) {
        const payload = {
            model: this.model,
            messages: messages.map(m => {
                // Ollama expects specific format
                const msg = { role: m.role, content: m.content || '' };
                if (m.tool_calls)
                    msg.tool_calls = m.tool_calls;
                return msg;
            }),
            stream: false,
        };
        if (tools && tools.length > 0) {
            payload.tools = tools.map(t => ({
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
    async chat(messages, tools) {
        // Note: Gemini SDK formatting is slightly different, adapting minimally
        const formattedMessages = messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : m.role === 'tool' ? 'function' : m.role,
            parts: m.tool_calls ? [] : [{ text: m.content || ' ' }]
        }));
        try {
            const res = await this.ai.models.generateContent({
                model: this.model,
                contents: formattedMessages,
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
    async chat(messages, tools) {
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
