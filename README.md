# Fire Safety Explorer

A dashboard over NASA PSI microgravity combustion investigations, built for the 2026 NASA Space Apps Challenge "Flame in Freefall". It lets you pick a crew habitat (ISS, Moon base, rover, Mars base, spacesuit), then browse, filter and compare investigations and see what the research does and does not cover.

## Run

```
npm install
npm run dev
npm run build
```

## Data

`data/investigations.json` is the team seed file (`meta`, `habitats`, `investigations`, `future`, `incidents`, `spinoffs`). `data/team_investigations.original.json` is the untouched copy. Records with a `psi_id` also carry a `psi_link` and, where PSI text stated them, filled values listed in `psi_filled`.

`npm run hints` reads a saved PSI response in `data/psi_raw.json` and writes `data/psi_hints.md`, sentences a person can check before filling values by hand.

## Use of AI (disclosure)

This project used AI assistance (Claude by Anthropic) for code and for drafting data records from public PSI text. All data should be checked against the linked NASA PSI record. AI-generated content is flagged in `meta.ai_note` in the JSON.

## Credits

Data: NASA Physical Sciences Informatics. This project is not endorsed by NASA.
