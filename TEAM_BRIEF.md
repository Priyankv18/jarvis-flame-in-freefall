# TEAM_BRIEF: paste this at the start of every Claude chat

## The challenge
NASA Space Apps 2026, **Flame in Freefall**: build an SI (AI) powered web dashboard that **summarizes, ranks and interprets** NASA microgravity combustion investigations (PSI database) to give fire safety insights for crew habitats: spacecraft, ISS, Moon Base, pressurized rovers, Mars.

Key facts from the brief: Moon Base and rovers will likely run at **30%+ O2 at 10.2 psi or less** (much more flammable than Earth air); spacesuits are 100% O2 at 4.3 psi; ACME CFI-G went up to 85% O2; there is **no partial-gravity data in PSI yet** (LUCI and FM2 planned).

## Team and file ownership (only edit your own files)
| Person | Role | Owns |
| --- | --- | --- |
| Hargun | Data lead | `src/data/investigations.json` |
| Pranav | Frontend lead | `src/App.jsx`, `src/App.css`, `src/components/Catalogue.jsx`, deployment, merges |
| Priyank | Scoring and visuals | `src/lib/scoring.js`, `src/components/ScoreTable.jsx`, `src/components/GapMap.jsx` |
| Arjun | AI lead | `src/lib/ai.js`, `src/components/AskPanel.jsx`, `api/ask.js` |
| 5th member | Story and submission | slides, 30 s demo video, submission page text (not in repo) |

## Contracts (do not break without telling the group)
- Every component gets the same props: `investigations`, `habitats`, `habitat` (the selected one). Only Pranav edits `App.jsx`.
- Data shape: see `_meta.units` in `investigations.json`. Field names: `id, name, fuel_state, fuel, sample_geometry, o2_min, o2_max, pressure_min, pressure_max, flow_min, flow_max, diluents, hardware, measurements, safety_pillar, relevance, key_findings, psi_link`. Unknown = `null`, never a guess.
- `/api/ask` takes `{ question, habitat, context[] }` and returns `{ answer, citations[] }`.

## Git workflow
- Branches: `data-hargun`, `frontend-pranav`, `viz-priyank`, `ai-arjun`. Commit small and often under your own account (that is our contribution record).
- Merge to `main` at checkpoints: Sat 1 PM, Sat 5:30 PM, Sat ~9 PM. Feature freeze Sun 12 PM. Final submit by Sun 2 PM (deadline Sun 11:59 PM NZ).

## Rules
- Never commit API keys (`.env.local` is gitignored). Never commit the event deck (it has lab logins).
- No NASA logos, flags or mission insignia in the UI or slides.
- AI must answer only from our data and cite investigation ids.
- Log what you used Claude for (one line each) for the "Use of SI" submission field.
