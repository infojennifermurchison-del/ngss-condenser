# ==============================================================================
# Texas daycares cited in the last week for TRAINING-HOUR violations
# ------------------------------------------------------------------------------
# Paste this whole file into a single Google Colab cell (or open the .ipynb)
# and press Run. No API key required; adding a free Socrata app token
# (see APP_TOKEN below) makes it faster and avoids throttling.
#
# Data source: Texas HHS "Search Texas Child Care" compliance data, published as
# open data on the Texas Open Data Portal. THREE datasets are joined because the
# citation itself, its date, and the facility's details live in separate tables:
#
#   * HHSC CCL Non-Compliance ................ tqgd-mf4x  -> WHAT standard was cited
#         (operation_id, activity_id, standard_number_description, narrative, ...)
#         NOTE: this table has NO citation date -- only correction dates.
#   * HHSC CCL Inspection/Investigation ...... m5q4-3y3d  -> WHEN (activity_date)
#         (activity_id, operation_id, activity_date, activity_type, ...)
#   * HHSC CCL Operations .................... bc5r-88dy  -> WHO / WHERE
#         (operation_id, operation_name, address, city, county, phone, ...)
#
# Join path:  inspections  --activity_id-->  non-compliance  --operation_id-->  operations
#
# "Last week" is anchored (by default) to the newest activity date actually in
# the feed, because the state data lags the calendar. The exact window is printed.
# ==============================================================================

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
# CONFIG
# ------------------------------------------------------------------------------
APP_TOKEN = ""       # optional free token: data.texas.gov -> profile -> App Tokens
DAYS_BACK = 7        # "last week"
ANCHOR    = "auto"   # "auto" = newest date in feed (recommended); "today" = calendar date

# Only include child-care *day cares* (drops residential/GRO facilities) when the
# operations table exposes an operation type. Set False to keep everything.
DAYCARE_ONLY = True

# TRAINING-HOUR standards. Chapter 746 = centers, 747 = child-care homes; the
# professional-development / training divisions sit in the 746.13xx / 747.13xx
# range (annual clock hours, pre-service training, orientation). We match on the
# standard number AND on keywords, so wording changes don't break it.
TRAINING_STANDARD_REGEX = re.compile(r"\b7(?:46|47)\.13\d\d", re.I)
TRAINING_KEYWORDS = [
    "training hour", "clock hour", "annual training", "hours of training",
    "pre-service training", "preservice training", "professional development",
    "orientation", "training clock",
]
# True = keep ONLY hour-count violations (drops generic orientation/CPR rows).
STRICT_HOURS_ONLY = False

NONCOMPLIANCE_ID = "tqgd-mf4x"
INSPECTIONS_ID   = "m5q4-3y3d"
OPERATIONS_ID    = "bc5r-88dy"
BASE = "https://data.texas.gov/resource/{}.json"

session = requests.Session()
if APP_TOKEN:
    session.headers["X-App-Token"] = APP_TOKEN


# ------------------------------------------------------------------------------
# SODA helpers
# ------------------------------------------------------------------------------
def soda_get(dataset_id, params):
    r = session.get(BASE.format(dataset_id), params=params, timeout=120)
    if r.status_code != 200:
        raise RuntimeError(f"SODA {dataset_id} HTTP {r.status_code}: {r.text[:300]}")
    return r.json()


def soda_get_all(dataset_id, where=None, select=None, order=None, page=50000):
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


def looks_like_date(value):
    """True only if the value parses to a plausible calendar date (1990-2100).
    This rejects big numeric IDs like activity_id=885794989."""
    if value is None:
        return False
    s = str(value)
    if re.fullmatch(r"\d+", s):          # pure integer -> an ID, not a date
        return False
    try:
        ts = pd.to_datetime(s, errors="raise")
        return 1990 <= ts.year <= 2100
    except Exception:
        return False


def find_date_col(sample_row, prefer):
    cols = list(sample_row.keys())
    lower = {c.lower(): c for c in cols}
    for p in prefer:                     # honor preferred names, but only if valid
        if p in lower and looks_like_date(sample_row[lower[p]]):
            return lower[p]
    for c in cols:                       # otherwise, any column with a real date value
        if looks_like_date(sample_row[c]):
            return c
    return None


