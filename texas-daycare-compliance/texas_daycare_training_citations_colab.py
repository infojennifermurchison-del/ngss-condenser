# ==============================================================================
# Texas daycares cited in the last week for TRAINING-HOUR violations
# ------------------------------------------------------------------------------
# Paste this whole file into a single Google Colab cell (or upload the .ipynb)
# and press Run. No API key required, but adding a free Socrata app token
# (see APP_TOKEN below) makes it faster and avoids throttling.
#
# Data source: Texas HHS "Search Texas Child Care" compliance data, published as
# open data on the Texas Open Data Portal:
#   - HHSC CCL Non-Compliance Data ...... tqgd-mf4x  (the deficiencies/citations)
#   - HHSC CCL Operations Data .......... bc5r-88dy  (name / address / city / county)
#
# The state refreshes these datasets on the 20th of each month AND rolls in
# recent activity, so "last week" is relative to the newest activity date in the
# feed, not necessarily today's calendar date. The script prints the exact
# window it used so there's no ambiguity.
# ==============================================================================

# --- Install deps (Colab already has pandas/requests, but this is safe) -------
import subprocess, sys
for pkg in ("requests", "pandas"):
    try:
        __import__(pkg)
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", pkg])

import re
import datetime as dt
import requests
import pandas as pd

# ------------------------------------------------------------------------------
# CONFIG — tweak these
# ------------------------------------------------------------------------------
APP_TOKEN   = ""          # optional: free token from https://data.texas.gov -> profile -> App Tokens
DAYS_BACK   = 7           # "last week"
# How to anchor the window:
#   "auto"  -> use the most recent activity date present in the data (recommended,
#              because the state feed often lags the calendar by days/weeks)
#   "today" -> anchor to today's real date
ANCHOR      = "auto"

# Standards that are about TRAINING HOURS. We match on both the standard number
# and on keywords in the standard text, so we catch it regardless of schema.
# Chapter 746 = child-care centers, 747 = licensed/registered child-care homes.
# The Professional Development / training divisions live in the 746.13xx and
# 747.13xx ranges (annual clock hours, pre-service training, orientation, etc.).
TRAINING_STANDARD_REGEX = re.compile(r"\b7(?:46|47)\.13\d\d", re.I)
TRAINING_KEYWORDS = [
    "training hour", "clock hour", "annual training", "hours of training",
    "pre-service training", "preservice training", "professional development",
    "orientation", "training clock",
]
# Set STRICT_HOURS_ONLY = True to keep ONLY hour-count violations (drops generic
# "orientation"/"CPR" style training rows). False = all training-related rows.
STRICT_HOURS_ONLY = False

NONCOMPLIANCE_ID = "tqgd-mf4x"
OPERATIONS_ID    = "bc5r-88dy"
BASE = "https://data.texas.gov/resource/{}.json"

session = requests.Session()
if APP_TOKEN:
    session.headers["X-App-Token"] = APP_TOKEN


# ------------------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------------------
def soda_get(dataset_id, params):
    """One SODA request with basic error surfacing."""
    r = session.get(BASE.format(dataset_id), params=params, timeout=90)
    if r.status_code != 200:
        raise RuntimeError(f"SODA {dataset_id} HTTP {r.status_code}: {r.text[:300]}")
    return r.json()


def soda_get_all(dataset_id, where=None, select=None, order=None, page=50000):
    """Fetch every matching row with $limit/$offset pagination."""
    rows, offset = [], 0
    while True:
        params = {"$limit": page, "$offset": offset}
        if where:  params["$where"]  = where
        if select: params["$select"] = select
        if order:  params["$order"]  = order
        chunk = soda_get(dataset_id, params)
        rows.extend(chunk)
        if len(chunk) < page:
            break
        offset += page
    return pd.DataFrame(rows)


def detect_column(columns, prefer, keywords):
    """Pick the best-matching column name from a list, case-insensitively."""
    lower = {c.lower(): c for c in columns}
    for p in prefer:
        if p in lower:
            return lower[p]
    for c in columns:
        cl = c.lower()
        if any(k in cl for k in keywords):
            return c
    return None


# ------------------------------------------------------------------------------
# 1) Discover the real column names (schema-proof)
# ------------------------------------------------------------------------------
sample = soda_get(NONCOMPLIANCE_ID, {"$limit": 1})
if not sample:
    raise SystemExit("No rows returned from the Non-Compliance dataset.")
cols = list(sample[0].keys())
print("Non-Compliance columns available:\n  " + ", ".join(cols) + "\n")

DATE_COL = detect_column(
    cols,
    prefer=["activity_date", "citation_date", "inspection_date", "date"],
    keywords=["activity", "date"],
)
STD_NUM_COL = detect_column(
    cols,
    prefer=["standard_number_description", "standard_number", "section"],
    keywords=["standard_number", "standard", "section", "rule"],
)
STD_TXT_COL = detect_column(
    cols,
    prefer=["standard_description", "narrative", "activity_description"],
    keywords=["description", "narrative", "text"],
)
OP_COL = detect_column(
    cols,
    prefer=["operation_id", "operation_number", "facility_id"],
    keywords=["operation_id", "operation_number", "facility"],
)
NAME_COL = detect_column(
    cols, prefer=["operation_name"], keywords=["operation_name", "name"]
)

if not DATE_COL:
    raise SystemExit(f"Couldn't find a date column. Columns were: {cols}")
print(f"Using date column   : {DATE_COL}")
print(f"Using standard-# col : {STD_NUM_COL}")
print(f"Using standard-text  : {STD_TXT_COL}")
print(f"Using operation-id   : {OP_COL}")
print(f"Using name column    : {NAME_COL}\n")


