// Reads data/psi_raw.json (a saved PSI search response) and data/investigations.json.
// Writes data/psi_hints.md listing candidate sentences that mention oxygen, pressure
// or flow near a number. It never writes values into investigations.json: a human
// reads each sentence and decides.
import fs from 'node:fs'

const rawPath = 'data/psi_raw.json'
if (!fs.existsSync(rawPath)) {
  console.error('Missing data/psi_raw.json. Save the PSI search JSON there first.')
  process.exit(1)
}
const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'))
const hits = raw?.hits?.hits ?? []
const terms = /(oxygen|O2|pressure|atm|psi|flow|velocity|cm\/s|diluent|nitrogen|helium)/i
const hasNumber = /\d/

let out = '# PSI hints (candidates only, verify by reading)\n\n'
for (const h of hits) {
  const s = h._source ?? {}
  const id = s.Accession ?? s.accession ?? 'unknown'
  const text = [s.Objectives, s.Approach, s.Hypothesis].filter(Boolean).join(' ')
  const sentences = text.split(/(?<=[.!?])\s+/).filter((x) => terms.test(x) && hasNumber.test(x))
  if (!sentences.length) continue
  out += `## ${id} ${s.Acronym ?? ''}\n`
  sentences.forEach((x) => (out += `- ${x}\n`))
  out += '\n'
}
fs.writeFileSync('data/psi_hints.md', out)
console.log('Wrote data/psi_hints.md')
