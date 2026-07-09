# Texas daycares cited last week for training-hour violations

Google Colab script that queries the Texas HHS **Search Texas Child Care**
compliance data and returns the daycares cited in the **last 7 days** for
**training-hour** violations.

## What it does

It joins **three** Texas HHS [Search Texas Child Care](https://childcare.hhs.texas.gov/)
open datasets on the [Texas Open Data Portal](https://data.texas.gov/), because
the citation, its date, and the facility's details live in separate tables:

| Dataset | ID | Provides | Join key |
|---|---|---|---|
| [Inspection/Investigation](https://data.texas.gov/See-Category-Tile/HHSC-CCL-Inspection-Investigation-Assessment-Data/m5q4-3y3d) | `m5q4-3y3d` | **when** (`activity_date`) | `activity_id` |
| [Non-Compliance](https://data.texas.gov/See-Category-Tile/HHSC-CCL-Non-Compliance-Data/tqgd-mf4x) | `tqgd-mf4x` | **what standard** was cited | `activity_id` → `operation_id` |
| [Operations](https://data.texas.gov/See-Category-Tile/HHSC-CCL-Daycare-and-Residential-Operations-Data/bc5r-88dy) | `bc5r-88dy` | **who / where** (name, city, county) | `operation_id` |

> The Non-Compliance table has **no citation date** of its own (only correction
> dates), which is why the inspection date has to come from `m5q4-3y3d`.

Steps:

1. Pull inspections in the last 7-day window → the recent `activity_id`s.
2. Pull the deficiencies for those activities and keep only **training-hour**
   citations — Chapter 746 (centers) / 747 (homes) professional-development
   standards in the `746.13xx` / `747.13xx` range (annual clock hours,
   pre-service training, orientation). See
   [26 TAC §746.1309](https://www.law.cornell.edu/regulations/texas/26-Tex-Admin-Code-SS-746-1309)
   — Texas requires **24 annual training clock hours** per caregiver.
3. Attach the activity date, then enrich with name / address / city / county.
4. Print a unique-daycare summary + citation detail and save/download a CSV.

## How to run

- Open `texas_daycare_training_citations_colab.ipynb` in
  [Google Colab](https://colab.research.google.com/) and choose
  **Runtime → Run all**, **or**
- Paste `texas_daycare_training_citations_colab.py` into a single Colab cell.

No API key required. A free Socrata app token (data.texas.gov → profile →
App Tokens) can be added to `APP_TOKEN` to avoid rate limiting.

## Config knobs (top of the script)

| Setting | Default | Meaning |
|---|---|---|
| `DAYS_BACK` | `7` | Size of the look-back window. |
| `ANCHOR` | `"auto"` | `"auto"` anchors to the newest activity date in the feed (the state data lags the calendar); `"today"` uses the real calendar date. |
| `STRICT_HOURS_ONLY` | `False` | `True` keeps only hour-count violations and drops generic orientation/CPR training rows. |

## Note on data freshness

Texas refreshes these open datasets on the **20th of each month**, and the
newest activity dates in the feed can trail the calendar by days to weeks.
`ANCHOR="auto"` handles this by defining "last week" relative to the most
recent record actually present, and the script prints the exact date window
it used. If you need real-time citations for the current calendar week, the
underlying [Search Texas Child Care](https://childcare.hhs.texas.gov/) site is
the authoritative source.
