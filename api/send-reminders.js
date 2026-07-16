// /api/send-reminders.js — emails mentors the youth still missing a metrics check
// this month. Runs automatically via Vercel Cron (daily; only acts on the 25th and
// the last day of the month) and can be triggered manually by an admin ("Send now").
//
// Required environment variables (set in Vercel):
//   SUPABASE_URL                 your Supabase project URL
//   SUPABASE_ANON_KEY            anon/public key (used to verify an admin's token)
//   SUPABASE_SERVICE_ROLE_KEY    service-role key (server-only; reads all data)
//   RESEND_API_KEY               your Resend API key
//   REMINDER_FROM_EMAIL          the "from" address (e.g. "Attendance Matters <noreply@yourdomain.org>")
//   CRON_SECRET                  any long random string; Vercel sends it on cron calls
//
// No npm dependencies — uses global fetch (Node 18+) and the Supabase REST API.

const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const FROM = process.env.REMINDER_FROM_EMAIL;
const CRON_SECRET = process.env.CRON_SECRET;

const svcHeaders = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };

async function rest(path) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: svcHeaders });
  if (!r.ok) throw new Error(`Supabase read failed (${r.status})`);
  return r.json();
}

async function sendEmail(to, subject, html) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND}` },
    body: JSON.stringify({ from: FROM, to: [to], subject, html })
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Email send failed for ${to}: ${t}`);
  }
  return true;
}

function monthRange(now) {
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  const p = (n) => String(n).padStart(2, '0');
  const from = `${y}-${p(m + 1)}-01`;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const to = `${y}-${p(m + 1)}-${p(lastDay)}`;
  return { from, to, lastDay, monthName: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) };
}

export default async function handler(req, res) {
  try {
    if (!URL_ || !SERVICE || !RESEND || !FROM) {
      return res.status(500).json({ error: 'Server is missing one or more required environment variables.' });
    }

    // ---- Authorize: Vercel cron (CRON_SECRET) or a signed-in admin ----
    const auth = req.headers.authorization || '';
    const isCron = !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
    let isAdmin = false;
    if (!isCron && auth.startsWith('Bearer ') && ANON) {
      const token = auth.slice(7);
      const ur = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
      if (ur.ok) {
        const u = await ur.json();
        const prof = await rest(`profiles?select=role&id=eq.${u.id}`);
        isAdmin = prof[0]?.role === 'admin';
      }
    }
    if (!isCron && !isAdmin) return res.status(401).json({ error: 'Unauthorized.' });

    // ---- Decide whether to send ----
    const now = new Date();
    const { from, to, lastDay, monthName } = monthRange(now);
    const isSendDay = now.getUTCDate() === 25 || now.getUTCDate() === lastDay;
    const force = req.query && (req.query.force === '1' || req.query.force === 'true');
    const proceed = isAdmin || force || (isCron && isSendDay);
    if (!proceed) return res.status(200).json({ skipped: true, reason: 'Not a scheduled send day.' });

    // ---- Pull data ----
    const [students, metrics, profiles] = await Promise.all([
      rest('students?select=id,first_name,last_name,assigned_mentor,assigned_mentor_2&program_status=eq.active'),
      rest(`sessions?select=student_id&session_type=eq.${encodeURIComponent('Metrics check')}&session_date=gte.${from}&session_date=lte.${to}`),
      rest('profiles?select=id,full_name,email,role')
    ]);

    const covered = new Set(metrics.map(m => m.student_id));
    const uncovered = students.filter(s => !covered.has(s.id));
    const profById = Object.fromEntries(profiles.map(p => [p.id, p]));

    // group uncovered youth by assigned mentor
    const byMentor = {};
    const unassigned = [];
    uncovered.forEach(s => {
      const mentors = [s.assigned_mentor, s.assigned_mentor_2].filter(m => m && profById[m]);
      if (mentors.length) {
        mentors.forEach(m => { (byMentor[m] = byMentor[m] || []).push(s); });
      } else { unassigned.push(s); }
    });

    const nameList = (arr) => '<ul>' + arr.map(s => `<li>${s.first_name} ${s.last_name}</li>`).join('') + '</ul>';
    const wrap = (inner) => `<div style="font-family:Arial,sans-serif;color:#1A2335;font-size:14px">
      <div style="background:#15284C;color:#fff;padding:12px 16px;font-weight:bold">Attendance Matters — Metrics Check Reminder</div>
      <div style="padding:16px">${inner}<p style="color:#888;font-size:12px;margin-top:18px">This is an automated reminder for ${monthName}.</p></div></div>`;

    let emailsSent = 0;
    const results = [];

    // mentor emails
    for (const mentorId of Object.keys(byMentor)) {
      const mentor = profById[mentorId];
      if (!mentor || !mentor.email) { results.push({ mentor: mentor?.full_name || mentorId, skipped: 'no email' }); continue; }
      const list = byMentor[mentorId];
      const html = wrap(`<p>Hi ${mentor.full_name || 'there'},</p>
        <p>These ${list.length} youth on your caseload still need a <strong>metrics check</strong> for <strong>${monthName}</strong>. Please complete one for each before month end so the coordinator's report is accurate:</p>
        ${nameList(list)}
        <p>Open the portal, pick the student, choose <em>Metrics check</em> under "Student service provided," and fill it in.</p>`);
      try { await sendEmail(mentor.email, `Metrics checks needed — ${monthName}`, html); emailsSent++; results.push({ mentor: mentor.full_name, sent: list.length }); }
      catch (e) { results.push({ mentor: mentor.full_name, error: e.message }); }
    }

    // admin summary
    const admins = profiles.filter(p => p.role === 'admin' && p.email);
    for (const admin of admins) {
      const perMentor = Object.keys(byMentor).map(id => `<p><strong>${profById[id]?.full_name || 'Mentor'}:</strong>${nameList(byMentor[id])}</p>`).join('');
      const html = wrap(`<p>Hi ${admin.full_name || 'there'},</p>
        <p><strong>${uncovered.length}</strong> active youth still need a metrics check for <strong>${monthName}</strong>.</p>
        ${perMentor || ''}
        ${unassigned.length ? `<p><strong>Unassigned:</strong>${nameList(unassigned)}</p>` : ''}
        ${uncovered.length === 0 ? '<p>🎉 Everyone is covered this month.</p>' : ''}`);
      try { await sendEmail(admin.email, `Metrics check status — ${monthName}`, html); emailsSent++; }
      catch (e) { results.push({ admin: admin.full_name, error: e.message }); }
    }

    return res.status(200).json({ ok: true, month: monthName, activeYouth: students.length, uncovered: uncovered.length, emailsSent, results });
  } catch (err) {
    console.error('send-reminders error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
