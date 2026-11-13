import { useState } from 'react'
import { Pencil, Plus, RefreshCw, Tags, Trash2 } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { financesService } from '../../services/finances/finances.service'
import { NATURES } from '../../config/finances/constantes'
import { anneeScolaireCourante } from '../../config/evaluations/constantes'
import Drawer from '../administration/Drawer'
import Switch from '../administration/Switch'
import { Badge, Champ, Chargement, EtatVide, aria, erreursChamps, formatDate, entier, formatMontant, useDonnees } from '../modules/outils'

const CYCLES = { maternelle: 'Maternelle', primaire: 'Primaire', secondaire: 'Secondaire', universitaire: 'Universitaire' }
/** Formules tarifaires : frais par année et par portée (établissement, cycle, niveau, classe), avec échéancier. */
export default function PanneauFormules({ actions, devise }) {
  const notify = useNotify()
  const peutGerer = actions.includes('gerer_tarifs')
  const [annee, setAnnee] = useState(anneeScolaireCourante())
  const liste = useDonnees(() => financesService.formules({ annee_scolaire: /^\d{4}-\d{4}$/.test(annee) ? annee : undefined }), [annee],
    { initial: { elements: [] }, onErreur: notify.fromError })
  const [form, setForm] = useState(null)
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const [bascule, setBascule] = useState(null)
  const formules = liste.donnees?.elements ?? []

  const ouvrir = (x) => {
    setErreurs({})
    setForm(x ? {
      uuid: x.uuid, code: x.code, libelle: x.libelle, nature: x.nature, annee_scolaire: x.annee_scolaire, cycle: x.cycle ?? '', niveau: x.niveau ?? '',
      montant: String(x.montant), echeancier: x.echeancier.map((e) => ({ libelle: e.libelle ?? '', date_echeance: e.date_echeance, montant: String(e.montant) })),
    } : { code: '', libelle: '', nature: 'scolarite', annee_scolaire: annee, cycle: '', niveau: '', montant: '', echeancier: [{ libelle: 'Tranche 1', date_echeance: '', montant: '' }] })
  }
  const somme = form ? form.echeancier.reduce((s, e) => s + (entier(e.montant) || 0), 0) : 0
  const majE = (i, k, v) => setForm((f) => ({ ...f, echeancier: f.echeancier.map((e, j) => (j === i ? { ...e, [k]: v } : e)) }))

  const enregistrer = async (ev) => {
    ev.preventDefault()
    const e = {}
    if (!form.uuid && !/^[a-z][a-z0-9_-]{2,59}$/.test(form.code.trim())) e.code = 'Minuscules, chiffres, « _ » ou « - » ; commence par une lettre.'
    if (form.libelle.trim().length < 3) e.libelle = 'Libellé de 3 caractères au moins.'
    if (!/^\d{4}-\d{4}$/.test(form.annee_scolaire)) e.annee_scolaire = 'Format attendu : 2026-2027.'
    const montant = entier(form.montant)
    if (!Number.isInteger(montant) || montant < 1) e.montant = 'Montant entier positif.'
    if (form.echeancier.some((x) => !x.date_echeance || !(entier(x.montant) > 0))) e.echeancier = 'Chaque échéance a une date et un montant.'
    else if (somme !== montant) e.echeancier = `La somme des échéances (${formatMontant(somme, devise)}) doit égaler le montant.`
    setErreurs(e)
    if (Object.keys(e).length) return
    const corps = {
      libelle: form.libelle.trim(), nature: form.nature, annee_scolaire: form.annee_scolaire, cycle: form.cycle || null, niveau: form.niveau.trim() || null, montant,
      echeancier: form.echeancier.map((x) => ({ libelle: x.libelle.trim() || null, date_echeance: x.date_echeance, montant: entier(x.montant) })),
    }
    setEnvoi(true)
    try {
      if (form.uuid) await financesService.modifierFormule(form.uuid, corps)
      else await financesService.creerFormule({ code: form.code.trim(), ...corps })
      notify.success(form.uuid ? 'Formule mise à jour' : 'Formule créée', form.libelle.trim())
      setForm(null)
      liste.recharger()
    } catch (err) {
      setErreurs(erreursChamps(err))
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  const basculer = async (x) => {
    setBascule(x.uuid)
    try { await financesService.modifierFormule(x.uuid, { actif: !x.actif }); liste.recharger() } catch (err) { notify.fromError(err) } finally { setBascule(null) }
  }

  return (
    <section className="ev" aria-labelledby="ev-titre-form">
      <div className="ev-entete">
        <div>
          <h2 className="ap-page-title" id="ev-titre-form">Formules tarifaires</h2>
          <p className="ap-page-sub">Montant et échéancier figés dès qu'une facture utilise la formule : créez-en une nouvelle pour changer un tarif.</p>
        </div>
        <div className="ev-actions">
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={liste.recharger} disabled={liste.chargement}><RefreshCw size={15} className={liste.chargement ? 'ap-spin' : ''} aria-hidden="true" /> Actualiser</button>
          {peutGerer && <button type="button" className="ap-btn ap-btn--sm" onClick={() => ouvrir(null)}><Plus size={15} aria-hidden="true" /> Nouvelle formule</button>}
        </div>
      </div>
      <div className="ap-card ev-filtres">
        <Champ id="ev-fo-annee" label="Année scolaire">
          <input {...aria('ev-fo-annee')} className="ap-input" maxLength={9} value={annee} placeholder="Exemple : 2026-2027" onChange={(e) => setAnnee(e.target.value.trim())} />
        </Champ>
      </div>
      {liste.chargement ? <Chargement label="Chargement…" /> : formules.length === 0 ? (
        <EtatVide icone={Tags} titre="Aucune formule" texte="Créez les frais de l'année (scolarité, inscription, cantine…) avant d'émettre des factures." />
      ) : (
        <div className="ap-card ap-card--flush ev-table-wrap">
          <table className="ap-table">
            <caption className="ap-sr">Formules tarifaires</caption>
            <thead><tr><th scope="col">Formule</th><th scope="col">Nature</th><th scope="col">Pour</th><th scope="col" className="ev-num">Montant</th><th scope="col">Échéances</th><th scope="col">Active</th><th scope="col"><span className="ap-sr">Modifier</span></th></tr></thead>
            <tbody>
              {formules.map((x) => (
                <tr key={x.uuid}>
                  <td><strong>{x.libelle}</strong><small>{x.code} - {x.annee_scolaire}</small></td>
                  <td>{NATURES[x.nature] ?? x.nature}</td>
                  <td>{x.classe_uuid ? 'Une classe' : x.niveau ? `Niveau ${x.niveau}` : x.cycle ? CYCLES[x.cycle] : 'Tout l\'établissement'}</td>
                  <td className="ev-num ev-fort">{formatMontant(x.montant, devise)}</td>
                  <td style={{ whiteSpace: 'normal', minWidth: 180 }}>{x.echeancier.map((e) => `${formatDate(e.date_echeance)} : ${formatMontant(e.montant, devise)}`).join(' ; ')}</td>
                  <td>{peutGerer ? <Switch checked={!!x.actif} busy={bascule === x.uuid} label={`${x.actif ? 'Désactiver' : 'Activer'} ${x.libelle}`} onChange={() => basculer(x)} /> : <Badge ton={x.actif ? 'success' : 'neutral'}>{x.actif ? 'Oui' : 'Non'}</Badge>}</td>
                  <td style={{ textAlign: 'right' }}>{peutGerer && <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => ouvrir(x)}><Pencil size={14} aria-hidden="true" /> Modifier</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={!!form} title={form?.uuid ? 'Modifier la formule' : 'Nouvelle formule'} onClose={() => !envoi && setForm(null)} busy={envoi}
        footer={(
          <>
            <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setForm(null)} disabled={envoi}>Annuler</button>
            <button type="submit" form="ev-form-formule" className="ap-btn" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
          </>
        )}>
        {form && (
          <form id="ev-form-formule" className="ev ev-form" onSubmit={enregistrer} noValidate>
            {!form.uuid && (
              <Champ id="ev-fo-code" label="Code" requis erreur={erreurs.code} aide="Référence stable (non modifiable).">
                <input {...aria('ev-fo-code', erreurs.code, true)} className="ap-input ap-input--mono" maxLength={60} value={form.code} placeholder="Exemple : scolarite-6e"
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toLowerCase() }))} />
              </Champ>
            )}
            <Champ id="ev-fo-lib" label="Libellé" requis erreur={erreurs.libelle}>
              <input {...aria('ev-fo-lib', erreurs.libelle)} className="ap-input" maxLength={150} value={form.libelle} placeholder="Exemple : Scolarité 6e"
                onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} />
            </Champ>
            <div className="ev-deux">
              <Champ id="ev-fo-nat" label="Nature" requis>
                <select {...aria('ev-fo-nat')} className="ap-input" value={form.nature} onChange={(e) => setForm((f) => ({ ...f, nature: e.target.value }))}>
                  {Object.entries(NATURES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Champ>
              <Champ id="ev-fo-an" label="Année scolaire" requis erreur={erreurs.annee_scolaire}>
                <input {...aria('ev-fo-an', erreurs.annee_scolaire)} className="ap-input" maxLength={9} value={form.annee_scolaire} placeholder="Exemple : 2026-2027"
                  onChange={(e) => setForm((f) => ({ ...f, annee_scolaire: e.target.value.trim() }))} />
              </Champ>
              <Champ id="ev-fo-cy" label="Cycle" aide="Vide : tout l'établissement.">
                <select {...aria('ev-fo-cy', null, true)} className="ap-input" value={form.cycle} onChange={(e) => setForm((f) => ({ ...f, cycle: e.target.value }))}>
                  <option value="">Tous</option>
                  {Object.entries(CYCLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Champ>
              <Champ id="ev-fo-niv" label="Niveau" aide="Comme dans la classe (exemple : 6e).">
                <input {...aria('ev-fo-niv', null, true)} className="ap-input" maxLength={60} value={form.niveau} placeholder="Exemple : 6e" onChange={(e) => setForm((f) => ({ ...f, niveau: e.target.value }))} />
              </Champ>
            </div>
            <Champ id="ev-fo-mt" label="Montant total" requis erreur={erreurs.montant}>
              <input {...aria('ev-fo-mt', erreurs.montant)} className="ap-input" inputMode="numeric" maxLength={14} value={form.montant} placeholder="Exemple : 150000"
                onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value.replace(/[^\d\s]/g, '') }))} />
            </Champ>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="ap-label" style={{ marginBottom: 8 }}>Échéancier <em aria-hidden="true" style={{ fontStyle: 'normal', color: '#c0392b' }}>*</em></legend>
              {form.echeancier.map((x, i) => (
                <div key={i} className="ev-ligne-echelle">
                  <input className="ap-input" aria-label={`Libellé de l'échéance ${i + 1}`} maxLength={120} value={x.libelle} placeholder="Exemple : Tranche 1" onChange={(e) => majE(i, 'libelle', e.target.value)} />
                  <input className="ap-input" type="date" aria-label={`Date de l'échéance ${i + 1}`} value={x.date_echeance} onChange={(e) => majE(i, 'date_echeance', e.target.value)} />
                  <input className="ap-input" inputMode="numeric" aria-label={`Montant de l'échéance ${i + 1}`} maxLength={14} value={x.montant} placeholder="Exemple : 50000" onChange={(e) => majE(i, 'montant', e.target.value.replace(/[^\d\s]/g, ''))} />
                  <button type="button" className="ap-btn ap-btn--ghost ap-btn--icon" aria-label={`Retirer l'échéance ${i + 1}`} disabled={form.echeancier.length === 1}
                    onClick={() => setForm((f) => ({ ...f, echeancier: f.echeancier.filter((_, j) => j !== i) }))}><Trash2 size={15} aria-hidden="true" /></button>
                </div>
              ))}
              {form.echeancier.length < 24 && (
                <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => setForm((f) => ({ ...f, echeancier: [...f.echeancier, { libelle: `Tranche ${f.echeancier.length + 1}`, date_echeance: '', montant: '' }] }))}>
                  <Plus size={14} aria-hidden="true" /> Ajouter une échéance
                </button>
              )}
              <p className="ap-hint" style={{ marginTop: 8 }}>Total des échéances : {formatMontant(somme, devise)}</p>
              {erreurs.echeancier && <p className="ap-error" role="alert">{erreurs.echeancier}</p>}
            </fieldset>
          </form>
        )}
      </Drawer>
    </section>
  )
}
