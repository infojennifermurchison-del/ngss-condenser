-- =============================================================================
-- Youth Mentorship Portal — Supabase schema
-- Run this in your Supabase project's SQL Editor (Dashboard → SQL Editor → New
-- query → paste → Run). Safe to re-run: it uses IF NOT EXISTS / CREATE OR REPLACE
-- and drops policies before recreating them.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES  (one row per app user — links to Supabase Auth, holds the role)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  email       text,   -- copied from the auth user; used by the reminder emails
  role        text not null default 'mentor' check (role in ('admin', 'mentor')),
  must_change_password boolean not null default false, -- true for admin-created logins
  created_at  timestamptz not null default now()
);

-- If upgrading an existing install (safe to re-run):
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists must_change_password boolean not null default false;

-- Helper: read the current app user's role WITHOUT triggering RLS recursion.
-- SECURITY DEFINER lets it bypass RLS when reading profiles. (Named app_user_role
-- to avoid clashing with Postgres's built-in current_role keyword.)
create or replace function public.app_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.app_user_role() = 'admin', false)
$$;

-- Auto-create a profile row whenever a new auth user is created.
-- full_name / role can be passed via the sign-up "data" payload, else defaults apply.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'mentor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill emails for any users created before the email column existed:
update public.profiles p set email = u.email
from auth.users u where u.id = p.id and p.email is distinct from u.email;

-- ---------------------------------------------------------------------------
-- 2. STUDENTS  (the youth in the program — the shared caseload)
-- ---------------------------------------------------------------------------
create table if not exists public.students (
  id                uuid primary key default gen_random_uuid(),
  first_name        text not null,
  last_name         text not null,
  date_of_birth     date,
  grade             text,
  school            text,
  guardian_name     text,
  guardian_contact  text,
  -- 'pending'  = intake submitted, awaiting admin approval for service
  -- 'active'   = approved and being served    'declined' = not enrolled
  program_status    text not null default 'active'
                    check (program_status in ('pending', 'active', 'inactive', 'completed', 'declined')),
  assigned_mentor   uuid references public.profiles (id) on delete set null,
  assigned_mentor_2 uuid references public.profiles (id) on delete set null,
  background        text,
  -- Full Form A + B/C/D/E intake captured as structured data (see app).
  intake            jsonb,
  intake_completed_at timestamptz,
  approved_by       uuid references public.profiles (id) on delete set null,
  approved_at       timestamptz,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now()
);

-- If upgrading an existing install, add the new columns (safe to re-run):
alter table public.students add column if not exists assigned_mentor_2 uuid references public.profiles (id) on delete set null;
alter table public.students add column if not exists intake jsonb;
alter table public.students add column if not exists intake_completed_at timestamptz;
alter table public.students add column if not exists approved_by uuid references public.profiles (id) on delete set null;
alter table public.students add column if not exists approved_at timestamptz;
do $$ begin
  alter table public.students drop constraint if exists students_program_status_check;
  alter table public.students add constraint students_program_status_check
    check (program_status in ('pending', 'active', 'inactive', 'completed', 'declined'));
exception when others then null; end $$;

-- ---------------------------------------------------------------------------
-- 3. SESSIONS  (contact-hour logs + session information)
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.students (id) on delete cascade,
  mentor_id         uuid references public.profiles (id) on delete set null,
  session_date      date not null,
  start_time        text,   -- HH:MM
  end_time          text,   -- HH:MM
  duration_minutes  integer not null default 0 check (duration_minutes >= 0),
  setting           text,        -- in-person, virtual, phone, group, etc.
  session_type      text,        -- 'Student session' or 'Metrics check' (service provided)
  topics            text,        -- what was covered
  progress_notes    text,        -- narrative notes
  concerns          text,        -- risk flags / concerns raised
  follow_up         text,        -- follow-up actions / next steps
  -- captured EVERY session:
  absences_since_last integer,   -- # absences since the previous meeting
  absence_reasons     text,      -- reason(s) for those absences
  -- captured on a METRICS CHECK (feeds the admin month-end report):
  currently_truant    text,      -- Yes / No
  truant_prior_month  text,      -- Yes / No — truant before this month
  referred_to_court   text,      -- Yes / No — referred to truancy court
  no_longer_truant    text,      -- Yes / No — no longer considered truant
  quarter_grades      text,      -- grades / GPA (end of quarter)
  discipline          text,      -- discipline incidents (end of quarter)
  auto_generated      boolean not null default false, -- AI-drafted month-end metrics
  created_at        timestamptz not null default now()
);

-- If upgrading an existing install (safe to re-run):
alter table public.sessions add column if not exists start_time text;
alter table public.sessions add column if not exists end_time text;
alter table public.sessions add column if not exists absences_since_last integer;
alter table public.sessions add column if not exists absence_reasons text;
alter table public.sessions add column if not exists currently_truant text;
alter table public.sessions add column if not exists truant_prior_month text;
alter table public.sessions add column if not exists referred_to_court text;
alter table public.sessions add column if not exists no_longer_truant text;
alter table public.sessions add column if not exists quarter_grades text;
alter table public.sessions add column if not exists discipline text;
alter table public.sessions add column if not exists auto_generated boolean not null default false;

