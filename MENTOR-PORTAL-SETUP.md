# Youth Mentorship Portal — Setup Guide

A web app for youth mentors to log **contact hours**, **session notes**, and their
**caseload**, build **AI intervention plans**, and (for the admin) download
**Excel reports** across the whole program.

- **1 admin** — sees every student, every session, every plan, and downloads Excel reports.
- **4 mentors** — see all students in the program, pick one, and log sessions / generate plans.

It runs on the same free Vercel setup as the rest of this project, plus a free
**Supabase** database for shared storage and logins.

Live URL once deployed: `https://YOUR-PROJECT.vercel.app/mentor`

> **Just want to look around first?** Add `?demo=1` to the URL
> (`…/mentor?demo=1`) for a no-login **demo** with sample students, sessions, and
> a working AI-plan generator. Nothing is saved, no database or login needed —
> it's only for previewing the interface. Switch between the admin and mentor
> views with the links in the demo banner.

---

## What you'll need (all free to start)

1. **A Supabase account** — https://supabase.com (the shared database + logins)
2. **Your Vercel project** — already set up for this repo
3. **An Anthropic API key** — already used by this project for AI features

---

## Step 1 — Create the Supabase project

1. Go to https://supabase.com and sign in → **New project**.
2. Name it (e.g. `mentorship-portal`), set a database password, pick a region, **Create**.
3. Wait ~1 minute for it to finish provisioning.

## Step 2 — Create the database tables

1. In Supabase, open **SQL Editor** → **New query**.
2. Open the file `supabase/schema.sql` from this repo, copy **all** of it, paste it in, and click **Run**.
3. You should see "Success. No rows returned." That created the tables, security rules, and login triggers.

## Step 3 — Create the 5 users

1. In Supabase, go to **Authentication → Users → Add user**.
2. Add each person with an **email + password**, and tick **Auto Confirm User** so they can log in immediately.
   - 1 admin (e.g. you)
   - 4 mentors
3. Now mark who the admin is and set display names. Back in **SQL Editor**, run this once,
   editing the emails/names:

   ```sql
   -- Make the admin an admin
   update public.profiles set role = 'admin', full_name = 'Your Name'
   where id = (select id from auth.users where email = 'admin@example.com');

   -- Name each mentor (repeat for all four)
   update public.profiles set full_name = 'Mentor One'
   where id = (select id from auth.users where email = 'mentor1@example.com');
   ```

## Step 4 — Get your Supabase keys

1. In Supabase, go to **Project Settings → API**.
2. Copy two values:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon / public** key (a long string under "Project API keys")

   > The anon key is safe to use in the browser — the security rules (RLS) you ran
   > in Step 2 control what each role can see and do.

## Step 5 — Add the keys to Vercel

1. In your Vercel project, go to **Settings → Environment Variables** and add:

   | Name | Value |
   |------|-------|
   | `SUPABASE_URL` | the Project URL from Step 4 |
   | `SUPABASE_ANON_KEY` | the anon/public key from Step 4 |
   | `ANTHROPIC_API_KEY` | your Anthropic key (for the AI plans) |

2. Go to **Deployments → ⋯ → Redeploy** so the new variables take effect.

## Step 6 — Add your students

1. Visit `https://YOUR-PROJECT.vercel.app/mentor` and sign in as the **admin**.
2. Open the **Manage Students** tab and add each youth in the program (you can assign a mentor to each).
3. Mentors can now log in, pick any student, and start logging sessions.

---

## How it's used day to day

**Intake → Approval (how a youth joins the caseload)**
- Any staff member/mentor opens the **New Intake** tab and fills out **Form A — Student
  Intake & Enrollment** (all 10 sections), plus Forms B–E, which the parent/guardian
  **signs electronically right in the app** (drawn signature + typed name). No paper
  double-handling. Any saved intake can be **printed or saved as a PDF** (with the
  signatures) from the student's profile or the Approvals queue.
- Submitting creates the student as **Pending approval** — they do NOT appear in the active
  caseload yet.
- The **admin** opens the **Approvals** tab, reviews each intake, and clicks **Approve for
  Service** (the youth joins the caseload) or **Decline**.
