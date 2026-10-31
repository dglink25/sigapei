/**
 * PanneauClasses - Classes concrètes selon la structure pédagogique par cycle :
 * - Maternelle & Primaire : Groupes (Groupe A, Groupe B) avec format de sigle "CM2 A",
 *   ou option "Cycle unique" sans groupe (sigle = "CM2").
 * - Secondaire : Promotions (Sixième, Seconde...), Séries (B, C, D...),
 *   choix classe unique (Sixième) ou multiples (Alphabétique: 6ème A, ou Numérique: 6ème M1).
 * Synchronisation automatique bidirectionnelle des matières.
 */
import { useEffect, useState, useMemo } from 'react'
import { Plus, X, Layers, AlertTriangle, Info, CheckCircle2, RefreshCw } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import {
  classesService,
  niveauxService,
  subdivisionsService,
  seriesService,
} from '../../../services/etablissements/configurationAcademique.service'
import Loader from '../../../components/commun/Loader'

const CYCLE_LABEL = {
  maternelle: 'Maternelle',
  primaire: 'Primaire',
  secondaire: 'Secondaire',
  universitaire: 'Université',
}

export default function PanneauClasses({ anneeActive, onTerminee, cycleFiltre, cycleObj, cyclesDisponibles = [] }) {
  const notify = useNotify()
  const [classes, setClasses] = useState([])
  const [niveaux, setNiveaux] = useState([])
  const [subs, setSubs] = useState([])
  const [series, setSeries] = useState([])
  const [filtreCycle, setFiltreCycle] = useState(cycleFiltre || '')
  const [charge, setCharge] = useState(false)
  const [modale, setModale] = useState(false)
  const [enCours, setEnCours] = useState(false)

  // Formulaire avec prise en compte des spécificités des cycles
  const [form, setForm] = useState({
    annee_uuid: '',
    cycle: 'primaire',
    niveau_uuid: '',
    subdivision_uuid: '',
    serie_uuid: '',
    // Secondaire :
    classe_unique_promotion: false,
    mode_numerotation: 'alphabetique', // 'alphabetique' ou 'numerique'
    suffixe_classe: 'A', // ex: 'A' pour 6ème A, ou 'M1' pour 6ème M1, '1' pour 2nde B1
    nom: '',
    sigle: '',
    effectif_previsionnel: '',
  })
  const [erreurs, setErreurs] = useState({})

  const charger = async () => {
    if (!anneeActive) return
    setCharge(true)
    try {
      const params = { annee_uuid: anneeActive.uuid }
      if (filtreCycle) params.cycle = filtreCycle
      const [rCls, rNiv, rSub, rSer] = await Promise.all([
        classesService.lister(params),
        niveauxService.lister(filtreCycle || undefined),
        subdivisionsService.lister({ annee_uuid: anneeActive.uuid }),
        seriesService.lister(filtreCycle || undefined),
      ])
      const cls = rCls?.data ?? rCls ?? []
      setClasses(cls)
      setNiveaux(rNiv?.data ?? rNiv ?? [])
      setSubs(rSub?.data ?? rSub ?? [])
      setSeries(rSer?.data ?? rSer ?? [])
      if (cls.length > 0 && typeof onTerminee === 'function') onTerminee('classes')
    } catch (err) {
      notify.fromError(err)
    } finally {
      setCharge(false)
    }
  }

  useEffect(() => {
    charger()
  }, [anneeActive?.uuid, filtreCycle]) // eslint-disable-line

  // Identification du niveau / promotion sélectionné(e)
  const niveauSelectionne = useMemo(() => {
    return niveaux.find((n) => n.uuid === form.niveau_uuid) || null
  }, [niveaux, form.niveau_uuid])

  // Séries disponibles pour la promotion choisie (secondaire)
  const seriesPourPromotion = useMemo(() => {
    if (!niveauSelectionne || niveauSelectionne.cycle !== 'secondaire') return []
    return series.filter(
      (s) =>
        s.promotion_id === niveauSelectionne.id ||
        s.promotion?.uuid === niveauSelectionne.uuid ||
        (!s.promotion_id && s.cycle === 'secondaire')
    )
  }, [series, niveauSelectionne])

  // Série sélectionnée
  const serieSelectionnee = useMemo(() => {
    return series.find((s) => s.uuid === form.serie_uuid) || null
  }, [series, form.serie_uuid])

  // Groupe sélectionné (maternelle / primaire)
  const groupeSelectionne = useMemo(() => {
    return subs.find((s) => s.uuid === form.subdivision_uuid) || null
  }, [subs, form.subdivision_uuid])

  // Calcul dynamique du Nom et du Sigle proposé
  useEffect(() => {
    if (!niveauSelectionne) return

    const cycleActuel = niveauSelectionne.cycle || form.cycle

    if (cycleActuel === 'maternelle' || cycleActuel === 'primaire') {
      const abr = niveauSelectionne.abreviation || niveauSelectionne.nom
      if (form.subdivision_uuid && groupeSelectionne) {
        const codeSub = groupeSelectionne.code || groupeSelectionne.nom.replace(/^Groupe\s+/i, '').trim()
        const sigleCalcul = `${abr} ${codeSub}`
        const nomCalcul = `${niveauSelectionne.nom} - ${groupeSelectionne.nom}`
        setForm((f) => ({ ...f, sigle: sigleCalcul, nom: nomCalcul }))
      } else {
        // Cycle unique : pas de groupe
        setForm((f) => ({ ...f, sigle: abr, nom: niveauSelectionne.nom }))
      }
    } else if (cycleActuel === 'secondaire') {
      const abr = niveauSelectionne.abreviation || niveauSelectionne.nom

      if (niveauSelectionne.a_series && serieSelectionnee) {
        // Promotion avec Série (ex: 2nde B1, Tle D)
        const codeSerie = serieSelectionnee.code || serieSelectionnee.nom
        const suffixe = (form.suffixe_classe || '1').trim()
        const sigleCalcul = `${abr} ${codeSerie}${suffixe}`
        const nomCalcul = `${niveauSelectionne.nom} Série ${codeSerie} ${suffixe}`
        setForm((f) => ({ ...f, sigle: sigleCalcul, nom: nomCalcul }))
      } else {
        // Promotion sans série (ex: Sixième)
        if (form.classe_unique_promotion) {
          setForm((f) => ({
            ...f,
            nom: niveauSelectionne.nom,
            sigle: abr,
          }))
        } else {
          const suffixe = (form.suffixe_classe || (form.mode_numerotation === 'numerique' ? 'M1' : 'A')).trim()
          const sigleCalcul = `${abr} ${suffixe}`
          const nomCalcul = `${niveauSelectionne.nom} ${suffixe}`
          setForm((f) => ({ ...f, sigle: sigleCalcul, nom: nomCalcul }))
        }
      }
    }
  }, [
    niveauSelectionne,
    serieSelectionnee,
    groupeSelectionne,
    form.classe_unique_promotion,
    form.mode_numerotation,
    form.suffixe_classe,
    form.subdivision_uuid,
    form.cycle,
  ])

  const cycles = ['', 'maternelle', 'primaire', 'secondaire', 'universitaire']

  const ouvrirModale = () => {
    const cycleCourant = filtreCycle || 'primaire'
    setForm({
      annee_uuid: anneeActive?.uuid ?? '',
      cycle: cycleCourant,
      niveau_uuid: '',
      subdivision_uuid: '',
      serie_uuid: '',
      classe_unique_promotion: false,
      mode_numerotation: 'alphabetique',
      suffixe_classe: 'A',
      nom: '',
      sigle: '',
      effectif_previsionnel: '',
    })
    setErreurs({})
    setModale(true)
  }

  const valider = () => {
    const e = {}
    if (!form.niveau_uuid) e.niveau_uuid = 'Sélectionnez un niveau / une promotion.'

    const cycle = niveauSelectionne?.cycle || form.cycle
    if (cycle === 'maternelle' || cycle === 'primaire') {
      const isCycleUnique = cycleObj?.cycle_unique || subs.filter((s) => s.cycle === cycle && s.actif).length === 0
      if (!isCycleUnique && !form.subdivision_uuid) {
        e.subdivision_uuid = 'Sélectionnez un groupe (ou configurez en Cycle unique).'
      }
    }

    if (cycle === 'secondaire' && niveauSelectionne?.a_series && !form.serie_uuid) {
      e.serie_uuid = 'Cette promotion comporte des séries : veuillez sélectionner une série.'
    }

    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettre = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnCours(true)
    try {
      await classesService.creer({
        annee_uuid: form.annee_uuid,
        niveau_uuid: form.niveau_uuid,
        subdivision_uuid: form.subdivision_uuid || undefined,
        serie_uuid: form.serie_uuid || undefined,
        nom: form.nom.trim() || undefined,
        mode_numerotation: form.mode_numerotation || undefined,
        sigle: form.sigle.trim() || undefined,
        effectif_previsionnel: form.effectif_previsionnel ? Number(form.effectif_previsionnel) : undefined,
      })
      notify.success('Classe créée', `La classe ${form.sigle} est prête avec synchronisation des matières.`)
      setModale(false)
      await charger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnCours(false)
    }
  }

  if (!anneeActive) {
    return (
      <div className="ap-card ap-empty">
        <AlertTriangle size={32} aria-hidden="true" />
        <p>Sélectionnez d'abord une année académique.</p>
      </div>
    )
  }

  const isSecondaire = (filtreCycle === 'secondaire') || (niveauSelectionne?.cycle === 'secondaire')
  const isMaternellePrimaire = (filtreCycle === 'maternelle' || filtreCycle === 'primaire') ||
    (niveauSelectionne?.cycle === 'maternelle' || niveauSelectionne?.cycle === 'primaire')

  const renduBandeauRegles = () => {
    if (filtreCycle === 'primaire') {
      return (
        <div className="ap-alert ap-alert--info" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
          <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary, #047857)' }} />
          <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
            <strong>Règle pédagogique Primaire :</strong>
            <p style={{ margin: '4px 0 0' }}>
              Toute classe créée appartient à un groupe (ex: <em>Groupe A</em>, <em>Groupe B</em>) formant les sigles (ex. <em>CM2 A</em>, <em>CM2 B</em>) ou au <em>Cycle unique</em> (ex. <em>CM2</em>). Toute matière assignée est automatiquement répercutée entre les classes homologues.
            </p>
          </div>
        </div>
      )
    }
    if (filtreCycle === 'maternelle') {
      return (
        <div className="ap-alert ap-alert--info" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
          <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary, #047857)' }} />
          <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
            <strong>Règle pédagogique Maternelle :</strong>
            <p style={{ margin: '4px 0 0' }}>
              Structure par groupes (ex: <em>M1 Groupe A</em>, <em>M1 Groupe B</em>) ou classe unique, avec synchronisation automatique des matières.
            </p>
          </div>
        </div>
      )
    }
    if (filtreCycle === 'secondaire') {
      return (
        <div className="ap-alert ap-alert--info" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
          <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary, #047857)' }} />
          <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
            <strong>Règles strictes Secondaire :</strong>
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
              <li><strong>Promotion sans série (Sixième, 5ème...) :</strong> Numérotation alphabétique (<em>6ème A</em>) ou numérique (<em>6ème M1</em>) ou classe unique.</li>
              <li><strong>Promotion à séries (Seconde, Terminale...) :</strong> Rattachée obligatoirement à une série (<em>2nde B1</em>, <em>2nde B2</em>) avec isolation stricte des matières.</li>
            </ul>
          </div>
        </div>
      )
    }
    return (
      <div className="ap-alert ap-alert--info" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
        <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary, #047857)' }} />
        <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
          <strong>Règles de synchronisation des classes :</strong>
          <p style={{ margin: '4px 0 0' }}>
            Les classes sont structurées selon le cycle et héritent automatiquement des matières pédagogiques associées.
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
            {filtreCycle === 'secondaire'
              ? 'Classes du Secondaire'
              : filtreCycle === 'maternelle' || filtreCycle === 'primaire'
              ? 'Classes Pédagogiques'
              : 'Classes'}
          </h2>
          <p className="ap-page-sub">
            Année : <strong>{anneeActive.libelle}</strong>
            {filtreCycle ? ` - Cycle ${CYCLE_LABEL[filtreCycle] ?? filtreCycle}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={charger} disabled={charge}>
            <RefreshCw size={14} className={charge ? 'spin' : ''} /> Actualiser
          </button>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}>
            <Plus size={14} /> Nouvelle classe
          </button>
        </div>
      </div>

      {renduBandeauRegles()}

      {!cycleFiltre && (
        <div className="ap-filters">
          {cycles.map((c) => (
            <button
              key={c}
              type="button"
              className={`ap-tab${filtreCycle === c ? ' is-active' : ''}`}
              onClick={() => setFiltreCycle(c)}
            >
              {c ? CYCLE_LABEL[c] : 'Tous les cycles'}
            </button>
          ))}
        </div>
      )}

      {charge ? (
        <div className="ap-card" style={{ padding: '2.5rem', display: 'flex', justifyContent: 'center' }}>
          <Loader mode="inline" label="Chargement des classes…" />
        </div>
      ) : classes.length === 0 ? (
        <div className="ap-card ap-empty">
          <Layers size={36} aria-hidden="true" />
          <p>Aucune classe configurée pour cette sélection.</p>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}>
            <Plus size={14} /> Créer la première classe
          </button>
        </div>
      ) : (
        <div className="ap-card ap-card--flush">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Sigle</th>
                <th>Nom de la classe</th>
                <th>{filtreCycle === 'secondaire' ? 'Promotion' : 'Niveau scolaire'}</th>
                {isMaternellePrimaire && <th>Groupe</th>}
                {isSecondaire && <th>Série</th>}
                <th>Effectif</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.uuid}>
                  <td>
                    <span className="ap-code" style={{ fontWeight: 700, color: 'var(--primary, #047857)' }}>
                      {c.sigle || '-'}
                    </span>
                  </td>
                  <td>
                    <strong>{c.nom || c.sigle || '-'}</strong>
                  </td>
                  <td>
                    <span className="ap-badge ap-badge--neutral">
                      {c.niveau?.nom ?? '-'}
                      {c.niveau?.abreviation ? ` (${c.niveau.abreviation})` : ''}
                    </span>
                  </td>
                  {isMaternellePrimaire && (
                    <td>
                      {c.subdivision ? (
                        <span className="ap-badge ap-badge--info">{c.subdivision.nom}</span>
                      ) : (
                        <span style={{ color: 'var(--sg-text-muted)', fontSize: '0.82rem' }}>Cycle unique</span>
                      )}
                    </td>
                  )}
                  {isSecondaire && (
                    <td>
                      {c.serie ? (
                        <span className="ap-badge ap-badge--warning" style={{ fontWeight: 600 }}>
                          {c.serie.code || c.serie.nom}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--sg-text-muted)' }}>-</span>
                      )}
                    </td>
                  )}
                  <td>{c.effectif_previsionnel ?? <span style={{ color: 'var(--sg-text-muted)' }}>-</span>}</td>
                  <td>
                    <span className={`ap-badge ${c.actif ? 'ap-badge--success' : 'ap-badge--neutral'}`}>
                      {c.actif ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modale de création d'une classe ── */}
      {modale && (
        <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="m-cls">
          <div className="cfg-modale" style={{ maxWidth: 560 }}>
            <div className="cfg-modale-tete">
              <h3 id="m-cls">
                {isSecondaire
                  ? 'Créer une classe du Secondaire'
                  : filtreCycle
                  ? `Nouvelle classe (${CYCLE_LABEL[filtreCycle] ?? filtreCycle})`
                  : 'Nouvelle classe'}
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
                {/* 1. Sélection Promotion / Niveau */}
                <div className={`ap-field${erreurs.niveau_uuid ? ' has-error' : ''}`}>
                  <label className="ap-label" htmlFor="cls-niv">
                    {filtreCycle === 'secondaire' ? 'Promotion *' : 'Niveau scolaire *'}
                  </label>
                  <select
                    id="cls-niv"
                    className="ap-input"
                    value={form.niveau_uuid}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        niveau_uuid: e.target.value,
                        serie_uuid: '',
                        classe_unique_promotion: false,
                      }))
                    }
                  >
                    <option value="">-- Sélectionner --</option>
                    {niveaux
                      .filter((n) => !filtreCycle || n.cycle === filtreCycle)
                      .map((n) => (
                        <option key={n.uuid} value={n.uuid}>
                          {n.nom} {n.abreviation ? `(${n.abreviation})` : ''}
                          {!filtreCycle ? ` - ${CYCLE_LABEL[n.cycle]}` : ''}
                        </option>
                      ))}
                  </select>
                  {erreurs.niveau_uuid && <p className="ap-error">{erreurs.niveau_uuid}</p>}
                </div>

                {/* 2. Logique SECONDAIRE */}
                {isSecondaire && niveauSelectionne && (
                  <>
                    {/* Cas A : La promotion comporte des Séries (ex: Seconde avec Série B, C...) */}
                    {niveauSelectionne.a_series ? (
                      <div className="ap-card" style={{ padding: 14, background: 'var(--sg-surface-2, #f8fafc)', marginBottom: 14, border: '1px solid var(--border-color, #e2e8f0)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <CheckCircle2 size={16} color="var(--primary, #047857)" />
                          <strong style={{ fontSize: '0.88rem' }}>Promotion à séries (ex. Seconde, Terminale)</strong>
                        </div>
                        <div className={`ap-field${erreurs.serie_uuid ? ' has-error' : ''}`}>
                          <label className="ap-label" htmlFor="cls-ser">Série associée *</label>
                          <select
                            id="cls-ser"
                            className="ap-input"
                            value={form.serie_uuid}
                            onChange={(e) => setForm((f) => ({ ...f, serie_uuid: e.target.value }))}
                          >
                            <option value="">-- Sélectionner la série --</option>
                            {seriesPourPromotion.map((s) => (
                              <option key={s.uuid} value={s.uuid}>
                                {s.code} - {s.nom}
                              </option>
                            ))}
                          </select>
                          {erreurs.serie_uuid && <p className="ap-error">{erreurs.serie_uuid}</p>}
                        </div>

                        <div className="ap-field" style={{ marginTop: 10 }}>
                          <label className="ap-label" htmlFor="cls-suf">Numéro / Index de classe</label>
                          <input
                            id="cls-suf"
                            className="ap-input ap-input--mono"
                            value={form.suffixe_classe}
                            onChange={(e) => setForm((f) => ({ ...f, suffixe_classe: e.target.value }))}
                            placeholder="Ex: 1 pour 2nde B1, 2 pour 2nde B2"
                          />
                          <p className="ap-hint">Exemple : pour Série B avec index 1 → Sigle <strong>2nde B1</strong>.</p>
                        </div>
                      </div>
                    ) : (
                      /* Cas B : Promotion sans série (ex: Sixième, Cinquième...) */
                      <div className="ap-card" style={{ padding: 14, background: 'var(--sg-surface-2, #f8fafc)', marginBottom: 14, border: '1px solid var(--border-color, #e2e8f0)' }}>
                        <label className="ap-label" style={{ marginBottom: 8, display: 'block' }}>
                          Une seule classe à créer pour cette promotion ?
                        </label>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.88rem' }}>
                            <input
                              type="radio"
                              name="unique_prom"
                              checked={form.classe_unique_promotion === true}
                              onChange={() => setForm((f) => ({ ...f, classe_unique_promotion: true }))}
                            />
                            Oui (Classe unique : Sixième / 6ème)
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.88rem' }}>
                            <input
                              type="radio"
                              name="unique_prom"
                              checked={form.classe_unique_promotion === false}
                              onChange={() => setForm((f) => ({ ...f, classe_unique_promotion: false }))}
                            />
                            Non (Plusieurs classes)
                          </label>
                        </div>

                        {!form.classe_unique_promotion && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="ap-field">
                              <label className="ap-label" htmlFor="cls-mod">Numérotation</label>
                              <select
                                id="cls-mod"
                                className="ap-input"
                                value={form.mode_numerotation}
                                onChange={(e) =>
                                  setForm((f) => ({
                                    ...f,
                                    mode_numerotation: e.target.value,
                                    suffixe_classe: e.target.value === 'numerique' ? 'M1' : 'A',
                                  }))
                                }
                              >
                                <option value="alphabetique">Alphabétique (ex: 6ème A)</option>
                                <option value="numerique">Numérique (ex: 6ème M1)</option>
                              </select>
                            </div>
                            <div className="ap-field">
                              <label className="ap-label" htmlFor="cls-suf-alpha">Suffixe / Lettre</label>
                              <input
                                id="cls-suf-alpha"
                                className="ap-input ap-input--mono"
                                value={form.suffixe_classe}
                                onChange={(e) => setForm((f) => ({ ...f, suffixe_classe: e.target.value }))}
                                placeholder={form.mode_numerotation === 'numerique' ? 'M1, M2...' : 'A, B, C...'}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* 3. Logique MATERNELLE / PRIMAIRE */}
                {isMaternellePrimaire && (
                  <div className={`ap-field${erreurs.subdivision_uuid ? ' has-error' : ''}`}>
                    <label className="ap-label" htmlFor="cls-sub">
                      Groupe associé
                      <span style={{ fontWeight: 400, marginLeft: 6, color: 'var(--sg-text-muted)' }}>
                        (Groupe A, Groupe B...)
                      </span>
                    </label>
                    <select
                      id="cls-sub"
                      className="ap-input"
                      value={form.subdivision_uuid}
                      onChange={(e) => setForm((f) => ({ ...f, subdivision_uuid: e.target.value }))}
                    >
                      <option value="">-- Aucun (Cycle unique / Classe sans groupe) --</option>
                      {subs
                        .filter((s) => s.actif && (!filtreCycle || s.cycle === filtreCycle))
                        .map((s) => (
                          <option key={s.uuid} value={s.uuid}>
                            {s.nom} {s.code ? `(${s.code})` : ''}
                          </option>
                        ))}
                    </select>
                    <p className="ap-hint">
                      Laissez vide si votre établissement fonctionne en <strong>Cycle unique</strong> (ex: CM2).
                    </p>
                    {erreurs.subdivision_uuid && <p className="ap-error">{erreurs.subdivision_uuid}</p>}
                  </div>
                )}

                {/* 4. Nom complet et Sigle calculé */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
                  <div className="ap-field">
                    <label className="ap-label" htmlFor="cls-nom">Nom complet de la classe</label>
                    <input
                      id="cls-nom"
                      className="ap-input"
                      value={form.nom}
                      onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                      placeholder="Généré automatiquement"
                    />
                  </div>
                  <div className="ap-field">
                    <label className="ap-label" htmlFor="cls-sig">Sigle (ex: CM2 A, 6ème A)</label>
                    <input
                      id="cls-sig"
                      className="ap-input ap-input--mono"
                      style={{ fontWeight: 700 }}
                      value={form.sigle}
                      onChange={(e) => setForm((f) => ({ ...f, sigle: e.target.value }))}
                      placeholder="Sigle"
                    />
                  </div>
                </div>

                {/* 5. Effectif prévisionnel */}
                <div className="ap-field">
                  <label className="ap-label" htmlFor="cls-eff">Effectif prévisionnel (élèves)</label>
                  <input
                    id="cls-eff"
                    type="number"
                    min={1}
                    className="ap-input"
                    style={{ maxWidth: 140 }}
                    value={form.effectif_previsionnel}
                    onChange={(e) => setForm((f) => ({ ...f, effectif_previsionnel: e.target.value }))}
                    placeholder="30"
                  />
                </div>

                {/* Notice de synchronisation */}
                <div className="ap-alert ap-alert--success" style={{ marginTop: 10, padding: '10px 12px', fontSize: '0.82rem' }}>
                  Les matières déjà configurées pour ce niveau / promotion seront automatiquement rattachées à cette classe dès sa création.
                </div>
              </div>

              <div className="cfg-modale-pied">
                <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setModale(false)}>
                  Annuler
                </button>
                <button type="submit" className="ap-btn" disabled={enCours}>
                  {enCours ? 'Création en cours…' : 'Créer la classe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
