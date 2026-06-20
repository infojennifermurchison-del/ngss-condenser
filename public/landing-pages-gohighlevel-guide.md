# Building Your 3 Service Landing Pages in GoHighLevel

This guide gives you everything to build three simple landing pages in GoHighLevel — one
for each tile on your home page. You don't have to write anything from scratch: just copy
the wording and links below.

---

## How it all fits together

```
        HOME PAGE  (your 3 tiles)
        /            |             \
   Business        Daycare        Gov Contracting
   landing page    landing page   landing page
      |                |               |
   each page has:  "Take the quiz" button  +  "Book a free consult" button
```

When someone clicks a tile, they land on that service's page. From there they can take the
quiz **or** book a call with you.

---

## Before you start: gather your 2 links

**1) Your booking link (same on all three pages):**

```
https://calendar.google.com/calendar/appointments/schedules/AcZssZ2cUi9y5W0yfles1HzBgXX-tPIo_pZ_KWw1MmGD5o514TWNGl5PAi2SAKptNTs1kGKJFGX3_0hW
```

**2) Your three quiz links.** After your site is deployed to Vercel, you'll have a web
address like `your-project.vercel.app`. Your quiz links will be:

| Service | Quiz link (replace the first part with your real Vercel address) |
|---|---|
| Business | `https://YOUR-PROJECT.vercel.app/business-quiz.html` |
| Daycare | `https://YOUR-PROJECT.vercel.app/daycare-quiz.html` |
| Gov Contracting | `https://YOUR-PROJECT.vercel.app/govcon-quiz.html` |

> 💡 If you'd rather not deal with Vercel yet, you can also upload each quiz as its own
> page inside GoHighLevel and use that page's link instead. Either way works.

---

## The GoHighLevel steps (same for each of the 3 pages)

1. In GoHighLevel, go to **Sites → Funnels** (or **Websites**) and open the funnel/site
   your home page is in.
2. Click **+ Add New Step / Page**. Name it (e.g. "Business", "Daycare", "Gov Contracting").
3. Open the new page in the builder. Add a **Section**, then inside it add these elements
   from the left panel:
   - A **Headline / Text** element → paste the **Headline**.
   - A **Text / Paragraph** element → paste the **Subheadline** and **Body**.
   - A **Button** element → this is the **"Take the quiz"** button.
   - A second **Button** element → this is the **"Book a free consult"** button.
   - A small **Text** element at the bottom → paste the **Trust line**.
4. **To make a button link somewhere:** click the button, open its settings, find
   **"On Click / Action"**, choose **"Open URL / Website URL"**, and paste the link.
   Turn ON **"Open in new tab"** for both buttons.
5. **Save**, then click **Publish**. Copy the page's published URL — you'll need it for the
   next step.
6. **Point your home-page tile to this page:** go back to your home page in the builder,
   click the tile (or its button), open its **Action / Link** settings, and paste this
   page's URL. Repeat for all three tiles.

> Do steps 1–6 once per service, using the wording for each page below.

---

## PAGE 1 — Business

**Page name / tile:** Business (your "I'm a business" tile)

**Headline:**
> Know exactly what to work on next in your business.

**Subheadline:**
> Take a free 5-minute quiz to find your growth stage — then let's turn the results into a plan.

**Body:**
> Every business moves through predictable stages, and each one calls for a different focus.
> This quick quiz pinpoints where you are right now and hands you a clear set of priorities
> for the next six months. When you're ready, book a free consult and we'll build your next
> steps together.

**Button 1 (primary):**
- Text: `Take the free business quiz →`
- Link: your **business** quiz link

**Button 2 (secondary):**
- Text: `Book a free consult`
- Link: your **booking** link

**Trust line (small text):**
> About 5 minutes · No sign-up · Your answers stay private.

---

## PAGE 2 — Daycare (Texas Rising Star)

**Page name / tile:** Daycare (your "I'm a daycare" tile)

**Headline:**
> Raise your Texas Rising Star level — and your reimbursement.

**Subheadline:**
> A free check of your Category 2 teacher–child interactions — the most heavily weighted part of your score.

**Body:**
> Category 2 counts for 40% of your Texas Rising Star score — more than any other category —
> and it's all about what happens between your teachers and children. This quick check shows
> where your interactions are strong and where a little focused coaching could lift your star
> level and your reimbursement rate. Take the quiz, then book a free consult and we'll build a
> simple coaching plan for your teachers.

**Button 1 (primary):**
- Text: `Take the free TRS check →`
- Link: your **daycare** quiz link

**Button 2 (secondary):**
- Text: `Book a free consult`
- Link: your **booking** link

**Trust line (small text):**
> About 5 minutes · No sign-up · Built around the official TRS Category 2.

---

## PAGE 3 — Government Contracting

**Page name / tile:** Gov Contracting (your "government contracting" tile)

**Headline:**
> Find out if you're ready to win government contracts.

**Subheadline:**
> A free 5-minute readiness check — from registrations to bidding — with your clear next step.

**Body:**
> Government contracting rewards preparation, and the steps build on each other: get registered,
> get positioned, then bid and deliver. This quick check shows exactly which step you're on and
> what to do next. Take the quiz, then book a free consult and we'll map out your path to a first
> (or next) contract.

**Button 1 (primary):**
- Text: `Take the free readiness quiz →`
- Link: your **govcon** quiz link

**Button 2 (secondary):**
- Text: `Book a free consult`
- Link: your **booking** link

**Trust line (small text):**
> About 5 minutes · No sign-up · Plain-English results.

---

## Quick checklist

- [ ] Site deployed to Vercel (so your quiz links work) — or quizzes uploaded into GoHighLevel
- [ ] Page 1 (Business) built, both buttons linked, published
- [ ] Page 2 (Daycare) built, both buttons linked, published
- [ ] Page 3 (Gov Contracting) built, both buttons linked, published
- [ ] Home-page tile 1 → Business page
- [ ] Home-page tile 2 → Daycare page
- [ ] Home-page tile 3 → Gov Contracting page
- [ ] Tested every button on your phone

> Tip: The quizzes already have a "Book a free consult" button inside their results screen,
> so visitors get two chances to book — on the landing page and after finishing the quiz.
