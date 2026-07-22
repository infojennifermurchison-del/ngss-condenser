# Book MCG — Murchison Consulting Group website

A four-doors homepage. Each door opens to a service page that ends in a
"$77.77 / 30-minute call" booking button (payment collected by your Google
Calendar appointment schedule, credited toward the service chosen).

## Files

| File | Purpose |
|------|---------|
| `index.html` | Homepage — the four doors |
| `grant-govcon.html` | Door 01 — Grant & Government Contracting Consulting |
| `training.html` | Door 02 — Training |
| `technical-writing.html` | Door 03 — Technical Writing (Licensing & Credentialing) |
| `business-consulting.html` | Door 04 — Business Consulting |
| `styles.css` | Shared design system (brand colors, doors, CTA cards) |
| `vercel.json` | Deploy config (clean URLs) |

Everything is plain static HTML/CSS — no build step. It works by opening
`index.html` directly, or hosting the folder on Vercel, GoHighLevel, or any
static host.

## The booking button

Every "Book the call — $77.77" button links to the same Google Calendar
appointment schedule you already use. To change it, search all four service
pages for `calendar.google.com` and replace the URL.

## Editing content

- **Door names / order:** edit the four `.door` blocks in `index.html`.
- **Service copy:** edit the matching `*.html` file (hero, feature grid,
  "who it's for" list, CTA text).
- **Brand colors:** edit the `:root` variables at the top of `styles.css`
  (`--accent` teal, `--gold`).
- **Price:** search for `$77.77` across the files if it ever changes.