- The intake data then feeds the student's profile, the AI intervention plan, and the Excel
  reports.

**Metrics checks & the month-end report**
- Every time a mentor logs a session they record **absences since the last meeting** and
  the **reason**. Under **Student service provided** they choose **Student session** or
  **Metrics check**.
- A **Metrics check** (do it at least once a month per youth) captures the truancy data
  behind your report: currently truant?, truant before this month?, referred to truancy
  court?, no longer truant?, plus end-of-quarter **grades** and **discipline**.
- **Admin → Reports → Month-End Report:** pick the month and click **Generate** to see the
  six numbers, then **Download to Excel**. It warns you about any active youth who are
  **missing a metrics check** that month (so the numbers stay accurate).
- The six numbers: (1) service hours completed, (2) youth currently enrolled, (3) previously
  truant youth referred to truancy court, (4) truant youth not referred to court, (5) youth
  no longer considered truant, (6) total truant youth prior to this month.

**Mentors**
- Sign in → **Students** tab → search/select a youth.
- **Log a Session**: date, duration in minutes, setting, type, topics, notes, concerns, follow-up.
- **AI Intervention Plan**: type the current concerns + goals, click Generate. The plan uses
  the youth's profile and recent sessions. Review it, then **Save to Student Record**.

**Admin**
- Everything mentors can do, plus:
- **Manage Students** — add/edit the roster, assign mentors, set status.
- **Reports** — pick an optional date range and **Download Excel Report**. You get one
  workbook with five sheets:
  1. **Caseload** — the full student roster
  2. **Sessions** — every logged session
  3. **Hours by Student** — total contact hours per youth
  4. **Hours by Mentor** — total contact hours per mentor
  5. **Intervention Plans** — every saved AI plan

---

## FERPA & data privacy (please read)

This app stores **education records** about minors (names, DOB, attendance,
grades, discipline, 504/IEP, counseling notes). That makes it FERPA-relevant
**whether or not** Social Security numbers are collected — FERPA protects the
records, not just SSNs. The app is built to support compliance, but compliance is
mostly about *how your organization runs it*, not the software alone. Key points:

- **Your legal basis to hold records** is the signed **Form C (FERPA release)**.
  Keep those signatures on file (the app now captures them electronically).
- **Safeguards already in place:** individual logins, role-based access (mentors
  vs admin), encryption in transit (HTTPS) and at rest (Supabase AES-256), and
  the data is only used to deliver/report the program.
- **What you should do:** use strong passwords; turn on **multi-factor
  authentication** in Supabase; only create accounts for people who need them;
  set a **data-retention/destruction** schedule; and keep signed
  **data-processing agreements** with your vendors (Supabase, Vercel, Anthropic).
- **AI & third parties:** generating an intervention plan sends a **de-identified**
  summary to Anthropic's API — first name, age, grade, and needs only; never the
  full name, school, address, IDs, or guardian details. For extra protection you
  can enable zero-data-retention on your Anthropic account.
- **Not legal advice.** Before entering real student data, get sign-off from your
  district/LEA and the Houston Health Department on this data-handling approach.

## Notes & safety

- **Privacy:** This stores information about minors. Keep logins private, use strong
  passwords, and only add the people who need access. Supabase data is encrypted at rest.
- **AI plans are drafts.** Claude does not diagnose. Always review and adapt a plan before
  acting on it, and escalate real safety concerns to the appropriate professionals.
- **Costs:** Supabase free tier and Vercel free tier are plenty for 5 users. Each AI plan
  costs roughly $0.02–$0.05 of Anthropic credit.

## Troubleshooting

- **"Almost there — finish setup" screen:** `SUPABASE_URL` / `SUPABASE_ANON_KEY` aren't set in
  Vercel, or you didn't redeploy after adding them.
- **Can't log in:** Make sure the user exists in Supabase **Authentication → Users** and was
  **Auto Confirmed**.
- **Mentor sees no admin tabs:** That's expected — only the admin sees Reports / Manage Students.
- **AI plan fails:** Check `ANTHROPIC_API_KEY` is set in Vercel and has billing credit.
