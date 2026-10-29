/**
 * ModalAppelCandidature.jsx - Création et modification d'appels à candidature
 * Structuration stricte selon les 4 cycles d'enseignement :
 * 1. Maternelle & Primaire : ciblage par Groupe (ou Cycle unique)
 * 2. Secondaire : ciblage par Promotion, et pour les promotions à séries, par Série
 * 3. Universitaire : ciblage par Niveau d'études de chaque Filière (Département / Option)
 * Critères dynamiques (Age/Date, Type inscription : Test/Concours avec matières composées, etc.)
 * Pièces à fournir dynamiques, statut Payant/Gratuit (+ montant FCFA), dates/heures précises.
 */
import { useState, useEffect, useMemo } from 'react'
import {
  X,
  Plus,
  Trash2,
  Layers,
  FileText,
  DollarSign,
  HelpCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import {
  anneesService,
  subdivisionsService,
  niveauxService,
  seriesService,
} from '../../services/etablissements/configurationAcademique.service'
import Loader from '../../components/commun/Loader'

const CYCLES = [
  { id: 'maternelle',    label: 'Maternelle' },
  { id: 'primaire',      label: 'Primaire' },
  { id: 'secondaire',    label: 'Secondaire' },
  { id: 'universitaire', label: 'Université' },
]

const CYCLES_UNIV = [
  { id: 'licence',      label: 'Licence (L)' },
  { id: 'licence_pro',  label: 'Licence Professionnelle (LP)' },
  { id: 'master',       label: 'Master (M)' },
  { id: 'doctorat',     label: 'Doctorat (D)' },
  { id: 'ingenieur',    label: "Diplôme d'Ingénieur" },
]

export default function ModalAppelCandidature({
  ouvert,
  onFermer,
  onEnregistrer,
  appelInitial = null,
  enCours = false,
  cyclesDisponibles = [],
  anneeActive = null,
}) {
  // Cycles qui sont autorisés pour l'établissement ET activés pour l'année
  const cyclesAutorisesActifs = useMemo(() => {
    if (cyclesDisponibles.length > 0) {
      return CYCLES.filter((c) => cyclesDisponibles.includes(c.id))
    }
    return CYCLES
  }, [cyclesDisponibles])

  const cycleInitial = appelInitial?.cycle || (cyclesAutorisesActifs[0]?.id ?? 'primaire')

  // Données de configuration académique
  const [annees, setAnnees] = useState([])
  const [subdivisions, setSubdivisions] = useState([])
  const [niveaux, setNiveaux] = useState([])
  const [series, setSeries] = useState([])
  const [chargementDonnees, setChargementDonnees] = useState(false)

  // Formulaire d'appel
  const [form, setForm] = useState({
    titre: '',
    description: '',
    cycle: cycleInitial,
    annee_academique_uuid: anneeActive?.uuid || '',
    // Maternelle / Primaire :
    cycle_unique: false,
    subdivision_uuid: '',
    // Secondaire :
    promotion_uuid: '',
    serie_uuid: '',
    // Universitaire :
    cycle_univ: 'licence',
    departement_uuid: '',
    option_uuid: '',
    niveau_uuid: '',
    // Dates & Heures précises :
    date_debut: '',
    date_fin: '',
    // Statut & Frais :
    statut: 'ouvert',
    est_payant: false,
    frais_dossier: '',
    // Critères & Pièces :
    criteres_eligibilite: [],
    pieces_a_fournir: [],
  })

  const [erreurs, setErreurs] = useState({})

  // Charger les référentiels académiques lors de l'ouverture
  useEffect(() => {
    if (!ouvert) return
    const charger = async () => {
      setChargementDonnees(true)
      try {
        const anneeUuid = anneeActive?.uuid
        const [rAnn, rSub, rNiv, rSer] = await Promise.all([
          anneesService.lister(),
          subdivisionsService.lister(anneeUuid ? { annee_uuid: anneeUuid } : {}),
          niveauxService.lister(),
          seriesService.lister(),
        ])
        const listeAnnees = rAnn?.data ?? rAnn ?? []
        setAnnees(listeAnnees)
        setSubdivisions(rSub?.data ?? rSub ?? [])
        setNiveaux(rNiv?.data ?? rNiv ?? [])
        setSeries(rSer?.data ?? rSer ?? [])

        // Si nouvel appel, présélectionner l'année active
        if (!appelInitial) {
          const active = anneeActive || listeAnnees.find((a) => a.est_active) || listeAnnees[0]
          if (active) {
            setForm((f) => ({ ...f, annee_academique_uuid: active.uuid }))
          }
        }
      } catch (err) {
        console.error('Erreur chargement référentiels:', err)
      } finally {
        setChargementDonnees(false)
      }
    }
    charger()
  }, [ouvert, appelInitial, anneeActive?.uuid])

  // Initialisation ou réinitialisation du formulaire
  useEffect(() => {
    if (appelInitial) {
      setForm({
        titre: appelInitial.titre || '',
        description: appelInitial.description || '',
        cycle: appelInitial.cycle || cycleInitial,
        annee_academique_uuid: appelInitial.annee_academique_uuid || anneeActive?.uuid || '',
        cycle_unique: !!appelInitial.cycle_unique,
        subdivision_uuid: appelInitial.subdivision_uuid || '',
        promotion_uuid: appelInitial.promotion_uuid || '',
        serie_uuid: appelInitial.serie_uuid || '',
        cycle_univ: appelInitial.cycle_univ || 'licence',
        departement_uuid: appelInitial.departement_uuid || '',
        option_uuid: appelInitial.option_uuid || '',
        niveau_uuid: appelInitial.niveau_uuid || '',
        date_debut: appelInitial.date_debut ? appelInitial.date_debut.slice(0, 16) : '',
        date_fin: appelInitial.date_fin ? appelInitial.date_fin.slice(0, 16) : '',
        statut: appelInitial.statut || 'ouvert',
        est_payant: !!appelInitial.est_payant,
        frais_dossier: appelInitial.frais_dossier || '',
        criteres_eligibilite: Array.isArray(appelInitial.criteres_eligibilite)
          ? appelInitial.criteres_eligibilite
          : [],
        pieces_a_fournir: Array.isArray(appelInitial.pieces_a_fournir)
          ? appelInitial.pieces_a_fournir
          : [],
      })
    } else {
      const now = new Date()
      const debut = new Date(now.getTime() + 24 * 3600 * 1000).toISOString().slice(0, 16)
      const fin = new Date(now.getTime() + 31 * 24 * 3600 * 1000).toISOString().slice(0, 16)

      setForm((f) => ({
        ...f,
        titre: '',
        description: '',
        cycle: cycleInitial,
        annee_academique_uuid: anneeActive?.uuid || f.annee_academique_uuid,
        cycle_unique: false,
        subdivision_uuid: '',
        promotion_uuid: '',
        serie_uuid: '',
        cycle_univ: 'licence',
        departement_uuid: '',
        option_uuid: '',
        niveau_uuid: '',
        date_debut: debut,
        date_fin: fin,
        statut: 'ouvert',
        est_payant: false,
        frais_dossier: '',
        criteres_eligibilite: [
          {
            id: 'crit-1',
            type: 'type_inscription',
            label: "Modalité d'admission",
            mode: 'concours',
            matieres_composees: ['Mathématiques', 'Français'],
          },
          {
            id: 'crit-2',
            type: 'age',
            label: 'Tranche de date de naissance',
            date_min: '2008-01-01',
            date_max: '2012-12-31',
          },
        ],
        pieces_a_fournir: [
          { id: 'p-1', libelle: 'Acte de naissance légalisé', format: 'PDF', obligatoire: true },
          { id: 'p-2', libelle: 'Dernier relevé de notes / bulletin', format: 'PDF', obligatoire: true },
        ],
      }))
    }
    setErreurs({})
  }, [appelInitial, ouvert])

  // Filtres contextuels selon le cycle
  const subdivisionsCycle = useMemo(() => {
    return subdivisions.filter((s) => s.cycle === form.cycle || !s.cycle)
  }, [subdivisions, form.cycle])

  const promotionsSecondaire = useMemo(() => {
    return niveaux.filter((n) => n.cycle === 'secondaire')
  }, [niveaux])

  const promotionChoisie = useMemo(() => {
    return niveaux.find((n) => n.uuid === form.promotion_uuid) || null
  }, [niveaux, form.promotion_uuid])

  const seriesPromotion = useMemo(() => {
    if (!promotionChoisie) return []
    return series.filter(
      (s) =>
        s.promotion_id === promotionChoisie.id ||
        s.promotion?.uuid === promotionChoisie.uuid ||
        (!s.promotion_id && s.cycle === 'secondaire')
    )
  }, [series, promotionChoisie])

  // Université : départements, options, niveaux
  const departementsUniv = useMemo(() => {
    return subdivisions.filter((s) => s.type === 'departement' || s.cycle === 'universitaire')
  }, [subdivisions])

  const optionsUniv = useMemo(() => {
    return series.filter((s) => {
      const matchDep = !form.departement_uuid || s.subdivision?.uuid === form.departement_uuid
      return s.cycle === 'universitaire' && matchDep
    })
  }, [series, form.departement_uuid])

  const niveauxUniv = useMemo(() => {
    return niveaux.filter((n) => n.cycle === 'universitaire')
  }, [niveaux])

  // Génération automatique d'un titre représentatif
  const titreAuto = useMemo(() => {
    const nomCycle = CYCLES.find((c) => c.id === form.cycle)?.label ?? form.cycle
    if (form.cycle === 'maternelle' || form.cycle === 'primaire') {
      const sub = subdivisions.find((s) => s.uuid === form.subdivision_uuid)
      return form.cycle_unique
        ? `Appel à candidature - ${nomCycle} (Cycle unique)`
        : sub
        ? `Appel à candidature - ${nomCycle} (${sub.nom})`
        : `Appel à candidature - ${nomCycle}`
    }
    if (form.cycle === 'secondaire') {
      const prom = promotionChoisie ? promotionChoisie.nom : ''
      const ser = series.find((s) => s.uuid === form.serie_uuid)
      if (prom && ser) return `Appel à candidature - ${prom} Série ${ser.code || ser.nom}`
      if (prom) return `Appel à candidature - Promotion ${prom}`
      return `Appel à candidature - Secondaire`
    }
    if (form.cycle === 'universitaire') {
      const dep = departementsUniv.find((d) => d.uuid === form.departement_uuid)
      const opt = optionsUniv.find((o) => o.uuid === form.option_uuid)
      const niv = niveauxUniv.find((n) => n.uuid === form.niveau_uuid)
      const fNom = opt ? `${dep?.code || ''} ${opt.nom}` : dep?.nom || 'Filière'
      return niv ? `Appel à candidature - ${niv.nom} (${fNom})` : `Appel à candidature - Université`
    }
    return `Appel à candidature`
  }, [
    form.cycle,
    form.cycle_unique,
    form.subdivision_uuid,
    form.serie_uuid,
    form.departement_uuid,
    form.option_uuid,
    form.niveau_uuid,
    promotionChoisie,
    subdivisions,
    series,
    departementsUniv,
    optionsUniv,
    niveauxUniv,
  ])

  // --- Gestion des critères dynamiques ---
  const ajouterCritere = (typeDefaut = 'age') => {
    const nouveau = {
      id: `crit-${Date.now()}`,
      type: typeDefaut,
      label: typeDefaut === 'age' ? "Tranche d'âge" : 'Nouveau critère',
      date_min: '',
      date_max: '',
      mode: 'libre',
      matieres_composees: [],
      valeur_texte: '',
      valeur_nombre: '',
      obligatoire: true,
    }
    setForm((f) => ({ ...f, criteres_eligibilite: [...f.criteres_eligibilite, nouveau] }))
  }

  const modifierCritere = (id, champs) => {
    setForm((f) => ({
      ...f,
      criteres_eligibilite: f.criteres_eligibilite.map((c) => (c.id === id ? { ...c, ...champs } : c)),
    }))
  }

  const supprimerCritere = (id) => {
    setForm((f) => ({
      ...f,
      criteres_eligibilite: f.criteres_eligibilite.filter((c) => c.id !== id),
    }))
  }

  const ajouterMatiereComposee = (critId, matiere) => {
    if (!matiere.trim()) return
    setForm((f) => ({
      ...f,
      criteres_eligibilite: f.criteres_eligibilite.map((c) => {
        if (c.id !== critId) return c
        const actuelles = c.matieres_composees || []
        if (actuelles.includes(matiere.trim())) return c
        return { ...c, matieres_composees: [...actuelles, matiere.trim()] }
      }),
    }))
  }

  const supprimerMatiereComposee = (critId, index) => {
    setForm((f) => ({
      ...f,
      criteres_eligibilite: f.criteres_eligibilite.map((c) => {
        if (c.id !== critId) return c
        const actuelles = [...(c.matieres_composees || [])]
        actuelles.splice(index, 1)
        return { ...c, matieres_composees: actuelles }
      }),
    }))
  }

  // --- Gestion des pièces à fournir ---
  const ajouterPiece = () => {
    const nouvelle = {
      id: `p-${Date.now()}`,
      libelle: '',
      format: 'PDF',
      obligatoire: true,
    }
    setForm((f) => ({ ...f, pieces_a_fournir: [...f.pieces_a_fournir, nouvelle] }))
  }

  const modifierPiece = (id, champs) => {
    setForm((f) => ({
      ...f,
      pieces_a_fournir: f.pieces_a_fournir.map((p) => (p.id === id ? { ...p, ...champs } : p)),
    }))
  }

  const supprimerPiece = (id) => {
    setForm((f) => ({
      ...f,
      pieces_a_fournir: f.pieces_a_fournir.filter((p) => p.id !== id),
    }))
  }

  // --- Validation avant soumission ---
  const valider = () => {
    const err = {}
    if (!form.cycle) err.cycle = 'Cycle requis.'

    if (form.cycle === 'maternelle' || form.cycle === 'primaire') {
      if (!form.cycle_unique && !form.subdivision_uuid) {
        err.subdivision_uuid = 'Sélectionnez un groupe ou activez le Cycle unique.'
      }
    }

    if (form.cycle === 'secondaire') {
      if (!form.promotion_uuid) {
        err.promotion_uuid = 'Sélectionnez une promotion (ex. Sixième, Seconde).'
      }
      if (promotionChoisie?.a_series && !form.serie_uuid) {
        err.serie_uuid = 'Cette promotion comporte des séries : sélectionnez la série ciblée.'
      }
    }

    if (form.cycle === 'universitaire') {
      if (!form.departement_uuid) err.departement_uuid = 'Département requis.'
      if (!form.niveau_uuid) err.niveau_uuid = "Niveau d'études requis."
    }

    if (!form.date_debut) err.date_debut = 'Date et heure de début requises.'
    if (!form.date_fin) err.date_fin = 'Date et heure de fin requises.'
    if (form.date_debut && form.date_fin && form.date_debut >= form.date_fin) {
      err.date_fin = 'La date de fin doit être postérieure à la date de début.'
    }

    if (form.est_payant && (!form.frais_dossier || Number(form.frais_dossier) <= 0)) {
      err.frais_dossier = 'Précisez un montant valide supérieur à 0 FCFA.'
    }

    setErreurs(err)
    return Object.keys(err).length === 0
  }

  const soumettre = (ev) => {
    ev.preventDefault()
    if (!valider()) return

    const payload = {
      ...form,
      titre: form.titre.trim() || titreAuto,
      frais_dossier: form.est_payant ? Number(form.frais_dossier) : 0,
      annee_academique_uuid: form.annee_academique_uuid || undefined,
      subdivision_uuid: form.subdivision_uuid || undefined,
      promotion_uuid: form.promotion_uuid || undefined,
      serie_uuid: form.serie_uuid || undefined,
      departement_uuid: form.departement_uuid || undefined,
      option_uuid: form.option_uuid || undefined,
      niveau_uuid: form.niveau_uuid || undefined,
    }

    onEnregistrer(payload)
  }

  if (!ouvert) return null

  return (
    <div className="cfg-modale-fond" role="dialog" aria-modal="true" aria-labelledby="titre-modal-appel">
      <div className="cfg-modale" style={{ maxWidth: 760, maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="cfg-modale-tete" style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(4, 120, 87, 0.12)', display: 'grid', placeItems: 'center', color: 'var(--primary, #047857)' }}>
              <Layers size={20} />
            </div>
            <div>
              <h3 id="titre-modal-appel" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                {appelInitial ? "Modifier l'appel à candidature" : 'Lancer un appel à candidature'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--sg-text-muted, #64748b)' }}>
                Configuration institutionnelle selon le cycle, les critères d'éligibilité et pièces requises
              </p>
            </div>
          </div>
          <button type="button" className="ap-drawer-close" onClick={onFermer} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        {chargementDonnees ? (
          <div style={{ padding: '3.5rem', display: 'flex', justifyContent: 'center' }}>
            <Loader mode="inline" label="Chargement des données pédagogiques…" />
          </div>
        ) : (
          <form onSubmit={soumettre}>
          <div className="cfg-modale-corps" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 1. SÉLECTION DU CYCLE PÉDAGOGIQUE */}
            <div className="ap-card" style={{ padding: 16, background: 'var(--sg-surface-2, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <label className="ap-label" style={{ fontWeight: 700, marginBottom: 8, display: 'block' }}>
                1. Cycle d'enseignement cible *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                {cyclesAutorisesActifs.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        cycle: c.id,
                        subdivision_uuid: '',
                        promotion_uuid: '',
                        serie_uuid: '',
                        departement_uuid: '',
                        option_uuid: '',
                        niveau_uuid: '',
                      }))
                    }
                    className={`ap-btn ${form.cycle === c.id ? '' : 'ap-btn--ghost'}`}
                    style={{
                      justifyContent: 'center',
                      fontWeight: form.cycle === c.id ? 700 : 500,
                      borderColor: form.cycle === c.id ? 'var(--primary, #047857)' : undefined,
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              {cyclesAutorisesActifs.length === 1 && (
                <p className="ap-hint" style={{ marginTop: 8, color: 'var(--primary, #047857)', fontWeight: 500 }}>
                  Seul le cycle <strong>{cyclesAutorisesActifs[0].label}</strong> est actuellement autorisé et activé pour cette année académique.
                </p>
              )}
            </div>

            {/* 2. CIBLAGE SPÉCIFIQUE AU CYCLE */}
            <div className="ap-card" style={{ padding: 16, border: '1px solid var(--border-color, #e2e8f0)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <CheckCircle2 size={18} color="var(--primary, #047857)" />
                <strong style={{ fontSize: '0.95rem' }}>2. Structure cible du cycle {form.cycle}</strong>
              </div>

              {/* A. MATERNELLE & PRIMAIRE : Sélection du groupe ou Cycle unique */}
              {(form.cycle === 'maternelle' || form.cycle === 'primaire') && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input
                        type="checkbox"
                        checked={form.cycle_unique}
                        onChange={(e) => setForm((f) => ({ ...f, cycle_unique: e.target.checked, subdivision_uuid: '' }))}
                      />
                      <span>Établissement en <strong>Cycle unique</strong> (aucun groupe distinct)</span>
                    </label>
                  </div>

                  {!form.cycle_unique && (
                    <div className={`ap-field${erreurs.subdivision_uuid ? ' has-error' : ''}`}>
                      <label className="ap-label" htmlFor="app-grp">Groupe cible *</label>
                      <select
                        id="app-grp"
                        className="ap-input"
                        value={form.subdivision_uuid}
                        onChange={(e) => setForm((f) => ({ ...f, subdivision_uuid: e.target.value }))}
                      >
                        <option value="">-- Sélectionner le groupe (ex. Groupe A, Groupe B) --</option>
                        {subdivisionsCycle.map((s) => (
                          <option key={s.uuid} value={s.uuid}>
                            {s.nom} {s.code ? `(${s.code})` : ''}
                          </option>
                        ))}
                      </select>
                      {erreurs.subdivision_uuid && <p className="ap-error">{erreurs.subdivision_uuid}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* B. SECONDAIRE : Promotion & Séries */}
              {form.cycle === 'secondaire' && (
                <div style={{ display: 'grid', gridTemplateColumns: promotionChoisie?.a_series ? '1fr 1fr' : '1fr', gap: 14 }}>
                  <div className={`ap-field${erreurs.promotion_uuid ? ' has-error' : ''}`}>
                    <label className="ap-label" htmlFor="app-prom">Promotion *</label>
                    <select
                      id="app-prom"
                      className="ap-input"
                      value={form.promotion_uuid}
                      onChange={(e) => setForm((f) => ({ ...f, promotion_uuid: e.target.value, serie_uuid: '' }))}
                    >
                      <option value="">-- Sélectionner la promotion (ex. Sixième, Seconde, Terminale) --</option>
                      {promotionsSecondaire.map((p) => (
                        <option key={p.uuid} value={p.uuid}>
                          {p.nom} {p.abreviation ? `(${p.abreviation})` : ''} {p.a_series ? '- avec séries' : ''}
                        </option>
                      ))}
                    </select>
                    {erreurs.promotion_uuid && <p className="ap-error">{erreurs.promotion_uuid}</p>}
                  </div>

                  {promotionChoisie?.a_series && (
                    <div className={`ap-field${erreurs.serie_uuid ? ' has-error' : ''}`}>
                      <label className="ap-label" htmlFor="app-ser">Série ciblée *</label>
                      <select
                        id="app-ser"
                        className="ap-input"
                        value={form.serie_uuid}
                        onChange={(e) => setForm((f) => ({ ...f, serie_uuid: e.target.value }))}
                      >
                        <option value="">-- Sélectionner la série (ex. Série B, Série C, Tle D) --</option>
                        {seriesPromotion.map((s) => (
                          <option key={s.uuid} value={s.uuid}>
                            {s.code ? `${s.code} - ` : ''}{s.nom}
                          </option>
                        ))}
                      </select>
                      {erreurs.serie_uuid && <p className="ap-error">{erreurs.serie_uuid}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* C. UNIVERSITAIRE : Cycle Univ -> Filière (Dép/Option) -> Niveau d'études */}
              {form.cycle === 'universitaire' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="ap-field">
                      <label className="ap-label" htmlFor="app-u-cyc">Cycle universitaire *</label>
                      <select
                        id="app-u-cyc"
                        className="ap-input"
                        value={form.cycle_univ}
                        onChange={(e) => setForm((f) => ({ ...f, cycle_univ: e.target.value }))}
                      >
                        {CYCLES_UNIV.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className={`ap-field${erreurs.departement_uuid ? ' has-error' : ''}`}>
                      <label className="ap-label" htmlFor="app-u-dep">Département *</label>
                      <select
                        id="app-u-dep"
                        className="ap-input"
                        value={form.departement_uuid}
                        onChange={(e) => setForm((f) => ({ ...f, departement_uuid: e.target.value, option_uuid: '' }))}
                      >
                        <option value="">-- Sélectionner le département (ex. GE) --</option>
                        {departementsUniv.map((d) => (
                          <option key={d.uuid} value={d.uuid}>{d.nom} {d.code ? `(${d.code})` : ''}</option>
                        ))}
                      </select>
                      {erreurs.departement_uuid && <p className="ap-error">{erreurs.departement_uuid}</p>}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="ap-field">
                      <label className="ap-label" htmlFor="app-u-opt">Option / Spécialité</label>
                      <select
                        id="app-u-opt"
                        className="ap-input"
                        value={form.option_uuid}
                        onChange={(e) => setForm((f) => ({ ...f, option_uuid: e.target.value }))}
                      >
                        <option value="">-- Option unique ou globale --</option>
                        {optionsUniv.map((o) => (
                          <option key={o.uuid} value={o.uuid}>{o.code ? `${o.code} - ` : ''}{o.nom}</option>
                        ))}
                      </select>
                    </div>
                    <div className={`ap-field${erreurs.niveau_uuid ? ' has-error' : ''}`}>
                      <label className="ap-label" htmlFor="app-u-niv">Niveau d'études *</label>
                      <select
                        id="app-u-niv"
                        className="ap-input"
                        value={form.niveau_uuid}
                        onChange={(e) => setForm((f) => ({ ...f, niveau_uuid: e.target.value }))}
                      >
                        <option value="">-- Sélectionner le niveau (ex. L1, M1) --</option>
                        {niveauxUniv.map((n) => (
                          <option key={n.uuid} value={n.uuid}>{n.nom} {n.abreviation ? `(${n.abreviation})` : ''}</option>
                        ))}
                      </select>
                      {erreurs.niveau_uuid && <p className="ap-error">{erreurs.niveau_uuid}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. CRITÈRES D'ÉLIGIBILITÉ DYNAMIQUES */}
            <div className="ap-card" style={{ padding: 16, border: '1px solid var(--border-color, #e2e8f0)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HelpCircle size={18} color="var(--primary, #047857)" />
                  <strong style={{ fontSize: '0.95rem' }}>3. Critères d'éligibilité ({form.criteres_eligibilite.length})</strong>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => ajouterCritere('type_inscription')}
                    className="ap-btn ap-btn--ghost ap-btn--xs"
                  >
                    + Mode d'admission
                  </button>
                  <button
                    type="button"
                    onClick={() => ajouterCritere('age')}
                    className="ap-btn ap-btn--ghost ap-btn--xs"
                  >
                    + Tranche d'âge
                  </button>
                  <button
                    type="button"
                    onClick={() => ajouterCritere('texte')}
                    className="ap-btn ap-btn--xs"
                  >
                    <Plus size={12} /> Autre critère
                  </button>
                </div>
              </div>

              {form.criteres_eligibilite.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--sg-text-muted)', fontStyle: 'italic' }}>
                  Aucun critère défini. Cliquez sur les boutons ci-dessus pour ajouter des exigences d'âge, mode d'admission ou pièces.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {form.criteres_eligibilite.map((crit, idx) => (
                    <div
                      key={crit.id}
                      style={{
                        padding: 12,
                        background: 'var(--sg-surface-2, #f8fafc)',
                        borderRadius: 8,
                        border: '1px solid var(--border-color, #e2e8f0)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--primary, #047857)' }}>
                          Critère #{idx + 1} - {crit.type === 'age' ? 'Tranche de date/âge' : crit.type === 'type_inscription' ? "Modalité d'admission" : 'Personnalisé'}
                        </span>
                        <button
                          type="button"
                          onClick={() => supprimerCritere(crit.id)}
                          className="ap-btn ap-btn--ghost ap-btn--xs"
                          style={{ color: '#ef4444' }}
                          title="Supprimer ce critère"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Critère Type Inscription / Concours / Test */}
                      {crit.type === 'type_inscription' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                            <div className="ap-field">
                              <label className="ap-label">Libellé</label>
                              <input
                                className="ap-input"
                                value={crit.label}
                                onChange={(e) => modifierCritere(crit.id, { label: e.target.value })}
                                placeholder="Type d'inscription"
                              />
                            </div>
                            <div className="ap-field">
                              <label className="ap-label">Modalité</label>
                              <select
                                className="ap-input"
                                value={crit.mode || 'libre'}
                                onChange={(e) => modifierCritere(crit.id, { mode: e.target.value })}
                              >
                                <option value="concours">Concours d'entrée</option>
                                <option value="test">Test d'admission</option>
                                <option value="libre">Inscription libre</option>
                                <option value="selection">Sélection sur dossier</option>
                              </select>
                            </div>
                          </div>

                          {/* Matières composées si Concours ou Test */}
                          {(crit.mode === 'concours' || crit.mode === 'test') && (
                            <div style={{ background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                              <label className="ap-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                <Layers size={14} color="var(--primary, #047857)" />
                                Matières composées pour le {crit.mode === 'concours' ? 'concours' : 'test'} (obligatoire) :
                              </label>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                {(crit.matieres_composees || []).map((m, mIdx) => (
                                  <span
                                    key={mIdx}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      padding: '3px 8px',
                                      borderRadius: 4,
                                      background: '#ecfdf5',
                                      color: '#065f46',
                                      fontSize: '0.82rem',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {m}
                                    <button
                                      type="button"
                                      onClick={() => supprimerMatiereComposee(crit.id, mIdx)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                      <X size={12} />
                                    </button>
                                  </span>
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <input
                                  id={`mat-inp-${crit.id}`}
                                  className="ap-input"
                                  placeholder="Ajouter une épreuve (ex. Français, Mathématiques...)"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      ajouterMatiereComposee(crit.id, e.target.value)
                                      e.target.value = ''
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  className="ap-btn ap-btn--sm"
                                  onClick={() => {
                                    const inp = document.getElementById(`mat-inp-${crit.id}`)
                                    if (inp && inp.value) {
                                      ajouterMatiereComposee(crit.id, inp.value)
                                      inp.value = ''
                                    }
                                  }}
                                >
                                  Ajouter
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Critère Date / Tranche d'âge */}
                      {crit.type === 'age' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 10 }}>
                          <div className="ap-field">
                            <label className="ap-label">Libellé du critère</label>
                            <input
                              className="ap-input"
                              value={crit.label}
                              onChange={(e) => modifierCritere(crit.id, { label: e.target.value })}
                              placeholder="Tranche d'âge / Naissance"
                            />
                          </div>
                          <div className="ap-field">
                            <label className="ap-label">Né(e) après le</label>
                            <input
                              type="date"
                              className="ap-input"
                              value={crit.date_min || ''}
                              onChange={(e) => modifierCritere(crit.id, { date_min: e.target.value })}
                            />
                          </div>
                          <div className="ap-field">
                            <label className="ap-label">Né(e) avant le</label>
                            <input
                              type="date"
                              className="ap-input"
                              value={crit.date_max || ''}
                              onChange={(e) => modifierCritere(crit.id, { date_max: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      {/* Critère Texte libre */}
                      {crit.type === 'texte' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
                          <div className="ap-field">
                            <label className="ap-label">Libellé</label>
                            <input
                              className="ap-input"
                              value={crit.label}
                              onChange={(e) => modifierCritere(crit.id, { label: e.target.value })}
                              placeholder="Ex. Diplôme requis, Mention"
                            />
                          </div>
                          <div className="ap-field">
                            <label className="ap-label">Exigence / Valeur attendue</label>
                            <input
                              className="ap-input"
                              value={crit.valeur_texte || ''}
                              onChange={(e) => modifierCritere(crit.id, { valeur_texte: e.target.value })}
                              placeholder="Ex. Bac C ou D avec Mention AB"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. PIÈCES À FOURNIR DYNAMIQUES */}
            <div className="ap-card" style={{ padding: 16, border: '1px solid var(--border-color, #e2e8f0)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} color="var(--primary, #047857)" />
                  <strong style={{ fontSize: '0.95rem' }}>4. Pièces justificatives exigées ({form.pieces_a_fournir.length})</strong>
                </div>
                <button type="button" onClick={ajouterPiece} className="ap-btn ap-btn--xs">
                  <Plus size={12} /> Ajouter une pièce
                </button>
              </div>

              {form.pieces_a_fournir.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--sg-text-muted)', fontStyle: 'italic' }}>
                  Aucune pièce requise configurée. Cliquez sur le bouton ci-dessus pour définir les documents attendus (acte, bulletins, photos...).
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.pieces_a_fournir.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 100px 40px',
                        gap: 10,
                        alignItems: 'center',
                        padding: '6px 10px',
                        background: 'var(--sg-surface-2, #f8fafc)',
                        borderRadius: 6,
                      }}
                    >
                      <input
                        className="ap-input"
                        value={p.libelle}
                        onChange={(e) => modifierPiece(p.id, { libelle: e.target.value })}
                        placeholder="Libellé du document (ex. Acte de naissance)"
                      />
                      <select
                        className="ap-input"
                        value={p.format}
                        onChange={(e) => modifierPiece(p.id, { format: e.target.value })}
                      >
                        <option value="PDF">Format PDF</option>
                        <option value="JPEG, PNG">Image (JPG, PNG)</option>
                        <option value="PDF, JPG">Tous formats (PDF/Image)</option>
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={p.obligatoire}
                          onChange={(e) => modifierPiece(p.id, { obligatoire: e.target.checked })}
                        />
                        Obligatoire
                      </label>
                      <button
                        type="button"
                        onClick={() => supprimerPiece(p.id)}
                        className="ap-btn ap-btn--ghost ap-btn--xs"
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. FRAIS DE CANDIDATURE (PAYANT OU GRATUIT) */}
            <div className="ap-card" style={{ padding: 16, border: '1px solid var(--border-color, #e2e8f0)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <DollarSign size={18} color="var(--primary, #047857)" />
                <strong style={{ fontSize: '0.95rem' }}>5. Frais de dossier / candidature</strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem' }}>
                    <input
                      type="radio"
                      name="est_payant"
                      checked={!form.est_payant}
                      onChange={() => setForm((f) => ({ ...f, est_payant: false, frais_dossier: '' }))}
                    />
                    <span>Gratuit</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem' }}>
                    <input
                      type="radio"
                      name="est_payant"
                      checked={form.est_payant}
                      onChange={() => setForm((f) => ({ ...f, est_payant: true, frais_dossier: '10000' }))}
                    />
                    <span>Payant</span>
                  </label>
                </div>

                {form.est_payant && (
                  <div className={`ap-field${erreurs.frais_dossier ? ' has-error' : ''}`}>
                    <label className="ap-label" htmlFor="app-frais">Montant des frais (FCFA) *</label>
                    <input
                      id="app-frais"
                      type="number"
                      min={100}
                      step={500}
                      className="ap-input"
                      value={form.frais_dossier}
                      onChange={(e) => setForm((f) => ({ ...f, frais_dossier: e.target.value }))}
                      placeholder="Ex. 10000"
                    />
                    {erreurs.frais_dossier && <p className="ap-error">{erreurs.frais_dossier}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* 6. PÉRIODE DE CANDIDATURE AVEC HEURES PRÉCISES */}
            <div className="ap-card" style={{ padding: 16, border: '1px solid var(--border-color, #e2e8f0)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Clock size={18} color="var(--primary, #047857)" />
                <strong style={{ fontSize: '0.95rem' }}>6. Période de candidature (dates & heures exactes)</strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className={`ap-field${erreurs.date_debut ? ' has-error' : ''}`}>
                  <label className="ap-label" htmlFor="app-dt-deb">Date & Heure d'ouverture *</label>
                  <input
                    id="app-dt-deb"
                    type="datetime-local"
                    className="ap-input"
                    value={form.date_debut}
                    onChange={(e) => setForm((f) => ({ ...f, date_debut: e.target.value }))}
                  />
                  {erreurs.date_debut && <p className="ap-error">{erreurs.date_debut}</p>}
                </div>
                <div className={`ap-field${erreurs.date_fin ? ' has-error' : ''}`}>
                  <label className="ap-label" htmlFor="app-dt-fin">Date & Heure de clôture *</label>
                  <input
                    id="app-dt-fin"
                    type="datetime-local"
                    className="ap-input"
                    value={form.date_fin}
                    onChange={(e) => setForm((f) => ({ ...f, date_fin: e.target.value }))}
                  />
                  {erreurs.date_fin && <p className="ap-error">{erreurs.date_fin}</p>}
                </div>
              </div>
            </div>

            {/* 7. TITRE, DESCRIPTION & STATUT */}
            <div className="ap-card" style={{ padding: 16, border: '1px solid var(--border-color, #e2e8f0)' }}>
              <div className="ap-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="ap-label" htmlFor="app-tit">Titre de l'appel</label>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, titre: titreAuto }))}
                    className="ap-btn ap-btn--ghost ap-btn--xs"
                    style={{ fontSize: '0.75rem' }}
                  >
                    Intitulé automatique
                  </button>
                </div>
                <input
                  id="app-tit"
                  className="ap-input"
                  style={{ fontWeight: 600 }}
                  value={form.titre || titreAuto}
                  onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
                  placeholder={titreAuto}
                />
              </div>

              <div className="ap-field" style={{ marginTop: 12 }}>
                <label className="ap-label" htmlFor="app-desc">Description institutionnelle & Instructions</label>
                <textarea
                  id="app-desc"
                  rows={3}
                  className="ap-input"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Présentation de l'appel, consignes d'inscription, calendrier prévisionnel des épreuves..."
                />
              </div>

              <div className="ap-field" style={{ marginTop: 12, maxWidth: 200 }}>
                <label className="ap-label" htmlFor="app-stat">Statut initial</label>
                <select
                  id="app-stat"
                  className="ap-input"
                  value={form.statut}
                  onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}
                >
                  <option value="ouvert">Ouvert immédiatement</option>
                  <option value="brouillon">Brouillon</option>
                  <option value="termine">Terminé</option>
                  <option value="annule">Annulé</option>
                </select>
              </div>
            </div>
          </div>

          <div className="cfg-modale-pied" style={{ borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
            <button type="button" className="ap-btn ap-btn--ghost" onClick={onFermer}>
              Annuler
            </button>
            <button type="submit" className="ap-btn" disabled={enCours || chargementDonnees}>
              {enCours ? 'Enregistrement en cours…' : appelInitial ? "Mettre à jour l'appel" : "Lancer l'appel à candidature"}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}
