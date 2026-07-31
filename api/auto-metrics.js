// /api/auto-metrics.js — on the last day of each month, auto-drafts a Metrics Check for
// every active youth who doesn't already have one, by having AI read that month's session
// notes, absences, and service times. Auto-generated checks are flagged (auto_generated)
// and DO count toward the month-end report; a mentor's own metrics check always wins and is
// never overwritten. The admin gets a summary email to spot-check.
//
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, RESEND_API_KEY,
//           REMINDER_FROM_EMAIL, CRON_SECRET, (SUPABASE_ANON_KEY for admin manual trigger).

export const config = { maxDuration: 60 };

const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC = process.env.ANTHROPIC_API_KEY;
const RESEND = process.env.RESEND_API_KEY;
const FROM = process.env.REMINDER_FROM_EMAIL;
const CRON_SECRET = process.env.CRON_SECRET;

const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };
const p2 = (n) => String(n).padStart(2, '0');

async function rest(path, opts) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: svc, ...(opts || {}) });
  if (!r.ok) throw new Error(`Supabase (${r.status}): ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

async function claudeJSON(system, prompt) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 600, system, messages: [{ role: 'user', content: prompt }] })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || 'Anthropic error');
  const text = (d.content || []).map(b => b.text || '').join('');
  const m = text.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : {};
}

const SYSTEM = `You are a youth-truancy program analyst. From a month of mentor session notes, decide the youth's truancy metrics for the monthly report. Answer ONLY from evidence in the notes/intake; when the notes don't clearly indicate something, use the conservative default. Never invent grades or court involvement. Return ONLY a JSON object, no prose.`;

function buildPrompt(student, monthSessions, monthName) {
  const i = student.intake || {};
  const elig = (i.eligibility || []).join('; ');
  const priorTruant = /truan|chronic absentee/i.test(elig) ? 'Yes (per intake eligibility)' : 'Unknown';
  const notes = monthSessions.map(s =>
    `- ${s.session_date} (${s.session_type}): ${[s.topics, s.progress_notes, s.concerns && 'Concern: ' + s.concerns, s.follow_up && 'Follow-up: ' + s.follow_up, (s.absences_since_last != null) && `absences since last: ${s.absences_since_last}${s.absence_reasons ? ' (' + s.absence_reasons + ')' : ''}`].filter(Boolean).join('; ')}`
  ).join('\n') || 'No sessions logged this month.';
  return `Youth (de-identified): first name ${student.first_name}, grade ${student.grade || 'n/a'}.
Intake eligibility: ${elig || 'n/a'}. Was truant prior to this month: ${priorTruant}.

MONTH OF NOTES (${monthName}):
${notes}

Decide these fields and return JSON exactly:
{
  "currently_truant": "Yes" | "No",              // is the youth still truant at month end, per notes
  "truant_prior_month": "Yes" | "No",            // were they truant before this month (use intake eligibility)
  "referred_to_court": "Yes" | "No",             // only Yes if the notes explicitly mention a truancy-court referral
  "no_longer_truant": "Yes" | "No",              // Yes only if notes show attendance recovered / exited truancy
  "quarter_grades": "",                          // only if a grade/GPA is stated in the notes, else ""
  "discipline": ""                               // only if a discipline incident is stated in the notes, else ""
}
Defaults when unclear: currently_truant "Yes", referred_to_court "No", no_longer_truant "No".`;
}

async function sendEmail(to, subject, html) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND}` },
    body: JSON.stringify({ from: FROM, to: [to], subject, html })
  });
}

