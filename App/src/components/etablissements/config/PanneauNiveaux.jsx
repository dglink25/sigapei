import { useEffect, useState } from 'react'
import { Plus, X, Layers, AlertTriangle, GitBranch, RefreshCw } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import {
  niveauxService,
  subdivisionsService,
  seriesService,
} from '../../../services/etablissements/configurationAcademique.service'
import Loader from '../../../components/commun/Loader'

const NIVEAUX_SUGGESTION = {
  maternelle: [
    { nom: 'Maternelle 1', abr: 'M1' },
    { nom: 'Maternelle 2', abr: 'M2' },
    { nom: 'Petite section', abr: 'PS' },
    { nom: 'Moyenne section', abr: 'MS' },
    { nom: 'Grande section', abr: 'GS' },
  ],
  primaire: [
    { nom: "Cours d'initiation", abr: 'CI' },
    { nom: 'Cours préparatoire', abr: 'CP' },
    { nom: 'Cours élémentaire 1ère année', abr: 'CE1' },
    { nom: 'Cours élémentaire 2ème année', abr: 'CE2' },
    { nom: 'Cours moyen 1ère année', abr: 'CM1' },
    { nom: 'Cours moyen 2ème année', abr: 'CM2' },
  ],
  secondaire: [
    { nom: 'Sixième', abr: '6ème', a_series: false },
    { nom: 'Cinquième', abr: '5ème', a_series: false },
    { nom: 'Quatrième', abr: '4ème', a_series: false },
    { nom: 'Troisième', abr: '3ème', a_series: false },
    { nom: 'Seconde', abr: '2nde', a_series: true },
    { nom: 'Première', abr: '1ère', a_series: true },
    { nom: 'Terminale', abr: 'Tle', a_series: true },
  ],
  universitaire: [
    { nom: 'Première Année (L1)', abr: 'L1' },
    { nom: 'Deuxième Année (L2)', abr: 'L2' },
    { nom: 'Troisième Année (L3)', abr: 'L3' },
    { nom: 'Master 1', abr: 'M1' },
    { nom: 'Master 2', abr: 'M2' },
    { nom: 'Doctorat 1ère Année', abr: 'D1' },
  ],
}

const CYCLE_LABEL = {
  maternelle: 'Maternelle', primaire: 'Primaire', secondaire: 'Secondaire', universitaire: 'Université',
}

