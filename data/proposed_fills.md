# Proposed fills for data/investigations.json

Prepared 2026-11-15 with AI assistance (Claude). This file is a proposal only. `data/investigations.json` was not changed.

Rule used: a value is proposed only if a source sentence states it directly for that experiment. Nothing was converted, estimated or assumed (no "cabin air", 21 percent or 1 atm unless written). Where a source is silent the field stays null and is listed as "not stated".

## Result in one line

None of the sources we could read state a value for any of the 88 null range fields or the 1 missing fuels list in scope. **0 fields can be filled. 89 stay unknown.** Four existing values are flagged below because the sources we read do not support them.

## Sources checked

| Key | URL | Status |
|---|---|---|
| saffire_sheet | https://www.nasa.gov/wp-content/uploads/2025/07/spacecraft-fire-safety-demonstration-saffire.pdf | Read in full |
| same_sheet | https://www.nasa.gov/wp-content/uploads/2025/07/smoke-aerosol-measurement-experiment-same.pdf | Read in full |
| daft_sheet | https://www.nasa.gov/wp-content/uploads/2025/07/dust-and-aerosol-measurement-feasibility-test-daft.pdf | Read in full |
| bass_sheet | https://www.nasa.gov/wp-content/uploads/2025/07/burning-and-suppression-of-solids-bass.pdf | Read in full |
| acme_sheet | https://www.nasa.gov/wp-content/uploads/2025/07/advanced-combustion-via-microgravity-experiments-acme.pdf | Read in full |
| flex_sheet | https://www.nasa.gov/wp-content/uploads/2025/07/flame-extinguishment-experiment-flex.pdf | Read in full |
| spice_sheet | https://www.nasa.gov/wp-content/uploads/2025/07/smoke-point-in-co-flow-experiment-spice.pdf | Read in full |
| slice_sheet | https://www.nasa.gov/wp-content/uploads/2025/07/structure-liftoff-in-combustion-experiment-slice.pdf | Read in full |
| glenn | https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/ | Read; no numbers for any listed experiment |

### Could not reach

| Source | Problem |
|---|---|
| PSI-99 (SAFFIRE-II), PSI-47 (DAFT), PSI-22 (ACME-EFIELD), PSI-10 (ACME-FLAME-DESIGN), PSI-23 (ACME-S-FLAME), PSI-68 (FLEX-2), PSI-39 (CFI), PSI-159 (ACME-CFI-G), PSI-21 (ACME-CLD) at https://psi.nasa.gov/physci/repo/data/investigations/PSI-XX | Page loads but has no text without JavaScript (only "NASA PSI"). Needs a person with a browser. |
| brief: https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/ | TLS certificate error, page not retrieved. Source for CFI and ACME-CFI-G. |
| guide: the JSC combustion mini-book PDF in meta.sources | Not checked in this pass. |

## Per record

"Not stated" means the source was read and gives no number for that field.

### BASS (bass_sheet)
- o2_min, o2_max: not stated for the ISS tests.
- pressure_atm_min, pressure_atm_max: not stated.
- Confirms existing flow_min 5, flow_max 50 cm/s: "The crewmember adjusts the airflow from 5 to 50 cm/s." No conflict.
- Do not use: the sheet mentions "a 2-cm-diameter PMMA sphere burning in 17% oxygen, 1 atm. pressure, at 2 cm/s forced convective flow". That is a ground drop tower test, not the ISS experiment.

### BASS-II (bass_sheet)
- o2_min, o2_max: not stated. The sheet says ambient oxygen was a variable ("ambient oxygen concentration") and that the working volume was vitiated with "station GN2 at a flow rate of up to 500 cc/min", but gives no oxygen percent.
- pressure_atm_min, pressure_atm_max: not stated.
- Confirms flow 5 to 50 cm/s: "The crewmember adjusts the airflow from 5 to 50 cm/s." No conflict.
- Note: the sheet says both "BASS-II consists of 100 fuel samples" and "Forty-one test samples will be burned". The data file already flags this.

### BASS-M (bass_sheet)
- o2_min, o2_max, pressure_atm_min, pressure_atm_max: not stated.
- Confirms flow 5 to 50 cm/s: "The crew member adjusts the airflow from 5 to 50 cm/s." No conflict.

### SAFFIRE-I (saffire_sheet)
- o2, pressure, flow (all six fields): not stated.
- Fuels already in data; sheet agrees: "the cotton-fiberglass blend burn sample measured 0.4 m wide by 1 meter long."

### SAFFIRE-II (saffire_sheet; PSI-99 not reachable)
- o2, pressure, flow: not stated.
- Fuels agree: "The nine samples in the experiment kit include a cotton-fiberglass blend, Nomex, and the same acrylic glass that is used for spacecraft windows."

### SAFFIRE-III (saffire_sheet)
- o2, pressure: not stated.
- flow_min, flow_max: not stated as a number. Sheet: "the same cotton-fiberglass blend that was burned in Saffire-I, but at a higher flow velocity." Matches the existing flow_note.

