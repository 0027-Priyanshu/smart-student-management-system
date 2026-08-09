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
  chat(messages: AIChatMessage[], tools?: ToolDeclaration[]): Promise<AIChatMessage>;
}

export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async chat(messages: AIChatMessage[], tools?: ToolDeclaration[]): Promise<AIChatMessage> {
    const payload: any = {
      model: this.model,
      messages: messages.map(m => {
        // Ollama expects specific format
        const msg: any = { role: m.role, content: m.content || '' };
        if (m.tool_calls) msg.tool_calls = m.tool_calls;
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

  async chat(messages: AIChatMessage[], tools?: ToolDeclaration[]): Promise<AIChatMessage> {
    // Note: Gemini SDK formatting is slightly different, adapting minimally
    const formattedMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : m.role === 'tool' ? 'function' : m.role,
      parts: m.tool_calls ? [] : [{ text: m.content || ' ' }]
    }));

    try {
      const res = await this.ai.models.generateContent({
        model: this.model,
        contents: formattedMessages as any,
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
  async chat(messages: AIChatMessage[], tools?: ToolDeclaration[]): Promise<AIChatMessage> {
    return {
      role: 'assistant',
      content: 'AI service is currently unavailable. Application data and standard management features remain accessible.'
    };
  }
}

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || 'mock';
  
  if (provider.toLowerCase() === 'ollama') {
    return new OllamaProvider(
      process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      process.env.OLLAMA_MODEL || 'qwen2.5:7b'
    );
  }
  
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    return new GeminiProvider(process.env.GEMINI_API_KEY);
  }
  
  return new MockProvider();
}
