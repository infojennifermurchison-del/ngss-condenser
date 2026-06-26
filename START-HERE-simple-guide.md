# Start Here — The Simple Guide

This walks you through getting your Mentor app online, step by step, in plain
language. No tech experience needed. Just follow along and click what it says.

There are **two parts**:

- **Part 1 — See the app** (about 5 minutes). Gets a sample version online so you
  can click around. No logins, nothing saved — just for looking.
- **Part 2 — Turn it on for real** (about 20 minutes). Adds the saving, the
  logins for you and your 4 mentors, and the AI plans.

You can do Part 1 today, play with it, and come back for Part 2 whenever.

Keep a notepad (paper or a notes app) handy. You'll create a few passwords and
copy a few codes, and you'll want them written down.

---

# PART 1 — See the app (5 minutes)

Your app's files are already saved online in a place called GitHub. We just need
a free service called **Vercel** to turn those files into a real website.

### Step 1 — Make a free Vercel account
1. Open a web browser and go to **vercel.com**.
2. Click **Sign Up**.
3. Choose **Continue with GitHub**. (GitHub is where your app files live.)
4. If it asks you to log in to GitHub, do that. Then click any **Authorize** or
   **Continue** buttons to let Vercel and GitHub talk to each other.

### Step 2 — Bring your app into Vercel
1. Once you're logged in, look for a button that says **Add New…** and choose
   **Project** from the little menu. (It might also just say **Import Project**.)
2. You'll see a list of your projects. Find the one named **ngss-condenser** and
   click the **Import** button next to it.

### Step 3 — Put it online
1. A settings page appears. **Don't change anything.** Just scroll down and click
   the big **Deploy** button.
2. Wait about a minute while it works. You'll see confetti or a **"Congratulations"**
   message when it's done.

### Step 4 — Open the sample app
1. Click the **Continue to Dashboard** button (or **Visit**).
2. You'll see your website address near the top. It looks something like
   `ngss-condenser-something.vercel.app`. **Write this address down** — it's your
   app's home.
3. In your browser's address bar, type that address and add this to the end:
   **`/mentor?demo=1`**

   So the whole thing looks like:
   `ngss-condenser-something.vercel.app/mentor?demo=1`
4. Press Enter.

🎉 You're now looking at the app with pretend students and notes. Click around!
- At the top there's a yellow bar that lets you switch between **"View as Admin"**
  (that's the boss view — that's you) and **"View as Mentor"** (what your mentors see).
- Try clicking a student, logging a practice session, and clicking
  **Generate Intervention Plan**.
- As Admin, try the **Reports** tab and the **Download Excel Report** button.

Nothing here is saved — it's just a sandbox to play in. When you're ready for the
real thing, do Part 2.

---

# PART 2 — Turn it on for real (20 minutes)

For real use you need a free **filing cabinet** to store your students and notes.
That filing cabinet is a free service called **Supabase**. We'll set it up, create
the 5 logins, and connect everything together.

## A) Make the free filing cabinet (Supabase)

### Step 5 — Sign up for Supabase
1. Go to **supabase.com** and click **Start your project** (or **Sign Up**).
2. Choose **Continue with GitHub** again, and click any **Authorize** buttons.

### Step 6 — Create your project
1. Click **New Project**.
2. Fill in:
   - **Name:** type `Mentor App` (anything is fine).
   - **Database Password:** make up a strong password. **Write it down** — you
     likely won't need it again, but keep it safe.
   - **Region:** pick the location closest to where you live.
3. Click **Create new project**.
4. Wait about 1–2 minutes for it to finish getting ready. Have a sip of coffee.

### Step 7 — Set up the drawers in the filing cabinet
This tells the filing cabinet what to store (students, sessions, plans). You'll
copy some text from your app's files and paste it in. Don't worry about what it
says — you're just copying and pasting.

1. **Get the text to copy:**
   - In a new browser tab, go to **github.com** and open your **ngss-condenser**
     project (sign in if needed).
   - Click the folder named **supabase**, then click the file **schema.sql**.
   - Look for a **Copy** icon (two little overlapping squares) on the right side
     above the text. Click it. The text is now copied. (If you don't see the icon,
     click **Raw**, then select all the text and copy it.)
2. **Paste it into Supabase:**
   - Back in the Supabase tab, look down the **left side** for an icon called
     **SQL Editor** (it looks like a little terminal/page). Click it.
   - Click **New query**.
   - Click in the big empty box and paste (Ctrl+V on Windows, Cmd+V on Mac).
   - Click the green **Run** button (bottom right). 
   - You should see a green **Success** message. ✅ The drawers are made.

## B) Make the 5 logins (you + 4 mentors)

### Step 8 — Add each person
1. On the Supabase left side, click **Authentication** (a little person/key icon).
2. Click **Users**, then the **Add user** button → **Create new user**.
3. For each person, type their **email** and a **password**, and **turn ON** the
   switch that says **Auto Confirm User** (this lets them log in right away).
   Click **Create user**.
4. Do this **5 times**: once for you, and once for each of your 4 mentors.
   **Write down each email and password** — you'll hand the mentors theirs.

### Step 9 — Mark yourself as the boss and add names
Right now all 5 people are plain "mentors." This step makes **you** the admin
(the boss who sees everything) and adds everyone's names.

