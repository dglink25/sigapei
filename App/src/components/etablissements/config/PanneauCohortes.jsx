/**
 * PanneauCohortes - Cohortes universitaires selon la structure académique :
 * Cycle universitaire (Licence, LP, Master, Doctorat) -> Département (ex. GE)
 * -> Option / Filière (ex. Électronique) -> Niveau d'études (ex. L1) -> Cohorte (ex. L1A, L1B).
 *
 * Règle d'assignation : Toute matière / UE assignée à une cohorte est automatiquement
 * assignée à l'autre, que la cohorte soit créée avant ou après.
 */
import { useEffect, useState, useMemo } from 'react'
import { Plus, X, Users, AlertTriangle, Info, CheckCircle, RefreshCw } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import {
  cohortesService,
  niveauxService,
  seriesService,
  subdivisionsService,
} from '../../../services/etablissements/configurationAcademique.service'
import Loader from '../../../components/commun/Loader'

const CYCLES_UNIV = [
  { id: 'licence',      label: 'Cycle Licence (L)',               prefixe: 'L' },
  { id: 'licence_pro',  label: 'Cycle Licence Professionnelle (LP)', prefixe: 'LP' },
  { id: 'master',       label: 'Cycle Master (M)',                prefixe: 'M' },
  { id: 'doctorat',     label: 'Cycle Doctorat (D)',              prefixe: 'D' },
  { id: 'ingenieur',    label: "Diplôme d'Ingénieur",             prefixe: 'ING' },
  { id: 'bts',          label: 'Brevet de Technicien Supérieur (BTS)', prefixe: 'BTS' },
]

