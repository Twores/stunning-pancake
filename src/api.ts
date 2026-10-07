import { forgetPublication, rememberPublication, type Publication } from './publications'
import type { Invitation, RsvpChoice } from './types'

export class ApiError extends Error {
  status: number

  constructor(status: number) {
    super(String(status))
    this.status = status
  }
}

export interface PublicSite {
  invitation: Omit<Invitation, 'id' | 'createdAt' | 'updatedAt'>
  expiresAt: string
  rsvp: RsvpChoice
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })
  } catch {
    throw new ApiError(0)
  }
  if (!response.ok && response.status !== 204) throw new ApiError(response.status)
  return response
}

export function sitePath(publicId: string): string {
  return `/s/${publicId}`
}

export async function publishSite(invitation: Invitation): Promise<Publication> {
  const response = await request('/api/sites', {
    method: 'POST',
    body: JSON.stringify(invitation),
  })
  const body = (await response.json()) as Partial<Publication>
  if (!body.publicId || !body.editToken || !body.expiresAt) throw new ApiError(500)
  const publication = { publicId: body.publicId, editToken: body.editToken, expiresAt: body.expiresAt }
  rememberPublication(invitation.id, publication)
  return publication
}

export async function updateSite(publication: Publication, invitation: Invitation): Promise<void> {
  await request(`/api/sites/${publication.publicId}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${publication.editToken}` },
    body: JSON.stringify(invitation),
  })
}

export async function removeSite(localId: string, publication: Publication): Promise<void> {
  try {
    await request(`/api/sites/${publication.publicId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${publication.editToken}` },
    })
  } finally {
    forgetPublication(localId)
  }
}

export async function fetchSite(publicId: string): Promise<PublicSite> {
  const response = await request(`/api/sites/${publicId}`)
  return (await response.json()) as PublicSite
}

export async function sendRsvp(publicId: string, choice: RsvpChoice): Promise<void> {
  await request(`/api/sites/${publicId}/rsvp`, {
    method: 'POST',
    body: JSON.stringify({ choice }),
  })
}