create index if not exists sessions_student_idx on public.sessions (student_id);
create index if not exists sessions_mentor_idx  on public.sessions (mentor_id);
create index if not exists sessions_date_idx    on public.sessions (session_date);

-- ---------------------------------------------------------------------------
-- 4. INTERVENTION PLANS  (AI-generated, saved per student)
-- ---------------------------------------------------------------------------
create table if not exists public.intervention_plans (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students (id) on delete cascade,
  created_by      uuid references public.profiles (id) on delete set null,
  title           text not null default 'Intervention Plan',
  input_summary   text,          -- the concerns/goals the mentor fed in
  plan_content    text not null, -- the AI-generated plan (markdown/plain text)
  status          text not null default 'active' check (status in ('draft', 'active', 'completed', 'archived')),
  created_at      timestamptz not null default now()
);

create index if not exists plans_student_idx on public.intervention_plans (student_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- Model: any signed-in mentor or admin can READ the shared program data and
-- CREATE session logs / intervention plans. Editing the student roster, deleting
-- records, and reassigning caseloads are ADMIN-only.
-- =============================================================================
alter table public.profiles            enable row level security;
alter table public.students            enable row level security;
alter table public.sessions            enable row level security;
alter table public.intervention_plans  enable row level security;

-- ---- PROFILES ----
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- STUDENTS ----
-- All signed-in users can see the roster. Any staff member (mentor or admin) can
-- SUBMIT an intake (insert). Approving/editing/deleting students is ADMIN-only.
drop policy if exists students_select on public.students;
create policy students_select on public.students
  for select using (auth.role() = 'authenticated');

drop policy if exists students_admin_write on public.students;  -- replaced by the policies below
drop policy if exists students_insert on public.students;
create policy students_insert on public.students
  for insert with check (auth.uid() = created_by or public.is_admin());

drop policy if exists students_admin_update on public.students;
create policy students_admin_update on public.students
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists students_admin_delete on public.students;
create policy students_admin_delete on public.students
  for delete using (public.is_admin());

-- ---- SESSIONS ----  (everyone reads for continuity; mentors create their own)
drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions
  for select using (auth.role() = 'authenticated');

drop policy if exists sessions_insert on public.sessions;
create policy sessions_insert on public.sessions
  for insert with check (auth.uid() = mentor_id or public.is_admin());

drop policy if exists sessions_update on public.sessions;
create policy sessions_update on public.sessions
  for update using (auth.uid() = mentor_id or public.is_admin());

drop policy if exists sessions_delete on public.sessions;
create policy sessions_delete on public.sessions
  for delete using (auth.uid() = mentor_id or public.is_admin());

-- ---- INTERVENTION PLANS ----
drop policy if exists plans_select on public.intervention_plans;
create policy plans_select on public.intervention_plans
  for select using (auth.role() = 'authenticated');

drop policy if exists plans_insert on public.intervention_plans;
create policy plans_insert on public.intervention_plans
  for insert with check (auth.uid() = created_by or public.is_admin());

drop policy if exists plans_update on public.intervention_plans;
create policy plans_update on public.intervention_plans
  for update using (auth.uid() = created_by or public.is_admin());

drop policy if exists plans_delete on public.intervention_plans;
create policy plans_delete on public.intervention_plans
  for delete using (auth.uid() = created_by or public.is_admin());

-- =============================================================================
-- STORAGE — student file attachments (intervention-plan PDFs + uploaded documents)
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('student-files', 'student-files', false)
on conflict (id) do nothing;

drop policy if exists studentfiles_read on storage.objects;
create policy studentfiles_read on storage.objects
  for select using (bucket_id = 'student-files' and auth.role() = 'authenticated');

drop policy if exists studentfiles_insert on storage.objects;
create policy studentfiles_insert on storage.objects
  for insert with check (bucket_id = 'student-files' and auth.role() = 'authenticated');

drop policy if exists studentfiles_update on storage.objects;
create policy studentfiles_update on storage.objects
  for update using (bucket_id = 'student-files' and public.is_admin());

drop policy if exists studentfiles_delete on storage.objects;
create policy studentfiles_delete on storage.objects
  for delete using (bucket_id = 'student-files' and public.is_admin());

-- =============================================================================
-- AFTER RUNNING THIS:
--  1. Create your 5 users in Dashboard → Authentication → Users → Add user
--     (1 admin + 4 mentors). Use email + password, and tick "Auto Confirm".
--  2. Mark the admin: run this with the admin's email:
--        update public.profiles set role = 'admin', full_name = 'Admin Name'
--        where id = (select id from auth.users where email = 'admin@example.com');
--  3. Set each mentor's display name similarly (role stays 'mentor'):
--        update public.profiles set full_name = 'Mentor Name'
--        where id = (select id from auth.users where email = 'mentor@example.com');
-- =============================================================================
