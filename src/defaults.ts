import type { Invitation, Occasion, PhotoAlign, SectionId, Theme } from './types'

export const OCCASION_LABEL: Record<Occasion, string> = {
  date: 'Свидание',
  walk: 'Прогулка',
}

export const THEME_LABEL: Record<Theme, string> = {
  rose: 'Романтичная',
  night: 'Вечерняя',
  meadow: 'Парковая',
}

export const PHOTO_ALIGN_LABEL: Record<PhotoAlign, string> = {
  left: 'Слева',
  center: 'По центру',
  right: 'Справа',
}

export const DEFAULT_RSVP_YES = 'Приду'
export const DEFAULT_RSVP_NO = 'Не смогу'
export const DEFAULT_RSVP_YES_NOTE = 'Здорово. Я буду ждать.'
export const DEFAULT_RSVP_NO_NOTE = 'Жаль. Если передумаешь — кнопка «Приду» всё ещё здесь.'

export const SECTION_LABEL: Record<SectionId, string> = {
  hero: 'Обложка',
  message: 'Письмо',
  when: 'Когда',
  where: 'Где',
  photo: 'Фото',
  rsvp: 'Ответ',
}

const DATE_SECTIONS: SectionId[] = ['hero', 'message', 'photo', 'when', 'where', 'rsvp']
const WALK_SECTIONS: SectionId[] = ['hero', 'message', 'when', 'where', 'photo', 'rsvp']

function contentFor(occasion: Occasion): Pick<
  Invitation,
  | 'theme'
  | 'recipient'
  | 'sender'
  | 'title'
  | 'message'
  | 'datetime'
  | 'placeName'
  | 'placeNote'
  | 'mapUrl'
  | 'photoDataUrl'
  | 'sections'
> {
  if (occasion === 'date') {
    return {
      theme: 'rose',
      recipient: 'тебя',
      sender: 'меня',
      title: 'Один вечер, только мы',
      message:
        'Не хочу оставлять это коротким сообщением. Если этот вечер свободен — я уже знаю место: тихое, вкусное и без спешки.',
      datetime: '2026-10-10T19:00',
      placeName: 'Маленький зал на набережной',
      placeNote: 'Столик держу в голове. Адрес пришлю, как скажешь да.',
      mapUrl: '',
      photoDataUrl: null,
      sections: [...DATE_SECTIONS],
    }
  }

  return {
    theme: 'meadow',
    recipient: 'тебя',
    sender: 'меня',
    title: 'Пойдём, пока не стемнело',
    message:
      'Без расписания на весь день. Улицы, кофе навынос и разговор, который не хочется обрывать на полуслове.',
    datetime: '2026-10-11T15:00',
    placeName: 'Главный вход в парк',
    placeNote: 'Если пойдёт дождь, свернём в ближайшую кофейню.',
    mapUrl: '',
    photoDataUrl: null,
    sections: [...WALK_SECTIONS],
  }
}

export function createInvitation(occasion: Occasion): Invitation {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    occasion,
    ...contentFor(occasion),
    photoAlign: 'center',
    photoWidth: 100,
    rsvpYes: DEFAULT_RSVP_YES,
    rsvpNo: DEFAULT_RSVP_NO,
    rsvpYesNote: DEFAULT_RSVP_YES_NOTE,
    rsvpNoNote: DEFAULT_RSVP_NO_NOTE,
    createdAt: now,
    updatedAt: now,
  }
}

export function defaultSections(occasion: Occasion): SectionId[] {
  return occasion === 'date' ? [...DATE_SECTIONS] : [...WALK_SECTIONS]
}
