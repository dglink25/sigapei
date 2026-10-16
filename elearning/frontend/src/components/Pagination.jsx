import { TAILLE_PAGE } from '../api/client.js'

export function Pagination({ page, total, taillePage = TAILLE_PAGE, onPageChange }) {
  if (!total) return null
  const nbPages = Math.max(1, Math.ceil(total / taillePage))
  if (nbPages <= 1) {
    return (
      <nav className="pagination" aria-label="Pagination">
        <span>{total} résultat(s)</span>
      </nav>
    )
  }
  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="bouton bouton-secondaire bouton-compact"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ← Précédent
      </button>
      <span>
        Page {page} / {nbPages} - {total} résultat(s)
      </span>
      <button
        type="button"
        className="bouton bouton-secondaire bouton-compact"
        disabled={page >= nbPages}
        onClick={() => onPageChange(page + 1)}
      >
        Suivant →
      </button>
    </nav>
  )
}