export default function PanneauNiveaux({ anneeActive, onTerminee, cycleFiltre, labelTitre }) {
  const notify = useNotify()
  const [items,         setItems]         = useState([])
  const [departements,  setDepartements]  = useState([])
  const [options,       setOptions]       = useState([])
  const [charge,        setCharge]        = useState(true)
  const [modale,        setModale]        = useState(false)
  const [enCours,       setEnCours]       = useState(false)

  const [form, setForm] = useState({
    cycle: cycleFiltre || 'primaire',
    nom: '',
    abreviation: '',
    ordre: 0,
    a_series: false,
    subdivision_uuid: '',
    serie_uuid: '',
  })
  const [erreurs, setErreurs] = useState({})

  const estSecondaire = (cycleFiltre || form.cycle) === 'secondaire'
  const estUniv       = (cycleFiltre || form.cycle) === 'universitaire'

  const charger = async () => {
    setCharge(true)
    try {
      const [rNiv, rSub, rSer] = await Promise.all([
        niveauxService.lister({ cycle: cycleFiltre || undefined }),
        estUniv ? subdivisionsService.lister({ annee_uuid: anneeActive?.uuid }) : Promise.resolve([]),
        estUniv ? seriesService.lister({ cycle: 'universitaire' }) : Promise.resolve([]),
      ])
      const liste = rNiv?.data ?? rNiv ?? []
      setItems(liste)
      setDepartements(rSub?.data ?? rSub ?? [])
      setOptions(rSer?.data ?? rSer ?? [])
      if (liste.length > 0 && onTerminee) onTerminee('niveaux')
    } catch (err) {
      notify.fromError(err)
    } finally {
      setCharge(false)
    }
  }

  useEffect(() => {
    charger()
  }, [cycleFiltre, anneeActive?.uuid]) // eslint-disable-line

  const ouvrirModale = () => {
    setForm({
      cycle: cycleFiltre || 'primaire',
      nom: '',
      abreviation: '',
      ordre: items.length + 1,
      a_series: false,
      subdivision_uuid: '',
      serie_uuid: '',
    })
    setErreurs({})
    setModale(true)
  }

  const appliquerSuggestion = (sug) => {
    setForm((f) => ({
      ...f,
      nom: sug.nom,
      abreviation: sug.abr,
      a_series: sug.a_series ?? false,
    }))
  }

  const valider = () => {
    const e = {}
    if (!form.nom.trim()) e.nom = estSecondaire ? 'Le nom de la promotion est requis.' : 'Le nom est requis.'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettre = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnCours(true)
    try {
      await niveauxService.creer({
        cycle:            cycleFiltre || form.cycle,
        nom:              form.nom.trim(),
        abreviation:      form.abreviation.trim() || undefined,
        ordre:            form.ordre !== '' ? Number(form.ordre) : 0,
        a_series:         Boolean(form.a_series),
        subdivision_uuid: form.subdivision_uuid || undefined,
        serie_uuid:       form.serie_uuid || undefined,
      })
      notify.success(estSecondaire ? 'Promotion créée' : 'Niveau créé', form.nom)
      setModale(false)
      await charger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnCours(false)
    }
  }

  const basculer = async (item) => {
    try {
      await niveauxService.modifier(item.uuid, { actif: !item.actif })
      setItems((prev) => prev.map((i) => (i.uuid === item.uuid ? { ...i, actif: !i.actif } : i)))
    } catch (err) {
      notify.fromError(err)
    }
  }

  const suggestions = NIVEAUX_SUGGESTION[cycleFiltre || 'primaire'] ?? []

  // Pour l'université : filtrer les options selon le département sélectionné
  const depChoisi = departements.find((d) => d.uuid === form.subdivision_uuid)
  const optionsDuDep = options.filter((o) => !form.subdivision_uuid || o.subdivision?.uuid === form.subdivision_uuid)

  return (
    <div className="cfg-tab">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">
            {labelTitre ?? (estSecondaire ? 'Promotions' : estUniv ? "Niveaux d'études" : 'Niveaux scolaires')}
          </h2>
          <p className="ap-page-sub">
            {estSecondaire
              ? 'Définissez les promotions du secondaire (Sixième, Seconde, Terminale...). Vous pouvez spécifier si une promotion a des séries.'
              : estUniv
              ? "Définissez les années et niveaux d'études rattachés à chaque département ou option (L1, L2, Master 1...)."
              : 'Référentiel des niveaux scolaires partagé entre tous les groupes.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={charger} disabled={charge}>
            <RefreshCw size={14} className={charge ? 'spin' : ''} /> Actualiser
          </button>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}>
            <Plus size={14} /> {estSecondaire ? 'Nouvelle promotion' : 'Nouveau niveau'}
          </button>
        </div>
      </div>

      {charge ? (
        <div className="ap-card" style={{ padding: '2.5rem', display: 'flex', justifyContent: 'center' }}>
          <Loader mode="inline" label="Chargement des niveaux…" />
        </div>
      ) : items.length === 0 ? (
        <div className="ap-card ap-empty">
          <Layers size={36} aria-hidden="true" />
          <p>{estSecondaire ? 'Aucune promotion configurée.' : 'Aucun niveau configuré.'}</p>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}>
            <Plus size={14} /> {estSecondaire ? 'Créer une promotion' : 'Créer un niveau'}
          </button>
        </div>
      ) : (
        <div className="ap-card ap-card--flush">
          <table className="ap-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Ordre</th>
                <th>{estSecondaire ? 'Promotion' : 'Nom'}</th>
                <th>Abréviation</th>
                {estSecondaire && <th>Comporte des séries ?</th>}
                {estUniv && <th>Département / Option</th>}
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.uuid}>
                  <td style={{ color: 'var(--sg-text-muted)' }}>{it.ordre}</td>
                  <td><strong>{it.nom}</strong></td>
                  <td>{it.abreviation ? <span className="ap-code">{it.abreviation}</span> : '-'}</td>
                  {estSecondaire && (
                    <td>
                      {it.a_series ? (
                        <span className="ap-badge ap-badge--info" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <GitBranch size={12} /> Oui (ex: Série B, C)
                        </span>
                      ) : (
                        <span className="ap-badge ap-badge--neutral">Non (Classes directes)</span>
                      )}
                    </td>
                  )}
                  {estUniv && (
                    <td>
                      {it.subdivision?.nom ?? (it.serie ? `${it.serie.nom} (${it.serie.code})` : '-')}
                    </td>
                  )}
                  <td>
                    <span className={`ap-badge ${it.actif ? 'ap-badge--success' : 'ap-badge--neutral'}`}>
                      {it.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => basculer(it)}>
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
        <div className="modal-pro-overlay" role="dialog" aria-modal="true" aria-labelledby="m-niv">
          <div className="modal-pro-content">
            <div className="modal-pro-header">
              <h3 className="modal-pro-title" id="m-niv">
                {estSecondaire ? 'Nouvelle promotion' : 'Nouveau niveau scolaire'}
              </h3>
              <button type="button" className="modal-pro-close" onClick={() => setModale(false)} aria-label="Fermer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={soumettre}>
              <div className="modal-pro-body">
                {/* Suggestions rapides */}
                {suggestions.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <p className="form-hint" style={{ marginBottom: 6 }}>Suggestions courantes :</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {suggestions.map((s) => (
                        <button
                          key={s.nom}
                          type="button"
                          className="ap-btn ap-btn--ghost ap-btn--xs"
                          onClick={() => appliquerSuggestion(s)}
                        >
                          {s.nom} ({s.abr})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pour l'université : rattachement au département / option */}
                {estUniv && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Département universitaire</label>
                      <select
                        className="form-input"
                        value={form.subdivision_uuid}
                        onChange={(e) => setForm((f) => ({ ...f, subdivision_uuid: e.target.value, serie_uuid: '' }))}
                      >
                        <option value="">-- Rattacher à un département (optionnel) --</option>
                        {departements.map((d) => (
                          <option key={d.uuid} value={d.uuid}>
                            {d.nom} ({d.code}) {d.option_unique ? '• Option unique' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {depChoisi && !depChoisi.option_unique && optionsDuDep.length > 0 && (
                      <div className="form-group">
                        <label className="form-label">Option spécifique</label>
                        <select
                          className="form-input"
                          value={form.serie_uuid}
                          onChange={(e) => setForm((f) => ({ ...f, serie_uuid: e.target.value }))}
                        >
                          <option value="">-- Toutes les options ou commun --</option>
                          {optionsDuDep.map((o) => (
                            <option key={o.uuid} value={o.uuid}>
                              {o.nom} ({o.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="niv-nom">
                    {estSecondaire ? 'Nom de la promotion' : 'Nom du niveau'} <span>*</span>
                  </label>
                  <input
                    id="niv-nom"
                    type="text"
                    className={`form-input${erreurs.nom ? ' has-error' : ''}`}
                    value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    placeholder={estSecondaire ? 'Ex. Sixième, Seconde, Terminale…' : 'Ex. CI, CP, Licence 1…'}
                  />
                  {erreurs.nom && <p className="form-error">{erreurs.nom}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="niv-abr">Abréviation / Code court</label>
                  <input
                    id="niv-abr"
                    type="text"
                    className="form-input ap-input--mono"
                    value={form.abreviation}
                    onChange={(e) => setForm((f) => ({ ...f, abreviation: e.target.value }))}
                    placeholder={estSecondaire ? 'Ex. 6ème, 2nde, Tle…' : 'Ex. CI, CM2, L1…'}
                  />
                  <p className="form-hint">
                    Utilisée pour composer automatiquement les sigles de classes (ex. 6ème A, 2nde B1, CM2 A).
                  </p>
                </div>

                {/* Si Secondaire : option pour déclarer si la promotion a des séries */}
                {estSecondaire && (
                  <div className="form-group" style={{ background: 'var(--sg-surface-alt)', padding: 12, borderRadius: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.a_series}
                        onChange={(e) => setForm((f) => ({ ...f, a_series: e.target.checked }))}
                        style={{ marginTop: 3 }}
                      />
                      <div>
                        <strong>Cette promotion comporte des séries (ex: Seconde Série B, Terminale Série D)</strong>
                        <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--sg-text-muted)' }}>
                          Cochez cette case pour Seconde, Première, Terminale, etc. Vous pourrez créer des séries pour cette promotion dans l'onglet Séries.
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="niv-ordre">Ordre d'affichage</label>
                  <input
                    id="niv-ordre"
                    type="number"
                    min={0}
                    className="form-input"
                    value={form.ordre}
                    onChange={(e) => setForm((f) => ({ ...f, ordre: e.target.value }))}
                    style={{ maxWidth: 120 }}
                  />
                </div>
              </div>

              <div className="modal-pro-footer">
                <button type="button" className="btn-pro btn-pro--ghost" onClick={() => setModale(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-pro btn-pro--primary" disabled={enCours}>
                  {enCours ? 'Création…' : estSecondaire ? 'Créer la promotion' : 'Créer le niveau'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
