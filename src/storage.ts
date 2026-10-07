import { DEFAULT_RSVP_NO, DEFAULT_RSVP_NO_NOTE, DEFAULT_RSVP_YES, DEFAULT_RSVP_YES_NOTE, defaultSections } from './defaults'
import type { Invitation, Occasion, PhotoAlign, RsvpChoice, SectionId, Theme } from './types'
import { PHOTO_ALIGNS, SECTION_IDS, THEMES } from './types'

const DRAFTS_KEY = 'invitation-drafts'
const RSVP_KEY = 'invitation-rsvp'

const OCCASIONS: Occasion[] = ['date', 'walk']

function isOccasion(value: unknown): value is Occasion {
  return typeof value === 'string' && OCCASIONS.includes(value as Occasion)
}

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && THEMES.includes(value as Theme)
}

function isSectionId(value: unknown): value is SectionId {
  return typeof value === 'string' && SECTION_IDS.includes(value as SectionId)
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function readPhotoAlign(value: unknown): PhotoAlign {
  return typeof value === 'string' && PHOTO_ALIGNS.includes(value as PhotoAlign) ? (value as PhotoAlign) : 'center'
}

function readPhotoWidth(value: unknown): number {
  const width = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(width)) return 100
  return Math.min(100, Math.max(30, Math.round(width)))
}

function normalize(value: unknown): Invitation | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<Invitation>
  if (typeof raw.id !== 'string' || !isOccasion(raw.occasion)) return null

  const sections = Array.isArray(raw.sections)
    ? raw.sections.filter(isSectionId)
    : defaultSections(raw.occasion)
  const uniqueSections = sections.filter((sectionId, index) => sections.indexOf(sectionId) === index)

  return {
    id: raw.id,
    occasion: raw.occasion,
    theme: isTheme(raw.theme) ? raw.theme : raw.occasion === 'date' ? 'rose' : 'meadow',
    recipient: readString(raw.recipient),
    sender: readString(raw.sender),
    title: readString(raw.title),
    message: readString(raw.message),
    datetime: readString(raw.datetime),
    placeName: readString(raw.placeName),
    placeNote: readString(raw.placeNote),
    mapUrl: readString(raw.mapUrl),
    photoDataUrl: typeof raw.photoDataUrl === 'string' ? raw.photoDataUrl : null,
    photoAlign: readPhotoAlign(raw.photoAlign),
    photoWidth: readPhotoWidth(raw.photoWidth),
    rsvpYes: readString(raw.rsvpYes, DEFAULT_RSVP_YES),
    rsvpNo: readString(raw.rsvpNo, DEFAULT_RSVP_NO),
    rsvpYesNote: readString(raw.rsvpYesNote, DEFAULT_RSVP_YES_NOTE),
    rsvpNoNote: readString(raw.rsvpNoNote, DEFAULT_RSVP_NO_NOTE),
    sections: uniqueSections,
    createdAt: readString(raw.createdAt, new Date().toISOString()),
    updatedAt: readString(raw.updatedAt, new Date().toISOString()),
  }
}

function readDrafts(): Invitation[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      const invitation = normalize(item)
      return invitation ? [invitation] : []
    })
  } catch {
    return []
  }
}

export function listInvitations(): Invitation[] {
  return readDrafts().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getInvitation(id: string): Invitation | null {
  return readDrafts().find((item) => item.id === id) ?? null
}

export function saveInvitation(invitation: Invitation): void {
  const all = readDrafts()
  const index = all.findIndex((item) => item.id === invitation.id)
  const next = index >= 0 ? all.map((item, i) => (i === index ? invitation : item)) : [invitation, ...all]
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(next))
}

export function deleteInvitation(id: string): void {
  const next = readDrafts().filter((item) => item.id !== id)
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(next))
  const rsvp = readRsvpMap()
  if (id in rsvp) {
    delete rsvp[id]
    localStorage.setItem(RSVP_KEY, JSON.stringify(rsvp))
  }
}

function readRsvpMap(): Record<string, 'yes' | 'no'> {
  try {
    const raw = localStorage.getItem(RSVP_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const result: Record<string, 'yes' | 'no'> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (value === 'yes' || value === 'no') result[key] = value
    }
    return result
  } catch {
    return {}
  }
}

export function getRsvp(id: string): RsvpChoice {
  return readRsvpMap()[id] ?? null
}

export function setRsvp(id: string, choice: RsvpChoice): void {
  const map = readRsvpMap()
  if (choice === null) delete map[id]
  else map[id] = choice
  localStorage.setItem(RSVP_KEY, JSON.stringify(map))
}
