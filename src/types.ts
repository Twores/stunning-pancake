export type Occasion = 'date' | 'walk'

export type Theme = 'rose' | 'night' | 'meadow'

export type SectionId = 'hero' | 'message' | 'when' | 'where' | 'photo' | 'rsvp'

export type RsvpChoice = 'yes' | 'no' | null

export type PhotoAlign = 'left' | 'center' | 'right'

export const PHOTO_ALIGNS: PhotoAlign[] = ['left', 'center', 'right']

export const SECTION_IDS: SectionId[] = ['hero', 'message', 'when', 'where', 'photo', 'rsvp']

export const THEMES: Theme[] = ['rose', 'night', 'meadow']

export interface Invitation {
  id: string
  occasion: Occasion
  theme: Theme
  recipient: string
  sender: string
  title: string
  message: string
  datetime: string
  placeName: string
  placeNote: string
  mapUrl: string
  photoDataUrl: string | null
  photoAlign: PhotoAlign
  photoWidth: number
  rsvpYes: string
  rsvpNo: string
  rsvpYesNote: string
  rsvpNoNote: string
  sections: SectionId[]
  createdAt: string
  updatedAt: string
}
