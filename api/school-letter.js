// /api/school-letter.js — emails the parent/guardian the school-authorization letter (as a
// PDF attachment) when an admin approves an intake. The parent hands this letter to the
// school so the assigned mentor is added to the student's registration card as authorized
// to take the student OUT OF CLASS (not off campus) for mentoring sessions.
//
// The client (admin, signed in) generates the PDF and posts it here base64-encoded, along
// with the guardian's email. This function verifies the caller is an admin, then sends it
// via Resend. Only a first name is included in the email body (de-identified).
//
// Env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
//           RESEND_API_KEY, REMINDER_FROM_EMAIL.

const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const FROM = process.env.REMINDER_FROM_EMAIL;

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!URL_ || !SERVICE || !RESEND || !FROM || !ANON) return res.status(500).json({ error: 'Missing environment variables.' });

    // Verify the caller is a signed-in admin.
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized.' });
    const ur = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: ANON, Authorization: auth } });
    if (!ur.ok) return res.status(401).json({ error: 'Unauthorized.' });
    const u = await ur.json();
    const pr = await fetch(`${URL_}/rest/v1/profiles?select=role&id=eq.${u.id}`, {
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` }
    });
    const prof = await pr.json();
    if (!Array.isArray(prof) || prof[0]?.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });

    const { to, first_name, guardian_name, filename, pdf_base64 } = req.body || {};
    if (!to || !pdf_base64) return res.status(400).json({ error: 'Missing recipient or attachment.' });

    const greeting = guardian_name ? String(guardian_name).slice(0, 80) : 'Parent/Guardian';
    const child = first_name ? String(first_name).slice(0, 60) : 'your child';
    const html = `<div style="font-family:Arial,sans-serif;color:#1A2335;font-size:14px">
      <div style="background:#15284C;color:#fff;padding:12px 16px;font-weight:bold">Safe Schools, Safer Families Truancy Program — School Authorization Letter</div>
      <div style="padding:16px">
        <p>Dear ${greeting},</p>
        <p>Thank you for enrolling ${child} in the Safe Schools, Safer Families Truancy Program.</p>
        <p>Attached is a letter you can give directly to your child's school. It asks the school to add your child's assigned mentor to the registration card as someone authorized to take your child <strong>out of class — but not out of school</strong> — for short mentoring sessions.</p>
        <p><strong>What to do:</strong> Print the attached letter, sign and date it at the bottom, and give it to your child's front office or registrar.</p>
        <p>Questions? Call us at 832-684-6697 or reply to this email.</p>
        <p style="color:#5A6473;font-size:12px">Murchison Consulting Group, LLC · Safe Schools, Safer Families Truancy Program<br>14150 Huffmeister Road, Suite 200, Cypress, TX 77429</p>
      </div></div>`;

    const PROGRAM_EMAIL = 'truancyproject@bookmcg.com';
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND}` },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        cc: [PROGRAM_EMAIL],          // program keeps a copy of every letter sent
        reply_to: PROGRAM_EMAIL,      // parent replies go to the program inbox
        subject: 'Your child’s school authorization letter — Safe Schools, Safer Families Truancy Program',
        html,
        attachments: [{ filename: filename || 'school-authorization-letter.pdf', content: pdf_base64 }]
      })
    });
    if (!r.ok) {
      const err = await r.text();
      return res.status(502).json({ error: 'Email failed', detail: err, attached: true, emailed: false });
    }
    return res.status(200).json({ ok: true, attached: true, emailed: true });
  } catch (e) {
    console.error('school-letter:', e);
    return res.status(500).json({ error: e.message || 'Internal error', attached: true, emailed: false });
  }
}
