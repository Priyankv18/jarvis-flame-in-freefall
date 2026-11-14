import csv
import json
import sys

JSON_PATH = "data/investigations.json"
CSV_PATH = "data/investigations.csv"
SEP = " | "
LISTS = {"fuels", "diluents", "measurements", "pillars", "key_findings"}
NUMBERS = {"o2_min", "o2_max", "pressure_atm_min", "pressure_atm_max", "flow_min", "flow_max"}
FIRST = ["id", "name", "fuel_state", "o2_min", "o2_max", "pressure_atm_min", "pressure_atm_max",
         "flow_min", "flow_max", "o2_note", "flow_note", "todo", "source"]


def to_csv():
    raw = json.load(open(JSON_PATH))
    recs = raw["investigations"]
    cols = list(FIRST)
    for r in recs:
        for k in r:
            if k not in cols:
                cols.append(k)
    with open(CSV_PATH, "w", newline="", encoding="utf-8-sig") as f:  # utf-8-sig so Excel reads it right
        w = csv.writer(f)
        w.writerow(cols)
        for r in recs:
            row = []
            for c in cols:
                v = r.get(c)
                if v is None:
                    row.append("")
                elif c in LISTS:
                    row.append(SEP.join(v))
                else:
                    row.append(v)
            w.writerow(row)
    print(f"wrote {CSV_PATH} ({len(recs)} rows)")


def num(s, ident, col):
    try:
        x = float(s)
    except ValueError:
        sys.exit(f"ERROR {ident}: {col} = '{s}' is not a number")
    return int(x) if x.is_integer() else x


def to_json():
    raw = json.load(open(JSON_PATH))
    old = {r["id"]: r for r in raw["investigations"]}
    out = []
    with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            ident = row["id"].strip()
            rec = {}
            for col, cell in row.items():
                cell = (cell or "").strip()
                if cell == "":
                    if col in LISTS:
                        rec[col] = []          # list fields are always arrays, even when empty
                    elif col in old.get(ident, {}):
                        rec[col] = None        # keep explicit nulls that already existed
                    # keys that never existed stay absent
                    continue
                if col in LISTS:
                    rec[col] = cell.split(SEP)
                elif col in NUMBERS:
                    rec[col] = num(cell, ident, col)
                else:
                    rec[col] = cell
            out.append(rec)
    raw["investigations"] = out
    json.dump(raw, open(JSON_PATH, "w"), indent=2, ensure_ascii=False)
    print(f"wrote {JSON_PATH} ({len(out)} investigations). Now run validate.py")


if __name__ == "__main__" and len(sys.argv) == 2 and sys.argv[1] in ("to-csv", "to-json"):
    to_csv() if sys.argv[1] == "to-csv" else to_json()
else:
    sys.exit(__doc__)
