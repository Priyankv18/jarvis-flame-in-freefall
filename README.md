# JARVIS: Flame in Freefall

**Team JARVIS, NASA Space Apps Challenge 2026.** A dashboard that summarizes, ranks and interprets NASA microgravity combustion investigations from the Physical Sciences Informatics (PSI) database, to give fire safety insights for spacecraft, the ISS, a Moon Base and pressurized rovers.

## Features (in progress)
- **Catalogue**: every investigation with fuel, test conditions, hardware and safety role.
- **Ranking**: pick a crew environment and see which investigations matter most, with a transparent score breakdown.
- **Gap map**: tested oxygen and pressure vs where crews will actually live. The empty space is the research gap.
- **Ask JARVIS**: questions answered only from our dataset, with cited investigation ids.

## Run it
```bash
npm install
npm run dev          # app at http://localhost:5173 (no /api)
npx vercel dev       # app + /api/ask together
```
Copy `.env.example` to `.env.local` and add the LLM key. Never commit it.

## Data sources
- [NASA PSI Data Repository: Combustion Science](https://psi.nasa.gov/physci/repo/search?q=combustion)
- [A Researcher's Guide to ISS Combustion Science (2015)](https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/)
- [NASA Combustion Science](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/)
- NASA lessons learned: Apollo 1, Apollo 13, Mir fire. NASA Spinoff articles on firefighter gear and smoke detection.

## Use of SI (AI)
This project was built with SI assistance (Claude) for planning, code scaffolding and compiling the seed dataset from public NASA sources. All AI-assisted data was checked by the team; unknown values are left empty rather than estimated. The app itself uses an LLM to answer questions, grounded in and citing our dataset.

## Team
Arjun (AI), Hargun (data), Priyank (scoring and visuals), Pranav (frontend), and our story and submission lead.
