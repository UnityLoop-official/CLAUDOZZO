export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return res.status(503).json({ error: 'no_api_key', message: 'API key non configurata.' });
  }

  try {
    const { messages, vibe, system } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: system,
        messages: messages
      })
    });

    const data = await response.json();

    if (data.content && data.content[0]) {
      return res.status(200).json({ reply: data.content[0].text });
    } else {
      return res.status(500).json({ error: 'api_error', message: JSON.stringify(data) });
    }
  } catch (e) {
    return res.status(500).json({ error: 'server_error', message: e.message });
  }
}
