import { useEffect, useState, useMemo } from 'react'
import { Plus, X, BookOpen, AlertTriangle, Share2, Info, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import {
  matieresService,
  niveauxService,
  seriesService,
} from '../../../services/etablissements/configurationAcademique.service'
import Loader from '../../../components/commun/Loader'

const CYCLES = [
  { id: '',              label: 'Tous les cycles' },
  { id: 'maternelle',    label: 'Maternelle' },
  { id: 'primaire',      label: 'Primaire' },
  { id: 'universitaire', label: 'Université' },
]

export default function PanneauMatieres({
  anneeActive,
  onTerminee,
  cycleFiltre,
  cycleObj,
  cyclesDisponibles = [],
}) {
  const notify = useNotify()
  const [filtreCycle, setFiltreCycle] = useState(cycleFiltre || '')
  const [items, setItems] = useState([])
  const [niveaux, setNiveaux] = useState([])
  const [series, setSeries] = useState([])
  const [charge, setCharge] = useState(false)
  const [modale, setModale] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [propagation, setPropagation] = useState(null) // { uuid, classes: [], count }
  const [form, setForm] = useState({
    annee_uuid: '',
    cycle: cycleFiltre || (cyclesDisponibles.length > 0 ? cyclesDisponibles[0] : 'primaire'),
    niveau_uuid: '',
    serie_uuid: '',
    matiere_uuid_externe: '',
    nom_matiere: '',
    code_matiere: '',
    coefficient: '',
    est_obligatoire: true,
  })
  const [erreurs, setErreurs] = useState({})

  const cycleCourant = cycleFiltre || form.cycle
  const isMaternellePrimaire = cycleCourant === 'maternelle' || cycleCourant === 'primaire'
  const isSecondaire = cycleCourant === 'secondaire'
  const isUniv = cycleCourant === 'universitaire'

  const charger = async () => {
    if (!anneeActive) return
    setCharge(true)
    try {
      const params = { annee_uuid: anneeActive.uuid }
      if (filtreCycle) params.cycle = filtreCycle
      const [rMat, rNiv, rSer] = await Promise.all([
        matieresService.lister(params),
        niveauxService.lister(filtreCycle || undefined),
        seriesService.lister(filtreCycle || undefined),
      ])
      const liste = rMat?.data ?? rMat ?? []
      setItems(liste)
      setNiveaux(rNiv?.data ?? rNiv ?? [])
      setSeries(rSer?.data ?? rSer ?? [])
      if (liste.length > 0 && typeof onTerminee === 'function') onTerminee('matieres')
    } catch (err) {
      notify.fromError(err)
    } finally {
      setCharge(false)
    }
  }

  useEffect(() => {
    charger()
  }, [anneeActive?.uuid, filtreCycle]) // eslint-disable-line

  const niveauSelectionne = useMemo(() => {
    return niveaux.find((n) => n.uuid === form.niveau_uuid) || null
  }, [niveaux, form.niveau_uuid])

  const seriesDisponibles = useMemo(() => {
    const cycle = form.cycle
    if (cycle === 'secondaire' && niveauSelectionne) {
      return series.filter(
        (s) =>
          s.promotion_id === niveauSelectionne.id ||
          s.promotion?.uuid === niveauSelectionne.uuid ||
          (!s.promotion_id && s.cycle === 'secondaire')
      )
    }
    if (cycle === 'maternelle' || cycle === 'primaire') {
      return []
    }
    return series.filter((s) => !cycle || s.cycle === cycle)
  }, [series, form.cycle, niveauSelectionne])

  // Cycles disponibles autorisés et actifs
  const optionsCyclesSelectionnables = useMemo(() => {
    if (cyclesDisponibles.length > 0) {
      return CYCLES.filter((c) => c.id && cyclesDisponibles.includes(c.id))
    }
    return CYCLES.filter((c) => c.id)
  }, [cyclesDisponibles])

  if (!anneeActive) {
    return (
      <div className="ap-card ap-empty">
        <AlertTriangle size={32} aria-hidden="true" />
        <p>Sélectionnez d'abord une année académique.</p>
      </div>
    )
  }

  const genererUuidAuto = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  const ouvrirModale = () => {
    const cycleDefaut = cycleFiltre || (optionsCyclesSelectionnables[0]?.id ?? 'primaire')
    setForm({
      annee_uuid: anneeActive.uuid,
      cycle: cycleDefaut,
      niveau_uuid: '',
      serie_uuid: '',
      matiere_uuid_externe: genererUuidAuto(),
      nom_matiere: '',
      code_matiere: '',
      coefficient: '',
      est_obligatoire: true,
    })
    setErreurs({})
    setModale(true)
  }

  const valider = () => {
    const e = {}
    if (!form.cycle) e.cycle = 'Cycle requis.'
    if (!form.niveau_uuid) {
      e.niveau_uuid =
        form.cycle === 'secondaire'
          ? 'Promotion requise.'
          : form.cycle === 'universitaire'
          ? "Niveau d'études requis."
          : 'Niveau scolaire requis.'
    }
    if (!form.nom_matiere.trim()) e.nom_matiere = 'Nom de matière requis.'
    if (!form.matiere_uuid_externe.trim()) {
      form.matiere_uuid_externe = genererUuidAuto()
    }
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettre = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnCours(true)
    try {
      const r = await matieresService.creer({
        annee_uuid: form.annee_uuid,
        cycle: form.cycle,
        niveau_uuid: form.niveau_uuid,
        serie_uuid: !isMaternellePrimaire && form.serie_uuid ? form.serie_uuid : undefined,
        matiere_uuid_externe: form.matiere_uuid_externe.trim(),
        nom_matiere: form.nom_matiere.trim(),
        code_matiere: form.code_matiere.trim() || undefined,
        coefficient: form.coefficient !== '' ? Number(form.coefficient) : null,
        est_obligatoire: form.est_obligatoire,
      })
      notify.success('Matière configurée', `${form.nom_matiere} assignée avec propagation automatique.`)
      setModale(false)

      const created = r?.data ?? r
      if (created?.uuid) {
        try {
          const prev = await matieresService.previewPropagation(created.uuid)
          const data = prev?.data ?? prev
          if ((data?.count ?? 0) > 0) {
            setPropagation({ uuid: created.uuid, classes: data.classes, count: data.count })
          }
        } catch {
          /* propagation automatique déjà effectuée côté backend */
        }
      }
      await charger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnCours(false)
    }
  }

  const confirmerPropagation = async () => {
    if (!propagation) return
    try {
      const r = await matieresService.propager(propagation.uuid)
      const data = r?.data ?? r
      notify.success('Propagation confirmée', `${data?.crees ?? propagation.count} classe(s) mise(s) à jour.`)
      setPropagation(null)
      await charger()
    } catch (err) {
      notify.fromError(err)
    }
  }

  const renduBandeauRegles = () => {
    if (cycleCourant === 'primaire') {
      return (
        <div className="ap-alert ap-alert--info" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
          <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary, #047857)' }} />
          <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
            <strong>Règle pédagogique Primaire :</strong>
            <p style={{ margin: '4px 0 0' }}>
              Toute matière configurée pour un niveau scolaire (ex. <em>CM2</em>) est automatiquement assignée à toutes les classes homologues de ce niveau à travers l'ensemble des groupes (ex. <em>CM2 A</em>, <em>CM2 B</em> ou cycle unique) pour l'année scolaire active.
            </p>
          </div>
        </div>
      )
    }
    if (cycleCourant === 'maternelle') {
      return (
        <div className="ap-alert ap-alert--info" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
          <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary, #047857)' }} />
          <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
            <strong>Règle pédagogique Maternelle :</strong>
            <p style={{ margin: '4px 0 0' }}>
              Toute matière configurée pour un niveau (ex. <em>Maternelle 1</em>) est automatiquement assignée à toutes les classes de ce niveau à travers l'ensemble des groupes.
            </p>
          </div>
        </div>
      )
    }
    if (cycleCourant === 'secondaire') {
      return (
        <div className="ap-alert ap-alert--info" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
          <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary, #047857)' }} />
          <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
            <strong>Règles strictes Secondaire :</strong>
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
              <li><strong>Promotion sans série (ex: Sixième) :</strong> Toute matière s'assigne automatiquement à toutes les classes de la promotion (<em>6ème A</em>, <em>6ème M1</em>...).</li>
              <li><strong>Promotion avec série (ex: 2nde B) :</strong> Toute matière assignée à une série est isolée et assignée uniquement aux classes de cette série (<em>2nde B1</em>, <em>2nde B2</em>), jamais aux autres séries (<em>2nde C</em>).</li>
            </ul>
          </div>
        </div>
      )
    }
    if (cycleCourant === 'universitaire') {
      return (
        <div className="ap-alert ap-alert--info" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
          <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary, #047857)' }} />
          <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
            <strong>Règles pédagogiques Université :</strong>
            <p style={{ margin: '4px 0 0' }}>
              Synchronisation automatique des matières / UE entre toutes les cohortes de la même filière (<em>L1A ↔ L1B</em>).
            </p>
          </div>
        </div>
      )
    }
    return (
      <div className="ap-alert ap-alert--info" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
        <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary, #047857)' }} />
        <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
          <strong>Règles pédagogiques :</strong>
          <p style={{ margin: '4px 0 0' }}>
            Les matières sont automatiquement synchronisées selon les règles spécifiques à chaque cycle d'enseignement.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="cfg-tab">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">
            {isUniv ? 'Matières & Unités d\'Enseignement' : 'Matières & Coefficients'}
          </h2>
          <p className="ap-page-sub">
            Année : <strong>{anneeActive.libelle}</strong>
            {cycleFiltre ? ` - Cycle ${CYCLES.find((c) => c.id === cycleFiltre)?.label ?? cycleFiltre}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={charger} disabled={charge}>
            <RefreshCw size={14} className={charge ? 'spin' : ''} /> Actualiser
          </button>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}>
            <Plus size={14} /> Configurer une matière
          </button>
        </div>
      </div>

      {renduBandeauRegles()}

      {!cycleFiltre && optionsCyclesSelectionnables.length > 1 && (
        <div className="ap-filters">
          <button
            type="button"
            className={`ap-tab${filtreCycle === '' ? ' is-active' : ''}`}
            onClick={() => setFiltreCycle('')}
          >
            Tous les cycles
          </button>
          {optionsCyclesSelectionnables.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`ap-tab${filtreCycle === c.id ? ' is-active' : ''}`}
              onClick={() => setFiltreCycle(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {charge ? (
        <div className="ap-card" style={{ padding: '2.5rem', display: 'flex', justifyContent: 'center' }}>
          <Loader mode="inline" label="Chargement des matières & coefficients…" />
        </div>
      ) : items.length === 0 ? (
        <div className="ap-card ap-empty">
          <BookOpen size={36} aria-hidden="true" />
          <p>Aucune matière configurée pour cette sélection.</p>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}>
            <Plus size={14} /> Configurer
          </button>
        </div>
      ) : (
        <div className="ap-card ap-card--flush">
          <table className="ap-table">
            <thead>
              <tr>
                <th>{isUniv ? 'Matière / UE' : 'Matière'}</th>
                <th>Code</th>
                {!cycleFiltre && <th>Cycle</th>}
                <th>{isSecondaire ? 'Promotion' : isUniv ? "Niveau d'études" : 'Niveau scolaire'}</th>
                {isSecondaire && <th>Série</th>}
                {isUniv && <th>Option / Filière</th>}
                <th>{isUniv ? 'Crédits / Coef' : 'Coefficient'}</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.uuid}>
                  <td>
                    <strong>{m.nom_matiere}</strong>
                  </td>
                  <td>
                    {m.code_matiere ? (
                      <span className="ap-code">{m.code_matiere}</span>
                    ) : (
                      <span style={{ color: 'var(--sg-text-muted)' }}>-</span>
                    )}
                  </td>
                  {!cycleFiltre && (
                    <td>
                      <span className="ap-badge ap-badge--neutral">
                        {CYCLES.find((c) => c.id === m.cycle)?.label ?? m.cycle}
                      </span>
                    </td>
                  )}
                  <td>
                    <span className="ap-badge ap-badge--neutral">
                      {m.niveau?.nom ?? '-'}
                      {m.niveau?.abreviation ? ` (${m.niveau.abreviation})` : ''}
                    </span>
                  </td>
                  {isSecondaire && (
                    <td>
                      {m.serie ? (
                        <span className="ap-badge ap-badge--info" style={{ fontWeight: 600 }}>
                          {m.serie.code || m.serie.nom}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--sg-text-muted)', fontSize: '0.82rem' }}>
                          Toutes les classes
                        </span>
                      )}
                    </td>
                  )}
                  {isUniv && (
                    <td>
                      {m.serie ? (
                        <span className="ap-badge ap-badge--info" style={{ fontWeight: 600 }}>
                          {m.serie.nom} ({m.serie.code})
                        </span>
                      ) : (
                        <span style={{ color: 'var(--sg-text-muted)', fontSize: '0.82rem' }}>Tronc commun</span>
                      )}
                    </td>
                  )}
                  <td>
                    {m.coefficient !== null && m.coefficient !== undefined ? (
                      <strong style={{ color: 'var(--primary, #047857)' }}>{m.coefficient}</strong>
                    ) : (
                      <span style={{ color: 'var(--sg-text-muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>
                        Non défini
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`ap-badge ${m.est_obligatoire ? 'ap-badge--success' : 'ap-badge--neutral'}`}>
                      {m.est_obligatoire ? 'Obligatoire' : 'Optionnel'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modale de création / configuration ── */}
      {modale && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="m-mat">
          <div className="cfg-modale" style={{ maxWidth: 580 }}>
            <div className="cfg-modale-tete">
              <h3 id="m-mat">
                Configurer une matière
                {cycleFiltre ? ` - ${CYCLES.find((c) => c.id === cycleFiltre)?.label ?? cycleFiltre}` : ''}
              </h3>
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
                {/* 1. Cycle & Niveau */}
                <div style={{ display: 'grid', gridTemplateColumns: cycleFiltre ? '1fr' : '1fr 1fr', gap: 12 }}>
                  {!cycleFiltre && (
                    <div className={`ap-field${erreurs.cycle ? ' has-error' : ''}`}>
                      <label className="ap-label" htmlFor="mat-cyc">Cycle *</label>
                      <select
                        id="mat-cyc"
                        className="ap-input"
                        value={form.cycle}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            cycle: e.target.value,
                            niveau_uuid: '',
                            serie_uuid: '',
                          }))
                        }
                      >
                        {optionsCyclesSelectionnables.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      {erreurs.cycle && <p className="ap-error">{erreurs.cycle}</p>}
                    </div>
                  )}

                  <div className={`ap-field${erreurs.niveau_uuid ? ' has-error' : ''}`}>
                    <label className="ap-label" htmlFor="mat-niv">
                      {form.cycle === 'secondaire'
                        ? 'Promotion *'
                        : form.cycle === 'universitaire'
                        ? "Niveau d'études *"
                        : 'Niveau scolaire *'}
                    </label>
                    <select
                      id="mat-niv"
                      className="ap-input"
                      value={form.niveau_uuid}
                      onChange={(e) => setForm((f) => ({ ...f, niveau_uuid: e.target.value, serie_uuid: '' }))}
                    >
                      <option value="">-- Sélectionner --</option>
                      {niveaux
                        .filter((n) => !form.cycle || n.cycle === form.cycle)
                        .map((n) => (
                          <option key={n.uuid} value={n.uuid}>
                            {n.nom} {n.abreviation ? `(${n.abreviation})` : ''}
                          </option>
                        ))}
                    </select>
                    {erreurs.niveau_uuid && <p className="ap-error">{erreurs.niveau_uuid}</p>}
                  </div>
                </div>

                {/* 2. Série ou Filière - STRICTEMENT MASQUÉ pour Maternelle / Primaire */}
                {form.cycle === 'secondaire' && (
                  <>
                    {niveauSelectionne?.a_series ? (
                      <div className="ap-field">
                        <label className="ap-label" htmlFor="mat-ser">Série associée (optionnel)</label>
                        <select
                          id="mat-ser"
                          className="ap-input"
                          value={form.serie_uuid}
                          onChange={(e) => setForm((f) => ({ ...f, serie_uuid: e.target.value }))}
                        >
                          <option value="">-- Commune à toutes les séries de la promotion --</option>
                          {seriesDisponibles.map((s) => (
                            <option key={s.uuid} value={s.uuid}>
                              {s.code ? `${s.code} - ` : ''}{s.nom}
                            </option>
                          ))}
                        </select>
                        {form.serie_uuid ? (
                          <p className="ap-hint" style={{ color: 'var(--primary, #047857)', fontWeight: 500 }}>
                            Règle d'isolation : Cette matière sera assignée à toutes les classes de cette série (ex. 2nde B1, 2nde B2) mais jamais aux autres séries (ex. 2nde C).
                          </p>
                        ) : (
                          <p className="ap-hint">
                            Règle commune : Cette matière sera partagée par toutes les séries de la promotion.
                          </p>
                        )}
                      </div>
                    ) : form.niveau_uuid ? (
                      <p className="ap-hint" style={{ margin: '4px 0 10px', color: 'var(--primary, #047857)' }}>
                        Promotion sans série : Cette matière sera automatiquement assignée à l'ensemble des classes de cette promotion (ex: 6ème A, 6ème M1...).
                      </p>
                    ) : null}
                  </>
                )}

                {form.cycle === 'universitaire' && (
                  <div className="ap-field">
                    <label className="ap-label" htmlFor="mat-ser">Option / Filière (UE spécifique)</label>
                    <select
                      id="mat-ser"
                      className="ap-input"
                      value={form.serie_uuid}
                      onChange={(e) => setForm((f) => ({ ...f, serie_uuid: e.target.value }))}
                    >
                      <option value="">-- Tronc commun / Toutes les options --</option>
                      {seriesDisponibles.map((s) => (
                        <option key={s.uuid} value={s.uuid}>
                          {s.code ? `${s.code} - ` : ''}{s.nom}
                        </option>
                      ))}
                    </select>
                    <p className="ap-hint">
                      Synchronisation : Les matières créées sont automatiquement répercutées sur toutes les cohortes (L1A ↔ L1B).
                    </p>
                  </div>
                )}

                {(form.cycle === 'maternelle' || form.cycle === 'primaire') && form.niveau_uuid && (
                  <p className="ap-hint" style={{ margin: '4px 0 10px', color: 'var(--primary, #047857)' }}>
                    Règle d'assignation automatique : Cette matière sera assignée à l'ensemble des classes homologues de ce niveau à travers tous les groupes (Groupe A, Groupe B...) de l'année scolaire.
                  </p>
                )}

                {/* Nom et Code matière */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
                  <div className={`ap-field${erreurs.nom_matiere ? ' has-error' : ''}`}>
                    <label className="ap-label" htmlFor="mat-nom">Nom de la matière *</label>
                    <input
                      id="mat-nom"
                      className="ap-input"
                      value={form.nom_matiere}
                      onChange={(e) => setForm((f) => ({ ...f, nom_matiere: e.target.value }))}
                      placeholder="Ex. Mathématiques, Physique-Chimie..."
                    />
                    {erreurs.nom_matiere && <p className="ap-error">{erreurs.nom_matiere}</p>}
                  </div>
                  <div className="ap-field">
                    <label className="ap-label" htmlFor="mat-code">Code / Abréviation</label>
                    <input
                      id="mat-code"
                      className="ap-input ap-input--mono"
                      value={form.code_matiere}
                      onChange={(e) => setForm((f) => ({ ...f, code_matiere: e.target.value.toUpperCase() }))}
                      placeholder="MATH, PC..."
                    />
                  </div>
                </div>

                {/* Coefficient & UUID externe */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="ap-field">
                    <label className="ap-label" htmlFor="mat-coef">
                      Coefficient
                      {(form.cycle === 'maternelle' || form.cycle === 'primaire') && (
                        <span style={{ marginLeft: 4, fontWeight: 400, color: 'var(--sg-text-muted)', fontSize: '0.78rem' }}>
                          (optionnel)
                        </span>
                      )}
                    </label>
                    <input
                      id="mat-coef"
                      type="number"
                      min={0}
                      step={0.5}
                      className="ap-input"
                      value={form.coefficient}
                      onChange={(e) => setForm((f) => ({ ...f, coefficient: e.target.value }))}
                      placeholder="Vide = non défini"
                    />
                  </div>
                  <div className="ap-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="ap-label" htmlFor="mat-uuid" style={{ margin: 0 }}>UUID Référence</label>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, matiere_uuid_externe: genererUuidAuto() }))}
                        className="ap-btn ap-btn--ghost ap-btn--xs"
                        style={{ padding: '2px 6px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <RefreshCw size={11} /> Auto
                      </button>
                    </div>
                    <input
                      id="mat-uuid"
                      className="ap-input ap-input--mono"
                      style={{ fontSize: '0.75rem' }}
                      value={form.matiere_uuid_externe}
                      onChange={(e) => setForm((f) => ({ ...f, matiere_uuid_externe: e.target.value }))}
                      placeholder="Auto-généré"
                    />
                  </div>
                </div>

                {/* Switch Obligatoire */}
                <div className="ap-switchline" style={{ marginTop: 8 }}>
                  <div>
                    <strong>Matière obligatoire</strong>
                    <small>Détermine si la note est exigée dans la moyenne générale</small>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.est_obligatoire}
                    className={`ap-switch${form.est_obligatoire ? ' is-on' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, est_obligatoire: !f.est_obligatoire }))}
                  >
                    <span className="ap-switch-thumb" />
                  </button>
                </div>
              </div>

              <div className="cfg-modale-pied">
                <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setModale(false)}>
                  Annuler
                </button>
                <button type="submit" className="ap-btn" disabled={enCours}>
                  {enCours ? 'Enregistrement…' : 'Enregistrer et propager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale de confirmation de propagation ── */}
      {propagation && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="m-prop">
          <div className="cfg-modale" style={{ maxWidth: 520 }}>
            <div className="cfg-modale-tete">
              <h3 id="m-prop" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Share2 size={16} /> Confirmation de la propagation
              </h3>
              <button
                type="button"
                className="ap-drawer-close"
                onClick={() => setPropagation(null)}
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="cfg-modale-corps">
              <p className="cfg-confirm-texte">
                {propagation.count} classe(s) homologue(s) identifiée(s) pour cette configuration.
                Les matières ont été synchronisées automatiquement selon les règles de votre cycle.
              </p>
              <div className="cfg-confirm-resume">
                <strong>Classes synchronisées</strong>
                {propagation.classes.map((c) => (
                  <div key={c.uuid} style={{ marginTop: 4, fontSize: '0.85rem' }}>
                    <span className="ap-code">{c.sigle}</span> - {c.niveau} {c.subdivision ? `/ ${c.subdivision}` : ''}
                  </div>
                ))}
              </div>
            </div>
            <div className="cfg-modale-pied">
              <button type="button" className="ap-btn" onClick={() => setPropagation(null)}>
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
