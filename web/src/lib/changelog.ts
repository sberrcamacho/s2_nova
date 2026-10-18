import raw from '@/lib/changelog.json'
import type { User } from '@/types'

// "Novedades": what changed in each version, newest first. Written by
// scripts/gen-changelog.mjs from scripts/changelog.json (never edit
// changelog.json by hand); each item's image is a capture of the feature in
// src/assets/whatsnew/<image>-light|dark.webp.

export interface LocalizedText {
  es: string
  en: string
}

export interface ChangelogItem {
  image: string
  title: LocalizedText
  body: LocalizedText
}

export interface ChangelogVersion {
  version: string
  date: string // YYYY-MM-DD
  items: ChangelogItem[]
  also: LocalizedText[]
}

export const CHANGELOG: ChangelogVersion[] = raw.versions.map((v) => ({ ...v, also: v.also ?? [] }))

const IMAGES = import.meta.glob('../assets/whatsnew/*.webp', { eager: true, import: 'default' }) as Record<string, string>

export function changelogImage(key: string, theme: 'light' | 'dark'): string | undefined {
  return IMAGES[`../assets/whatsnew/${key}-${theme}.webp`]
}

const SEEN_KEY = 's2nova.whatsNewSeen'

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

export function markWhatsNewSeen(version: string = CHANGELOG[0]?.version ?? ''): void {
  try {
    localStorage.setItem(SEEN_KEY, version)
  } catch {
    // Private mode: it shows again next time, which is harmless.
  }
}

// The newest version's Novedades, once per browser. An account created on
// or after that release has nothing "new" to see (its tours come first),
// and the example account doesn't get it either.
export function pendingWhatsNew(user: Pick<User, 'isGuest' | 'memberSince'> | null): ChangelogVersion | null {
  const latest = CHANGELOG[0]
  if (!latest || !user || user.isGuest) return null
  const seen = readSeen()
  if (seen === latest.version) return null
  if (seen === null && user.memberSince >= latest.date) {
    markWhatsNewSeen(latest.version)
    return null
  }
  return latest
}
