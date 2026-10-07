import { Link } from 'react-router-dom'

const steps = [
  {
    n: '01',
    title: 'Повод',
    text: 'Свидание или прогулка. Текст, место и время уже на русском — остаётся подставить свои.',
  },
  {
    n: '02',
    title: 'Ссылка',
    text: 'Опубликуйте страницу и отправьте адрес в Telegram, ВКонтакте, WhatsApp или MAX. Приложение получателю не нужно.',
  },
  {
    n: '03',
    title: 'Месяц',
    text: 'Сервер хранит сайт 30 дней с момента создания ссылки, затем удаляет его сам.',
  },
]

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <p className="brand">Приглашение</p>
        <Link to="/app">Мои черновики</Link>
      </header>

      <main>
        <section className="landing-hero">
          <p className="landing-kicker">Для переписки в России</p>
          <h1>Сайт, который открывается по ссылке</h1>
          <p className="landing-lead">
            Соберите приглашение на свидание или прогулку и отправьте одну ссылку. Даты пишутся так, как их читают в России, а страница живёт на сервере месяц.
          </p>
          <div className="landing-actions">
            <Link className="landing-primary" to="/app">
              Собрать приглашение
            </Link>
            <a href="#how">Как это устроено</a>
          </div>
          <p className="landing-link-sample" aria-hidden="true">
            <span>ссылка</span>
            ваш-сайт/s/vecher
          </p>
        </section>

        <section id="how" className="landing-steps">
          {steps.map((step) => (
            <article key={step.n}>
              <p>{step.n}</p>
              <h2>{step.title}</h2>
              <span>{step.text}</span>
            </article>
          ))}
        </section>

        <section className="landing-note">
          <h2>Ссылка живёт 30 дней</h2>
          <p>
            Пока вы правите текст, черновик лежит в этом браузере. Когда вы получаете ссылку, копия сохраняется на сервере до указанной даты. После этого адрес перестаёт открываться. Ответ «приду» или «не смогу» тоже хранится вместе со страницей.
          </p>
        </section>
      </main>
    </div>
  )
}
