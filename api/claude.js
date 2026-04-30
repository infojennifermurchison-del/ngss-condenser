// /api/claude.js - Vercel serverless function
// This proxies requests to the Anthropic API so the API key stays server-side.

export default async function handler(req, res) {
  // Lock down to POST only
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic CORS so the frontend (same origin) works fine
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY environment variable.' });
  }

  try {
    const { system, messages, max_tokens } = req.body || {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Request body must include a messages array.' });
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: max_tokens || 8000,
        system: system,
        messages: messages
      })
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      console.error('Anthropic API error:', data);
      return res.status(anthropicResponse.status).json({
        error: data.error?.message || 'Anthropic API request failed.'
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
}
