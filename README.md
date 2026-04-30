# NGSS Curriculum Condenser — Deployment Guide

A public-facing web tool for Connecticut science teachers that uses Claude to condense NGSS units into 2–3 session-per-week pacing, with auto-generated standards analyses, pacing calendars, and 5E lesson plans built around Discovery Education resources.

This guide walks you through deploying it to Vercel (free tier) so any teacher can use it via a URL — no login required on their end.

---

## What you're deploying

```
ngss-condenser-deploy/
├── api/
│   └── claude.js          ← serverless function that proxies Claude API calls
├── public/
│   └── index.html         ← the teacher-facing UI
├── package.json
├── vercel.json
└── README.md              ← this file
```

The teacher sees only the website. The API key lives only on the server (Vercel) — it's never sent to teachers' browsers.

---

## What you'll need

1. **An Anthropic API key.** Sign up at https://console.anthropic.com and create one. You'll add a small amount of credit ($5–$20 is plenty for testing — each unit generation uses roughly $0.15–$0.40 of API credit).
2. **A free Vercel account.** Sign up at https://vercel.com (you can use GitHub, GitLab, or email — no Microsoft login required for either).
3. **A free GitHub account** (optional but recommended for easy deployment). Sign up at https://github.com.

That's it. No credit card required for any of these to get started.

---

## Deployment — the easy way (drag and drop)

This takes about 5 minutes.

### Step 1: Get your Anthropic API key

1. Go to https://console.anthropic.com
2. Sign up or log in
3. Click **Settings** → **API Keys** → **Create Key**
4. Name it "NGSS Condenser" and copy the key (it starts with `sk-ant-...`)
5. Add billing credits under **Settings** → **Plans & Billing** ($10 is a good starting amount)

⚠️ **Save the key somewhere safe.** Anthropic only shows it once.

### Step 2: Deploy to Vercel

1. Go to https://vercel.com and sign up / log in
2. On your dashboard, click **Add New** → **Project**
3. Click **Deploy a different repository** or look for the small text option to **upload a folder** (Vercel sometimes shows this as "Browse all templates → Other → Upload"). If you only see the GitHub option, use the GitHub method below instead.
4. Drag the entire `ngss-condenser-deploy` folder onto the upload area
5. Vercel will detect the project automatically. **Before clicking Deploy**, expand **Environment Variables** and add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** paste the key from Step 1
6. Click **Deploy**

In about 60 seconds you'll get a live URL like `ngss-condenser-abc123.vercel.app`. That's the URL you give to teachers.

### Step 3 (optional): Use a custom domain

In your Vercel project's **Settings** → **Domains**, you can add a domain you own. Or you can just keep the free `.vercel.app` URL.

---

## Deployment — the GitHub way (recommended for ongoing updates)

If you want easy updates later, this is the cleaner path.

1. Create a new GitHub repo (e.g., `ngss-condenser`)
2. Upload the contents of `ngss-condenser-deploy/` to that repo (using GitHub's web interface "Add file → Upload files" works fine — no command line needed)
3. In Vercel, click **Add New** → **Project** → **Import** from GitHub and pick the repo
4. **Before clicking Deploy**, add the `ANTHROPIC_API_KEY` environment variable as in Step 2 above
5. Click Deploy

Future updates: just edit files in GitHub and Vercel automatically redeploys.

---

## Testing it

Once deployed, visit your URL. The form should load. Try one of the sample units (e.g., "Ecosystems" with MS-LS2 standards) and confirm:

1. The "Generate Unit Documents" button works (about 30–60 seconds)
2. All three documents download as `.docx` files
3. The files open cleanly in Word

If you see "Generation failed: Server is missing ANTHROPIC_API_KEY environment variable", it means the env var didn't save. Go to Vercel → your project → **Settings** → **Environment Variables**, add it, and click **Redeploy** in the Deployments tab.

---

## Costs to expect

- **Vercel:** Free for this use case. The free tier includes 100 GB-hours of serverless function execution per month, way more than this tool will use.
- **Anthropic API:** Each full unit generation uses approximately $0.15–$0.40 of API credit (depends on standards length and number of lessons). 100 units ≈ $20–$40.
- You can monitor usage at https://console.anthropic.com under **Usage**.

If you want a hard spending limit, set one under **Settings** → **Plans & Billing** → **Spend limits** in the Anthropic console.

---

## Sharing with teachers

Once deployed, give teachers:

1. The URL
2. A short note: *"This tool generates draft NGSS unit documents you can edit. Always review for accuracy and adapt for your students before teaching."*

That's all they need. They don't need an account, login, or any technical setup.

---

## Customizing

- **Branding:** Edit the `<header>` and color variables (`--accent`, `--gold`) at the top of `public/index.html`
- **Adding/removing form fields:** Edit the form section in `index.html` and add the fields to the `getFormData()` and `baseContext` sections
- **Changing the prompts:** All three prompts live in `handleGenerate()` in `index.html` — they're plain template strings you can edit directly
- **Adding new districts/contexts:** Update the prompts to reference different state assessments or curriculum frameworks

---

## Troubleshooting

**"Failed to fetch" error:** Means the frontend can't reach the backend function. Check that `api/claude.js` deployed correctly under your project's **Functions** tab in Vercel.

**"Server is missing ANTHROPIC_API_KEY" error:** The env var isn't set. Add it under Settings → Environment Variables, then redeploy.

**Documents don't download:** Check your browser isn't blocking pop-ups for the Vercel domain.

**The Discovery Education suggestions are generic:** Expected — Claude doesn't have access to the actual DE catalog. Teachers will need to swap in specific asset titles. The structure and pedagogy are the value-add.

---

## Security notes

- The API key is stored only as a Vercel environment variable, never in the code
- Anyone with the URL can use the tool, which means anyone with the URL is spending your API credits
- For a more locked-down version, you can add a simple password check to `api/claude.js` (have Claude help you add this if you want it)
- If your URL ever gets shared too widely and credit usage spikes, you can rotate the API key in the Anthropic console and update the env var in Vercel — the old key stops working immediately