### SAFFIRE-IV-VI (saffire_sheet)
- o2, pressure, flow: not stated. Sheet: Saffire IV burned "the same materials were burned in Saffire II, but at different pressures and oxygen saturation"; Saffire-V covers "the range of pressures and oxygen concentrations expected in future exploration spacecraft"; Saffire-VI tests "flammability at different oxygen levels". No values.
- Fuels: the sheet adds detail on SIBAL: "SIBAL cloth, a composite of 75% cotton and 25% fiberglass." Optional wording change, not a range fill.
- Note: the sheet calls Saffire both "The series of three" and "a series of six experiments".

### SAME (same_sheet)
- o2, pressure, flow: not stated. Sheet only says samples "were tested at different airflow rates, heating temperatures, and smoke aging durations".

### SAME-R (same_sheet)
- o2, pressure, flow: not stated.

### DAFT (daft_sheet, glenn; PSI-47 not reachable)
- o2, pressure, flow: not stated.
- fuels: not stated. DAFT burns nothing; it counts particles in station air ("assess and characterize the distribution of particles in the air inside ISS"). Proposal: keep `fuels` as an empty list, which matches `fuel_state` "none (dust, no combustion)". The validator could treat this record as an expected exception.

### FLEX-2 (flex_sheet; PSI-68 not reachable)
- flow_min, flow_max: not stated as a number. Sheet: the droplet "is subjected to a known and controlled sub-buoyant flow of the quiescent atmosphere". Matches the existing flow_note.
- The FLEX-2 section does not state oxygen or pressure, so the existing values (from PSI per the earlier merge) could not be re-checked here.

### CFI (brief and PSI-39 not reachable)
- o2_min, o2_max, flow_min, flow_max: not checked. The FLEX and ACME sheets do not cover this record.

### ACME-CFI-G (acme_sheet; brief and PSI-159 not reachable)
- o2_min, pressure_atm_min, pressure_atm_max: not stated in the ACME sheet.
- The existing o2_max 85 cites the brief, which we could not load, so it is unverified in this pass.

### ACME-CLD (acme_sheet; PSI-21 not reachable)
- pressure, flow: not stated.
- **Flag:** existing o2_min 21, o2_max 21. The sheet says only "diluted methane and ethylene flames in an air coflow" and gives no oxygen percent. Under the no-assumption rule, 21 is not supported by this sheet. Check PSI-21 before keeping it.

### ACME-EFIELD (acme_sheet; PSI-22 not reachable)
- o2, pressure, flow: not stated. Sheet: "Measurements, as a function of field strength and fuel dilution, will be made of the ion current through the flame".
- **Flag:** existing fuels ["methane"]. The ACME sheet names no fuel for E-FIELD. The value came from PSI in the earlier merge and could not be re-checked.

### ACME-FLAME-DESIGN (acme_sheet; PSI-10 not reachable)
- o2_max, pressure: not stated. Sheet: "Tests will be conducted with various concentrations of both the injected fuel (i.e., ethylene or methane) and the oxygen enriched atmosphere".
- **Flag:** existing o2_min 21. The sheet says "oxygen enriched" with no number. 21 is not stated in this source.

### ACME-S-FLAME (acme_sheet; PSI-23 not reachable)
- o2, pressure: not stated. Sheet: "Tests will be conducted with various inert diluents, in both the fuel and chamber atmosphere."

### SPICE (spice_sheet)
- pressure, flow: not stated. Sheet mentions "different nozzle diameter/co-flow velocity configurations" without values.
- **Flag:** existing o2_min 21, o2_max 21. The sheet says "co-flowing air" / "a co-flowing oxidizer", no oxygen percent. Not supported as written.

### SLICE (slice_sheet)
- pressure, flow: not stated. Sheet: "the air velocity is incrementally increased until the diffusion flame detaches and lifts", no values.
- **Flag:** existing o2_min 21, o2_max 21. Same issue as SPICE ("coflow of air", no percent). Note: the sheet's "40% ethylene flame" refers to fuel dilution in a numerical simulation, not oxygen.

## Count

| Group | Null fields in scope | Filled | Still unknown |
|---|---|---|---|
| BASS, BASS-II, BASS-M | 12 | 0 | 12 |
| SAFFIRE-I to IV-VI | 24 | 0 | 24 |
| SAME, SAME-R | 12 | 0 | 12 |
| DAFT (6 ranges + fuels) | 7 | 0 | 7 |
| FLEX-2, CFI | 6 | 0 | 6 |
| ACME (CFI-G, CLD, EFIELD, FLAME-DESIGN, S-FLAME) | 20 | 0 | 20 |
| SPICE, SLICE | 8 | 0 | 8 |
| **Total** | **89** | **0** | **89** |

Flagged existing values to review: ACME-CLD o2 21, SPICE o2 21, SLICE o2 21, ACME-FLAME-DESIGN o2_min 21, ACME-EFIELD fuels. Flow 5 to 50 cm/s for all three BASS records was confirmed.

Next step: someone opens the nine PSI pages and the challenge brief in a browser. Those are the only sources left that might give numbers.
