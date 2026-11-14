import json
import sys

import pandas as pd

path = sys.argv[1] if len(sys.argv) > 1 else "data/investigations.json"
raw = json.load(open(path))
df = pd.DataFrame(raw["investigations"])
errors, warnings = [], []

# --- hard errors: these break scoring / the gap map ---
for i in df.id[df.id.duplicated()]:
    errors.append(f"duplicate id: {i}")

for lo, hi, name in [("o2_min", "o2_max", "O2"),
                     ("pressure_atm_min", "pressure_atm_max", "pressure"),
                     ("flow_min", "flow_max", "flow")]:
    for _, r in df[df[lo] > df[hi]].iterrows():
        errors.append(f"{r.id}: {name} min > max")
    # half-filled range: one end known, other null (can't draw a rectangle)
    half = df[df[lo].isna() != df[hi].isna()]
    for _, r in half.iterrows():
        warnings.append(f"{r.id}: {name} has only one end filled ({lo}={r[lo]}, {hi}={r[hi]})")

for _, r in df[~df.source.isin(raw["meta"]["sources"])].iterrows():
    errors.append(f"{r.id}: source '{r.source}' not in meta.sources")

for col in ("o2_min", "o2_max"):
    bad = df[(df[col] < 0) | (df[col] > 100)]
    for _, r in bad.iterrows():
        errors.append(f"{r.id}: {col}={r[col]} outside 0-100 %")

# --- warnings: things still to do ---
for _, r in df[df.todo.notna()].iterrows():
    warnings.append(f"{r.id}: TODO -> {r.todo}")

# --- coverage: the numbers for the pitch ---
n = len(df)
print(f"{n} investigations\n")
print("Coverage (investigations with BOTH min and max filled):")
for lo, hi, name in [("o2_min", "o2_max", "O2 range"),
                     ("pressure_atm_min", "pressure_atm_max", "pressure range"),
                     ("flow_min", "flow_max", "flow range")]:
    k = int((df[lo].notna() & df[hi].notna()).sum())
    print(f"  {name:15s} {k:2d}/{n}  ({100 * k / n:.0f}%)")

print("\nfuel_state values (filters need these consistent):")
print(df.fuel_state.value_counts().to_string())

print(f"\n{len(warnings)} warnings")
for w in warnings:
    print("  WARN ", w)
print(f"{len(errors)} errors")
for e in errors:
    print("  ERROR", e)
sys.exit(1 if errors else 0)
