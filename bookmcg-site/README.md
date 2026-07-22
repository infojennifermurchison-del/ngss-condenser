# Book MCG — Murchison Consulting Group website

A four-doors homepage. Each door opens to a service page that ends in a
"$77.77 / 30-minute call" booking button (payment collected by the booking
calendar, credited toward the service chosen). Built to the Murchison
Consulting Group Brand Guidelines v1.0.

## Brand system in use

- **Colors** — Charcoal `#2C2C2E` (primary/text), Dusty Mauve `#A88B95`
  (signature accent, used sparingly), Warm Gray `#8E8E93` (secondary text),
  Light Gray `#E5E5EA` (tints). Defined as CSS variables at the top of
  `styles.css`.
- **Type** — Palatino Linotype for headlines and body, Georgia for italics,
  captions, and letter-spaced labels. Both are system fonts (no licensing).
- **Logo** — full lockup in the header, reverse (white) lockup on the charcoal
  footer, monogram as the favicon. Photography follows the guide's usage map.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Homepage — the four doors + environmental hero photo |
| `grant-govcon.html` | Door 01 — Grant & Government Contracting Consulting |
| `training.html` | Door 02 — Training |
| `technical-writing.html` | Door 03 — Technical Writing (Licensing & Credentialing) |
| `business-consulting.html` | Door 04 — Business Consulting |
| `about.html` | About the firm / Jennifer Murchison bio |
| `privacy.html` | Privacy Policy |
| `terms.html` | Terms & Conditions |
| `styles.css` | Shared design system |
| `vercel.json` | Deploy config (clean URLs) |
| `assets/` | Logo variants + headshots (see below) |

### Assets

| File | Use |
|------|-----|
| `mcg-logo.png` | Full-color lockup (original) |
| `mcg-logo-transparent.png` | Header (transparent background) |
| `mcg-logo-reverse.png` | White lockup for the charcoal footer |
| `mcg-monogram.png` | Favicon / square applications |
| `jennifer-environmental.png` | Homepage hero (Var 04) |
| `jennifer-authoritative.png` | Grant & GovCon + Technical Writing (Var 01) |
| `jennifer-engaged.png` | Training (Var 02) |
| `jennifer-approachable.png` | Business Consulting (Var 03) |

## Booking buttons (the $77.77 call)

| Door | Booking link |
|------|--------------|
| Grant & GovCon | `.../widget/bookings/strategy-call-mcg` |
| Training | `.../widget/bookings/tecpds-support-meeting` |
| Technical Writing | `.../widget/booking/TNnlBfgEX0l8BuX6gzAw` |
| Business Consulting | `.../widget/booking/7NNQY5gtIhHaTiPs9yjq` |

To change a link, open the matching `*.html` file and edit the `href` on the
`.btn-book` anchor. To change the price, search all files for `$77.77`.

## Editing

- **Door names / order:** the four `.door` blocks in `index.html`.
- **Service copy:** the matching `*.html` file.
- **Brand colors / fonts:** the `:root` block at the top of `styles.css`.

Plain static HTML/CSS — no build step. Open `index.html` directly, or host the
folder on Vercel, GoHighLevel, or any static host.
