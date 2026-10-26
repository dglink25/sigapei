import { Component } from 'react'
import { ErrorPage } from '../../pages/commun/ErrorPages'

/** Filet de securite global : evite l'ecran blanc en cas d'erreur de rendu. */
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    console.error('[SIGAPEI] Erreur de rendu :', error, info?.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <ErrorPage
        code="500"
        title="Une erreur est survenue"
        message="L'application a rencontré un problème inattendu. Vos données n'ont pas été perdues ; rechargez la page pour continuer."
        actions={[
          { label: 'Recharger la page', onClick: () => window.location.reload(), primary: true },
          { label: "Retour à l'accueil", href: '/' },
        ]}
      />
    )
  }
}
