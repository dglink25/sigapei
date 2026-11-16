import { useState } from 'react'
import { FileCog, Pencil, Plus, RefreshCw, Sparkles } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { demandesService } from '../../services/demandes/demandes.service'
import { CATEGORIES_DEMANDEUR, REGLES } from '../../config/demandes/constantes'
import Drawer from '../administration/Drawer'
import Switch from '../administration/Switch'
import { Badge, Champ, Chargement, EtatVide, aria, erreursChamps, useDonnees } from '../modules/outils'

const VIDE = {
  code: '', nom: '', description: '', categorie_demandeur: 'apprenant', regles: {}, traitement_automatique: false, delai: '3',
  modele: { en_tete: '', titre: '', corps: '', mentions: '', signataire: '', lieu: '' },
}
const VARIABLES = '{{nom_complet}}, {{matricule}}, {{classe}}, {{date_naissance}}, {{fonction}}, {{date_du_jour}}, {{reference}}'

/** Types de documents de l'établissement : règles d'éligibilité, modèle du document, activation (configurer_types). */
export default function PanneauTypes() {
  const notify = useNotify()
  const liste = useDonnees(() => demandesService.types(true), [], { initial: [], onErreur: notify.fromError })
  const [form, setForm] = useState(null)
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const [bascule, setBascule] = useState(null)
  const types = liste.donnees ?? []

  const initialiser = async () => {
    setEnvoi(true)
    try {
      const r = await demandesService.initialiserTypes()
      notify.success('Documents standards', r?.message)
      liste.recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  const ouvrir = (t) => {
    setErreurs({})
    setForm(t ? {
      uuid: t.uuid, code: t.code, nom: t.nom, description: t.description ?? '', categorie_demandeur: t.categorie_demandeur,
      regles: { ...(t.regles_eligibilite ?? {}) }, traitement_automatique: !!t.traitement_automatique,
      delai: t.delai_indicatif_jours == null ? '' : String(t.delai_indicatif_jours),
      modele: { ...VIDE.modele, ...(t.modele ?? {}) },
    } : structuredClone(VIDE))
  }

  const enregistrer = async (ev) => {
    ev.preventDefault()
    const e = {}
    if (!form.uuid && !/^[a-z][a-z0-9_-]{2,59}$/.test(form.code.trim())) e.code = 'Minuscules, chiffres, « _ » ou « - » ; commence par une lettre (3 caractères au moins).'
    if (form.nom.trim().length < 3) e.nom = 'Nom de 3 caractères au moins.'
    if (form.delai !== '' && !(Number.isInteger(Number(form.delai)) && Number(form.delai) >= 0 && Number(form.delai) <= 365)) e.delai_indicatif_jours = 'Entre 0 et 365 jours.'
    setErreurs(e)
    if (Object.keys(e).length) return
    const regles = Object.fromEntries(Object.entries(REGLES).filter(([, r]) => r.categorie === form.categorie_demandeur).map(([k]) => [k, !!form.regles[k]]))
    const modele = Object.fromEntries(Object.entries(form.modele).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v))
    const corps = {
      nom: form.nom.trim(), description: form.description.trim() || undefined, categorie_demandeur: form.categorie_demandeur,
      regles_eligibilite: regles, traitement_automatique: form.traitement_automatique,
      ...(form.delai !== '' ? { delai_indicatif_jours: Number(form.delai) } : {}), modele,
    }
    setEnvoi(true)
    try {
      if (form.uuid) await demandesService.modifierType(form.uuid, corps)
      else await demandesService.creerType({ code: form.code.trim(), ...corps })
      notify.success(form.uuid ? 'Document mis à jour' : 'Document créé', form.nom.trim())
      setForm(null)
      liste.recharger()
    } catch (err) {
      setErreurs(erreursChamps(err))
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  const basculer = async (t) => {
    setBascule(t.uuid)
    try {
      await demandesService.modifierType(t.uuid, { actif: !t.actif })
      liste.recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBascule(null)
    }
  }

  const majModele = (k) => (e) => setForm((f) => ({ ...f, modele: { ...f.modele, [k]: e.target.value } }))

  return (
    <section className="ev" aria-labelledby="ev-titre-types">
      <div className="ev-entete">
        <div>
          <h2 className="ap-page-title" id="ev-titre-types">Documents délivrés</h2>
          <p className="ap-page-sub">Ce que l'on peut demander, à qui, à quelles conditions, et le texte du document produit.</p>
        </div>
        <div className="ev-actions">
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={liste.recharger} disabled={liste.chargement}>
            <RefreshCw size={15} className={liste.chargement ? 'ap-spin' : ''} aria-hidden="true" /> Actualiser
          </button>
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={initialiser} disabled={envoi}><Sparkles size={15} aria-hidden="true" /> Ajouter les documents standards</button>
          <button type="button" className="ap-btn ap-btn--sm" onClick={() => ouvrir(null)}><Plus size={15} aria-hidden="true" /> Nouveau document</button>
        </div>
      </div>

      {liste.chargement ? <Chargement label="Chargement…" /> : types.length === 0 ? (
        <EtatVide icone={FileCog} titre="Aucun document configuré" texte="Ajoutez les documents standards (certificat de scolarité, attestation de travail…) puis adaptez-les.">
          <button type="button" className="ap-btn ap-btn--sm" onClick={initialiser} disabled={envoi}><Sparkles size={15} aria-hidden="true" /> Ajouter les documents standards</button>
        </EtatVide>
      ) : (
        <div className="ap-card ap-card--flush ev-table-wrap">
          <table className="ap-table">
            <caption className="ap-sr">Documents délivrés</caption>
            <thead><tr><th scope="col">Document</th><th scope="col">Pour</th><th scope="col">Conditions</th><th scope="col">Délivrance</th><th scope="col">Actif</th><th scope="col"><span className="ap-sr">Modifier</span></th></tr></thead>
            <tbody>
              {types.map((t) => {
                const regles = Object.entries(t.regles_eligibilite ?? {}).filter(([, v]) => v).map(([k]) => REGLES[k]?.libelle ?? k)
                return (
                  <tr key={t.uuid}>
                    <td><strong>{t.nom}</strong><small>{t.code}</small></td>
                    <td>{CATEGORIES_DEMANDEUR[t.categorie_demandeur] ?? t.categorie_demandeur}</td>
                    <td style={{ whiteSpace: 'normal', minWidth: 200 }}>{regles.length ? regles.join(' ; ') : <span className="ev-muet">Aucune</span>}</td>
                    <td>{t.traitement_automatique ? <Badge ton="success">Automatique</Badge> : `Sous ${t.delai_indicatif_jours ?? '-'} jour(s)`}</td>
                    <td><Switch checked={!!t.actif} busy={bascule === t.uuid} label={`${t.actif ? 'Désactiver' : 'Activer'} ${t.nom}`} onChange={() => basculer(t)} /></td>
                    <td style={{ textAlign: 'right' }}><button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => ouvrir(t)}><Pencil size={14} aria-hidden="true" /> Modifier</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={!!form} title={form?.uuid ? 'Modifier le document' : 'Nouveau document'} onClose={() => !envoi && setForm(null)} busy={envoi}
        footer={(
          <>
            <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setForm(null)} disabled={envoi}>Annuler</button>
            <button type="submit" form="ev-form-type" className="ap-btn" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
          </>
        )}>
        {form && (
          <form id="ev-form-type" className="ev ev-form" onSubmit={enregistrer} noValidate>
            {!form.uuid && (
              <Champ id="ev-ty-code" label="Code" requis erreur={erreurs.code} aide="Référence stable, non modifiable ensuite.">
                <input {...aria('ev-ty-code', erreurs.code, true)} className="ap-input ap-input--mono" maxLength={60} value={form.code} placeholder="Exemple : certificat_frequentation"
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toLowerCase() }))} />
              </Champ>
            )}
            <Champ id="ev-ty-nom" label="Nom" requis erreur={erreurs.nom}>
              <input {...aria('ev-ty-nom', erreurs.nom)} className="ap-input" maxLength={120} value={form.nom} placeholder="Exemple : Certificat de fréquentation"
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />
            </Champ>
            <Champ id="ev-ty-desc" label="Description">
              <input {...aria('ev-ty-desc')} className="ap-input" maxLength={500} value={form.description} placeholder="Exemple : Atteste de la présence régulière de l'apprenant."
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </Champ>
            <div className="ev-deux">
              <Champ id="ev-ty-cat" label="Demandé par" requis erreur={erreurs.categorie_demandeur}>
                <select {...aria('ev-ty-cat', erreurs.categorie_demandeur)} className="ap-input" value={form.categorie_demandeur}
                  onChange={(e) => setForm((f) => ({ ...f, categorie_demandeur: e.target.value }))}>
                  {Object.entries(CATEGORIES_DEMANDEUR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Champ>
              <Champ id="ev-ty-delai" label="Délai indicatif (jours)" erreur={erreurs.delai_indicatif_jours}>
                <input {...aria('ev-ty-delai', erreurs.delai_indicatif_jours)} type="number" min={0} max={365} className="ap-input" value={form.delai} placeholder="Exemple : 3"
                  onChange={(e) => setForm((f) => ({ ...f, delai: e.target.value }))} />
              </Champ>
            </div>
            <fieldset style={{ border: 0, padding: 0, margin: '0 0 16px' }}>
              <legend className="ap-label" style={{ marginBottom: 8 }}>Conditions vérifiées automatiquement</legend>
              {Object.entries(REGLES).filter(([, r]) => r.categorie === form.categorie_demandeur).map(([k, r]) => (
                <label key={k} className="ev-case" htmlFor={`ev-ty-r-${k}`} style={{ marginBottom: 8 }}>
                  <input id={`ev-ty-r-${k}`} type="checkbox" checked={!!form.regles[k]} onChange={(e) => setForm((f) => ({ ...f, regles: { ...f.regles, [k]: e.target.checked } }))} />
                  {r.libelle}
                </label>
              ))}
              {form.categorie_demandeur === 'tout_profil' && <p className="ap-hint">Aucune condition automatique pour un document ouvert à tous.</p>}
              {erreurs.regles_eligibilite && <p className="ap-error" role="alert">{erreurs.regles_eligibilite}</p>}
              <label className="ev-case" htmlFor="ev-ty-auto" style={{ marginTop: 8 }}>
                <input id="ev-ty-auto" type="checkbox" checked={form.traitement_automatique} onChange={(e) => setForm((f) => ({ ...f, traitement_automatique: e.target.checked }))} />
                Délivrer automatiquement dès que les conditions sont remplies
              </label>
            </fieldset>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="ap-label" style={{ marginBottom: 8 }}>Modèle du document (PDF)</legend>
              <div className="ev-deux">
                <Champ id="ev-ty-et" label="En-tête"><input {...aria('ev-ty-et')} className="ap-input" maxLength={150} value={form.modele.en_tete} placeholder="Exemple : Collège Les Palmiers - Cotonou" onChange={majModele('en_tete')} /></Champ>
                <Champ id="ev-ty-ti" label="Titre"><input {...aria('ev-ty-ti')} className="ap-input" maxLength={120} value={form.modele.titre} placeholder="Exemple : CERTIFICAT DE SCOLARITÉ" onChange={majModele('titre')} /></Champ>
              </div>
              <Champ id="ev-ty-corps" label="Texte" aide={`Variables disponibles : ${VARIABLES}.`}>
                <textarea {...aria('ev-ty-corps', null, true)} className="ap-textarea" rows={7} maxLength={4000} value={form.modele.corps}
                  placeholder="Exemple : Je soussigné certifie que {{nom_complet}}, matricule {{matricule}}, est régulièrement inscrit(e) en classe de {{classe}}." onChange={majModele('corps')} />
              </Champ>
              <div className="ev-deux">
                <Champ id="ev-ty-sig" label="Signataire"><input {...aria('ev-ty-sig')} className="ap-input" maxLength={120} value={form.modele.signataire} placeholder="Exemple : Le Directeur" onChange={majModele('signataire')} /></Champ>
                <Champ id="ev-ty-lieu" label="Lieu"><input {...aria('ev-ty-lieu')} className="ap-input" maxLength={80} value={form.modele.lieu} placeholder="Exemple : Cotonou" onChange={majModele('lieu')} /></Champ>
              </div>
              <Champ id="ev-ty-ment" label="Mentions">
                <textarea {...aria('ev-ty-ment')} className="ap-textarea" rows={2} maxLength={1000} value={form.modele.mentions} placeholder="Exemple : En foi de quoi le présent certificat est délivré pour servir et valoir ce que de droit." onChange={majModele('mentions')} />
              </Champ>
            </fieldset>
          </form>
        )}
      </Drawer>
    </section>
  )
}
