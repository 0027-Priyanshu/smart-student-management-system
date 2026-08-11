import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: any;
}

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export interface AIProvider {
  chat(input: { systemInstruction?: string; messages: AIChatMessage[]; tools?: ToolDeclaration[] }): Promise<AIChatMessage>;
  healthCheck(): Promise<{ available: boolean; provider: string; model?: string; reason?: string }>;
}

export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async healthCheck(): Promise<{ available: boolean; provider: string; model?: string; reason?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { method: 'GET' });
      if (!res.ok) return { available: false, provider: 'ollama', reason: `SERVER_ERROR_${res.status}` };
      return { available: true, provider: 'ollama', model: this.model };
    } catch (e: any) {
      return { available: false, provider: 'ollama', reason: 'SERVER_UNREACHABLE' };
    }
  }

  async chat(input: { systemInstruction?: string; messages: AIChatMessage[]; tools?: ToolDeclaration[] }): Promise<AIChatMessage> {
    const formattedMessages: any[] = [];
    if (input.systemInstruction) {
      formattedMessages.push({ role: 'system', content: input.systemInstruction });
    }
    
    formattedMessages.push(...input.messages.map(m => {
      // Ollama expects specific format
      const msg: any = { role: m.role, content: m.content || '' };
      if (m.tool_calls) msg.tool_calls = m.tool_calls;
      return msg;
    }));

    const payload: any = {
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
      if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`);
      
      const data: any = await res.json();
      const message = data.message;
      return {
        role: 'assistant',
        content: message.content || '',
        tool_calls: message.tool_calls
      };
    } catch (err: any) {
      console.error('Ollama Error:', err.message);
      throw err;
    }
  }
}

export class GeminiProvider implements AIProvider {
  private ai: GoogleGenAI;
  private model = 'gemini-2.5-flash';

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async healthCheck(): Promise<{ available: boolean; provider: string; model?: string; reason?: string }> {
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
    } catch (e: any) {
      return { available: false, provider: 'gemini', reason: e.message || 'API_UNREACHABLE' };
    }
  }

  async chat(input: { systemInstruction?: string; messages: AIChatMessage[]; tools?: ToolDeclaration[] }): Promise<AIChatMessage> {
    const config: any = {};
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
        contents: formattedMessages as any,
        config: Object.keys(config).length > 0 ? config : undefined
      });
      return {
        role: 'assistant',
        content: res.text || ''
      };
    } catch (err: any) {
      console.error('Gemini Error:', err.message);
      throw err;
    }
  }
}

export class MockProvider implements AIProvider {
  async healthCheck(): Promise<{ available: boolean; provider: string; model?: string; reason?: string }> {
    return { available: true, provider: 'mock', model: 'mock-local-1.0' };
  }
  async chat(input: { systemInstruction?: string; messages: AIChatMessage[]; tools?: ToolDeclaration[] }): Promise<AIChatMessage> {
    const lastMsg = input.messages[input.messages.length - 1];
    
    // If we just received a tool result, formulate a human response
    if (lastMsg.role === 'tool') {
      const toolData = lastMsg.content;
      try {
        const parsed = JSON.parse(toolData);
        if (parsed.count !== undefined) return { role: 'assistant', content: `There are ${parsed.count} records matching your query.` };
        if (Array.isArray(parsed)) return { role: 'assistant', content: `I found ${parsed.length} results. Here is the data: ${JSON.stringify(parsed.slice(0, 3))}...` };
        return { role: 'assistant', content: `Here is the requested information: ${toolData}` };
      } catch (e) {
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

export class FreeLLMProvider implements AIProvider {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(baseUrl: string, apiKey: string, model: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
  }

  async healthCheck(): Promise<{ available: boolean; provider: string; model?: string; reason?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      if (!res.ok) return { available: false, provider: 'freellmapi', reason: `SERVER_ERROR_${res.status}` };
      return { available: true, provider: 'freellmapi', model: this.model };
    } catch (e: any) {
      return { available: false, provider: 'freellmapi', reason: 'SERVER_UNREACHABLE' };
    }
  }

  async chat(input: { systemInstruction?: string; messages: AIChatMessage[]; tools?: ToolDeclaration[] }): Promise<AIChatMessage> {
    const formattedMessages: any[] = [];
    if (input.systemInstruction) {
      formattedMessages.push({ role: 'system', content: input.systemInstruction });
    }
    
    formattedMessages.push(...input.messages.map(m => {
      const msg: any = { role: m.role, content: m.content || '' };
      
      if (m.role === 'tool') {
        msg.tool_call_id = m.tool_call_id || m.name || 'unknown';
        // DO NOT send name inside tool message for strictly typed providers, tool_call_id is enough, but name is allowed by some.
        // OpenAI says tool message MUST have `tool_call_id` and `content`.
      } else {
        if (m.tool_calls && m.tool_calls.length > 0) {
          msg.tool_calls = m.tool_calls;
        }
      }
      return msg;
    }));

    const payload: any = {
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
      if (!res.ok) throw new Error(`FreeLLMAPI error: ${res.statusText}`);
      
      const data: any = await res.json();
      const message = data.choices[0].message;
      return {
        role: 'assistant',
        content: message.content || '',
        tool_calls: message.tool_calls
      };
    } catch (err: any) {
      console.error('FreeLLMAPI Error:', err.message);
      throw err;
    }
  }
}

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || 'freellmapi';
  
  if (provider.toLowerCase() === 'freellmapi') {
    return new FreeLLMProvider(
      process.env.FREELLM_BASE_URL || 'https://edumanager-ai.duckdns.org/v1',
      process.env.FREELLM_API_KEY || 'freellmapi-32b3a4ac86050c8d3cc340c7c85c9d0ed44ad8aabd31ba01',
      process.env.FREELLM_MODEL || 'auto'
    );
  }

  if (provider.toLowerCase() === 'ollama') {
    return new OllamaProvider(
      process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      process.env.OLLAMA_MODEL || 'qwen2.5:7b'
    );
  }
  
  if (provider.toLowerCase() === 'gemini') {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini");
    return new GeminiProvider(process.env.GEMINI_API_KEY);
  }
  
  return new MockProvider();
}