export default async function handler(req, res) {
  try {
    if (!URL_ || !SERVICE || !ANTHROPIC) return res.status(500).json({ error: 'Missing environment variables.' });

    // Authorize: cron or admin
    const auth = req.headers.authorization || '';
    const isCron = !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
    let isAdmin = false;
    if (!isCron && auth.startsWith('Bearer ') && ANON) {
      const ur = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: ANON, Authorization: auth } });
      if (ur.ok) { const u = await ur.json(); const prof = await rest(`profiles?select=role&id=eq.${u.id}`); isAdmin = prof[0]?.role === 'admin'; }
    }
    if (!isCron && !isAdmin) return res.status(401).json({ error: 'Unauthorized.' });

    const now = new Date();
    const y = now.getUTCFullYear(), m = now.getUTCMonth();
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const from = `${y}-${p2(m + 1)}-01`, to = `${y}-${p2(m + 1)}-${p2(lastDay)}`;
    const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const force = req.query && (req.query.force === '1' || req.query.force === 'true');
    if (!force && !isAdmin && now.getUTCDate() !== lastDay) return res.status(200).json({ skipped: true, reason: 'Not the last day of the month.' });

    const [students, monthSessions, profiles] = await Promise.all([
      rest('students?select=id,first_name,grade,date_of_birth,assigned_mentor,assigned_mentor_2,intake&program_status=eq.active'),
      rest(`sessions?select=student_id,session_date,session_type,topics,progress_notes,concerns,follow_up,absences_since_last,absence_reasons&session_date=gte.${from}&session_date=lte.${to}`),
      rest('profiles?select=id,full_name,email,role')
    ]);
    const haveMetrics = new Set(monthSessions.filter(s => s.session_type === 'Metrics check').map(s => s.student_id));
    const byStudent = {};
    monthSessions.forEach(s => { (byStudent[s.student_id] = byStudent[s.student_id] || []).push(s); });
    const targets = students.filter(s => !haveMetrics.has(s.id));

    const generated = [];
    // Small concurrency to stay within the function time budget.
    for (let i = 0; i < targets.length; i += 6) {
      const chunk = targets.slice(i, i + 6);
      await Promise.all(chunk.map(async (s) => {
        try {
          const mx = await claudeJSON(SYSTEM, buildPrompt(s, byStudent[s.id] || [], monthName));
          await rest('sessions', {
            method: 'POST',
            headers: { ...svc, Prefer: 'return=minimal' },
            body: JSON.stringify({
              student_id: s.id, mentor_id: s.assigned_mentor || null, session_date: to,
              session_type: 'Metrics check', duration_minutes: 0, auto_generated: true,
              topics: 'Auto-generated from monthly notes',
              currently_truant: mx.currently_truant || 'Yes',
              truant_prior_month: mx.truant_prior_month || '',
              referred_to_court: mx.referred_to_court || 'No',
              no_longer_truant: mx.no_longer_truant || 'No',
              quarter_grades: mx.quarter_grades || '',
              discipline: mx.discipline || ''
            })
          });
          generated.push({ name: `${s.first_name}`, ...mx });
        } catch (e) { generated.push({ name: s.first_name, error: e.message }); }
      }));
    }

    // Notify admins to spot-check.
    if (RESEND && FROM && generated.length) {
      const rows = generated.map(g => `<li>${g.name}: ${g.error ? 'ERROR - ' + g.error : `truant ${g.currently_truant || '?'}, court ${g.referred_to_court || '?'}, no-longer-truant ${g.no_longer_truant || '?'}`}</li>`).join('');
      const html = `<div style="font-family:Arial,sans-serif;color:#1A2335;font-size:14px">
        <div style="background:#15284C;color:#fff;padding:12px 16px;font-weight:bold">Attendance Matters - Auto-Generated Metrics</div>
        <div style="padding:16px">
          <p>${generated.length} metrics check(s) were auto-generated for ${monthName} from mentors' notes and now count toward the report. <strong>Please review/adjust any before submitting your month-end numbers</strong> - open each youth and edit the metrics check marked "AUTO".</p>
          <ul>${rows}</ul></div></div>`;
      for (const a of profiles.filter(p => p.role === 'admin' && p.email)) await sendEmail(a.email, `Auto-generated metrics for ${monthName} (review)`, html);
    }

    return res.status(200).json({ ok: true, month: monthName, active: students.length, alreadyHad: haveMetrics.size, generated: generated.length });
  } catch (err) {
    console.error('auto-metrics:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
