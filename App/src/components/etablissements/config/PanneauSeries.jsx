import { useEffect, useState } from 'react'
import { Plus, X, GitBranch, AlertTriangle, Building2, School, RefreshCw } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import {
  seriesService,
  niveauxService,
  subdivisionsService,
} from '../../../services/etablissements/configurationAcademique.service'
import Loader from '../../../components/commun/Loader'

export default function PanneauSeries({ onTerminee, cycleFiltre, cycleForce, labelTitre }) {
  const notify = useNotify()
  const cycleCourant = cycleForce || cycleFiltre || 'secondaire'
  const estSecondaire = cycleCourant === 'secondaire'
  const estUniv       = cycleCourant === 'universitaire'

  const [items,         setItems]         = useState([])
  const [promotions,    setPromotions]    = useState([])
  const [departements,  setDepartements]  = useState([])
  const [charge,        setCharge]        = useState(true)
  const [modale,        setModale]        = useState(false)
  const [enCours,       setEnCours]       = useState(false)

  const [form, setForm] = useState({
    nom: '',
    code: '',
    description: '',
    promotion_uuid: '',
    subdivision_uuid: '',
  })
  const [erreurs, setErreurs] = useState({})

  const charger = async () => {
    setCharge(true)
    try {
      const [rSer, rNiv, rSub] = await Promise.all([
        seriesService.lister({ cycle: cycleCourant }),
        estSecondaire ? niveauxService.lister({ cycle: 'secondaire' }) : Promise.resolve([]),
        estUniv ? subdivisionsService.lister({ cycle_univ: undefined }) : Promise.resolve([]),
      ])
      const liste = rSer?.data ?? rSer ?? []
      setItems(liste)
      setPromotions(rNiv?.data ?? rNiv ?? [])
      setDepartements((rSub?.data ?? rSub ?? []).filter((s) => s.type === 'departement' && !s.option_unique))
      if (liste.length > 0 && onTerminee) onTerminee('series')
    } catch (err) {
      notify.fromError(err)
    } finally {
      setCharge(false)
    }
  }

  useEffect(() => {
    charger()
  }, [cycleCourant]) // eslint-disable-line

  const ouvrirModale = () => {
    const promoDefaut = promotions.find((p) => p.a_series)?.uuid || promotions[0]?.uuid || ''
    const depDefaut   = departements[0]?.uuid || ''
    setForm({
      nom: '',
      code: '',
      description: '',
      promotion_uuid: promoDefaut,
      subdivision_uuid: depDefaut,
    })
    setErreurs({})
    setModale(true)
  }

  const valider = () => {
    const e = {}
    if (!form.nom.trim()) e.nom = 'Le nom est requis.'
    if (!form.code.trim()) e.code = 'Le code/sigle est requis (ex: D, B, ELt).'
    if (estSecondaire && !form.promotion_uuid) e.promotion_uuid = 'Sélectionnez une promotion parente.'
    if (estUniv && !form.subdivision_uuid) e.subdivision_uuid = 'Sélectionnez un département parent.'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const soumettre = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnCours(true)
    try {
      await seriesService.creer({
        cycle:            cycleCourant,
        nom:              form.nom.trim(),
        code:             form.code.trim().toUpperCase(),
        description:      form.description.trim() || undefined,
        promotion_uuid:   estSecondaire ? form.promotion_uuid : undefined,
        subdivision_uuid: estUniv ? form.subdivision_uuid : undefined,
      })
      notify.success(estSecondaire ? 'Série créée avec succès' : 'Option créée avec succès', form.nom)
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
      await seriesService.modifier(item.uuid, { actif: !item.actif })
      setItems((prev) => prev.map((i) => (i.uuid === item.uuid ? { ...i, actif: !i.actif } : i)))
    } catch (err) {
      notify.fromError(err)
    }
  }

  const promoSelectionnee = promotions.find((p) => p.uuid === form.promotion_uuid)
  const depSelectionne    = departements.find((d) => d.uuid === form.subdivision_uuid)

  return (
    <div className="cfg-tab">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">
            {labelTitre ?? (estSecondaire ? 'Séries de promotion' : 'Options de département')}
          </h2>
          <p className="ap-page-sub">
            {estSecondaire
              ? 'Rattachez des séries spécifiques à chaque promotion du secondaire (ex: Seconde B, Seconde C, Terminale D, Terminale A).'
              : 'Créez les options (spécialités) pour chaque département universitaire (ex: GE Option Électricité, Option Électronique).'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={charger} disabled={charge}>
            <RefreshCw size={14} className={charge ? 'spin' : ''} /> Actualiser
          </button>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}>
            <Plus size={14} /> {estSecondaire ? 'Nouvelle série' : 'Nouvelle option'}
          </button>
        </div>
      </div>

      {charge ? (
        <div className="ap-card" style={{ padding: '2.5rem', display: 'flex', justifyContent: 'center' }}>
          <Loader mode="inline" label={estSecondaire ? "Chargement des séries…" : "Chargement des options / filières…"} />
        </div>
      ) : items.length === 0 ? (
        <div className="ap-card ap-empty">
          <GitBranch size={36} aria-hidden="true" />
          <p>
            {estSecondaire
              ? 'Aucune série configurée pour le secondaire. Créez des séries rattachées à vos promotions (ex: Série B pour Seconde, Série D pour Terminale).'
              : 'Aucune option configurée pour les départements universitaires.'}
          </p>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrirModale}>
            <Plus size={14} /> {estSecondaire ? 'Créer une série' : 'Créer une option'}
          </button>
        </div>
      ) : (
        <div className="ap-card ap-card--flush">
          <table className="ap-table">
            <thead>
              <tr>
                {estSecondaire && <th>Promotion</th>}
                {estUniv && <th>Département</th>}
                <th>Code</th>
                <th>Libellé complet</th>
                <th>Combinaison</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const promo = it.promotion?.nom || it.promotion?.abreviation || ''
                const combi = estSecondaire
                  ? `${it.promotion?.abreviation || it.promotion?.nom || ''} ${it.code}`
                  : `${it.subdivision?.code || it.subdivision?.nom || ''}-${it.code}`

                return (
                  <tr key={it.uuid}>
                    {estSecondaire && (
                      <td>
                        <strong>{it.promotion?.nom || '-'}</strong>
                        {it.promotion?.abreviation && <span className="ap-code" style={{ marginLeft: 6 }}>{it.promotion.abreviation}</span>}
                      </td>
                    )}
                    {estUniv && (
                      <td>
                        <strong>{it.subdivision?.nom || '-'}</strong>
                        {it.subdivision?.code && <span className="ap-code" style={{ marginLeft: 6 }}>{it.subdivision.code}</span>}
                      </td>
                    )}
                    <td><span className="ap-code">{it.code}</span></td>
                    <td>{it.nom}</td>
                    <td>
                      <span className="ap-badge ap-badge--info" style={{ fontWeight: 600 }}>
                        {combi.trim() || '-'}
                      </span>
                    </td>
                    <td>
                      <span className={`ap-badge ${it.actif ? 'ap-badge--success' : 'ap-badge--neutral'}`}>
                        {it.actif ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => basculer(it)}>
                        {it.actif ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale d'ajout */}
      {modale && (
        <div className="modal-pro-overlay" role="dialog" aria-modal="true" aria-labelledby="m-ser">
          <div className="modal-pro-content">
            <div className="modal-pro-header">
              <h3 className="modal-pro-title" id="m-ser">
                {estSecondaire ? 'Nouvelle série pour une promotion' : 'Nouvelle option départementale'}
              </h3>
              <button type="button" className="modal-pro-close" onClick={() => setModale(false)} aria-label="Fermer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={soumettre}>
              <div className="modal-pro-body">
                {estSecondaire ? (
                  <div className={`form-group${erreurs.promotion_uuid ? ' has-error' : ''}`}>
                    <label className="form-label">Promotion parente <span>*</span></label>
                    <select
                      className="form-input"
                      value={form.promotion_uuid}
                      onChange={(e) => setForm((f) => ({ ...f, promotion_uuid: e.target.value }))}
                    >
                      <option value="">-- Sélectionner une promotion --</option>
                      {promotions.map((p) => (
                        <option key={p.uuid} value={p.uuid}>
                          {p.nom} {p.abreviation ? `(${p.abreviation})` : ''} {p.a_series ? '(Séries attendues)' : ''}
                        </option>
                      ))}
                    </select>
                    {erreurs.promotion_uuid && <p className="form-error">{erreurs.promotion_uuid}</p>}
                    <p className="form-hint">Exemple : Seconde, Première, Terminale.</p>
                  </div>
                ) : (
                  <div className={`form-group${erreurs.subdivision_uuid ? ' has-error' : ''}`}>
                    <label className="form-label">Département parent <span>*</span></label>
                    <select
                      className="form-input"
                      value={form.subdivision_uuid}
                      onChange={(e) => setForm((f) => ({ ...f, subdivision_uuid: e.target.value }))}
                    >
                      <option value="">-- Sélectionner un département --</option>
                      {departements.map((d) => (
                        <option key={d.uuid} value={d.uuid}>
                          {d.nom} ({d.code})
                        </option>
                      ))}
                    </select>
                    {erreurs.subdivision_uuid && <p className="form-error">{erreurs.subdivision_uuid}</p>}
                  </div>
                )}

                <div className={`form-group${erreurs.code ? ' has-error' : ''}`}>
                  <label className="form-label" htmlFor="ser-code">
                    {estSecondaire ? 'Code de la série' : "Code de l'option"} <span>*</span>
                  </label>
                  <input
                    id="ser-code"
                    type="text"
                    className="form-input ap-input--mono"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder={estSecondaire ? 'Ex. D, B, C, A, F3, TI…' : 'Ex. El, ELt, GL, SI…'}
                  />
                  {erreurs.code && <p className="form-error">{erreurs.code}</p>}
                </div>

                <div className={`form-group${erreurs.nom ? ' has-error' : ''}`}>
                  <label className="form-label" htmlFor="ser-nom">
                    {estSecondaire ? 'Nom complet de la série' : "Nom complet de l'option"} <span>*</span>
                  </label>
                  <input
                    id="ser-nom"
                    type="text"
                    className="form-input"
                    value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    placeholder={estSecondaire ? 'Ex. Série D (Scientifique), Série B…' : 'Ex. Électricité, Électronique, Génie Logiciel…'}
                  />
                  {erreurs.nom && <p className="form-error">{erreurs.nom}</p>}
                </div>

                {/* Aperçu en temps réel */}
                {(form.code || form.nom) && (
                  <div style={{ background: 'var(--sg-surface-alt)', padding: 12, borderRadius: 8, marginTop: 10 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--sg-text-muted)' }}>Aperçu de la combinaison :</span>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--sg-primary)', marginTop: 2 }}>
                      {estSecondaire
                        ? `${promoSelectionnee?.abreviation || promoSelectionnee?.nom || 'Promotion'} ${form.code || '?'}`
                        : `${depSelectionne?.code || depSelectionne?.nom || 'Département'} / Option ${form.nom || '?'} (${form.code || '?'})`}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-pro-footer">
                <button type="button" className="btn-pro btn-pro--ghost" onClick={() => setModale(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-pro btn-pro--primary" disabled={enCours}>
                  {enCours ? 'Création…' : estSecondaire ? 'Créer la série' : "Créer l'option"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
