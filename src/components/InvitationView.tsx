import type { CSSProperties, ReactNode } from 'react'
import type { Invitation, RsvpChoice, SectionId } from '../types'
import { OCCASION_LABEL } from '../defaults'
import { formatWhen, safeMapUrl } from '../format'
import './InvitationView.css'

interface InvitationViewProps {
  invitation: Invitation
  rsvp: RsvpChoice
  onRsvp: (choice: RsvpChoice) => void
}

function textOrPlaceholder(value: string, placeholder: string) {
  const trimmed = value.trim()
  if (trimmed) return { text: trimmed, placeholder: false }
  return { text: placeholder, placeholder: true }
}

function Ornament() {
  return (
    <svg className="ornament" viewBox="0 0 140 16" aria-hidden="true">
      <path d="M8 8h48M84 8h48" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="70" cy="8" r="2.4" fill="currentColor" />
      <circle cx="70" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

function Hero({ invitation }: { invitation: Invitation }) {
  const recipient = invitation.recipient.trim()
  const title = invitation.title.trim()
  const sender = invitation.sender.trim()

  return (
    <header className="invite-hero">
      <p className="eyebrow">{OCCASION_LABEL[invitation.occasion]}</p>
      <Ornament />
      {recipient ? <p>для {recipient}</p> : null}
      {title ? <h1>{title}</h1> : null}
      {sender ? <p className="sender">от {sender}</p> : null}
    </header>
  )
}

function Message({ invitation }: { invitation: Invitation }) {
  const message = textOrPlaceholder(invitation.message, 'Здесь будет письмо — несколько тёплых фраз, ради которых и собирается страница.')
  return (
    <section className="invite-block">
      <h2>Письмо</h2>
      <p className={`letter ${message.placeholder ? 'is-placeholder' : ''}`}>{message.text}</p>
    </section>
  )
}

function When({ invitation }: { invitation: Invitation }) {
  const when = formatWhen(invitation.datetime)
  return (
    <section className="invite-block">
      <h2>Когда</h2>
      <p className={`when-line ${when ? '' : 'is-placeholder'}`}>{when ?? 'Дата ещё не выбрана'}</p>
    </section>
  )
}

function Where({ invitation }: { invitation: Invitation }) {
  const place = textOrPlaceholder(invitation.placeName, 'Место встречи')
  const note = invitation.placeNote.trim()
  const map = safeMapUrl(invitation.mapUrl)

  return (
    <section className="invite-block">
      <h2>Где</h2>
      <p className={`place-name ${place.placeholder ? 'is-placeholder' : ''}`}>{place.text}</p>
      {note ? <p className="place-note">{note}</p> : null}
      {map ? (
        <a className="map-link" href={map} target="_blank" rel="noreferrer">
          Открыть карту
        </a>
      ) : null}
    </section>
  )
}

function Photo({ invitation }: { invitation: Invitation }) {
  return (
    <section
      className={`invite-block invite-photo is-${invitation.photoAlign}`}
      style={{ '--photo-width': `${invitation.photoWidth}%` } as CSSProperties}
    >
      <h2>Фото</h2>
      {invitation.photoDataUrl ? (
        <img src={invitation.photoDataUrl} alt="" />
      ) : (
        <div className="photo-placeholder">Здесь будет фото</div>
      )}
    </section>
  )
}

function Rsvp({
  invitation,
  choice,
  onRsvp,
}: {
  invitation: Invitation
  choice: RsvpChoice
  onRsvp: (choice: RsvpChoice) => void
}) {
  const yes = invitation.rsvpYes.trim()
  const no = invitation.rsvpNo.trim()
  const yesNote = invitation.rsvpYesNote.trim()
  const noNote = invitation.rsvpNoNote.trim()

  return (
    <section className="invite-block invite-rsvp">
      <h2>Ты придёшь?</h2>
      <div className="rsvp-actions">
        {yes ? (
          <button
            type="button"
            className={choice === 'yes' ? 'is-on' : undefined}
            onClick={() => onRsvp(choice === 'yes' ? null : 'yes')}
          >
            {yes}
          </button>
        ) : null}
        {no ? (
          <button
            type="button"
            className={choice === 'no' ? 'is-on' : undefined}
            onClick={() => onRsvp(choice === 'no' ? null : 'no')}
          >
            {no}
          </button>
        ) : null}
      </div>
      {choice === 'yes' && yes && yesNote ? <p className="rsvp-note">{yesNote}</p> : null}
      {choice === 'no' && no && noNote ? <p className="rsvp-note">{noNote}</p> : null}
    </section>
  )
}

const RENDERERS: Record<SectionId, (props: InvitationViewProps) => ReactNode> = {
  hero: ({ invitation }) => <Hero invitation={invitation} />,
  message: ({ invitation }) => <Message invitation={invitation} />,
  when: ({ invitation }) => <When invitation={invitation} />,
  where: ({ invitation }) => <Where invitation={invitation} />,
  photo: ({ invitation }) => <Photo invitation={invitation} />,
  rsvp: ({ invitation, rsvp, onRsvp }) => <Rsvp invitation={invitation} choice={rsvp} onRsvp={onRsvp} />,
}

export default function InvitationView({ invitation, rsvp, onRsvp }: InvitationViewProps) {
  return (
    <div className="invite-page" data-theme={invitation.theme}>
      <article className="invite">
        {invitation.sections.map((sectionId) => (
          <div key={sectionId}>{RENDERERS[sectionId]({ invitation, rsvp, onRsvp })}</div>
        ))}
      </article>
    </div>
  )
}
