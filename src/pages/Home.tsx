import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { removeSite, sitePath } from '../api'
import { createInvitation, OCCASION_LABEL, THEME_LABEL } from '../defaults'
import { formatExpires, formatUpdated } from '../format'
import { getPublication } from '../publications'
import { deleteInvitation, listInvitations, saveInvitation } from '../storage'
import type { Invitation, Occasion } from '../types'

export default function Home() {
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState<Invitation[]>(() => listInvitations())

  function create(occasion: Occasion) {
    const invitation = createInvitation(occasion)
    saveInvitation(invitation)
    navigate(`/edit/${invitation.id}`)
  }

  async function remove(id: string) {
    if (!window.confirm('Удалить этот черновик и ссылку на сайт?')) return
    const publication = getPublication(id)
    deleteInvitation(id)
    setDrafts(listInvitations())
    if (!publication) return
    try {
      await removeSite(id, publication)
    } catch {
      window.alert('Черновик удалён. Ссылка на сервере могла остаться до конца месяца.')
    }
  }

  return (
    <main className="home">
      <header className="home-hero">
        <p className="brand">Конструктор</p>
        <h1>Сайты-приглашения</h1>
        <p>Соберите страницу для свидания или прогулки и сразу посмотрите, как её откроют.</p>
      </header>

      <section className="occasion-grid" aria-label="Новое приглашение">
        <button type="button" className="occasion-card is-date" onClick={() => create('date')}>
          <span>Свидание</span>
          <strong>Вечер вдвоём</strong>
          <em>Письмо, место и время</em>
        </button>
        <button type="button" className="occasion-card is-walk" onClick={() => create('walk')}>
          <span>Прогулка</span>
          <strong>Выйти из дома</strong>
          <em>Лёгкий повод встретиться</em>
        </button>
      </section>

      <section className="drafts">
        <div className="section-heading">
          <h2>Черновики</h2>
          <p>Черновик в браузере. Опубликованная ссылка живёт 30 дней.</p>
        </div>
        {drafts.length === 0 ? (
          <p className="empty">Пока пусто. Выберите повод выше — страница сохранится сразу.</p>
        ) : (
          <ul className="draft-list">
            {drafts.map((draft) => {
              const publication = getPublication(draft.id)
              return (
                <li key={draft.id} className="draft-card">
                  <p className="draft-kicker">
                    {OCCASION_LABEL[draft.occasion]} · {THEME_LABEL[draft.theme]}
                  </p>
                  <h3>{draft.title.trim() || 'Без заголовка'}</h3>
                  <p className="draft-meta">
                    {publication
                      ? `Ссылка до ${formatExpires(publication.expiresAt)}`
                      : formatUpdated(draft.updatedAt)}
                  </p>
                  <div className="draft-actions">
                    {publication ? <Link to={sitePath(publication.publicId)}>Сайт</Link> : <Link to={`/preview/${draft.id}`}>Открыть</Link>}
                    <Link to={`/edit/${draft.id}`}>Править</Link>
                    <button type="button" onClick={() => remove(draft.id)}>
                      Удалить
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
