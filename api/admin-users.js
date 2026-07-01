// /api/admin-users.js — lets a signed-in ADMIN add / list / remove team logins
// from inside the app. Creating logins needs the service-role key, which stays
// server-side here. Every call is verified to come from an admin.
//
// Uses env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };

// Confirm the caller is a signed-in admin; returns their user object or null.
async function requireAdmin(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ') || !ANON) return null;
  const token = auth.slice(7);
  const ur = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
  if (!ur.ok) return null;
  const u = await ur.json();
  const pr = await fetch(`${URL_}/rest/v1/profiles?select=role&id=eq.${u.id}`, { headers: svc });
  const prof = (await pr.json())[0];
  return prof && prof.role === 'admin' ? u : null;
}

export default async function handler(req, res) {
  if (!URL_ || !SERVICE) return res.status(500).json({ error: 'Server is missing Supabase environment variables.' });
  const admin = await requireAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Admins only.' });

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${URL_}/rest/v1/profiles?select=id,full_name,email,role&order=role.desc,full_name.asc`, { headers: svc });
      return res.status(200).json({ users: await r.json() });
    }

    if (req.method === 'POST') {
      const { full_name, email, password, role } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: 'Email and a temporary password are required.' });
      const safeRole = role === 'admin' ? 'admin' : 'mentor';
      const r = await fetch(`${URL_}/auth/v1/admin/users`, {
        method: 'POST', headers: svc,
        body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: full_name || '', role: safeRole } })
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.msg || data.error_description || data.error || 'Could not create the user.' });
      // Enforce profile fields and require a password change on first login.
      await fetch(`${URL_}/rest/v1/profiles?id=eq.${data.id}`, { method: 'PATCH', headers: svc, body: JSON.stringify({ full_name: full_name || '', email, role: safeRole, must_change_password: true }) });
      return res.status(200).json({ ok: true, id: data.id });
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || (req.body && req.body.id);
      if (!id) return res.status(400).json({ error: 'Missing user id.' });
      if (id === admin.id) return res.status(400).json({ error: "You can't remove your own login." });
      const r = await fetch(`${URL_}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: svc });
      if (!r.ok) return res.status(r.status).json({ error: (await r.text()) || 'Could not remove the user.' });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (e) {
    console.error('admin-users error:', e);
    return res.status(500).json({ error: e.message || 'Internal error' });
  }
}