export default function PanneauCohortes({ anneeActive, onTerminee }) {
  const notify = useNotify()
  const [items, setItems] = useState([])
  const [departements, setDepartements] = useState([])
  const [niveaux, setNiveaux] = useState([])
  const [filieres, setFilieres] = useState([])
  const [charge, setCharge] = useState(false)
  const [modale, setModale] = useState(false)
  const [enCours, setEnCours] = useState(false)

  const [form, setForm] = useState({
    annee_uuid: '',
    cycle_univ: 'licence',
    subdivision_uuid: '', // Département
    filiere_uuid: '',     // Option / Filière
    niveau_uuid: '',      // Niveau d'études (ex: L1, M1)
    diplome: 'licence',
    lettre: 'A',
    sigle: '',
    semestres: '',
  })
  const [erreurs, setErreurs] = useState({})

  const charger = async () => {
    if (!anneeActive) return
    setCharge(true)
    try {
      const [rCoh, rSub, rNiv, rFil] = await Promise.all([
        cohortesService.lister(anneeActive.uuid),
        subdivisionsService.lister({ annee_uuid: anneeActive.uuid }),
        niveauxService.lister('universitaire'),
        seriesService.lister('universitaire'),
      ])
      const liste = rCoh?.data ?? rCoh ?? []
      setItems(liste)
      setDepartements((rSub?.data ?? rSub ?? []).filter((s) => s.type === 'departement' || s.cycle === 'universitaire'))
      setNiveaux(rNiv?.data ?? rNiv ?? [])
      setFilieres(rFil?.data ?? rFil ?? [])
      if (liste.length > 0 && typeof onTerminee === 'function') onTerminee('cohortes')
    } catch (err) {
      notify.fromError(err)
    } finally {
      setCharge(false)
    }
  }

  useEffect(() => {
    charger()
  }, [anneeActive?.uuid]) // eslint-disable-line

  // Options / filières filtrées par département et cycle univ
  const filieresFiltrees = useMemo(() => {
    return filieres.filter((f) => {
      const matchDep = !form.subdivision_uuid || f.subdivision_id === departements.find((d) => d.uuid === form.subdivision_uuid)?.id || f.subdivision?.uuid === form.subdivision_uuid
      const matchCycle = !form.cycle_univ || f.cycle_univ === form.cycle_univ || !f.cycle_univ
      return matchDep && matchCycle
    })
  }, [filieres, form.subdivision_uuid, form.cycle_univ, departements])

  // Niveaux d'études filtrés
  const niveauxFiltres = useMemo(() => {
    return niveaux.filter((n) => {
      return !form.cycle_univ || n.cycle_univ === form.cycle_univ || !n.cycle_univ
    })
  }, [niveaux, form.cycle_univ])

  // Génération automatique du sigle (ex. L1A, LP2B, GE-L1A)
  useEffect(() => {
    const niv = niveaux.find((n) => n.uuid === form.niveau_uuid)
    const fil = filieres.find((f) => f.uuid === form.filiere_uuid)
    const lettr = (form.lettre || 'A').trim().toUpperCase()

    if (niv) {
      const abrNiv = niv.abreviation || niv.nom
      if (fil?.code) {
        setForm((f) => ({ ...f, sigle: `${abrNiv}${lettr}` }))
      } else {
        setForm((f) => ({ ...f, sigle: `${abrNiv}${lettr}` }))
      }
    }
  }, [form.niveau_uuid, form.filiere_uuid, form.lettre, niveaux, filieres])

  if (!anneeActive) {
    return (
      <div className="ap-card ap-empty">
        <AlertTriangle size={32} aria-hidden="true" />
        <p>Sélectionnez d'abord une année académique.</p>
      </div>
    )
  }

  const ouvrirModale = () => {
    setForm({
      annee_uuid: anneeActive.uuid,
      cycle_univ: 'licence',
      subdivision_uuid: departements[0]?.uuid || '',
      filiere_uuid: '',
      niveau_uuid: '',
      diplome: 'licence',
      lettre: 'A',
      sigle: '',
      semestres: '',
    })
    setErreurs({})
    setModale(true)
  }

  const valider = () => {
    const e = {}
    if (!form.filiere_uuid) e.filiere_uuid = 'Sélectionnez une option / filière.'
    if (!form.niveau_uuid) e.niveau_uuid = "Sélectionnez un niveau d'études."
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettre = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnCours(true)
    try {
      await cohortesService.creer({
        annee_uuid: form.annee_uuid,
        cycle_univ: form.cycle_univ,
        subdivision_uuid: form.subdivision_uuid || undefined,
        filiere_uuid: form.filiere_uuid,
        niveau_uuid: form.niveau_uuid,
        diplome: form.diplome,
        lettre: form.lettre.trim() || undefined,
        sigle: form.sigle.trim() || undefined,
        semestres: form.semestres.trim() || undefined,
      })
      notify.success('Cohorte créée', `La cohorte ${form.sigle} est prête avec synchronisation des matières/UE.`)
      setModale(false)
      await charger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="cfg-tab">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Cohortes Universitaires</h2>
          <p className="ap-page-sub">
            Année : <strong>{anneeActive.libelle}</strong> - Structuration par Cycle universitaire, Département, Option/Filière, Niveau d'études (L1, L2, M1...) et Cohortes (L1A, L1B...).
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={charger} disabled={charge}>
            <RefreshCw size={14} className={charge ? 'spin' : ''} /> Actualiser
          </button>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}>
            <Plus size={14} /> Nouvelle cohorte
          </button>
        </div>
      </div>

      {/* Règle pédagogique institutionnelle */}
      <div className="ap-alert ap-alert--info" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
        <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary, #047857)' }} />
        <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
          <strong>Règle d'assignation automatique de l'Université :</strong>
          <p style={{ margin: '4px 0 0' }}>
            Toute matière ou Unité d'Enseignement (UE) assignée à une cohorte (ex: <em>L1A</em>) est automatiquement assignée aux autres cohortes homologues (ex: <em>L1B</em>), que la cohorte soit créée avant ou après l'ajout de la matière.
          </p>
        </div>
      </div>

      {charge ? (
        <div className="ap-card" style={{ padding: '2.5rem', display: 'flex', justifyContent: 'center' }}>
          <Loader mode="inline" label="Chargement des cohortes…" />
        </div>
      ) : items.length === 0 ? (
        <div className="ap-card ap-empty">
          <Users size={36} aria-hidden="true" />
          <p>Aucune cohorte configurée pour cette année académique.</p>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}>
            <Plus size={14} /> Créer une cohorte
          </button>
        </div>
      ) : (
        <div className="ap-card ap-card--flush">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Sigle</th>
                <th>Département</th>
                <th>Option / Filière</th>
                <th>Niveau d'études</th>
                <th>Cycle Univ.</th>
                <th>Cohorte</th>
                <th>Semestres</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.uuid}>
                  <td>
                    <span className="ap-code" style={{ fontWeight: 700, color: 'var(--primary, #047857)' }}>
                      {c.sigle || '-'}
                    </span>
                  </td>
                  <td>{c.departement?.nom ?? '-'}</td>
                  <td>
                    <strong>{c.filiere?.nom ?? '-'}</strong>
                    {c.filiere?.code ? ` (${c.filiere.code})` : ''}
                  </td>
                  <td>
                    <span className="ap-badge ap-badge--neutral">
                      {c.niveau?.nom ?? '-'} {c.niveau?.abreviation ? `(${c.niveau.abreviation})` : ''}
                    </span>
                  </td>
                  <td>
                    <span className="ap-badge ap-badge--info">
                      {CYCLES_UNIV.find((d) => d.id === c.cycle_univ || d.id === c.diplome)?.label ?? (c.cycle_univ || c.diplome)}
                    </span>
                  </td>
                  <td><strong>{c.lettre || 'A'}</strong></td>
                  <td>{c.semestres || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modale de création de cohorte ── */}
      {modale && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="m-coh">
          <div className="cfg-modale" style={{ maxWidth: 560 }}>
            <div className="cfg-modale-tete">
              <h3 id="m-coh">Nouvelle cohorte universitaire</h3>
              <button
                type="button"
                className="ap-drawer-close"
                onClick={() => setModale(false)}
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={soumettre}>
              <div className="cfg-modale-corps">
                {/* 1. Cycle universitaire */}
                <div className="ap-field">
                  <label className="ap-label" htmlFor="coh-cyc">Cycle universitaire *</label>
                  <select
                    id="coh-cyc"
                    className="ap-input"
                    value={form.cycle_univ}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        cycle_univ: e.target.value,
                        diplome: e.target.value,
                        filiere_uuid: '',
                        niveau_uuid: '',
                      }))
                    }
                  >
                    {CYCLES_UNIV.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Département & Option/Filière */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="ap-field">
                    <label className="ap-label" htmlFor="coh-dep">Département</label>
                    <select
                      id="coh-dep"
                      className="ap-input"
                      value={form.subdivision_uuid}
                      onChange={(e) => setForm((f) => ({ ...f, subdivision_uuid: e.target.value, filiere_uuid: '' }))}
                    >
                      <option value="">-- Tous les départements --</option>
                      {departements.map((d) => (
                        <option key={d.uuid} value={d.uuid}>
                          {d.nom} {d.code ? `(${d.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={`ap-field${erreurs.filiere_uuid ? ' has-error' : ''}`}>
                    <label className="ap-label" htmlFor="coh-fil">Option / Filière *</label>
                    <select
                      id="coh-fil"
                      className="ap-input"
                      value={form.filiere_uuid}
                      onChange={(e) => setForm((f) => ({ ...f, filiere_uuid: e.target.value }))}
                    >
                      <option value="">-- Sélectionner l'option --</option>
                      {filieresFiltrees.map((f) => (
                        <option key={f.uuid} value={f.uuid}>
                          {f.code ? `${f.code} - ` : ''}{f.nom}
                        </option>
                      ))}
                    </select>
                    {erreurs.filiere_uuid && <p className="ap-error">{erreurs.filiere_uuid}</p>}
                  </div>
                </div>

                {/* 3. Niveau d'études & Lettre */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
                  <div className={`ap-field${erreurs.niveau_uuid ? ' has-error' : ''}`}>
                    <label className="ap-label" htmlFor="coh-niv">Niveau d'études *</label>
                    <select
                      id="coh-niv"
                      className="ap-input"
                      value={form.niveau_uuid}
                      onChange={(e) => setForm((f) => ({ ...f, niveau_uuid: e.target.value }))}
                    >
                      <option value="">-- Sélectionner le niveau --</option>
                      {niveauxFiltres.map((n) => (
                        <option key={n.uuid} value={n.uuid}>
                          {n.nom} {n.abreviation ? `(${n.abreviation})` : ''}
                        </option>
                      ))}
                    </select>
                    {erreurs.niveau_uuid && <p className="ap-error">{erreurs.niveau_uuid}</p>}
                  </div>
                  <div className="ap-field">
                    <label className="ap-label" htmlFor="coh-let">Lettre / Cohorte</label>
                    <input
                      id="coh-let"
                      className="ap-input ap-input--mono"
                      value={form.lettre}
                      onChange={(e) => setForm((f) => ({ ...f, lettre: e.target.value.toUpperCase() }))}
                      placeholder="A, B, C..."
                      maxLength={5}
                    />
                  </div>
                </div>

                {/* 4. Sigle et Semestres */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="ap-field">
                    <label className="ap-label" htmlFor="coh-sig">Sigle généré</label>
                    <input
                      id="coh-sig"
                      className="ap-input ap-input--mono"
                      style={{ fontWeight: 700 }}
                      value={form.sigle}
                      onChange={(e) => setForm((f) => ({ ...f, sigle: e.target.value.toUpperCase() }))}
                      placeholder="Ex: L1A, L1B"
                    />
                  </div>
                  <div className="ap-field">
                    <label className="ap-label" htmlFor="coh-sem">Semestres (optionnel)</label>
                    <input
                      id="coh-sem"
                      className="ap-input"
                      value={form.semestres}
                      onChange={(e) => setForm((f) => ({ ...f, semestres: e.target.value }))}
                      placeholder="Ex: S1, S2"
                    />
                  </div>
                </div>

                {/* Notice institutionnelle */}
                <div className="ap-alert ap-alert--success" style={{ marginTop: 8, padding: '10px 12px', fontSize: '0.82rem' }}>
                  Les matières / UE configurées pour cette filière et ce niveau seront automatiquement synchronisées avec cette cohorte et les autres cohortes homologues (L1A ↔ L1B).
                </div>
              </div>

              <div className="cfg-modale-pied">
                <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setModale(false)}>
                  Annuler
                </button>
                <button type="submit" className="ap-btn" disabled={enCours}>
                  {enCours ? 'Création en cours…' : 'Créer la cohorte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
