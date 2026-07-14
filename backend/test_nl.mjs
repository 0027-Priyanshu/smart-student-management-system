import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  const query = "attendance below 100";
  const prompt = `You are a Smart Search interpreter. The user wants to filter students via natural language.
  Translate the following query into a JSON object representing the database filter intention.
  Supported types: "attendance", "gpa", "department".
  Supported operators: "<", ">", "=".
  Query: "${query}"
  Return ONLY the JSON format without markdown tags:
  {
    "type": "attendance",
    "operator": "<",
    "value": 75
  }
  If the query cannot be interpreted, return an empty object {}.`;

  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const rawText = result.text;
  console.log("Raw output:", rawText);
  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  console.log("Cleaned:", cleaned);
  console.log("Parsed:", JSON.parse(cleaned));
}
test();
