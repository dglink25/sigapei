import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Inbox, RefreshCw, ChevronRight } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { ADMIN_PATHS, STATUTS } from '../../config/etablissements/config'
import { normaliserDemande } from '../../lib/etablissements/form'
import { adminService } from '../../services/etablissements/etablissement.service'
import Loader from '../../components/commun/Loader'
import { StatusBadge } from '../../components/etablissements/ui'
import '../AdministrationPrincipale/admin.css'

export const depuis = (iso) => {
  if (!iso) return '-'
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (j <= 0) return "Aujourd'hui"
  return j === 1 ? 'Il y a 1 jour' : `Il y a ${j} jours`
}
export const dateFr = (iso) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '-'

const TABS = [
  { id: 'soumise',             label: 'À instruire' },
  { id: 'correction_demandee', label: 'En correction' },
  { id: 'validee',             label: 'Validées' },
  { id: 'tous',                label: 'Toutes' },
]

export default function DemandesPage() {
  const notify   = useNotify()
  const navigate = useNavigate()
  const [items,   setItems]   = useState(null)
  const [tab,     setTab]     = useState('soumise')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems((await adminService.lister()).map(normaliserDemande))
    } catch (err) {
      notify.fromError(err)
      setItems(p => p ?? [])
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => { load() }, [load])

  const counts = useMemo(() => {
    const c = { tous: items?.length ?? 0 }
    Object.keys(STATUTS).forEach(s => { c[s] = (items ?? []).filter(d => d.statut === s).length })
    return c
  }, [items])

  const rows = useMemo(() =>
    (items ?? [])
      .filter(d => tab === 'tous' || d.statut === tab)
      .sort((a, b) => new Date(a.dateSoumission ?? 0) - new Date(b.dateSoumission ?? 0)),
    [items, tab],
  )

  return (
    <div className="ap">
      {/* En-tête */}
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Demandes d'inscription</h2>
          <p className="ap-page-sub">Instruction des dossiers soumis par les établissements</p>
        </div>
        <div className="ap-page-actions">
          <button
            type="button"
            className="ap-btn ap-btn--ghost"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'ap-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="ap-filters">
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

      {/* Contenu */}
      <div className="ap-card ap-card--flush">
        {items === null ? (
          <Loader mode="inline" label="Chargement des demandes…" />
        ) : rows.length === 0 ? (
          <div className="ap-empty">
            <Inbox size={36} aria-hidden="true" />
            <p>Aucune demande dans cette catégorie.</p>
          </div>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Dossier</th>
                  <th>Établissement</th>
                  <th>Dirigeant</th>
                  <th>Soumise</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(d => (
                  <tr
                    key={d.uuid}
                    onClick={() => navigate(ADMIN_PATHS.detail(d.uuid))}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && navigate(ADMIN_PATHS.detail(d.uuid))}
                  >
                    <td><span className="ap-code">{d.reference}</span></td>
                    <td><strong>{d.form.nom || '-'}</strong></td>
                    <td>{d.form.dirigeant_nom || '-'}</td>
                    <td>
                      {dateFr(d.dateSoumission)}
                      <small>{depuis(d.dateSoumission)}</small>
                    </td>
                    <td><StatusBadge statut={d.statut} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <ChevronRight size={16} style={{ color: 'var(--ap-muted)', opacity: 0.5 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
