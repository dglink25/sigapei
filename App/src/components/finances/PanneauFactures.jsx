import { useMemo, useState } from 'react'
import { FilePlus2, Receipt, RefreshCw, Search, Users } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { financesService } from '../../services/finances/finances.service'
import { STATUTS_FACTURE, libelle } from '../../config/finances/constantes'
import { anneeScolaireCourante } from '../../config/evaluations/constantes'
import Drawer from '../administration/Drawer'
import Pagination from '../administration/Pagination'
import { libelleClasse, useClassesAccessibles } from '../modules/classes'
import { Badge, Champ, Chargement, EtatVide, aria, erreursChamps, formatDate, formatMontant, useDonnees } from '../modules/outils'
import FactureDetail from './FactureDetail'

/** Factures de l'établissement (consulter_finances) ; émission (emettre_factures). */
export default function PanneauFactures({ actions, devise, filtres, setFiltres }) {
  const notify = useNotify()
  const [f, setF] = useState({ statut: 'ouvertes', recherche: '', en_retard: false, annee_scolaire: '', tri: 'recentes', page: 1 })
  const [saisieRecherche, setSaisieRecherche] = useState('')
  const liste = useDonnees(() => financesService.factures(f), [f.statut, f.recherche, f.en_retard, f.annee_scolaire, f.tri, f.page],
    { initial: { elements: [], meta: null }, onErreur: notify.fromError })
  const [emission, setEmission] = useState(false)
  const maj = (k, v) => setF((x) => ({ ...x, [k]: v, page: k === 'page' ? v : 1 }))
  const elements = liste.donnees?.elements ?? []

  return (
    <section className="ev" aria-labelledby="ev-titre-fac">
      <div className="ev-entete">
        <div>
          <h2 className="ap-page-title" id="ev-titre-fac">Factures</h2>
          <p className="ap-page-sub">Une facture émise est figée ; une erreur se corrige par annulation motivée puis nouvelle émission.</p>
        </div>
        <div className="ev-actions">
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={liste.recharger} disabled={liste.chargement}>
            <RefreshCw size={15} className={liste.chargement ? 'ap-spin' : ''} aria-hidden="true" /> Actualiser
          </button>
          {actions.includes('emettre_factures') && <button type="button" className="ap-btn ap-btn--sm" onClick={() => setEmission(true)}><FilePlus2 size={15} aria-hidden="true" /> Émettre</button>}
        </div>
      </div>

      <div className="ap-card ev-filtres">
        <Champ id="ev-fa-statut" label="Statut">
          <select {...aria('ev-fa-statut')} className="ap-input" value={f.statut} onChange={(e) => maj('statut', e.target.value)}>
            <option value="ouvertes">Non soldées</option>
            <option value="">Toutes</option>
            {Object.entries(STATUTS_FACTURE).map(([k, v]) => <option key={k} value={k}>{v.libelle}</option>)}
          </select>
        </Champ>
        <form className="ap-field" onSubmit={(e) => { e.preventDefault(); maj('recherche', saisieRecherche.trim()) }}>
          <label className="ap-label" htmlFor="ev-fa-rech">Rechercher</label>
          <div className="ap-search" style={{ margin: 0 }}>
            <Search size={16} aria-hidden="true" />
            <input id="ev-fa-rech" type="search" className="ap-input" maxLength={80} value={saisieRecherche} placeholder="Exemple : FA-2026-000012 ou ADJO"
              onChange={(e) => { setSaisieRecherche(e.target.value); if (!e.target.value) maj('recherche', '') }} />
          </div>
        </form>
        <Champ id="ev-fa-annee" label="Année scolaire">
          <input {...aria('ev-fa-annee')} className="ap-input" maxLength={9} value={f.annee_scolaire} placeholder="Exemple : 2026-2027"
            onChange={(e) => { const v = e.target.value.trim(); if (!v || /^\d{4}-\d{4}$/.test(v)) maj('annee_scolaire', v); else setF((x) => ({ ...x, annee_scolaire: v })) }} />
        </Champ>
        <Champ id="ev-fa-tri" label="Trier par">
          <select {...aria('ev-fa-tri')} className="ap-input" value={f.tri} onChange={(e) => maj('tri', e.target.value)}>
            <option value="recentes">Plus récentes</option><option value="anciennes">Plus anciennes</option>
            <option value="reste_desc">Reste à payer décroissant</option><option value="nom">Nom de l'apprenant</option>
          </select>
        </Champ>
        <label className="ev-case" htmlFor="ev-fa-retard"><input id="ev-fa-retard" type="checkbox" checked={f.en_retard} onChange={(e) => maj('en_retard', e.target.checked)} /> En retard seulement</label>
      </div>

      {liste.chargement && !elements.length ? <Chargement label="Chargement des factures…" /> : elements.length === 0 ? (
        <EtatVide icone={Receipt} titre="Aucune facture" texte="Aucune facture ne correspond à ces critères." />
      ) : (
        <div className="ap-card ap-card--flush">
          <div className="ev-table-wrap">
            <table className="ap-table">
              <caption className="ap-sr">Factures</caption>
              <thead><tr><th scope="col">Numéro</th><th scope="col">Apprenant</th><th scope="col">Classe</th><th scope="col" className="ev-num">Montant</th><th scope="col" className="ev-num">Reste</th><th scope="col">Émise le</th><th scope="col">Statut</th><th scope="col"><span className="ap-sr">Ouvrir</span></th></tr></thead>
              <tbody>
                {elements.map((x) => (
                  <tr key={x.uuid}>
                    <td><span className="ap-code">{x.numero}</span></td>
                    <td><strong>{x.apprenant_nom ?? '-'}</strong>{x.apprenant_matricule && <small>{x.apprenant_matricule}</small>}</td>
                    <td>{x.classe_nom ?? '-'}</td>
                    <td className="ev-num">{formatMontant(x.montant_total, x.devise)}</td>
                    <td className="ev-num ev-fort">{formatMontant(x.reste_a_payer, x.devise)}</td>
                    <td>{formatDate(x.emise_le)}</td>
                    <td><Badge ton={libelle(STATUTS_FACTURE, x.statut).badge}>{libelle(STATUTS_FACTURE, x.statut).libelle}</Badge></td>
                    <td style={{ textAlign: 'right' }}><button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => setFiltres({ facture: x.uuid })}>Ouvrir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={liste.donnees?.meta} onPage={(p) => maj('page', p)} unite="facture" />
        </div>
      )}

      <FactureDetail uuid={filtres.facture || null} actions={actions} onClose={() => setFiltres({ facture: '' })} onChange={liste.recharger} />
      {actions.includes('emettre_factures') && <Emission open={emission} devise={devise} onClose={() => setEmission(false)} onEmise={(uuid) => { liste.recharger(); if (uuid) setFiltres({ facture: uuid }) }} />}
    </section>
  )
}

function Emission({ open, devise, onClose, onEmise }) {
  const notify = useNotify()
  const ref = useClassesAccessibles('administrateur', notify.fromError)
  const [f, setF] = useState({ mode: 'individuelle', classe: '', apprenant: '', annee: anneeScolaireCourante(), formules: [], libelle: '' })
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const apprenants = useDonnees(() => financesService.apprenantsDeClasse(f.classe), [f.classe], { actif: open && !!f.classe && f.mode === 'individuelle', initial: [] })
  const anneeOk = /^\d{4}-\d{4}$/.test(f.annee)
  const formules = useDonnees(
    async () => (f.mode === 'individuelle'
      ? financesService.formulesApplicables(f.apprenant, f.annee)
      : (await financesService.formules({ annee_scolaire: f.annee, actives: 1 })).elements),
    [f.mode, f.apprenant, f.annee],
    { actif: open && anneeOk && (f.mode === 'classe' || !!f.apprenant), initial: [] },
  )
  const total = useMemo(() => (formules.donnees ?? []).filter((x) => f.formules.includes(x.uuid)).reduce((s, x) => s + Number(x.montant), 0), [formules.donnees, f.formules])
  const fermer = () => { if (!envoi) { setErreurs({}); onClose() } }
  const maj = (changements) => setF((x) => ({ ...x, ...changements }))

  const emettre = async (ev) => {
    ev.preventDefault()
    const e = {}
    if (!f.classe) e.classe_uuid = 'Choisissez la classe.'
    if (f.mode === 'individuelle' && !f.apprenant) e.apprenant_uuid = 'Choisissez l\'apprenant.'
    if (!anneeOk) e.annee_scolaire = 'Format attendu : 2026-2027.'
    if (!f.formules.length) e.formules = 'Cochez au moins une formule.'
    setErreurs(e)
    if (Object.keys(e).length) return
    setEnvoi(true)
    try {
      const corps = { annee_scolaire: f.annee, formules: f.formules, ...(f.libelle.trim() ? { libelle: f.libelle.trim() } : {}) }
      const r = f.mode === 'individuelle'
        ? await financesService.emettre({ apprenant_uuid: f.apprenant, ...corps })
        : await financesService.emettrePourClasse({ classe_uuid: f.classe, ...corps })
      notify.success('Facturation', r?.message)
      maj({ apprenant: '', formules: [], libelle: '' })
      onClose()
      onEmise(f.mode === 'individuelle' ? r?.data?.uuid : null)
    } catch (err) {
      setErreurs(erreursChamps(err))
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Drawer open={open} title="Émettre des factures" subtitle="À partir des formules tarifaires de l'année ; une formule n'est jamais facturée deux fois au même apprenant."
      onClose={fermer} busy={envoi}
      footer={(
        <>
          <button type="button" className="ap-btn ap-btn--ghost" onClick={fermer} disabled={envoi}>Annuler</button>
          <button type="submit" form="ev-form-emission" className="ap-btn" disabled={envoi}>{envoi ? 'Émission…' : f.mode === 'classe' ? 'Facturer la classe' : 'Émettre la facture'}</button>
        </>
      )}>
      <form id="ev-form-emission" className="ev ev-form" onSubmit={emettre} noValidate>
        <div className="ap-filters" role="tablist" aria-label="Type d'émission" style={{ marginBottom: 14 }}>
          <button type="button" role="tab" aria-selected={f.mode === 'individuelle'} className={`ap-tab${f.mode === 'individuelle' ? ' is-active' : ''}`} onClick={() => maj({ mode: 'individuelle', formules: [] })}>Un apprenant</button>
          <button type="button" role="tab" aria-selected={f.mode === 'classe'} className={`ap-tab${f.mode === 'classe' ? ' is-active' : ''}`} onClick={() => maj({ mode: 'classe', formules: [] })}><Users size={14} aria-hidden="true" /> Toute une classe</button>
        </div>
        <div className="ev-deux">
          <Champ id="ev-em-annee" label="Année scolaire" requis erreur={erreurs.annee_scolaire}>
            <input {...aria('ev-em-annee', erreurs.annee_scolaire)} className="ap-input" maxLength={9} value={f.annee} placeholder="Exemple : 2026-2027" onChange={(e) => maj({ annee: e.target.value.trim(), formules: [] })} />
          </Champ>
          <Champ id="ev-em-classe" label="Classe" requis erreur={erreurs.classe_uuid}>
            <select {...aria('ev-em-classe', erreurs.classe_uuid)} className="ap-input" value={f.classe} disabled={ref.chargement} onChange={(e) => maj({ classe: e.target.value, apprenant: '', formules: [] })}>
              <option value="">{ref.chargement ? 'Chargement…' : 'Choisir'}</option>
              {ref.classes.map((c) => <option key={c.uuid} value={c.uuid}>{libelleClasse(c)}</option>)}
            </select>
          </Champ>
        </div>
        {f.mode === 'individuelle' && (
          <Champ id="ev-em-app" label="Apprenant" requis erreur={erreurs.apprenant_uuid}>
            <select {...aria('ev-em-app', erreurs.apprenant_uuid)} className="ap-input" value={f.apprenant} disabled={!f.classe || apprenants.chargement} onChange={(e) => maj({ apprenant: e.target.value, formules: [] })}>
              <option value="">{apprenants.chargement ? 'Chargement…' : 'Choisir'}</option>
              {(apprenants.donnees ?? []).map((a) => <option key={a.uuid} value={a.uuid}>{[a.nom, a.prenom].filter(Boolean).join(' ')}{a.matricule ? ` (${a.matricule})` : ''}</option>)}
            </select>
          </Champ>
        )}
        <fieldset style={{ border: 0, padding: 0, margin: '0 0 16px' }}>
          <legend className="ap-label" style={{ marginBottom: 8 }}>Formules <em aria-hidden="true" style={{ fontStyle: 'normal', color: '#c0392b' }}>*</em></legend>
          {formules.chargement ? <p className="ap-hint">Chargement…</p> : (formules.donnees ?? []).length === 0 ? (
            <p className="ap-hint">{f.mode === 'individuelle' && !f.apprenant ? 'Choisissez d\'abord l\'apprenant.' : 'Aucune formule active pour cette année.'}</p>
          ) : (formules.donnees ?? []).map((x) => (
            <label key={x.uuid} className="ev-case" htmlFor={`ev-em-f-${x.uuid}`} style={{ marginBottom: 8 }}>
              <input id={`ev-em-f-${x.uuid}`} type="checkbox" checked={f.formules.includes(x.uuid)}
                onChange={(e) => maj({ formules: e.target.checked ? [...f.formules, x.uuid] : f.formules.filter((u) => u !== x.uuid) })} />
              {x.libelle} - {formatMontant(x.montant, devise)}{x.niveau ? ` (${x.niveau})` : ''}
            </label>
          ))}
          {erreurs.formules && <p className="ap-error" role="alert">{erreurs.formules}</p>}
          {total > 0 && <p style={{ margin: '6px 0 0' }}>Total par apprenant : <strong>{formatMontant(total, devise)}</strong></p>}
          {f.mode === 'classe' && <p className="ap-hint">Les formules doivent concerner le niveau de la classe ; les apprenants déjà facturés sont ignorés.</p>}
        </fieldset>
        <Champ id="ev-em-lib" label="Libellé de la facture">
          <input {...aria('ev-em-lib')} className="ap-input" maxLength={200} value={f.libelle} placeholder="Exemple : Scolarité 2026-2027" onChange={(e) => maj({ libelle: e.target.value })} />
        </Champ>
      </form>
    </Drawer>
  )
}
