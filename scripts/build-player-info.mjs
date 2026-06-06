// Best-effort player info (katakana name + photo + height + date of birth) for
// every squad player, sourced from Wikidata. No football API gives katakana or
// free photos for the 2026 squads, so this reuses Wikidata: resolve each name to
// a footballer entity (precision filter on the English description), then one
// SPARQL pass pulls ja label (P:label), image (P18), height (P2048), DOB (P569).
// Partial by design — famous players are covered, fringe players fall back to
// English name and no photo.
//
//   node scripts/build-player-info.mjs
//
// Writes src/data/playerInfoJa.ts (committed; no runtime Wikidata dependency).
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')
const { squads } = await import(path.join(root, 'src', 'data', 'squads.ts'))

const UA = 'wc2026-trapelko-playerinfo/1.0 (https://github.com/naotaxy/worldcup-trapelko-app)'
const FOOTBALL = /foot|soccer/i
const names = [...new Set(Object.values(squads).flatMap((list) => list.map((p) => p.name)))]
console.log(`unique players: ${names.length}`)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url, headers = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json', ...headers } })
      if (res.status === 429) {
        await sleep(1500 * (attempt + 1))
        continue
      }
      if (!res.ok) return null
      return await res.json()
    } catch {
      await sleep(500)
    }
  }
  return null
}

// Step 1: resolve name -> footballer Wikidata id.
async function resolveId(name) {
  const url =
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&uselang=en&type=item&limit=6&search=` +
    encodeURIComponent(name)
  const data = await getJson(url)
  const hit = (data?.search || []).find((h) => FOOTBALL.test(h.description || ''))
  return hit ? hit.id : null
}

const idByName = {}
const nameById = {}
let cursor = 0
let resolved = 0
async function worker() {
  while (cursor < names.length) {
    const i = cursor++
    const name = names[i]
    const id = await resolveId(name)
    if (id) {
      idByName[name] = id
      nameById[id] = name
      resolved += 1
    }
    if (i % 100 === 0) console.log(`  resolve ${i}/${names.length} (footballers: ${resolved})`)
    await sleep(35)
  }
}
await Promise.all(Array.from({ length: 6 }, worker))
console.log(`resolved entities: ${resolved}`)

// Step 2: one SPARQL pass per chunk for label(ja)/image/height/dob.
const ids = [...new Set(Object.values(idByName))]
const info = {} // id -> {ja, photo, heightCm, dob}
async function sparqlChunk(chunk) {
  const values = chunk.map((id) => `wd:${id}`).join(' ')
  const query = `SELECT ?item ?ja ?image ?height ?dob WHERE {
    VALUES ?item { ${values} }
    OPTIONAL { ?item wdt:P18 ?image. }
    OPTIONAL { ?item wdt:P2048 ?height. }
    OPTIONAL { ?item wdt:P569 ?dob. }
    OPTIONAL { ?item rdfs:label ?ja. FILTER(LANG(?ja)="ja") }
  }`
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch('https://query.wikidata.org/sparql', {
        method: 'POST',
        headers: {
          'user-agent': UA,
          accept: 'application/sparql-results+json',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ query }).toString(),
      })
      if (res.status === 429) {
        await sleep(2000 * (attempt + 1))
        continue
      }
      if (!res.ok) return
      const data = await res.json()
      for (const row of data.results.bindings) {
        const id = row.item.value.split('/').pop()
        const entry = info[id] || {}
        if (row.ja && !entry.ja) entry.ja = row.ja.value
        if (row.image && !entry.photo) {
          entry.photo = `${row.image.value.replace(/^http:/, 'https:')}?width=240`
        }
        if (row.height && entry.heightCm == null) {
          let h = Number(row.height.value)
          if (h > 0 && h < 3) h = h * 100 // some entities store height in meters (1.69)
          h = Math.round(h)
          if (h >= 140 && h <= 220) entry.heightCm = h // drop implausible values -> blank
        }
        if (row.dob && !entry.dob) entry.dob = row.dob.value.slice(0, 10)
        info[id] = entry
      }
      return
    } catch {
      await sleep(800)
    }
  }
}

for (let i = 0; i < ids.length; i += 200) {
  await sparqlChunk(ids.slice(i, i + 200))
  console.log(`  sparql ${Math.min(i + 200, ids.length)}/${ids.length}`)
  await sleep(200)
}

// Build name -> info map (only non-empty entries).
const out = {}
for (const name of names) {
  const id = idByName[name]
  if (!id) continue
  const entry = info[id]
  if (!entry) continue
  const record = {}
  if (entry.ja) record.ja = entry.ja
  if (entry.photo) record.photo = entry.photo
  if (entry.heightCm) record.heightCm = entry.heightCm
  if (entry.dob) record.dob = entry.dob
  if (Object.keys(record).length > 0) out[name] = record
}

const sorted = Object.keys(out)
  .sort((a, b) => a.localeCompare(b))
  .reduce((acc, key) => ({ ...acc, [key]: out[key] }), {})

const withJa = Object.values(sorted).filter((r) => r.ja).length
const withPhoto = Object.values(sorted).filter((r) => r.photo).length
const withHeight = Object.values(sorted).filter((r) => r.heightCm).length
const withDob = Object.values(sorted).filter((r) => r.dob).length

const ts =
  `// AUTO-GENERATED by scripts/build-player-info.mjs from Wikidata.\n` +
  `// Partial by design (famous players covered). ja=katakana name, photo=Commons\n` +
  `// thumbnail URL, heightCm, dob (YYYY-MM-DD, age computed at display time).\n` +
  `// Coverage: name ${withJa}, photo ${withPhoto}, height ${withHeight}, dob ${withDob} of ${names.length}.\n` +
  `export type PlayerInfo = { ja?: string; photo?: string; heightCm?: number; dob?: string }\n` +
  `export const playerInfoJa: Record<string, PlayerInfo> = ${JSON.stringify(sorted, null, 2)}\n`

await writeFile(path.join(root, 'src', 'data', 'playerInfoJa.ts'), ts, 'utf8')
console.log(`\nDONE -> src/data/playerInfoJa.ts | ja:${withJa} photo:${withPhoto} height:${withHeight} dob:${withDob} / ${names.length}`)
