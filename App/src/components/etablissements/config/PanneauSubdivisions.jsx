import { useEffect, useState } from 'react'
import { Plus, X, AlertTriangle, CheckCircle2, Building2, Users, Layers, ShieldCheck, RefreshCw } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import './FormulairePanneauSubdivision.css'
import {
  cyclesService,
  subdivisionsService,
} from '../../../services/etablissements/configurationAcademique.service'
import Loader from '../../../components/commun/Loader'

const CYCLES_UNIV = [
  { id: 'licence',     label: 'Cycle Licence',                 abr: 'L' },
  { id: 'licence_pro', label: 'Cycle Licence Professionnelle', abr: 'LP' },
  { id: 'master',      label: 'Cycle Master',                  abr: 'M' },
  { id: 'doctorat',    label: 'Cycle Doctorat',                abr: 'D' },
]

const TYPES = [
  { id: 'groupe',      label: 'Groupe',      ex: 'Groupe A, Groupe B…' },
  { id: 'section',     label: 'Section',     ex: 'Section Sciences, Section Lettres…' },
  { id: 'departement', label: 'Département', ex: 'Génie Électrique, Informatique…' },
]

const CYCLE_LABEL = {
  maternelle: 'Maternelle', primaire: 'Primaire', secondaire: 'Secondaire', universitaire: 'Université',
}

