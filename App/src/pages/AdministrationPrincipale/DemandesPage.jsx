import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox, RefreshCw, ChevronRight, Trash2, Square, CheckSquare } from 'lucide-react'
import { useNotify }     from '../../context/commun/NotifyContext'
import ConfirmDialog     from '../../components/commun/ConfirmDialog'
import Loader            from '../../components/commun/Loader'
import { ADMIN_PATHS, STATUTS } from '../../config/etablissements/config'
import { normaliserDemande }    from '../../lib/etablissements/form'
import { adminService }         from '../../services/etablissements/etablissement.service'
import { StatusBadge }          from '../../components/etablissements/ui'
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
  { id: 'brouillon',           label: 'Brouillons' },
  { id: 'tous',                label: 'Toutes' },
]

export default function DemandesPage() {
  const notify   = useNotify()
  const navigate = useNavigate()

  const [items,     setItems]     = useState(null)
  const [tab,       setTab]       = useState('soumise')
  const [loading,   setLoading]   = useState(false)
  const [selection, setSelection] = useState(new Set())   // UUIDs sélectionnés
  const [confirmer, setConfirmer] = useState(false)       // dialog suppression
  const [suppBusy,  setSuppBusy]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setSelection(new Set())
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

  // Réinitialiser la sélection si on change d'onglet
  useEffect(() => { setSelection(new Set()) }, [tab])

  const counts = useMemo(() => {
    const c = { tous: items?.length ?? 0 }
    Object.keys(STATUTS).forEach(s => { c[s] = (items ?? []).filter(d => d.statut === s).length })
    c.brouillon = (items ?? []).filter(d => d.statut === 'brouillon').length
    return c
  }, [items])

  const rows = useMemo(() =>
    (items ?? [])
      .filter(d => tab === 'tous' || d.statut === tab)
      .sort((a, b) => new Date(b.dateSoumission ?? b.dateSoumission ?? 0) - new Date(a.dateSoumission ?? 0)),
    [items, tab],
  )

  // Seuls les brouillons sont supprimables
  const brouillonsVisibles = rows.filter(d => d.statut === 'brouillon')
  const tousSelectionnes   = brouillonsVisibles.length > 0 && brouillonsVisibles.every(d => selection.has(d.uuid))

  function toggleTous() {
    if (tousSelectionnes) {
      setSelection(new Set())
    } else {
      setSelection(new Set(brouillonsVisibles.map(d => d.uuid)))
    }
  }

  function toggleUn(uuid) {
    setSelection(prev => {
      const next = new Set(prev)
      next.has(uuid) ? next.delete(uuid) : next.add(uuid)
      return next
    })
  }

  async function supprimerSelection() {
    setSuppBusy(true)
    try {
      const uuids = [...selection]
      await adminService.supprimerBrouillons(uuids)
      notify.success('Brouillons supprimés', `${uuids.length} brouillon${uuids.length > 1 ? 's' : ''} supprimé${uuids.length > 1 ? 's' : ''}.`)
      setSelection(new Set())
      await load()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setSuppBusy(false)
      setConfirmer(false)
    }
  }

  const nbSelection = selection.size
  const montrerCasesACocher = tab === 'brouillon' || tab === 'tous'

  return (
    <div className="ap">
      {/* En-tête */}
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Demandes d'inscription</h2>
          <p className="ap-page-sub">Instruction des dossiers soumis par les établissements</p>
        </div>
        <div className="ap-page-actions">
          {nbSelection > 0 && (
            <button
              type="button"
              className="ap-btn ap-btn--danger"
              onClick={() => setConfirmer(true)}
            >
              <Trash2 size={15} />
              Supprimer ({nbSelection})
            </button>
          )}
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

      {/* Tableau */}
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
                  {montrerCasesACocher && (
                    <th style={{ width: 40, paddingRight: 0 }}>
                      {brouillonsVisibles.length > 0 && (
                        <button
                          type="button"
                          style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--ap-muted)', display: 'grid', placeItems: 'center' }}
                          onClick={toggleTous}
                          aria-label={tousSelectionnes ? 'Tout désélectionner' : 'Tout sélectionner'}
                        >
                          {tousSelectionnes
                            ? <CheckSquare size={16} style={{ color: 'var(--ap-green)' }} />
                            : <Square size={16} />}
                        </button>
                      )}
                    </th>
                  )}
                  <th>Dossier</th>
                  <th>Établissement</th>
                  <th>Dirigeant</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(d => {
                  const estBrouillon  = d.statut === 'brouillon'
                  const estSelectionne = selection.has(d.uuid)
                  return (
                    <tr
                      key={d.uuid}
                      onClick={() => {
                        if (estBrouillon && montrerCasesACocher) { toggleUn(d.uuid); return }
                        navigate(ADMIN_PATHS.detail(d.uuid))
                      }}
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && navigate(ADMIN_PATHS.detail(d.uuid))}
                      style={estSelectionne ? { background: 'rgba(0,107,60,0.05)' } : undefined}
                    >
                      {montrerCasesACocher && (
                        <td style={{ paddingRight: 0 }} onClick={e => { e.stopPropagation(); if (estBrouillon) toggleUn(d.uuid) }}>
                          {estBrouillon && (
                            estSelectionne
                              ? <CheckSquare size={16} style={{ color: 'var(--ap-green)', display: 'block' }} />
                              : <Square size={16} style={{ color: 'var(--ap-muted)', display: 'block' }} />
                          )}
                        </td>
                      )}
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
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog confirmation suppression */}
      <ConfirmDialog
        open={confirmer}
        tone="danger"
        title={`Supprimer ${nbSelection} brouillon${nbSelection > 1 ? 's' : ''} ?`}
        message="Les brouillons sélectionnés et leurs documents seront définitivement supprimés. Cette action est irréversible."
        confirmLabel="Supprimer définitivement"
        loading={suppBusy}
        onConfirm={supprimerSelection}
        onCancel={() => setConfirmer(false)}
      />
    </div>
  )
}
