import { ChevronLeft, ChevronRight } from 'lucide-react'
import './admin-ui.css'

/** Pied de tableau : { page, pages, total, limite } renvoyé par l'API ; masqué s'il n'y a qu'une page. */
export default function Pagination({ pagination, onPage, unite = 'résultat' }) {
  if (!pagination || pagination.pages <= 1) return null
  const { page, pages, total } = pagination
  return (
    <nav className="ap-pager" aria-label="Pagination">
      <span>{total} {unite}{total > 1 ? 's' : ''}</span>
      <div className="ap-pager-nav">
        <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => onPage(page - 1)} disabled={page <= 1}>
          <ChevronLeft size={15} aria-hidden="true" /> Précédent
        </button>
        <span aria-live="polite">Page {page} sur {pages}</span>
        <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => onPage(page + 1)} disabled={page >= pages}>
          Suivant <ChevronRight size={15} aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}