export default function PanneauSubdivisions({ anneeActive, onTerminee, cycleFiltre, cycleObj, labelTitre, labelType }) {
  const notify = useNotify()
  const [cycles,        setCycles]        = useState([])
  const [cycleActuel,   setCycleActuel]   = useState(cycleObj || null)
  const [cycleId,       setCycleId]       = useState('')
  const [items,         setItems]         = useState([])
  const [charge,        setCharge]        = useState(false)
  const [modale,        setModale]        = useState(false)
  const [enCours,       setEnCours]       = useState(false)
  const [cycleUnique,   setCycleUnique]   = useState(Boolean(cycleObj?.cycle_unique))
  const [basculeUnique, setBasculeUnique] = useState(false)

  const [form, setForm] = useState({
    nom: '',
    code: '',
    type: 'groupe',
    description: '',
    cycle_univ: 'licence',
    option_unique: false,
  })
  const [erreurs, setErreurs] = useState({})

  // Charger les cycles actifs de l'année
  useEffect(() => {
    if (!anneeActive) return
    cyclesService.lister(anneeActive.uuid).then((r) => {
      let liste = (r?.data ?? r ?? []).filter((c) => c.actif)
      if (cycleFiltre) liste = liste.filter((c) => c.cycle === cycleFiltre)
      setCycles(liste)
      const sel = liste.find((c) => c.cycle === cycleFiltre) || liste[0]
      if (sel) {
        setCycleActuel(sel)
        setCycleId(sel.uuid)
        setCycleUnique(Boolean(sel.cycle_unique))
      }
    }).catch(notify.fromError)
  }, [anneeActive?.uuid, cycleFiltre]) // eslint-disable-line

  // Charger les subdivisions
  const chargerSubdivisions = async () => {
    if (!cycleId) return
    setCharge(true)
    try {
      const r = await subdivisionsService.lister({ cycle_uuid: cycleId, annee_uuid: anneeActive?.uuid })
      const liste = r?.data ?? r ?? []
      setItems(liste)
      if (liste.length > 0) onTerminee('groupes')
    } catch (err) {
      notify.fromError(err)
    } finally {
      setCharge(false)
    }
  }

  useEffect(() => {
    chargerSubdivisions()
  }, [cycleId]) // eslint-disable-line

  const changerCycleUnique = async (estUnique) => {
    setBasculeUnique(true)
    try {
      await cyclesService.enregistrer({
        annee_uuid: anneeActive.uuid,
        cycle: cycleFiltre || cycleActuel?.cycle,
        actif: true,
        cycle_unique: estUnique,
      })
      setCycleUnique(estUnique)
      notify.success(
        estUnique
          ? 'Mode cycle unique activé : les sigles de classes seront directement leurs abréviations.'
          : 'Mode plusieurs groupes activé : vous pouvez créer Groupe A, Groupe B, etc.'
      )
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBasculeUnique(false)
    }
  }

  const ouvrirModale = () => {
    const isUniv = (cycleFiltre || cycleActuel?.cycle) === 'universitaire'
    setForm({
      nom: '',
      code: '',
      type: isUniv ? 'departement' : (labelType || 'groupe'),
      description: '',
      cycle_univ: 'licence',
      option_unique: false,
    })
    setErreurs({})
    setModale(true)
  }

  const appliquerSuggestion = (nom, code) => {
    setForm((f) => ({ ...f, nom, code }))
  }

  const valider = () => {
    const e = {}
    if (!form.nom.trim()) e.nom = 'Le nom est requis.'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettre = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnCours(true)
    try {
      await subdivisionsService.creer({
        annee_uuid:        anneeActive.uuid,
        cycle_config_uuid: cycleId,
        type:              form.type,
        nom:               form.nom.trim(),
        code:              form.code.trim() || undefined,
        description:       form.description.trim() || undefined,
        cycle_univ:        form.type === 'departement' ? form.cycle_univ : undefined,
        option_unique:     Boolean(form.option_unique),
      })
      notify.success(form.type === 'departement' ? 'Département créé' : 'Groupe créé', form.nom)
      setModale(false)
      await chargerSubdivisions()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnCours(false)
    }
  }

  const basculerActif = async (item) => {
    try {
      await subdivisionsService.modifier(item.uuid, { actif: !item.actif })
      setItems((prev) => prev.map((i) => (i.uuid === item.uuid ? { ...i, actif: !i.actif } : i)))
    } catch (err) {
      notify.fromError(err)
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

  const estUniv = (cycleFiltre || cycleActuel?.cycle) === 'universitaire'
  const estMaternelleOuPrimaire = ['maternelle', 'primaire'].includes(cycleFiltre || cycleActuel?.cycle)

  return (
    <div className="cfg-tab">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">
            {labelTitre ?? (estUniv ? 'Cycles & Départements' : 'Groupes pédagogiques')}
          </h2>
          <p className="ap-page-sub">
            Année académique : <strong>{anneeActive.libelle}</strong>
          </p>
        </div>
        <div className="ap-page-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={charger} disabled={charge}>
            <RefreshCw size={14} className={charge ? 'spin' : ''} /> Actualiser
          </button>
          {(!estMaternelleOuPrimaire || !cycleUnique) && cycleId && (
            <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}>
              <Plus size={14} /> {estUniv ? 'Nouveau département' : 'Ajouter un groupe'}
            </button>
          )}
        </div>
      </div>

      {/* Option Cycle unique pour Maternelle / Primaire */}
      {estMaternelleOuPrimaire && (
        <div className="ap-card" style={{ marginBottom: 20, borderLeft: '4px solid var(--sg-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={20} style={{ color: 'var(--sg-primary)' }} />
                <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 600 }}>Organisation des groupes</h4>
              </div>
              <p style={{ margin: '4px 0 0 28px', fontSize: '0.84rem', color: 'var(--sg-text-muted)' }}>
                {cycleUnique
                  ? "Cycle unique actif : une seule division par niveau (le sigle de la classe est directement son abréviation, ex. CM2 ou M1)."
                  : "Plusieurs groupes actifs : vous pouvez créer des groupes distincts (Groupe A, Groupe B). Le sigle deviendra CM2 A, CM2 B..."}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={`ap-btn ap-btn--sm ${cycleUnique ? 'ap-btn--primary' : 'ap-btn--ghost'}`}
                disabled={basculeUnique}
                onClick={() => changerCycleUnique(true)}
              >
                <CheckCircle2 size={14} /> Cycle unique (1 seul groupe)
              </button>
              <button
                type="button"
                className={`ap-btn ap-btn--sm ${!cycleUnique ? 'ap-btn--primary' : 'ap-btn--ghost'}`}
                disabled={basculeUnique}
                onClick={() => changerCycleUnique(false)}
              >
                <Users size={14} /> Plusieurs groupes (Groupe A, B…)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Si Maternelle/Primaire et cycle unique activé */}
      {estMaternelleOuPrimaire && cycleUnique ? (
        <div className="ap-card ap-empty" style={{ padding: '36px 20px', textAlign: 'center' }}>
          <CheckCircle2 size={40} style={{ color: 'var(--sg-primary)', margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 600 }}>Cycle unique configuré</h3>
          <p style={{ maxWidth: 520, margin: '0 auto 16px', color: 'var(--sg-text-muted)', fontSize: '0.88rem' }}>
            Aucun groupe supplémentaire n'est requis. Rendez-vous dans l'onglet <strong>Classes</strong> pour créer vos classes
            (leurs abréviations formeront directement les sigles finaux).
          </p>
          <button
            type="button"
            className="ap-btn ap-btn--ghost ap-btn--sm"
            onClick={() => changerCycleUnique(false)}
          >
            Passer à plusieurs groupes (Groupe A, Groupe B…)
          </button>
        </div>
      ) : charge ? (
        <div className="ap-card" style={{ padding: '2.5rem', display: 'flex', justifyContent: 'center' }}>
          <Loader mode="inline" label={estUniv ? "Chargement des départements…" : "Chargement des groupes…"} />
        </div>
      ) : items.length === 0 ? (
        <div className="ap-card ap-empty">
          <Plus size={36} aria-hidden="true" />
          <p>
            {estUniv
              ? 'Aucun département configuré pour ce cycle. Créez un département (ex: Génie Électrique).'
              : 'Aucun groupe configuré pour ce cycle. Créez au moins un groupe (ex: Groupe A).'}
          </p>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}>
            <Plus size={14} /> {estUniv ? 'Créer un département' : 'Créer un groupe'}
          </button>
        </div>
      ) : (
        <div className="ap-card ap-card--flush">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Code</th>
                {estUniv && <th>Cycle Univ.</th>}
                {estUniv && <th>Option unique ?</th>}
                {!estUniv && <th>Type</th>}
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.uuid}>
                  <td>
                    <strong>{it.nom}</strong>
                    {it.description && <small>{it.description}</small>}
                  </td>
                  <td>{it.code ? <span className="ap-code">{it.code}</span> : <span style={{ color: 'var(--sg-text-muted)' }}>-</span>}</td>
                  {estUniv && (
                    <td>
                      <span className="ap-badge ap-badge--info">
                        {CYCLES_UNIV.find((c) => c.id === it.cycle_univ)?.label ?? it.cycle_univ ?? 'Licence'}
                      </span>
                    </td>
                  )}
                  {estUniv && (
                    <td>
                      {it.option_unique ? (
                        <span className="ap-badge ap-badge--success">Oui (Niveaux directs)</span>
                      ) : (
                        <span className="ap-badge ap-badge--neutral">Non (Multi-options)</span>
                      )}
                    </td>
                  )}
                  {!estUniv && (
                    <td>
                      <span className="ap-badge ap-badge--neutral">
                        {it.type === 'groupe' ? 'Groupe' : it.type === 'departement' ? 'Département' : 'Section'}
                      </span>
                    </td>
                  )}
                  <td>
                    <span className={`ap-badge ${it.actif ? 'ap-badge--success' : 'ap-badge--neutral'}`}>
                      {it.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => basculerActif(it)}>
                      {it.actif ? 'Désactiver' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale d'ajout */}
      {modale && (
        <div className="modal-pro-overlay" role="dialog" aria-modal="true" aria-labelledby="m-sub">
          <div className="modal-pro-content">
            <div className="modal-pro-header">
              <h3 className="modal-pro-title" id="m-sub">
                {estUniv ? 'Nouveau département universitaire' : 'Nouveau groupe'}
              </h3>
              <button type="button" className="modal-pro-close" onClick={() => setModale(false)} aria-label="Fermer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={soumettre}>
              <div className="modal-pro-body">
                {estUniv ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Sous-cycle universitaire <span>*</span></label>
                      <select
                        className="form-input"
                        value={form.cycle_univ}
                        onChange={(e) => setForm((f) => ({ ...f, cycle_univ: e.target.value }))}
                      >
                        {CYCLES_UNIV.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label} ({c.abr})
                          </option>
                        ))}
                      </select>
                      <p className="form-hint">Cycle auquel appartient ce département.</p>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="sub-nom">Nom du département <span>*</span></label>
                      <input
                        id="sub-nom"
                        type="text"
                        className={`form-input${erreurs.nom ? ' has-error' : ''}`}
                        value={form.nom}
                        onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                        placeholder="Ex. Génie Électrique, Informatique et Télécommunications…"
                      />
                      {erreurs.nom && <p className="form-error">{erreurs.nom}</p>}
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="sub-code">Code / Abréviation <span>*</span></label>
                      <input
                        id="sub-code"
                        type="text"
                        className="form-input ap-input--mono"
                        value={form.code}
                        onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                        placeholder="Ex. GE, IT, GC…"
                      />
                    </div>

                    <div className="form-group" style={{ background: 'var(--sg-surface-alt)', padding: 12, borderRadius: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={form.option_unique}
                          onChange={(e) => setForm((f) => ({ ...f, option_unique: e.target.checked }))}
                          style={{ marginTop: 3 }}
                        />
                        <div>
                          <strong>Option unique pour ce département</strong>
                          <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--sg-text-muted)' }}>
                            Cochez si le département ne comporte pas de spécialités distinctes. Les niveaux d'études (L1, L2…) lui seront directement rattachés.
                          </p>
                        </div>
                      </label>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <p className="form-hint" style={{ marginBottom: 6 }}>Suggestions rapides :</p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['Groupe A (A)', 'Groupe B (B)', 'Groupe C (C)'].map((s) => {
                          const m = s.match(/^(.+?)\s+\((.+?)\)$/)
                          return (
                            <button
                              key={s}
                              type="button"
                              className="ap-btn ap-btn--ghost ap-btn--xs"
                              onClick={() => appliquerSuggestion(m[1], m[2])}
                            >
                              {s}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="sub-nom">Nom du groupe <span>*</span></label>
                      <input
                        id="sub-nom"
                        type="text"
                        className={`form-input${erreurs.nom ? ' has-error' : ''}`}
                        value={form.nom}
                        onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                        placeholder="Ex. Groupe A, Groupe B…"
                      />
                      {erreurs.nom && <p className="form-error">{erreurs.nom}</p>}
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="sub-code">Code du groupe (suffixe de classe)</label>
                      <input
                        id="sub-code"
                        type="text"
                        className="form-input ap-input--mono"
                        value={form.code}
                        onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                        placeholder="Ex. A, B, C…"
                      />
                      <p className="form-hint">Ce code sera concaténé au sigle de la classe (ex. CM2 A).</p>
                    </div>
                  </>
                )}
              </div>

              <div className="modal-pro-footer">
                <button type="button" className="btn-pro btn-pro--ghost" onClick={() => setModale(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-pro btn-pro--primary" disabled={enCours}>
                  {enCours ? 'Création…' : estUniv ? 'Créer le département' : 'Créer le groupe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}