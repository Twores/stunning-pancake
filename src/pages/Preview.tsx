import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import InvitationView from '../components/InvitationView'
import { getInvitation, getRsvp, setRsvp } from '../storage'
import type { Invitation, RsvpChoice } from '../types'

export default function Preview() {
  const { id = '' } = useParams()
  const [invite, setInvite] = useState<Invitation | null>(() => getInvitation(id))
  const [rsvp, setChoice] = useState<RsvpChoice>(() => getRsvp(id))

  useEffect(() => {
    setInvite(getInvitation(id))
    setChoice(getRsvp(id))
  }, [id])

  useEffect(() => {
    const title = invite?.title.trim()
    document.title = title || 'Приглашение'
  }, [invite?.title])

  function chooseRsvp(choice: RsvpChoice) {
    if (!id) return
    setRsvp(id, choice)
    setChoice(choice)
  }

  if (!invite) {
    return (
      <main className="missing">
        <h1>Приглашение не найдено</h1>
        <p>В этом браузере нет такой страницы.</p>
        <Link to="/app">К черновикам</Link>
      </main>
    )
  }

  return (
    <div className="preview-screen">
      <div className="preview-banner">
        <span>Предпросмотр</span>
        <Link to={`/edit/${invite.id}`}>Вернуться к правке</Link>
      </div>
      <InvitationView invitation={invite} rsvp={rsvp} onRsvp={chooseRsvp} />
    </div>
  )
}
