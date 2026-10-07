import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, fetchSite, publishSite, sitePath, updateSite } from '../api'
import InvitationView from '../components/InvitationView'
import { SECTION_LABEL, THEME_LABEL, PHOTO_ALIGN_LABEL } from '../defaults'
import { formatExpires } from '../format'
import { forgetPublication, getPublication, type Publication } from '../publications'
import { getInvitation, getRsvp, saveInvitation, setRsvp } from '../storage'
import { PHOTO_ALIGNS, SECTION_IDS, THEMES, type Invitation, type RsvpChoice, type SectionId } from '../types'

const PHOTO_WARN_BYTES = 700 * 1024

function moveSection(sections: SectionId[], id: SectionId, direction: -1 | 1): SectionId[] {
  const index = sections.indexOf(id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= sections.length) return sections
  const next = sections.slice()
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export default function Editor() {
  const { id = '' } = useParams()
  const [invite, setInvite] = useState<Invitation | null>(() => getInvitation(id))
  const [rsvp, setChoice] = useState<RsvpChoice>(() => getRsvp(id))
  const [photoWarning, setPhotoWarning] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [publication, setPublication] = useState<Publication | null>(() => getPublication(id))
  const [linkState, setLinkState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [linkError, setLinkError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [remoteRsvp, setRemoteRsvp] = useState<RsvpChoice>(null)

  useEffect(() => {
    if (!invite) return
    try {
      saveInvitation(invite)
      setSaveError(null)
    } catch {
      setSaveError('Не удалось сохранить. Фото слишком большое для браузера — выберите снимок поменьше.')
    }
  }, [invite])

  useEffect(() => {
    const title = invite?.title.trim()
    document.title = title ? `${title} — правка` : 'Редактор приглашения'
  }, [invite?.title])

  useEffect(() => {
    if (!publication || !invite) return
    const current = invite
    const currentPublication = publication
    const timer = window.setTimeout(() => {
      setLinkState('saving')
      updateSite(currentPublication, current)
        .then(() => {
          setLinkState('idle')
          setLinkError(null)
        })
        .catch((error: unknown) => {
          if (error instanceof ApiError && error.status === 410) {
            forgetPublication(current.id)
            setPublication(null)
            setLinkError('Срок хранения истёк. Получите новую ссылку.')
          } else {
            setLinkError(error instanceof ApiError && error.status === 0 ? 'Сервер недоступен. Ссылка не обновилась.' : 'Не удалось обновить сайт по ссылке.')
          }
          setLinkState('error')
        })
    }, 700)
    return () => window.clearTimeout(timer)
  }, [invite, publication])

  useEffect(() => {
    if (!publication) return
    const publicId = publication.publicId
    let cancel = false
    function load() {
      fetchSite(publicId)
        .then((site) => {
          if (!cancel) setRemoteRsvp(site.rsvp)
        })
        .catch(() => {})
    }
    load()
    window.addEventListener('focus', load)
    return () => {
      cancel = true
      window.removeEventListener('focus', load)
    }
  }, [publication])

  async function publish() {
    if (!invite || publication) return
    setLinkState('saving')
    setLinkError(null)
    try {
      const next = await publishSite(invite)
      setPublication(next)
      setLinkState('idle')
    } catch (error: unknown) {
      setLinkState('error')
      setLinkError(error instanceof ApiError && error.status === 0 ? 'Сервер недоступен. Запустите его и попробуйте снова.' : 'Не удалось создать ссылку.')
    }
  }

  async function copyLink() {
    if (!publication) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${sitePath(publication.publicId)}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setLinkError('Не удалось скопировать. Выделите ссылку и скопируйте её вручную.')
      setLinkState('error')
    }
  }

  function update(patch: Partial<Invitation>) {
    setInvite((current) => (current ? { ...current, ...patch, updatedAt: new Date().toISOString() } : current))
  }

  function chooseRsvp(choice: RsvpChoice) {
    if (!invite) return
    setRsvp(invite.id, choice)
    setChoice(choice)
  }

  function onPhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPhotoWarning(file.size > PHOTO_WARN_BYTES)
    const reader = new FileReader()
    reader.onload = () => {
      update({ photoDataUrl: typeof reader.result === 'string' ? reader.result : null })
    }
    reader.readAsDataURL(file)
  }

  if (!invite) {
    return (
      <main className="missing">
        <h1>Черновик не найден</h1>
        <p>Его нет в этом браузере. Можно собрать новое приглашение.</p>
        <Link to="/app">К черновикам</Link>
      </main>
    )
  }

  const hidden = SECTION_IDS.filter((sectionId) => !invite.sections.includes(sectionId))

  return (
    <div className="editor">
      <header className="editor-bar">
        <Link to="/app" className="bar-back">
          Все приглашения
        </Link>
        <p className={saveError || linkState === 'error' ? 'save-status is-error' : 'save-status'}>
          {saveError ??
            (publication
              ? linkState === 'saving'
                ? 'Обновляю ссылку…'
                : linkState === 'error'
                  ? linkError
                  : `Ссылка действует до ${formatExpires(publication.expiresAt)}`
              : 'Черновик хранится в этом браузере')}
        </p>
        <Link className="bar-open" to={`/preview/${invite.id}`}>
          Открыть сайт
        </Link>
      </header>

      <div className="editor-body">
        <form className="editor-form" onSubmit={(event) => event.preventDefault()}>
          <fieldset>
            <legend>Ссылка на сайт</legend>
            {publication ? (
              <>
                <div className="share-row">
                  <input readOnly value={`${window.location.origin}${sitePath(publication.publicId)}`} aria-label="Ссылка на сайт" />
                  <button type="button" onClick={copyLink}>
                    {copied ? 'Скопировано' : 'Копировать'}
                  </button>
                </div>
                <p className="hint">
                  Страница открывается у получателя без черновика в браузере и хранится до {formatExpires(publication.expiresAt)}. Правки уходят на сервер сами.
                </p>
                <p className="hint">
                  {remoteRsvp === 'yes' ? 'По ссылке ответили: приду.' : remoteRsvp === 'no' ? 'По ссылке ответили: не смогу.' : 'Ответа по ссылке пока нет.'}
                </p>
              </>
            ) : (
              <>
                <button type="button" className="publish-btn" onClick={publish} disabled={linkState === 'saving'}>
                  {linkState === 'saving' ? 'Создаю ссылку…' : 'Получить ссылку'}
                </button>
                <p className="hint">Сайт сохранится на сервере на 30 дней. Этой ссылкой можно поделиться в Telegram, ВКонтакте, WhatsApp или MAX.</p>
                {linkError ? <p className="warn">{linkError}</p> : null}
              </>
            )}
          </fieldset>

          <fieldset>
            <legend>Тема</legend>
            <div className="themes">
              {THEMES.map((theme) => (
                <button
                  key={theme}
                  type="button"
                  className={invite.theme === theme ? 'theme-btn is-on' : 'theme-btn'}
                  onClick={() => update({ theme })}
                >
                  <span className={`swatch is-${theme}`} />
                  {THEME_LABEL[theme]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Обложка</legend>
            <Field label="Кому">
              <input
                value={invite.recipient}
                onChange={(event) => update({ recipient: event.target.value })}
                placeholder="тебя"
              />
            </Field>
            <Field label="Заголовок">
              <input
                value={invite.title}
                onChange={(event) => update({ title: event.target.value })}
                placeholder="Один вечер, только мы"
              />
            </Field>
            <Field label="От кого">
              <input
                value={invite.sender}
                onChange={(event) => update({ sender: event.target.value })}
                placeholder="меня"
              />
            </Field>
          </fieldset>

          <fieldset>
            <legend>Письмо</legend>
            <Field label="Текст">
              <textarea
                value={invite.message}
                onChange={(event) => update({ message: event.target.value })}
                rows={5}
              />
            </Field>
          </fieldset>

          <fieldset>
            <legend>Когда</legend>
            <Field label="Дата и время">
              <input
                type="datetime-local"
                value={invite.datetime}
                onChange={(event) => update({ datetime: event.target.value })}
              />
            </Field>
          </fieldset>

          <fieldset>
            <legend>Где</legend>
            <Field label="Место">
              <input
                value={invite.placeName}
                onChange={(event) => update({ placeName: event.target.value })}
              />
            </Field>
            <Field label="Пометка">
              <input
                value={invite.placeNote}
                onChange={(event) => update({ placeNote: event.target.value })}
              />
            </Field>
            <Field label="Ссылка на карту">
              <input
                type="url"
                inputMode="url"
                placeholder="https://yandex.ru/maps/"
                value={invite.mapUrl}
                onChange={(event) => update({ mapUrl: event.target.value })}
              />
            </Field>
          </fieldset>

          <fieldset>
            <legend>Фото</legend>
            <div className="photo-actions">
              <label className="file-btn">
                {invite.photoDataUrl ? 'Заменить фото' : 'Выбрать фото'}
                <input type="file" accept="image/*" onChange={onPhotoSelected} />
              </label>
              {invite.photoDataUrl ? (
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setPhotoWarning(false)
                    update({ photoDataUrl: null })
                  }}
                >
                  Убрать
                </button>
              ) : null}
            </div>
            {photoWarning ? (
              <p className="warn">Файл больше 700 КБ. Черновик может не поместиться в память браузера.</p>
            ) : (
              <p className="hint">Один снимок. В черновике он лежит в браузере, по опубликованной ссылке — на сервере в течение месяца.</p>
            )}
            <Field label={`Ширина, ${invite.photoWidth}% приглашения`}>
              <input
                type="range"
                min={30}
                max={100}
                step={5}
                value={invite.photoWidth}
                onChange={(event) => update({ photoWidth: Number(event.target.value) })}
              />
            </Field>
            <span className="field-label">Положение</span>
            <div className="choice-row">
              {PHOTO_ALIGNS.map((align) => (
                <button
                  key={align}
                  type="button"
                  className={invite.photoAlign === align ? 'is-on' : undefined}
                  onClick={() => update({ photoAlign: align })}
                >
                  {PHOTO_ALIGN_LABEL[align]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Ответ</legend>
            <Field label="Кнопка согласия">
              <input
                value={invite.rsvpYes}
                placeholder="Приду"
                onChange={(event) => update({ rsvpYes: event.target.value })}
              />
            </Field>
            <Field label="Надпись после согласия">
              <textarea
                rows={2}
                value={invite.rsvpYesNote}
                placeholder="Здорово. Я буду ждать."
                onChange={(event) => update({ rsvpYesNote: event.target.value })}
              />
            </Field>
            <Field label="Кнопка отказа">
              <input
                value={invite.rsvpNo}
                placeholder="Не смогу"
                onChange={(event) => update({ rsvpNo: event.target.value })}
              />
            </Field>
            <Field label="Надпись после отказа">
              <textarea
                rows={2}
                value={invite.rsvpNoNote}
                placeholder="Жаль. Если передумаешь — кнопка «Приду» всё ещё здесь."
                onChange={(event) => update({ rsvpNoNote: event.target.value })}
              />
            </Field>
            <p className="hint">Пустая подпись убирает кнопку, пустая надпись — текст после нажатия.</p>
          </fieldset>

          <fieldset>
            <legend>Секции</legend>
            <p className="hint">Скрывайте блоки и меняйте их порядок. Справа страница обновляется сразу.</p>
            <ul className="section-list">
              {invite.sections.map((sectionId, index) => (
                <li key={sectionId}>
                  <span>{SECTION_LABEL[sectionId]}</span>
                  <div>
                    <button
                      type="button"
                      aria-label={`${SECTION_LABEL[sectionId]} выше`}
                      disabled={index === 0}
                      onClick={() => update({ sections: moveSection(invite.sections, sectionId, -1) })}
                    >
                      Выше
                    </button>
                    <button
                      type="button"
                      aria-label={`${SECTION_LABEL[sectionId]} ниже`}
                      disabled={index === invite.sections.length - 1}
                      onClick={() => update({ sections: moveSection(invite.sections, sectionId, 1) })}
                    >
                      Ниже
                    </button>
                    <button type="button" onClick={() => update({ sections: invite.sections.filter((item) => item !== sectionId) })}>
                      Скрыть
                    </button>
                  </div>
                </li>
              ))}
              {hidden.map((sectionId) => (
                <li key={sectionId} className="is-off">
                  <span>{SECTION_LABEL[sectionId]}</span>
                  <div>
                    <button type="button" onClick={() => update({ sections: [...invite.sections, sectionId] })}>
                      Показать
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </fieldset>
        </form>

        <aside className="editor-preview" aria-label="Живой предпросмотр">
          <p className="preview-caption">Так увидит получатель</p>
          <div className="editor-stage">
            <InvitationView invitation={invite} rsvp={rsvp} onRsvp={chooseRsvp} />
          </div>
        </aside>
      </div>
    </div>
  )
}
