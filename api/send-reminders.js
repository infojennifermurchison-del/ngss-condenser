// /api/send-reminders.js — automated mentor reminders. Runs daily via Vercel Cron and
// sends two kinds of reminders:
//   • MONTHLY metrics-check reminder — on the 25th and the last day of the month:
//     lists each mentor's youth still missing a metrics check.
//   • WEEKLY session reminder — every Thursday: lists each mentor's assigned youth who
//     have not yet had BOTH of their sessions this week (fewer than 2 logged sessions).
// An admin can also trigger it manually: ?force=1 (metrics) or ?type=weekly&force=1.
//
// Env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
//           RESEND_API_KEY, REMINDER_FROM_EMAIL, CRON_SECRET.

const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const FROM = process.env.REMINDER_FROM_EMAIL;
const CRON_SECRET = process.env.CRON_SECRET;

const WEEKLY_DAY = 4;            // 0=Sun .. 4=Thursday
const SESSIONS_PER_WEEK = 2;     // required contacts per week

const svcHeaders = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
const p2 = (n) => String(n).padStart(2, '0');

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
  if (!r.ok) throw new Error(`Email send failed for ${to}: ${await r.text()}`);
  return true;
}
const nameList = (arr) => '<ul>' + arr.map(s => `<li>${s.first_name} ${s.last_name}</li>`).join('') + '</ul>';
const wrap = (title, inner, footer) => `<div style="font-family:Arial,sans-serif;color:#1A2335;font-size:14px">
  <div style="background:#15284C;color:#fff;padding:12px 16px;font-weight:bold">Attendance Matters — ${title}</div>
  <div style="padding:16px">${inner}<p style="color:#888;font-size:12px;margin-top:18px">${footer}</p></div></div>`;

function groupByMentor(items, profById) {
  const byMentor = {}, unassigned = [];
  items.forEach(s => {
    const mentors = [s.assigned_mentor, s.assigned_mentor_2].filter(m => m && profById[m]);
    if (mentors.length) mentors.forEach(m => { (byMentor[m] = byMentor[m] || []).push(s); });
    else unassigned.push(s);
  });
  return { byMentor, unassigned };
}

// ---- MONTHLY metrics-check reminder ----
async function runMetrics(now) {
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  const from = `${y}-${p2(m + 1)}-01`;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const to = `${y}-${p2(m + 1)}-${p2(lastDay)}`;
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const [students, metrics, profiles] = await Promise.all([
    rest('students?select=id,first_name,last_name,assigned_mentor,assigned_mentor_2&program_status=eq.active'),
    rest(`sessions?select=student_id&session_type=eq.${encodeURIComponent('Metrics check')}&session_date=gte.${from}&session_date=lte.${to}`),
    rest('profiles?select=id,full_name,email,role')
  ]);
  const covered = new Set(metrics.map(x => x.student_id));
  const uncovered = students.filter(s => !covered.has(s.id));
  const profById = Object.fromEntries(profiles.map(x => [x.id, x]));
  const { byMentor, unassigned } = groupByMentor(uncovered, profById);

  let emailsSent = 0;
  for (const id of Object.keys(byMentor)) {
    const mentor = profById[id]; if (!mentor?.email) continue;
    const html = wrap('Metrics Check Reminder', `<p>Hi ${mentor.full_name || 'there'},</p>
      <p>These ${byMentor[id].length} youth on your caseload still need a <strong>metrics check</strong> for <strong>${monthName}</strong>:</p>
      ${nameList(byMentor[id])}
      <p>Open the portal, pick the student, choose <em>Metrics check</em> under "Student service provided," and fill it in.</p>`,
      `Automated reminder for ${monthName}.`);
    try { await sendEmail(mentor.email, `Metrics checks needed — ${monthName}`, html); emailsSent++; } catch (e) {}
  }
  for (const admin of profiles.filter(x => x.role === 'admin' && x.email)) {
    const perMentor = Object.keys(byMentor).map(id => `<p><strong>${profById[id]?.full_name || 'Mentor'}:</strong>${nameList(byMentor[id])}</p>`).join('');
    const html = wrap('Metrics Check Status', `<p>Hi ${admin.full_name || 'there'},</p>
      <p><strong>${uncovered.length}</strong> active youth still need a metrics check for <strong>${monthName}</strong>.</p>
      ${perMentor}${unassigned.length ? `<p><strong>Unassigned:</strong>${nameList(unassigned)}</p>` : ''}
      ${uncovered.length === 0 ? '<p>🎉 Everyone is covered this month.</p>' : ''}`, `Automated summary for ${monthName}.`);
    try { await sendEmail(admin.email, `Metrics check status — ${monthName}`, html); emailsSent++; } catch (e) {}
  }
  return { type: 'metrics', month: monthName, uncovered: uncovered.length, emailsSent };
}

