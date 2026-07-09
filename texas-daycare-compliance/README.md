# Texas daycares cited last week for training-hour violations

Google Colab script that queries the Texas HHS **Search Texas Child Care**
compliance data and returns the daycares cited in the **last 7 days** for
**training-hour** violations.

## What it does

1. Reads the **HHSC CCL Non-Compliance Data** feed (`tqgd-mf4x`) from the
   [Texas Open Data Portal](https://data.texas.gov/See-Category-Tile/HHSC-CCL-Non-Compliance-Data/tqgd-mf4x) —
   the same deficiency records shown on the public
   [Search Texas Child Care](https://childcare.hhs.texas.gov/) site.
2. Filters to the last week of activity.
3. Keeps only citations about **training hours** — the Chapter 746 (centers)
   and 747 (homes) professional-development standards in the `746.13xx` /
   `747.13xx` range (annual clock hours, pre-service training, orientation).
   See [26 TAC §746.1309](https://www.law.cornell.edu/regulations/texas/26-Tex-Admin-Code-SS-746-1309)
   — Texas requires **24 annual training clock hours** per caregiver.
4. Enriches each hit with operation name / address / city / county from the
   **HHSC CCL Operations** dataset (`bc5r-88dy`).
5. Prints a unique-daycare summary + citation detail and saves/downloads a CSV.

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