# ------------------------------------------------------------------------------
# 2) Figure out the "last week" window
# ------------------------------------------------------------------------------
if ANCHOR == "auto":
    newest = soda_get(NONCOMPLIANCE_ID,
                      {"$select": f"max({DATE_COL}) as m"})[0]["m"]
    anchor_date = pd.to_datetime(newest).normalize()
    print(f"Newest activity date in feed: {anchor_date.date()} (anchoring here)")
else:
    anchor_date = pd.Timestamp(dt.date.today())
    print(f"Anchoring to today: {anchor_date.date()}")

start = anchor_date - pd.Timedelta(days=DAYS_BACK)
start_iso = start.strftime("%Y-%m-%dT00:00:00")
print(f"Window: {start.date()} .. {anchor_date.date()}\n")


# ------------------------------------------------------------------------------
# 3) Pull last-week deficiencies, then keep only training-hour citations
# ------------------------------------------------------------------------------
where = f"{DATE_COL} >= '{start_iso}'"
df = soda_get_all(NONCOMPLIANCE_ID, where=where, order=f"{DATE_COL} DESC")
print(f"Deficiencies logged in window: {len(df)}")

if df.empty:
    raise SystemExit("No deficiencies in this window. Try increasing DAYS_BACK "
                     "or set ANCHOR='auto'.")

std_num = df[STD_NUM_COL].fillna("").astype(str) if STD_NUM_COL else pd.Series("", index=df.index)
std_txt = df[STD_TXT_COL].fillna("").astype(str) if STD_TXT_COL else pd.Series("", index=df.index)
blob = (std_num + " " + std_txt)

mask_num = std_num.str.contains(TRAINING_STANDARD_REGEX)
mask_kw  = blob.str.lower().apply(lambda s: any(k in s for k in TRAINING_KEYWORDS))
mask = mask_num | mask_kw

if STRICT_HOURS_ONLY:
    hours_kw = ["training hour", "clock hour", "annual training", "hours of training"]
    mask &= blob.str.lower().apply(lambda s: any(k in s for k in hours_kw))

training = df[mask].copy()
print(f"Training-hour citations in window: {len(training)}\n")


# ------------------------------------------------------------------------------
# 4) Enrich with operation name / address / city / county
# ------------------------------------------------------------------------------
def has(colname):
    return colname and colname in training.columns

need_enrich = OP_COL and (not has(NAME_COL)
                          or not any(c.lower() in ("city", "county") for c in training.columns))

if need_enrich and OP_COL:
    ids = [str(x) for x in training[OP_COL].dropna().unique()]
    if ids:
        # Discover operations-dataset schema + its operation-id column
        op_sample = soda_get(OPERATIONS_ID, {"$limit": 1})
        op_cols = list(op_sample[0].keys()) if op_sample else []
        OP_JOIN = detect_column(op_cols,
                    prefer=["operation_id", "operation_number", "facility_id"],
                    keywords=["operation_id", "operation_number", "facility"])
        if OP_JOIN:
            quoted = ",".join("'" + i.replace("'", "''") + "'" for i in ids)
            ops = soda_get_all(OPERATIONS_ID, where=f"{OP_JOIN} in ({quoted})")
            keep = [c for c in op_cols if c.lower() in (
                "operation_name", "operation_type", "location_address",
                "address", "city", "county", "zip", "phone", "website_address",
                "email_address", "type_of_issuance", "programs_provided")]
            keep = list(dict.fromkeys([OP_JOIN] + keep))
            ops = ops[[c for c in keep if c in ops.columns]].drop_duplicates(OP_JOIN)
            training = training.merge(
                ops, how="left", left_on=OP_COL, right_on=OP_JOIN,
                suffixes=("", "_op"))


# ------------------------------------------------------------------------------
# 5) Present the result
# ------------------------------------------------------------------------------
def first_present(frame, names):
    for n in names:
        for c in frame.columns:
            if c.lower() == n:
                return c
    return None

name_c   = first_present(training, ["operation_name"])
city_c   = first_present(training, ["city"])
county_c = first_present(training, ["county"])
addr_c   = first_present(training, ["location_address", "address"])
show = [c for c in [name_c, addr_c, city_c, county_c,
                    DATE_COL, STD_NUM_COL, STD_TXT_COL] if c]

report = training[show].sort_values(DATE_COL, ascending=False) if show else training
pd.set_option("display.max_colwidth", 80)
pd.set_option("display.max_rows", 200)

print("=" * 90)
print(f"TEXAS DAYCARES CITED FOR TRAINING-HOUR VIOLATIONS "
      f"({start.date()} to {anchor_date.date()})")
print("=" * 90)

# Unique daycare summary
group_key = name_c or (OP_COL if OP_COL in training.columns else DATE_COL)
uniq = (training.groupby(group_key).size()
        .sort_values(ascending=False)
        .rename("training_citations").reset_index())
print(f"\nUnique daycares cited: {len(uniq)}\n")
print(uniq.to_string(index=False))
print("\n--- Citation detail ---\n")
print(report.to_string(index=False))


# ------------------------------------------------------------------------------
# 6) Save + download CSV (works in Colab)
# ------------------------------------------------------------------------------
out = f"tx_daycare_training_citations_{anchor_date.date()}.csv"
report.to_csv(out, index=False)
print(f"\nSaved: {out}")
try:
    from google.colab import files  # noqa
    files.download(out)
except Exception:
    pass  # not running in Colab; file is still written to disk
