#!/usr/bin/env node
// "Novedades" for both clients, described once in scripts/changelog.json.
// Writes the same JSON to web/src/lib/changelog.json and
// android/app/src/main/assets/changelog.json; never edit those by hand.
//
//   node scripts/gen-changelog.mjs
//
// Every item names an image; each client keeps its own capture of that
// feature in light and dark:
//   web/src/assets/whatsnew/<image>-light.webp, <image>-dark.webp
//   android/app/src/main/res/drawable-nodpi/whatsnew_<image>_light.webp, ..._dark.webp
// (Android also maps the name to the resource in ui/screens/whatsnew/WhatsNew.kt,
// so R8 keeps it.) The script fails when one is missing.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = JSON.parse(readFileSync(join(root, 'scripts/changelog.json'), 'utf8'))
const { versions } = source

const problems = []
const seen = new Set()
for (const v of versions) {
  if (!/^\d+\.\d+\.\d+$/.test(v.version)) problems.push(`${v.version}: version must be x.y.z`)
  if (seen.has(v.version)) problems.push(`${v.version}: listed twice`)
  seen.add(v.version)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) problems.push(`${v.version}: date must be YYYY-MM-DD`)
  for (const item of v.items) {
    for (const field of ['title', 'body']) {
      if (!item[field]?.es || !item[field]?.en) problems.push(`${v.version} ${item.image}: ${field} needs es and en`)
    }
    for (const theme of ['light', 'dark']) {
      const web = join(root, `web/src/assets/whatsnew/${item.image}-${theme}.webp`)
      const android = join(root, `android/app/src/main/res/drawable-nodpi/whatsnew_${item.image}_${theme}.webp`)
      if (!existsSync(web)) problems.push(`missing ${web}`)
      if (!existsSync(android)) problems.push(`missing ${android}`)
    }
  }
  for (const line of v.also ?? []) if (!line.es || !line.en) problems.push(`${v.version}: an "also" line needs es and en`)
}
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}

const out = JSON.stringify({ versions }, null, 2) + '\n'
writeFileSync(join(root, 'web/src/lib/changelog.json'), out)
writeFileSync(join(root, 'android/app/src/main/assets/changelog.json'), out)
console.log(`changelog: ${versions.length} versions written to both clients`)
