import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, fetchSite, sendRsvp, type PublicSite as PublicSiteData } from '../api'
import InvitationView from '../components/InvitationView'
import type { Invitation, RsvpChoice } from '../types'

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; site: PublicSiteData }
  | { status: 'missing' }
  | { status: 'expired' }
  | { status: 'offline' }

export default function PublicSite() {
  const { publicId = '' } = useParams()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [rsvp, setChoice] = useState<RsvpChoice>(null)
  const [rsvpError, setRsvpError] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    setState({ status: 'loading' })
    fetchSite(publicId)
      .then((site) => {
        if (cancel) return
        setState({ status: 'ready', site })
        setChoice(site.rsvp)
      })
      .catch((error: unknown) => {
        if (cancel) return
        if (error instanceof ApiError && error.status === 410) setState({ status: 'expired' })
        else if (error instanceof ApiError && error.status === 404) setState({ status: 'missing' })
        else setState({ status: 'offline' })
      })
    return () => {
      cancel = true
    }
  }, [publicId])

  useEffect(() => {
    if (state.status !== 'ready') return
    const title = state.site.invitation.title.trim()
    document.title = title || 'Приглашение'
  }, [state])

  async function chooseRsvp(choice: RsvpChoice) {
    setChoice(choice)
    setRsvpError(null)
    try {
      await sendRsvp(publicId, choice)
    } catch {
      setRsvpError('Ответ не сохранился. Проверьте связь и нажмите ещё раз.')
    }
  }

  if (state.status === 'loading') {
    return (
      <main className="missing">
        <h1>Открываем приглашение</h1>
        <p>Страница загружается с сервера.</p>
      </main>
    )
  }

  if (state.status === 'expired') {
    return (
      <main className="missing">
        <h1>Срок ссылки истёк</h1>
        <p>Сайт хранился месяц и уже удалён.</p>
        <Link to="/">На главную</Link>
      </main>
    )
  }

  if (state.status === 'offline') {
    return (
      <main className="missing">
        <h1>Сервер недоступен</h1>
        <p>Не получилось открыть приглашение. Попробуйте ещё раз чуть позже.</p>
        <Link to="/">На главную</Link>
      </main>
    )
  }

  if (state.status === 'missing') {
    return (
      <main className="missing">
        <h1>Ссылка не найдена</h1>
        <p>Такого приглашения нет. Проверьте адрес или попросите новую ссылку.</p>
        <Link to="/">На главную</Link>
      </main>
    )
  }

  const invitation = { ...state.site.invitation, id: publicId, createdAt: '', updatedAt: '' } as Invitation

  return (
    <div className="public-site">
      <InvitationView invitation={invitation} rsvp={rsvp} onRsvp={chooseRsvp} />
      {rsvpError ? <p className="public-rsvp-error">{rsvpError}</p> : null}
    </div>
  )
}
