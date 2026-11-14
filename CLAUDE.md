# Fire Safety Explorer

React + Vite + Tailwind static site, plus one Vercel serverless function in `api/ask.js` that serves the Ask tab. There is no other backend.

The Ask function reads its API key from the `LLM_API_KEY` environment variable, set in Vercel project settings (or an untracked `.env.local` for `npx vercel dev`). The key is never committed. Plain `npm run dev` does not serve `/api`.

## Rules
- Claude must never run git or gh commands. The human does all git work.
- Nobody pushes to main. Every change goes on a branch and is merged through a pull request.
- File ownership:
  - Pranav: src/App.jsx, src/components/Catalogue.jsx, src/components/Compare.jsx, src/lib/format.js
  - Priyank: src/components/GapMap.jsx, src/components/ScoreTable.jsx, src/lib/scoring.js
  - Arjun: src/components/AskPanel.jsx, src/lib/ai.js, api/ask.js
  - Hargun: data/investigations.json (final)
- Never rename JSON fields without telling the team.
- Do not invent data. A value not stated in the PSI record is null and the UI shows "unknown".
- Components receive props `{ investigations, habitats, habitat, meta }`.
- No em dashes in code comments, docs or scripts.
- No NASA logos or mission identifiers. No secrets or logins in the repo.
- README must state AI assistance.
- Run `npm run build` after changes.

## Data schema (data/investigations.json)
Top-level keys: `meta`, `habitats`, `investigations`, `future`, `incidents`, `spinoffs`. App.jsx imports this file. `src/data/investigations.json` is an unused copy.

Investigation fields:
- `id`, `name`, `family`, `hardware`, `fuel_state`, `fuels` (array), `geometry`
- `pillars`: array of prevention, detection, suppression
- `relevance`: direct, secondary or indirect
- `o2_min`, `o2_max`: percent by volume
- `pressure_atm_min`, `pressure_atm_max`: atm
- `flow_min`, `flow_max`: cm/s
- `diluents`, `measurements` (arrays), `variables`, `tests`, `key_findings` (array), `people`, `source` (key into `meta.sources`)
- Optional: `o2_note`, `flow_note`, `psi_note`, `todo`, `psi_id`, `psi_link`, `psi_filled` (fields filled from the PSI record)

Habitat fields: `id`, `name`, `gravity`, `airflow`, `note`, and either
- a single value: `o2` and `pressure_atm` (ISS `iss`, spacesuit `suit`), or
- an open range: `o2_min` (or more) and `pressure_atm_max` (or less) (`moon_base`, `rover`, `mars_base`).

Habitat ids are `iss`, `moon_base`, `rover`, `mars_base`, `suit` (underscores, not hyphens).
