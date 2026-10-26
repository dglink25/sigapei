import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import Drawer from './Drawer'
import { SkeletonList } from './Skeleton'
import './admin-ui.css'

/**
 * Tiroir de sélection multiple avec recherche, « tout sélectionner » et plafond.
 * items : [{ id, title, subtitle?, leading?, badge?, disabled?, note? }]
 */
export default function ChecklistDrawer({
  open, title, subtitle, items, loading = false, max, submitLabel = 'Valider', busy = false,
  onSubmit, onClose, searchPlaceholder = 'Rechercher…', emptyLabel = 'Aucun élément disponible.',
}) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(() => new Set())

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQ('')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSel(new Set())
    }
  }, [open])

  const visibles = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (items ?? []).filter((i) => !s || `${i.title} ${i.subtitle ?? ''}`.toLowerCase().includes(s))
  }, [items, q])

  const choisissables = visibles.filter((i) => !i.disabled)
  const toutes = choisissables.length > 0 && choisissables.every((i) => sel.has(i.id))
  const trop = max !== undefined && sel.size > max

  const basculer = (id) =>
    setSel((p) => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const basculerTout = () =>
    setSel((p) => {
      const n = new Set(p)
      choisissables.forEach((i) => (toutes ? n.delete(i.id) : n.add(i.id)))
      return n
    })

  return (
    <Drawer
      open={open}
      title={title}
      subtitle={subtitle}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <span className={`ap-drawer-count${trop ? ' is-over' : ''}`} aria-live="polite">
            {sel.size} sélectionné{sel.size > 1 ? 's' : ''}{max !== undefined ? ` / ${max} max.` : ''}
          </span>
          <button type="button" className="ap-btn ap-btn--ghost" onClick={onClose} disabled={busy}>Annuler</button>
          <button type="button" className="ap-btn" disabled={busy || sel.size === 0 || trop} onClick={() => onSubmit([...sel])}>
            {busy ? 'Enregistrement…' : submitLabel}
          </button>
        </>
      }
    >
      <div className="ap-search">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          className="ap-input"
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <SkeletonList rows={5} />
      ) : visibles.length === 0 ? (
        <p className="ap-hint" style={{ textAlign: 'center', padding: '24px 0' }}>{q ? 'Aucun résultat pour cette recherche.' : emptyLabel}</p>
      ) : (
        <>
          {choisissables.length > 1 && (
            <label className="ap-selectall">
              <input type="checkbox" className="ap-check" checked={toutes} onChange={basculerTout} />
              Tout sélectionner ({choisissables.length})
            </label>
          )}
          <ul className="ap-checklist">
            {visibles.map((i, idx) => (
              <li key={i.id} style={{ '--i': idx }}>
                <label className={`ap-check-row${sel.has(i.id) ? ' is-on' : ''}${i.disabled ? ' is-disabled' : ''}`}>
                  <input
                    type="checkbox"
                    className="ap-check"
                    checked={sel.has(i.id)}
                    disabled={i.disabled}
                    onChange={() => basculer(i.id)}
                  />
                  {i.leading}
                  <span className="ap-check-info">
                    <strong>{i.title}</strong>
                    {(i.note || i.subtitle) && <small>{i.note ?? i.subtitle}</small>}
                  </span>
                  {i.badge}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </Drawer>
  )
}
