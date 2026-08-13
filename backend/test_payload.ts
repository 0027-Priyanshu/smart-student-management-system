import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const apiKey = "freellmapi-c9239d7b59b1f30f9cbd1c88edb0ee3390b024f418c7c7d3";
  const baseUrl = "https://edumanager-ai.duckdns.org/v1";
  
  const allTools = [
    { name: 'countStudents', description: 'Get the total number of students in the system.', parameters: { type: 'object', properties: {} } }
  ];

  const payload = {
    model: "auto",
    messages: [
      { role: 'system', content: 'You are EduManager Copilot. You answer queries using tools.' },
      { role: "user", content: "how many students?" },
      { role: "assistant", content: "", tool_calls: [{ id: "call_123", type: "function", function: { name: "countStudents", arguments: "{}" } }] },
      { role: "tool", content: '{"totalStudents": 1}', tool_call_id: 'call_123' }
    ],
    tools: allTools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }))
  };

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