1. Go back to **SQL Editor** (left side) → **New query**.
2. Copy the lines below into the box. Then **change the example emails and names
   to your real ones.**

   ```sql
   -- Make YOU the boss (admin). Put YOUR email and name here:
   update public.profiles set role = 'admin', full_name = 'Your Full Name'
   where id = (select id from auth.users where email = 'you@example.com');

   -- Name mentor 1 (repeat the next two lines for each of your 4 mentors):
   update public.profiles set full_name = 'Mentor One Name'
   where id = (select id from auth.users where email = 'mentor1@example.com');
   ```

   To add the other 3 mentors, copy those last two lines again and again, each
   time changing the name and email. (One pair of lines per mentor.)
3. Click **Run**. You should see **Success**. ✅

## C) Get the 3 secret codes

Your app needs 3 secret codes to work: two that connect it to your filing
cabinet, and one for the AI. Let's collect them on your notepad.

### Step 10 — The two filing-cabinet codes (from Supabase)
1. In Supabase, click the **gear / Settings** icon (bottom of the left side).
2. Click **API**.
3. You'll see:
   - **Project URL** — copy it. Label it on your notepad as **"URL."**
   - **Project API Keys** → the one labeled **anon** **public** — copy it. Label
     it **"KEY."**

   (These two are safe to use — they only do what your login rules allow.)

### Step 11 — The AI code (from Anthropic)
> If you already set up the other tool (the NGSS one) you may already have this —
> you can reuse the same code and skip to Step 12.

1. Go to **console.anthropic.com** and sign up or log in.
2. Add a little bit of credit: click **Settings** → **Billing** → add $5–$10.
3. Click **Settings** → **API Keys** → **Create Key**. Name it `Mentor App`.
4. Copy the code (it starts with `sk-ant-...`). Label it **"AI"** on your notepad.
   ⚠️ Anthropic shows this only once, so copy it now.

## D) Give the codes to your app (in Vercel)

### Step 12 — Paste the 3 codes into Vercel
1. Go back to **vercel.com** and open your **ngss-condenser** project.
2. Click the **Settings** tab (top of the page).
3. On the left, click **Environment Variables**. (Think of these as 3 labeled
   slots where your secret codes go.)
4. Add the first one:
   - In the **Key** box type exactly: `SUPABASE_URL`
   - In the **Value** box paste your **"URL"** code.
   - Click **Save**.
5. Add the second one:
   - **Key:** `SUPABASE_ANON_KEY`
   - **Value:** paste your **"KEY"** code. Click **Save**.
6. Add the third one:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** paste your **"AI"** code. Click **Save**.

   ⚠️ Type the three Key names **exactly** as shown (all capitals, with the
   underscores). The Value is the long code you copied.

### Step 13 — Refresh the app so it picks up the codes
1. In Vercel, click the **Deployments** tab (top).
2. Find the most recent line at the top, click the **⋯** (three dots) on its
   right, and choose **Redeploy**. Confirm by clicking **Redeploy** again.
3. Wait about a minute.

## E) Add your students and start using it

### Step 14 — Log in as the boss
1. Go to your app address and add **`/mentor`** at the end (this time **without**
   the `?demo=1`). Example: `ngss-condenser-something.vercel.app/mentor`
2. Log in with **your** email and password from Step 8.
3. You'll see extra tabs because you're the admin: **Reports** and
   **Manage Students**.

### Step 15 — Add the youth in your program
1. Click **Manage Students**.
2. Fill in a student's first and last name (the rest is optional but helpful).
   You can pick which mentor they're assigned to.
3. Click **Save Student**. Repeat for each young person.

### Step 16 — Hand the mentors their logins
- Give each mentor your app address with **`/mentor`** on the end, plus the email
  and password you made for them in Step 8.
- When they log in, they'll see all the students, can pick one, log a session,
  and create an AI plan. They won't see the admin tabs — that's only you.

### Step 17 — Run your Excel reports (anytime)
1. Log in as yourself, click the **Reports** tab.
2. (Optional) Pick a **From** and **To** date.
3. Click **Download Excel Report**. An Excel file lands in your Downloads folder
   with separate sheets for your caseload, every session, total hours per
   student, total hours per mentor, and all the AI plans.

---

## You're done! 🎉

Day to day, everyone just goes to your app address with `/mentor` on the end and
logs in. You can add students and run reports anytime.

## A few friendly reminders
- This holds information about kids — keep the logins private and use good
  passwords. Only set up accounts for people who truly need them.
- The AI plans are **drafts to help you think** — always read them over and use
  your own judgment, and reach out to the right professionals for any real safety
  worries.
- Costs are tiny: the filing cabinet (Supabase) and website (Vercel) are free for
  your size, and each AI plan costs only a few cents.

## If something looks wrong
- **"Almost there — finish setup" message:** The 3 codes in Step 12 weren't saved
  right, or you skipped the Redeploy in Step 13. Double-check the spelling of the
  Key names and redeploy.
- **Can't log in:** Make sure that person was added in Step 8 with the
  **Auto Confirm User** switch turned on.
- **A mentor sees the admin tabs (or you don't):** Re-run Step 9 to set who the
  admin is.
- **The AI plan won't generate:** Check the **AI** code in Step 12, and that you
  added a little billing credit in Step 11.