// ---- WEEKLY session reminder ----
async function runWeekly(now) {
  // Monday (UTC) of the current week
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  const monday = `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;

  const [students, sessions, profiles] = await Promise.all([
    rest('students?select=id,first_name,last_name,assigned_mentor,assigned_mentor_2&program_status=eq.active'),
    rest(`sessions?select=student_id&session_date=gte.${monday}`),
    rest('profiles?select=id,full_name,email,role')
  ]);
  const count = {};
  sessions.forEach(s => { count[s.student_id] = (count[s.student_id] || 0) + 1; });
  const behind = students.filter(s => (count[s.id] || 0) < SESSIONS_PER_WEEK)
    .map(s => ({ ...s, done: count[s.id] || 0 }));
  const profById = Object.fromEntries(profiles.map(x => [x.id, x]));
  const { byMentor, unassigned } = groupByMentor(behind, profById);

  const line = (s) => `<li>${s.first_name} ${s.last_name} — ${s.done}/${SESSIONS_PER_WEEK} sessions this week</li>`;
  let emailsSent = 0;
  for (const id of Object.keys(byMentor)) {
    const mentor = profById[id]; if (!mentor?.email) continue;
    const html = wrap('Weekly Session Reminder', `<p>Hi ${mentor.full_name || 'there'},</p>
      <p>These youth on your caseload have not yet had <strong>both sessions this week</strong>. Please schedule the remaining session(s) before the week ends:</p>
      <ul>${byMentor[id].map(line).join('')}</ul>`,
      `Automated weekly reminder (week of ${monday}).`);
    try { await sendEmail(mentor.email, 'Weekly sessions still needed', html); emailsSent++; } catch (e) {}
  }
  for (const admin of profiles.filter(x => x.role === 'admin' && x.email)) {
    const perMentor = Object.keys(byMentor).map(id => `<p><strong>${profById[id]?.full_name || 'Mentor'}:</strong><ul>${byMentor[id].map(line).join('')}</ul></p>`).join('');
    const html = wrap('Weekly Session Status', `<p>Hi ${admin.full_name || 'there'},</p>
      <p><strong>${behind.length}</strong> active youth are short on sessions this week.</p>
      ${perMentor}${unassigned.length ? `<p><strong>Unassigned:</strong><ul>${unassigned.map(line).join('')}</ul></p>` : ''}
      ${behind.length === 0 ? '<p>🎉 Everyone has had both sessions this week.</p>' : ''}`, `Automated weekly summary (week of ${monday}).`);
    try { await sendEmail(admin.email, 'Weekly session status', html); emailsSent++; } catch (e) {}
  }
  return { type: 'weekly', weekOf: monday, behind: behind.length, emailsSent };
}

export default async function handler(req, res) {
  try {
    if (!URL_ || !SERVICE || !RESEND || !FROM) return res.status(500).json({ error: 'Missing environment variables.' });

    // Authorize: Vercel cron (CRON_SECRET) or a signed-in admin
    const auth = req.headers.authorization || '';
    const isCron = !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
    let isAdmin = false;
    if (!isCron && auth.startsWith('Bearer ') && ANON) {
      const ur = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: ANON, Authorization: auth } });
      if (ur.ok) { const u = await ur.json(); const prof = await rest(`profiles?select=role&id=eq.${u.id}`); isAdmin = prof[0]?.role === 'admin'; }
    }
    if (!isCron && !isAdmin) return res.status(401).json({ error: 'Unauthorized.' });

    const now = new Date();
    const force = req.query && (req.query.force === '1' || req.query.force === 'true');
    const type = req.query && req.query.type;
    const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
    const isMetricsDay = now.getUTCDate() === 25 || now.getUTCDate() === lastDay;
    const isWeeklyDay = now.getUTCDay() === WEEKLY_DAY;

    const out = [];
    if (force || isAdmin) {
      // Manual trigger: honor ?type (default metrics)
      out.push(type === 'weekly' ? await runWeekly(now) : await runMetrics(now));
    } else if (isCron) {
      if (isMetricsDay) out.push(await runMetrics(now));
      if (isWeeklyDay) out.push(await runWeekly(now));
      if (!out.length) return res.status(200).json({ skipped: true, reason: 'Not a scheduled reminder day.' });
    }
    const emailsSent = out.reduce((a, r) => a + (r.emailsSent || 0), 0);
    return res.status(200).json({ ok: true, ran: out, emailsSent, uncovered: out.find(r => r.type === 'metrics')?.uncovered });
  } catch (err) {
    console.error('send-reminders error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
