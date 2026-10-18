import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Search, Power, RotateCcw, Layers } from 'lucide-react'
import { useNotify }    from '../../context/commun/NotifyContext'
import ConfirmDialog    from '../../components/commun/ConfirmDialog'
import Loader           from '../../components/commun/Loader'
import { adminService } from '../../services/etablissements/etablissement.service'
import { servicesAcces } from '../../services/identite/servicesAcces.service'
import { SERVICE_PATHS } from '../../config/services/config'
import './admin.css'
import './services.css'

/* ─── Service établissements (suspension / réactivation) ─── */
const etabService = {
  lister: () => adminService.listerEtablissements(),
  suspendre: (uuid) => adminService.suspendreEtablissement(uuid),
  reactiver: (uuid) => adminService.reactiverEtablissement(uuid),
}

const TABS = [
  { id: 'tous',     label: 'Tous' },
  { id: 'actif',    label: 'Actifs' },
  { id: 'suspendu', label: 'Suspendus' },
]

function StatutBadge({ statut }) {
  const tone = statut === 'actif' ? 'success' : statut === 'suspendu' ? 'danger' : 'neutral'
  const label = statut === 'actif' ? 'Actif' : statut === 'suspendu' ? 'Suspendu' : statut ?? '-'
  return <span className={`ap-badge ap-badge--${tone}`}>{label}</span>
}

export default function EtablissementsPage() {
  const notify = useNotify()
  const [items,   setItems]   = useState(null)
  const [tab,     setTab]     = useState('tous')
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(false)
  const [action,  setAction]  = useState(null) // { type: 'suspendre'|'reactiver', item }
  const [busy,    setBusy]    = useState(false)
  const [resume,  setResume]  = useState({}) // { [etablissementUuid]: { actifs, bloques } }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await etabService.lister()
      setItems(Array.isArray(data) ? data : data?.etablissements ?? data?.items ?? [])
      // Résumé des services (Identité) : non bloquant, la page reste utilisable s'il échoue.
      servicesAcces.resume()
        .then((r) => setResume(Object.fromEntries((r?.resume ?? []).map((x) => [x.etablissementUuid, x]))))
        .catch(() => {})
    } catch (err) {
      notify.fromError(err)
      setItems(p => p ?? [])
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => { load() }, [load])

  const counts = useMemo(() => {
    if (!items) return { tous: 0, actif: 0, suspendu: 0 }
    return {
      tous:     items.length,
      actif:    items.filter(e => e.statut === 'actif').length,
      suspendu: items.filter(e => e.statut === 'suspendu').length,
    }
  }, [items])

  const rows = useMemo(() => {
    if (!items) return []
    const q = search.trim().toLowerCase()
    return items
      .filter(e => tab === 'tous' || e.statut === tab)
      .filter(e => !q || e.nom?.toLowerCase().includes(q) || e.code?.toLowerCase().includes(q) || e.slug?.toLowerCase().includes(q))
      .sort((a, b) => (a.nom ?? '').localeCompare(b.nom ?? '', 'fr'))
  }, [items, tab, search])

  async function executer() {
    if (!action) return
    setBusy(true)
    try {
      if (action.type === 'suspendre') {
        await etabService.suspendre(action.item.uuid)
        notify.success('Établissement suspendu', `${action.item.nom} est temporairement inaccessible.`)
      } else {
        await etabService.reactiver(action.item.uuid)
        notify.success('Établissement réactivé', `${action.item.nom} est à nouveau actif.`)
      }
      await load()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
      setAction(null)
    }
  }

  const dateFr = iso => iso
    ? new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'medium' })
    : '-'

  return (
    <div className="ap">
      {/* En-tête */}
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Établissements</h2>
          <p className="ap-page-sub">Gestion du réseau d'établissements SIGAPEI</p>
        </div>
        <div className="ap-page-actions">
          <button type="button" className="ap-btn ap-btn--ghost" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'ap-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="ap-filters" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`ap-tab${tab === t.id ? ' is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              <span>{counts[t.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="etab-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Rechercher un établissement"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="ap-card ap-card--flush">
        {items === null ? (
          <Loader mode="inline" label="Chargement des établissements…" />
        ) : rows.length === 0 ? (
          <div className="ap-empty">
            <p>Aucun établissement trouvé.</p>
          </div>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Établissement</th>
                  <th>Code</th>
                  <th>Slug</th>
                  <th>Types</th>
                  <th>Validé le</th>
                  <th>Services</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(e => (
                  <tr key={e.uuid}>
                    <td><strong>{e.nom ?? '-'}</strong></td>
                    <td><span className="ap-code">{e.code ?? '-'}</span></td>
                    <td><span className="ap-code">{e.slug ?? '-'}</span></td>
                    <td>{Array.isArray(e.types) ? e.types.join(', ') : (e.types ?? '-')}</td>
                    <td>{dateFr(e.date_validation ?? e.dateValidation ?? e.created_at)}</td>
                    <td>
                      {resume[e.uuid]
                        ? (
                          <span className="sv-resume">
                            <span className="ap-badge ap-badge--success">{resume[e.uuid].actifs} actif{resume[e.uuid].actifs > 1 ? 's' : ''}</span>
                            {resume[e.uuid].bloques > 0 && <span className="ap-badge ap-badge--danger">{resume[e.uuid].bloques} bloqué{resume[e.uuid].bloques > 1 ? 's' : ''}</span>}
                          </span>
                        )
                        : <span className="ap-badge ap-badge--neutral">Aucun</span>}
                    </td>
                    <td><StatutBadge statut={e.statut} /></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Link className="ap-btn ap-btn--ghost ap-btn--sm" to={SERVICE_PATHS.etablissement(e.uuid)} style={{ marginRight: 8 }}>
                        <Layers size={13} aria-hidden="true" />
                        Services
                      </Link>
                      {e.statut === 'actif' ? (
                        <button
                          type="button"
                          className="ap-btn ap-btn--danger ap-btn--sm"
                          onClick={() => setAction({ type: 'suspendre', item: e })}
                          title="Suspendre"
                        >
                          <Power size={13} />
                          Suspendre
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="ap-btn ap-btn--sm"
                          onClick={() => setAction({ type: 'reactiver', item: e })}
                          title="Réactiver"
                        >
                          <RotateCcw size={13} />
                          Réactiver
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm suspend */}
      <ConfirmDialog
        open={action?.type === 'suspendre'}
        tone="danger"
        title="Suspendre l'établissement ?"
        message={`${action?.item?.nom ?? 'Cet établissement'} sera immédiatement inaccessible. Les caches Redis seront invalidés.`}
        confirmLabel="Suspendre"
        loading={busy}
        onConfirm={executer}
        onCancel={() => setAction(null)}
      />

      {/* Confirm réactiver */}
      <ConfirmDialog
        open={action?.type === 'reactiver'}
        title="Réactiver l'établissement ?"
        message={`${action?.item?.nom ?? 'Cet établissement'} sera à nouveau accessible dès maintenant.`}
        confirmLabel="Réactiver"
        loading={busy}
        onConfirm={executer}
        onCancel={() => setAction(null)}
      />
    </div>
  )
}
