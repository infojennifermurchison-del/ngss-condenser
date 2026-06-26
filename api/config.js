// /api/config.js - Vercel serverless function
// Returns the PUBLIC Supabase config (project URL + anon/publishable key) to the
// browser. The anon key is designed to be exposed client-side: it can only do what
// your Row Level Security (RLS) policies allow. The service-role key and the
// Anthropic key are NEVER sent here — they stay server-side only.

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

  return res.status(200).json({
    supabaseUrl,
    supabaseAnonKey,
    configured: Boolean(supabaseUrl && supabaseAnonKey)
  });
}
