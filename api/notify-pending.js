// /api/notify-pending.js — emails the admin(s) that a new intake is awaiting approval.
// Called by the app right after a mentor submits an intake. Any signed-in user may
// trigger it; it only reveals a first name (de-identified) to the admins.
//
// Env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
//           RESEND_API_KEY, REMINDER_FROM_EMAIL.

const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const FROM = process.env.REMINDER_FROM_EMAIL;
const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!URL_ || !SERVICE || !RESEND || !FROM) return res.status(500).json({ error: 'Missing environment variables.' });

    // Require a signed-in user (any role).
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ') || !ANON) return res.status(401).json({ error: 'Unauthorized.' });
    const ur = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: ANON, Authorization: auth } });
    if (!ur.ok) return res.status(401).json({ error: 'Unauthorized.' });

    const firstName = (req.body && req.body.first_name) ? String(req.body.first_name).slice(0, 60) : 'A student';

    // How many are pending right now?
    const pr = await fetch(`${URL_}/rest/v1/students?select=id&program_status=eq.pending`, { headers: svc });
    const pendingCount = (await pr.json()).length || 0;

    // Email every admin.
    const ar = await fetch(`${URL_}/rest/v1/profiles?select=full_name,email&role=eq.admin`, { headers: svc });
    const admins = (await ar.json()).filter(a => a.email);

    const html = `<div style="font-family:Arial,sans-serif;color:#1A2335;font-size:14px">
      <div style="background:#15284C;color:#fff;padding:12px 16px;font-weight:bold">Attendance Matters — Intake Awaiting Approval</div>
      <div style="padding:16px">
        <p>A new intake for <strong>${firstName}</strong> has been submitted and is waiting for your approval.</p>
        <p>There ${pendingCount === 1 ? 'is' : 'are'} currently <strong>${pendingCount}</strong> intake${pendingCount === 1 ? '' : 's'} pending. Open the portal → <strong>Approvals</strong> to review, assign a mentor, and approve for service.</p>
      </div></div>`;

    let sent = 0;
    for (const a of admins) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND}` },
        body: JSON.stringify({ from: FROM, to: [a.email], subject: `New intake awaiting approval (${pendingCount} pending)`, html })
      });
      if (r.ok) sent++;
    }
    return res.status(200).json({ ok: true, sent, pending: pendingCount });
  } catch (e) {
    console.error('notify-pending:', e);
    return res.status(500).json({ error: e.message || 'Internal error' });
  }
}
