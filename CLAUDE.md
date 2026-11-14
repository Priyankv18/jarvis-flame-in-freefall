# Fire Safety Explorer

React + Vite + Tailwind static site. No backend.

## Rules
- Never run git or gh commands. The human does all git work.
- File ownership: Pranav owns App.jsx, Catalogue.jsx, Compare.jsx, src/lib/format.js. Priyank owns GapMap.jsx, ScoreTable.jsx, scoring.js. Arjun owns AskPanel.jsx, ai.js. Hargun owns data/investigations.json (final). Schema: ids are `id`, pillars are an array `pillars`, `relevance` is direct, secondary or indirect.
- Never rename JSON fields without telling the team.
- Do not invent data. A value not stated in the PSI record is null and the UI shows "unknown".
- Components receive props `{ investigations, habitat }`.
- No em dashes in code comments, docs or scripts.
- No NASA logos or mission identifiers. No secrets or logins in the repo.
- README must state AI assistance.
- Run `npm run build` after changes.