def pick(cols, prefer, keywords):
    lower = {c.lower(): c for c in cols}
    for p in prefer:
        if p in lower:
            return lower[p]
    for c in cols:
        if any(k in c.lower() for k in keywords):
            return c
    return None


def chunked(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def quote_in(values):
    return ",".join("'" + str(v).replace("'", "''") + "'" for v in values)


# ------------------------------------------------------------------------------
# 1) Inspections table -> the WHEN. Find its date + id columns.
# ------------------------------------------------------------------------------
insp_sample = soda_get(INSPECTIONS_ID, {"$limit": 1})
if not insp_sample:
    raise SystemExit("No rows from the Inspections dataset.")
insp_cols = list(insp_sample[0].keys())
print("Inspection columns:\n  " + ", ".join(insp_cols) + "\n")

INSP_DATE = find_date_col(insp_sample[0],
                          prefer=["activity_date", "inspection_date", "date"])
INSP_ACT  = pick(insp_cols, ["activity_id"], ["activity_id", "activity"])
INSP_OP   = pick(insp_cols, ["operation_id", "operation_number"], ["operation"])
if not (INSP_DATE and INSP_ACT):
    raise SystemExit(f"Couldn't map inspection date/activity columns. "
                     f"date={INSP_DATE} activity={INSP_ACT}. Columns: {insp_cols}")
print(f"Inspections -> date={INSP_DATE}, activity_id={INSP_ACT}, operation_id={INSP_OP}\n")

# ------------------------------------------------------------------------------
# 2) Determine the "last week" window
# ------------------------------------------------------------------------------
if ANCHOR == "auto":
    newest = soda_get(INSPECTIONS_ID, {"$select": f"max({INSP_DATE}) as m"})[0]["m"]
    anchor_date = pd.to_datetime(newest).normalize()
    print(f"Newest inspection date in feed: {anchor_date.date()} (anchoring here)")
else:
    anchor_date = pd.Timestamp(dt.date.today())
    print(f"Anchoring to today: {anchor_date.date()}")
start = anchor_date - pd.Timedelta(days=DAYS_BACK)
start_iso = start.strftime("%Y-%m-%dT00:00:00")
print(f"Window: {start.date()} .. {anchor_date.date()}\n")

# ------------------------------------------------------------------------------
# 3) Recent inspections -> the activity_ids that happened in the window
# ------------------------------------------------------------------------------
sel = f"{INSP_ACT},{INSP_DATE}" + (f",{INSP_OP}" if INSP_OP else "")
insp = soda_get_all(INSPECTIONS_ID,
                    where=f"{INSP_DATE} >= '{start_iso}'",
                    select=sel, order=f"{INSP_DATE} DESC")
print(f"Inspection activities in window: {len(insp)}")
if insp.empty:
    raise SystemExit("No inspection activity in this window. Increase DAYS_BACK "
                     "or use ANCHOR='auto'.")
act_ids = [a for a in insp[INSP_ACT].dropna().astype(str).unique()]

# ------------------------------------------------------------------------------
# 4) Non-Compliance rows for those activities -> the WHAT (standard cited)
# ------------------------------------------------------------------------------
nc_sample = soda_get(NONCOMPLIANCE_ID, {"$limit": 1})
nc_cols = list(nc_sample[0].keys())
print("Non-Compliance columns:\n  " + ", ".join(nc_cols) + "\n")
NC_ACT = pick(nc_cols, ["activity_id"], ["activity_id", "activity"])
NC_OP  = pick(nc_cols, ["operation_id", "operation_number"], ["operation"])
NC_STD = pick(nc_cols, ["standard_number_description", "standard_number"],
              ["standard_number", "standard", "section"])
NC_TXT = pick(nc_cols, ["narrative", "standard_description"],
              ["narrative", "description", "text"])
NC_RISK = pick(nc_cols, ["standard_risk_level"], ["risk"])

frames = []
for batch in chunked(act_ids, 200):
    frames.append(soda_get_all(NONCOMPLIANCE_ID,
                               where=f"{NC_ACT} in ({quote_in(batch)})"))
nc = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
print(f"Deficiencies tied to those activities: {len(nc)}")
if nc.empty:
    raise SystemExit("No deficiencies recorded for activities in this window.")

std_num = nc[NC_STD].fillna("").astype(str) if NC_STD else pd.Series("", index=nc.index)
std_txt = nc[NC_TXT].fillna("").astype(str) if NC_TXT else pd.Series("", index=nc.index)
blob = (std_num + " " + std_txt)
mask = std_num.str.contains(TRAINING_STANDARD_REGEX) | \
       blob.str.lower().apply(lambda s: any(k in s for k in TRAINING_KEYWORDS))
if STRICT_HOURS_ONLY:
    hk = ["training hour", "clock hour", "annual training", "hours of training"]
    mask &= blob.str.lower().apply(lambda s: any(k in s for k in hk))
training = nc[mask].copy()
print(f"Training-hour citations in window: {len(training)}\n")
if training.empty:
    raise SystemExit("No TRAINING-HOUR citations in this window. "
                     "Try a larger DAYS_BACK or set STRICT_HOURS_ONLY=False.")

# attach the activity date from the inspections table
insp_dates = insp[[INSP_ACT, INSP_DATE]].drop_duplicates(INSP_ACT)
insp_dates[INSP_ACT] = insp_dates[INSP_ACT].astype(str)
training[NC_ACT] = training[NC_ACT].astype(str)
training = training.merge(insp_dates, how="left", left_on=NC_ACT, right_on=INSP_ACT)

# ------------------------------------------------------------------------------
# 5) Operations table -> the WHO / WHERE
# ------------------------------------------------------------------------------
op_ids = [str(x) for x in training[NC_OP].dropna().unique()] if NC_OP else []
if op_ids:
    op_sample = soda_get(OPERATIONS_ID, {"$limit": 1})
    op_cols = list(op_sample[0].keys()) if op_sample else []
    OP_JOIN = pick(op_cols, ["operation_id", "operation_number"], ["operation"])
    wanted = [c for c in op_cols if c.lower() in (
        "operation_name", "operation_type", "type", "location_address",
        "address", "city", "county", "zip", "phone", "email_address",
        "website_address", "programs_provided", "programmatic_services")]
    frames = []
    for batch in chunked(op_ids, 200):
        frames.append(soda_get_all(OPERATIONS_ID,
                                   where=f"{OP_JOIN} in ({quote_in(batch)})"))
    ops = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
    if not ops.empty:
        keep = list(dict.fromkeys([OP_JOIN] + [c for c in wanted if c in ops.columns]))
        ops = ops[keep].drop_duplicates(OP_JOIN)
        ops[OP_JOIN] = ops[OP_JOIN].astype(str)
        training[NC_OP] = training[NC_OP].astype(str)
        training = training.merge(ops, how="left", left_on=NC_OP, right_on=OP_JOIN,
                                  suffixes=("", "_op"))
        # keep only day cares if we can tell them apart
        type_c = next((c for c in ("operation_type", "type") if c in training.columns), None)
        if DAYCARE_ONLY and type_c:
            training = training[training[type_c].fillna("").str.contains(
                "Day Care|Daycare|Child Care|Child-Care|Before|After School|Head Start",
                case=False, regex=True)]

# ------------------------------------------------------------------------------
# 6) Report + CSV
# ------------------------------------------------------------------------------
def col(*names):
    for n in names:
        for c in training.columns:
            if c.lower() == n:
                return c
    return None

name_c, city_c, county_c = col("operation_name"), col("city"), col("county")
addr_c = col("location_address", "address")
show = [c for c in [name_c, addr_c, city_c, county_c, INSP_DATE,
                    NC_STD, NC_RISK, NC_TXT] if c]
report = training[show].sort_values(INSP_DATE, ascending=False) if show else training

pd.set_option("display.max_colwidth", 90)
pd.set_option("display.max_rows", 300)
print("=" * 92)
print(f"TEXAS DAYCARES CITED FOR TRAINING-HOUR VIOLATIONS "
      f"({start.date()} to {anchor_date.date()})")
print("=" * 92)

group_key = name_c or (NC_OP if NC_OP in training.columns else INSP_DATE)
uniq = (training.groupby(group_key).size().sort_values(ascending=False)
        .rename("training_citations").reset_index())
print(f"\nUnique daycares cited: {len(uniq)}\n")
print(uniq.to_string(index=False))
print("\n--- Citation detail ---\n")
print(report.to_string(index=False))

out = f"tx_daycare_training_citations_{anchor_date.date()}.csv"
report.to_csv(out, index=False)
print(f"\nSaved: {out}")
try:
    from google.colab import files  # noqa
    files.download(out)
except Exception:
    pass
