import { ENV } from '../../config/commun/env'
import './ErrorPages.css'

/* Volontairement sans dependance au routeur : utilisable meme dans l'ErrorBoundary. */
export function ErrorPage({ code, title, message, actions = [] }) {
  return (
    <main className="err-page">
      <section className="err-card" role="alert">
        <img className="err-logo" src="/sigapei.png" alt={ENV.appName} />
        <p className="err-code">{code}</p>
        <h1 className="err-title">{title}</h1>
        <p className="err-msg">{message}</p>
        <div className="err-actions">
          {actions.map((a) =>
            a.href ? (
              <a key={a.label} href={a.href} className={`err-btn ${a.primary ? 'is-primary' : ''}`}>{a.label}</a>
            ) : (
              <button key={a.label} type="button" onClick={a.onClick} className={`err-btn ${a.primary ? 'is-primary' : ''}`}>{a.label}</button>
            ),
          )}
        </div>
        <p className="err-foot">{ENV.appName} · Plateforme intégrée de gestion scolaire</p>
      </section>
    </main>
  )
}

export const NotFoundPage = () => (
  <ErrorPage
    code="404"
    title="Page introuvable"
    message="La page que vous recherchez n'existe pas ou a été déplacée."
    actions={[{ label: "Retour à l'accueil", href: '/', primary: true }]}
  />
)

export const ForbiddenPage = () => (
  <ErrorPage
    code="403"
    title="Accès refusé"
    message="Votre rôle ne vous permet pas d'accéder à cette page. Contactez l'administrateur de votre établissement si vous pensez qu'il s'agit d'une erreur."
    actions={[{ label: "Retour à l'accueil", href: '/', primary: true }]}
  />
)
