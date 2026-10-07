export interface Publication {
  publicId: string
  editToken: string
  expiresAt: string
}

const KEY = 'invitation-publications'

function readAll(): Record<string, Publication> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const result: Record<string, Publication> = {}
    for (const [localId, value] of Object.entries(parsed)) {
      if (!value || typeof value !== 'object') continue
      const item = value as Partial<Publication>
      if (typeof item.publicId === 'string' && typeof item.editToken === 'string' && typeof item.expiresAt === 'string') {
        result[localId] = { publicId: item.publicId, editToken: item.editToken, expiresAt: item.expiresAt }
      }
    }
    return result
  } catch {
    return {}
  }
}

export function getPublication(localId: string): Publication | null {
  return readAll()[localId] ?? null
}

export function rememberPublication(localId: string, publication: Publication): void {
  const all = readAll()
  all[localId] = publication
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function forgetPublication(localId: string): void {
  const all = readAll()
  if (!(localId in all)) return
  delete all[localId]
  localStorage.setItem(KEY, JSON.stringify(all))
}
