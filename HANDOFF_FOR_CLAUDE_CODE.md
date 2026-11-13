# Handoff: Team JARVIS, Flame in Freefall (NASA Space Apps 2026)

Paste this into Claude Code after connecting the repo. It summarises everything decided so far.

## Who I am
Priyank, **scoring and visuals lead** on Team JARVIS (5 people, Hamilton NZ local event). My files: `src/lib/scoring.js`, `src/components/ScoreTable.jsx`, `src/components/GapMap.jsx`. Do not edit other people's files without asking them (see `TEAM_BRIEF.md`).

## The challenge
Build an SI (AI) powered web dashboard that **summarizes, ranks and interprets** NASA microgravity combustion investigations from the PSI database (psi.nasa.gov) to give fire safety insights for crew habitats: spacecraft, ISS, Moon Base, pressurized rovers, Mars.
- Moon Base and rovers: likely **30%+ O2 at 10.2 psi or less**. Spacesuit: 100% O2 at 4.3 psi. Earth / ISS: about 21% O2 at 14.7 psi.
- Highest-O2 microgravity tests: ACME CFI-G, up to 85% O2.
- No partial-gravity data in PSI yet (LUCI, FM2 planned). Microgravity and 1-g results bound it. E-FIELD Flames mimicked partial gravity.
- Key investigations: BASS, BASS-II, Saffire I-VI (solids flammability); SAME, SAME-R, DAFT (smoke detection); FLEX, FLEX-2 (suppression with CO2/He); CFI and six ACME experiments incl. BRE, CFI-G, E-FIELD; SPICE, SLICE.
- PSI has no public API and loads with JavaScript; values come from PSI pages, NASA fact sheets and the 2015 Researcher's Guide to Combustion Science.

## Product plan
1. **Catalogue**: table of ~21 investigations with fuel, O2/pressure/flow, hardware, measurements, safety pillar (prevention / detection / suppression), findings, PSI link.
2. **Ranking (my part)**: user picks a habitat; each investigation gets a transparent 0-100 score (weighted sum: oxygen overlap, fuel type, safety pillar, direct relevance). Show the breakdown and let users adjust weights.
3. **Gap map (my part, the key pitch visual)**: plot every investigation's tested O2 vs pressure (or flow) range as a box, overlay habitat operating zones (Moon Base highlighted). Empty space = research gaps. Unknown values are shown as unknown, never guessed.
4. **Ask JARVIS** (Arjun): LLM answers only from our dataset and cites investigation ids, via a Vercel serverless route `api/ask.js`.
5. Stretch: history panel (Apollo 1, Apollo 13, Mir, Artemis II smoke alarm), Earth spinoffs (water mist, smoke detector, firefighter air tanks and clothing).

## Tech
Vite + React 18 + Recharts, static JSON data (`src/data/investigations.json`), Vercel deploy, `api/ask.js` serverless function, API key in `.env.local` / Vercel env vars only. The starter scaffold is already in the repo and builds; every tab renders.

## Data status
`src/data/investigations.json` is a **4-record placeholder**. Hargun will replace it with the 21-investigation seed dataset that Arjun's Claude chat already produced. That file may use slightly different field names (it was described with `pressure` and `flow_speed` single fields). When it lands, check the field names and adapt `scoring.js` and `GapMap.jsx` to match, then update `TEAM_BRIEF.md`. Many O2/pressure/flow values are still null.

## Team, branches, schedule
- Hargun: data (`data-hargun`). Pranav: frontend, merges, deploy (`frontend-pranav`). Priyank: scoring + visuals (`viz-priyank`). Arjun: AI (`ai-arjun`). 5th member: story, slides, submission text.
- Checkpoints: Sat 1 PM, Sat 5:30 PM, Sat ~9 PM merges; Sun 12 PM feature freeze; Sun 2 PM final submit; Sun 3 PM back on campus; Sun 4 PM local judging (5-7 min pitch); **Sun 11:59 PM NZ global deadline**.

## Submission rules that affect the build
- Demo: **30 s video with English subtitles** or **max 7 slides**. Demo and project links must be public (test in incognito).
- Use of SI must be disclosed: name tools and how. AI-generated images/video need a visible "AI-generated" watermark. AI-generated code/data acknowledged in README and JSON metadata. No NASA logos, flags or mission identifiers.
- Judging criteria (unweighted): Influence, Creativity, Validity, Relevance, Presentation. Local judges include an AI engineer (grounding / hallucination questions) and a science educator (method and limits).

## What I want next
Help me build the ranking with weight sliders and score-breakdown bars, then the gap map with range boxes and the Moon Base zone highlighted, on branch `viz-priyank`.
