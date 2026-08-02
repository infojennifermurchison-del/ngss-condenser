// /api/send-parent-email.js — sends email to student guardians through Resend.
// Two uses, both admin-only:
//   • Bulk: message every active student's guardian at once (one private email each).
//   • Single: email one student's guardian and CC the assigned mentor(s) + the program.
// The client (a signed-in admin) builds the recipient list and the message; this function
// verifies the caller is an admin, then sends each message via Resend.
//
// Env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
//           RESEND_API_KEY, REMINDER_FROM_EMAIL.

const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const FROM = process.env.REMINDER_FROM_EMAIL;
const PROGRAM_EMAIL = 'truancyproject@bookmcg.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esc(s) {
  return String(s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function wrapHtml(subject, body) {
  const paras = String(body || '').split(/\n{2,}/).map(p => `<p style="margin:0 0 12px">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  return `<div style="font-family:Arial,sans-serif;color:#1A2335;font-size:14px;line-height:1.5">
    <div style="background:#15284C;color:#fff;padding:12px 16px;font-weight:bold">Safe Schools, Safer Families Truancy Program${subject ? ' — ' + esc(subject) : ''}</div>
    <div style="padding:16px">${paras}</div>
    <div style="padding:12px 16px;border-top:1px solid #E0E0E0;color:#5A6473;font-size:12px">
      Murchison Consulting Group, LLC · Safe Schools, Safer Families Truancy Program<br>
      14150 Huffmeister Road, Suite 200, Cypress, TX 77429 · 832-684-6697 · ${PROGRAM_EMAIL}
    </div></div>`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!URL_ || !SERVICE || !RESEND || !FROM || !ANON) return res.status(500).json({ error: 'Missing environment variables.' });

    // Verify the caller is signed-in staff. Emailing ONE guardian is open to any mentor
    // or admin; a BULK send (more than one recipient) is restricted to admins.
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized.' });
    const ur = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: ANON, Authorization: auth } });
    if (!ur.ok) return res.status(401).json({ error: 'Unauthorized.' });
    const u = await ur.json();
    const pr = await fetch(`${URL_}/rest/v1/profiles?select=role&id=eq.${u.id}`, {
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` }
    });
    const prof = await pr.json();
    const role = Array.isArray(prof) && prof[0] ? prof[0].role : null;
    if (!role) return res.status(403).json({ error: 'No staff profile for this account.' });

    const { subject, body, messages } = req.body || {};
    if (!body || !Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'Nothing to send.' });
    if (messages.length > 300) return res.status(400).json({ error: 'Too many recipients in one send.' });
    // Only admins may send to more than one guardian at a time.
    if (messages.length > 1 && role !== 'admin') return res.status(403).json({ error: 'Only an admin can email all parents at once.' });

    const html = wrapHtml(subject, body);
    let sent = 0; const failed = [];

    // Send in small concurrent batches to stay friendly to the Resend API.
    for (let i = 0; i < messages.length; i += 8) {
      const chunk = messages.slice(i, i + 8);
      await Promise.all(chunk.map(async (m) => {
        const to = String(m.to || '').trim();
        if (!EMAIL_RE.test(to)) { failed.push({ to, reason: 'invalid email' }); return; }
        // Always CC the program inbox (plus any caller-supplied CCs, e.g. the mentor).
        const cc = [...new Set([...(Array.isArray(m.cc) ? m.cc : []), PROGRAM_EMAIL].map(x => String(x || '').trim()))]
          .filter(x => EMAIL_RE.test(x) && x !== to);
        const payload = {
          from: FROM, to: [to], subject: subject || 'A message from the Safe Schools, Safer Families Truancy Program',
          html, reply_to: PROGRAM_EMAIL
        };
        if (cc.length) payload.cc = cc;
        try {
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND}` },
            body: JSON.stringify(payload)
          });
          if (r.ok) sent++;
          else failed.push({ to, reason: (await r.text()).slice(0, 200) });
        } catch (e) { failed.push({ to, reason: e.message }); }
      }));
    }

    return res.status(200).json({ ok: true, sent, failed });
  } catch (e) {
    console.error('send-parent-email:', e);
    return res.status(500).json({ error: e.message || 'Internal error' });
  }
}
