import { FreeLLMProvider } from './src/services/ai.provider';
import dotenv from 'dotenv';
dotenv.config();

async function testFreeLLM() {
  console.log('Testing FreeLLM connectivity...');
  const baseUrl = process.env.FREELLM_BASE_URL || 'https://edumanager-ai.duckdns.org/v1';
  const apiKey = process.env.FREELLM_API_KEY || 'free_local_key';
  const model = process.env.FREELLM_MODEL || 'auto';

  const provider = new FreeLLMProvider(baseUrl, apiKey, model);
  
  try {
    const health = await provider.healthCheck();
    console.log('Health:', health);
    
    if (health.available) {
      const res = await provider.chat({
        messages: [{ role: 'user', content: 'Reply exactly with EDUMANAGER CLOUD AI WORKING' }]
      });
      console.log('AI Response:', res.content);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testFreeLLM();
