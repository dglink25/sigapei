/**
 * PanneauAnnees - Gestion des années académiques.
 * Création (confirmation obligatoire), suspension, réactivation.
 * Jamais de suppression : protégé côté UI et backend.
 */
import { useEffect, useState } from 'react'
import { CalendarDays, Plus, Pause, Play, AlertTriangle, X, RefreshCw } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import { anneesService } from '../../../services/etablissements/configurationAcademique.service'

const STATUT_LIBELLES = {
  en_cours: 'En cours',
  a_venir:  'À venir',
  termine:  'Terminée',
  suspendu: 'Suspendue',
}

const STATUT_CLASSE = {
  en_cours: 'ap-badge--success',
  a_venir:  'ap-badge--info',
  termine:  'ap-badge--neutral',
  suspendu: 'ap-badge--warning',
}

export default function PanneauAnnees({ anneeActive, setAnneeActive, onTerminee }) {
  const notify = useNotify()
  const [annees,       setAnnees]       = useState([])
  const [chargement,   setChargement]   = useState(true)
  const [modale,       setModale]       = useState(null)   // null | 'creer' | 'suspendre' | 'confirmer'
  const [enCours,      setEnCours]      = useState(false)
  const [form,         setForm]         = useState({ date_debut: '', date_fin: '' })
  const [libelle,      setLibelle]      = useState('')
  const [noteSupension,setNoteSuspension] = useState('')
  const [cible,        setCible]        = useState(null)   // annee ciblée pour action

  const charger = async () => {
    setChargement(true)
    try {
      const r = await anneesService.lister()
      const liste = r?.data ?? r ?? []
      setAnnees(liste)
      if (liste.length > 0) onTerminee('annees')
      // Sélectionner l'année en cours si aucune sélectionnée
      if (!anneeActive) {
        const active = liste.find((a) => a.statut === 'en_cours') ?? liste[0]
        if (active) setAnneeActive(active)
      }
    } catch (err) {
      notify.fromError(err)
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => { charger() }, []) // eslint-disable-line

  // Génère le libellé automatiquement à partir des dates
  useEffect(() => {
    if (form.date_debut && form.date_fin) {
      const debut = new Date(form.date_debut)
      const fin   = new Date(form.date_fin)
      if (!isNaN(debut) && !isNaN(fin) && fin > debut) {
        setLibelle(`${debut.getFullYear()}-${fin.getFullYear()}`)
      }
    }
  }, [form.date_debut, form.date_fin])

  const ouvrirCreer = () => {
    setForm({ date_debut: '', date_fin: '' })
    setLibelle('')
    setModale('creer')
  }

  const validerForm = () => {
    if (!form.date_debut || !form.date_fin) return 'Les deux dates sont requises.'
    if (new Date(form.date_fin) <= new Date(form.date_debut)) return 'La date de fin doit être après la date de début.'
    return null
  }

  const allerAConfirmer = () => {
    const err = validerForm()
    if (err) { notify.warning('Saisie invalide', err); return }
    setModale('confirmer')
  }

  const confirmerCreation = async () => {
    setEnCours(true)
    try {
      const r = await anneesService.creer({ ...form, libelle: libelle || undefined })
      const nouvelle = r?.data ?? r
      setAnnees((prev) => [nouvelle, ...prev])
      setAnneeActive(nouvelle)
      onTerminee('annees')
      notify.success('Année créée', `L'année ${nouvelle.libelle} a été créée.`)
      setModale(null)
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnCours(false)
    }
  }

  const ouvrirSuspendre = (annee) => {
    setCible(annee)
    setNoteSuspension('')
    setModale('suspendre')
  }

  const confirmerSuspendre = async () => {
    if (!cible) return
    setEnCours(true)
    try {
      await anneesService.suspendre(cible.uuid, noteSupension)
      await charger()
      notify.success('Année suspendue', `${cible.libelle} est maintenant suspendue.`)
      setModale(null)
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnCours(false)
    }
  }

  const reactiver = async (annee) => {
    try {
      await anneesService.reactiver(annee.uuid)
      await charger()
      notify.success('Année réactivée', `${annee.libelle} est de nouveau active.`)
    } catch (err) {
      notify.fromError(err)
    }
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

  return (
    <div className="cfg-tab">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Années académiques</h2>
          <p className="ap-page-sub">
            Une année ne peut jamais être supprimée. Elle peut être suspendue ou réactivée.
          </p>
        </div>
        <div className="ap-page-actions">
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={charger} disabled={chargement} aria-label="Actualiser">
            <RefreshCw size={14} className={chargement ? 'ap-spin' : ''} />
          </button>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirCreer}>
            <Plus size={14} /> Nouvelle année
          </button>
        </div>
      </div>

      {chargement ? (
        <div className="ap-card">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ap-skel-row">
              <div className="ap-skel ap-skel--tile" style={{ '--i': i }} />
              <div className="ap-skel ap-skel--line" style={{ '--i': i }} />
              <div className="ap-skel ap-skel--short" style={{ '--i': i }} />
            </div>
          ))}
        </div>
      ) : annees.length === 0 ? (
        <div className="ap-card ap-empty">
          <CalendarDays size={36} aria-hidden="true" />
          <p>Aucune année académique. Créez-en une pour commencer.</p>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirCreer}>
            <Plus size={14} /> Créer une année
          </button>
        </div>
      ) : (
        <div className="ap-card ap-card--flush">
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Libellé</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Statut</th>
                  <th>Cycles</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {annees.map((a) => (
                  <tr
                    key={a.uuid}
                    onClick={() => setAnneeActive(a)}
                    style={anneeActive?.uuid === a.uuid ? { background: 'rgba(0,107,60,0.04)' } : undefined}
                  >
                    <td>
                      <strong>{a.libelle}</strong>
                      {anneeActive?.uuid === a.uuid && (
                        <span className="ap-badge ap-badge--success" style={{ marginLeft: 8, fontSize: '0.7rem' }}>Sélectionnée</span>
                      )}
                    </td>
                    <td>{fmt(a.date_debut)}</td>
                    <td>{fmt(a.date_fin)}</td>
                    <td>
                      <span className={`ap-badge ${STATUT_CLASSE[a.statut] ?? 'ap-badge--neutral'}`}>
                        {STATUT_LIBELLES[a.statut] ?? a.statut}
                      </span>
                    </td>
                    <td>{a.nb_cycles ?? '-'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {a.statut === 'suspendu' ? (
                          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => reactiver(a)}>
                            <Play size={13} /> Réactiver
                          </button>
                        ) : a.statut !== 'termine' ? (
                          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => ouvrirSuspendre(a)}>
                            <Pause size={13} /> Suspendre
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modale création ── */}
      {modale === 'creer' && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="m-titre-creer">
          <div className="cfg-modale">
            <div className="cfg-modale-tete">
              <h3 id="m-titre-creer">Nouvelle année académique</h3>
              <button type="button" className="ap-drawer-close" onClick={() => setModale(null)} aria-label="Fermer"><X size={16} /></button>
            </div>
            <div className="cfg-modale-corps">
              <div className="ap-alert ap-alert--warning" style={{ marginBottom: 16 }}>
                <AlertTriangle size={16} />
                <div>
                  <strong>Action irréversible</strong>
                  Une année académique créée ne peut jamais être supprimée.
                </div>
              </div>
              <div className="ap-field">
                <label className="ap-label" htmlFor="aa-debut">Date de début <em>*</em></label>
                <input id="aa-debut" type="date" className="ap-input" value={form.date_debut}
                  onChange={(e) => setForm((f) => ({ ...f, date_debut: e.target.value }))} />
              </div>
              <div className="ap-field">
                <label className="ap-label" htmlFor="aa-fin">Date de fin <em>*</em></label>
                <input id="aa-fin" type="date" className="ap-input" value={form.date_fin}
                  onChange={(e) => setForm((f) => ({ ...f, date_fin: e.target.value }))} />
              </div>
              {libelle && (
                <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--sg-text-secondary)' }}>
                  Libellé généré : <strong style={{ color: '#006B3C' }}>{libelle}</strong>
                </p>
              )}
            </div>
            <div className="cfg-modale-pied">
              <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setModale(null)}>Annuler</button>
              <button type="button" className="ap-btn" onClick={allerAConfirmer}>Continuer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale confirmation ── */}
      {modale === 'confirmer' && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="m-titre-conf">
          <div className="cfg-modale">
            <div className="cfg-modale-tete">
              <h3 id="m-titre-conf">Confirmer la création</h3>
              <button type="button" className="ap-drawer-close" onClick={() => setModale('creer')} aria-label="Retour"><X size={16} /></button>
            </div>
            <div className="cfg-modale-corps">
              <p className="cfg-confirm-texte">
                Vous êtes sur le point de créer cette année académique. Cette action est <strong>irréversible</strong>.
              </p>
              <div className="cfg-confirm-resume">
                <strong>Récapitulatif</strong>
                <div>Libellé : <strong>{libelle}</strong></div>
                <div>Début : {new Date(form.date_debut).toLocaleDateString('fr-FR')}</div>
                <div>Fin : {new Date(form.date_fin).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
            <div className="cfg-modale-pied">
              <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setModale('creer')}>Modifier</button>
              <button type="button" className="ap-btn" onClick={confirmerCreation} disabled={enCours}>
                {enCours ? 'Création…' : 'Confirmer la création'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale suspension ── */}
      {modale === 'suspendre' && cible && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="m-titre-susp">
          <div className="cfg-modale">
            <div className="cfg-modale-tete">
              <h3 id="m-titre-susp">Suspendre {cible.libelle}</h3>
              <button type="button" className="ap-drawer-close" onClick={() => setModale(null)} aria-label="Fermer"><X size={16} /></button>
            </div>
            <div className="cfg-modale-corps">
              <p className="cfg-confirm-texte">
                La suspension désactive temporairement cette année. Elle peut être réactivée à tout moment.
              </p>
              <div className="ap-field">
                <label className="ap-label" htmlFor="susp-note">Note (optionnel)</label>
                <textarea id="susp-note" className="ap-textarea" rows={3}
                  placeholder="Motif de la suspension…"
                  value={noteSupension} onChange={(e) => setNoteSuspension(e.target.value)} />
              </div>
            </div>
            <div className="cfg-modale-pied">
              <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setModale(null)}>Annuler</button>
              <button type="button" className="ap-btn ap-btn--warn" onClick={confirmerSuspendre} disabled={enCours}>
                {enCours ? 'Suspension…' : 'Suspendre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
