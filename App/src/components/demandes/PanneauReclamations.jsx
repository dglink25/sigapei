import { useEffect, useRef, useState } from 'react'
import { MessageSquarePlus, MessagesSquare, RefreshCw, Send } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { demandesService } from '../../services/demandes/demandes.service'
import { CATEGORIES_RECLAMATION, FAMILLE, STATUTS_RECLAMATION, libelleStatut, nomBeneficiaire } from '../../config/demandes/constantes'
import Drawer from '../administration/Drawer'
import Pagination from '../administration/Pagination'
import { Badge, Champ, Chargement, EtatVide, aria, erreursChamps, formatDate, formatDateHeure, useDonnees } from '../modules/outils'

/**
 * Réclamations : échange écrit entre un usager et l'établissement.
 *  - mode « miennes » : celles de l'utilisateur, nouvelle réclamation ;
 *  - mode « recues » : file de l'établissement (repondre_reclamation, limitée aux catégories du rôle).
 */
export default function PanneauReclamations({ mode, role }) {
  const notify = useNotify()
  const recues = mode === 'recues'
  const [f, setF] = useState({ statut: '', categorie: '', page: 1 })
  const liste = useDonnees(() => (recues ? demandesService.reclamationsRecues(f) : demandesService.mesReclamations(f)), [mode, f.statut, f.categorie, f.page],
    { initial: { elements: [], meta: null }, onErreur: notify.fromError })
  const [ouverte, setOuverte] = useState(null)
  const [nouvelle, setNouvelle] = useState(false)
  const elements = liste.donnees?.elements ?? []
  const maj = (k, v) => setF((x) => ({ ...x, [k]: v, page: k === 'page' ? v : 1 }))

  return (
    <section className="ev" aria-labelledby="ev-titre-recl">
      <div className="ev-entete">
        <div>
          <h2 className="ap-page-title" id="ev-titre-recl">{recues ? 'Réclamations reçues' : 'Mes réclamations'}</h2>
          <p className="ap-page-sub">{recues ? 'Répondez par écrit ; l\'usager est notifié à chaque message.' : 'Un échange écrit et suivi avec l\'établissement.'}</p>
        </div>
        <div className="ev-actions">
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={liste.recharger} disabled={liste.chargement}>
            <RefreshCw size={15} className={liste.chargement ? 'ap-spin' : ''} aria-hidden="true" /> Actualiser
          </button>
          {!recues && <button type="button" className="ap-btn ap-btn--sm" onClick={() => setNouvelle(true)}><MessageSquarePlus size={15} aria-hidden="true" /> Nouvelle réclamation</button>}
        </div>
      </div>

      <div className="ap-card ev-filtres">
        <Champ id="ev-rc-statut" label="Statut">
          <select {...aria('ev-rc-statut')} className="ap-input" value={f.statut} onChange={(e) => maj('statut', e.target.value)}>
            <option value="">Tous</option>
            {Object.entries(STATUTS_RECLAMATION).map(([k, v]) => <option key={k} value={k}>{v.libelle}</option>)}
          </select>
        </Champ>
        <Champ id="ev-rc-cat" label="Catégorie">
          <select {...aria('ev-rc-cat')} className="ap-input" value={f.categorie} onChange={(e) => maj('categorie', e.target.value)}>
            <option value="">Toutes</option>
            {Object.entries(CATEGORIES_RECLAMATION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Champ>
      </div>

      {liste.chargement && !elements.length ? <Chargement label="Chargement…" /> : elements.length === 0 ? (
        <EtatVide icone={MessagesSquare} titre="Aucune réclamation" texte={recues ? 'Aucune réclamation dans cette sélection.' : 'Vous n\'avez ouvert aucune réclamation.'} />
      ) : (
        <div className="ap-card ap-card--flush">
          <div className="ev-table-wrap">
            <table className="ap-table">
              <caption className="ap-sr">Réclamations</caption>
              <thead><tr><th scope="col">Référence</th><th scope="col">Objet</th><th scope="col">Catégorie</th><th scope="col">Dernier message</th><th scope="col">Statut</th><th scope="col"><span className="ap-sr">Ouvrir</span></th></tr></thead>
              <tbody>
                {elements.map((r) => {
                  const s = libelleStatut(STATUTS_RECLAMATION, r.statut)
                  return (
                    <tr key={r.uuid}>
                      <td>{r.non_lu && <span className="ev-non-lu" title="Nouveau message" />}<span className="ap-code">{r.reference}</span></td>
                      <td style={{ whiteSpace: 'normal', minWidth: 200 }}><strong>{r.objet}</strong></td>
                      <td>{CATEGORIES_RECLAMATION[r.categorie] ?? r.categorie}</td>
                      <td>{formatDate(r.dernier_message_le)}</td>
                      <td><Badge ton={s.badge}>{s.libelle}</Badge></td>
                      <td style={{ textAlign: 'right' }}><button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => setOuverte(r.uuid)}>Ouvrir</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination pagination={liste.donnees?.meta} onPage={(p) => maj('page', p)} unite="réclamation" />
        </div>
      )}

      <Fil uuid={ouverte} recues={recues} onClose={() => setOuverte(null)} onChange={liste.recharger} />
      {!recues && <NouvelleReclamation open={nouvelle} role={role} onClose={() => setNouvelle(false)} onCree={(r) => { liste.recharger(); if (r?.uuid) setOuverte(r.uuid) }} />}
    </section>
  )
}

function Fil({ uuid, recues, onClose, onChange }) {
  const notify = useNotify()
  const r = useDonnees(() => demandesService.reclamation(uuid), [uuid], { actif: !!uuid, onErreur: notify.fromError })
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const fin = useRef(null)
  const x = r.donnees

  useEffect(() => { fin.current?.scrollIntoView({ block: 'end' }) }, [x?.messages?.length])

  const envoyer = async (ev) => {
    ev.preventDefault()
    if (!texte.trim()) return
    setEnvoi(true)
    try {
      await demandesService.repondre(uuid, texte.trim())
      setTexte('')
      r.recharger()
      onChange()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  const changerStatut = async (statut) => {
    setEnvoi(true)
    try {
      await demandesService.statutReclamation(uuid, statut)
      notify.success('Statut mis à jour', libelleStatut(STATUTS_RECLAMATION, statut).libelle)
      r.recharger()
      onChange()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  const close = x?.statut === 'cloturee'

  return (
    <Drawer open={!!uuid} title={x?.objet ?? 'Réclamation'} subtitle={x ? `${x.reference} - ${CATEGORIES_RECLAMATION[x.categorie] ?? x.categorie}` : undefined}
      onClose={() => { if (!envoi) { setTexte(''); onClose() } }} busy={envoi}
      footer={x && !close && (
        <form className="ev" style={{ width: '100%', gap: 8 }} onSubmit={envoyer}>
          <label className="ap-sr" htmlFor="ev-rc-msg">Votre message</label>
          <textarea id="ev-rc-msg" className="ap-textarea" rows={3} maxLength={4000} value={texte} placeholder="Exemple : Merci pour votre retour, voici la pièce demandée…"
            onChange={(e) => setTexte(e.target.value)} />
          <div className="ev-actions" style={{ justifyContent: 'space-between' }}>
            {recues ? (
              <select className="ap-input" style={{ width: 'auto' }} aria-label="Statut de la réclamation" value={x.statut} disabled={envoi} onChange={(e) => changerStatut(e.target.value)}>
                {Object.entries(STATUTS_RECLAMATION).map(([k, v]) => <option key={k} value={k}>{v.libelle}</option>)}
              </select>
            ) : <span />}
            <button type="submit" className="ap-btn" disabled={envoi || !texte.trim()}><Send size={15} aria-hidden="true" /> Envoyer</button>
          </div>
        </form>
      )}>
      {r.chargement && !x ? <Chargement label="Chargement…" /> : x && (
        <div className="ev" style={{ gap: 12 }}>
          <p style={{ margin: 0 }}><Badge ton={libelleStatut(STATUTS_RECLAMATION, x.statut).badge}>{libelleStatut(STATUTS_RECLAMATION, x.statut).libelle}</Badge>{' '}
            <span className="ev-muet">Ouverte le {formatDate(x.cree_le)}{x.initiee_par === 'etablissement' ? ' par l\'établissement' : ''}</span></p>
          <div className="ev-fil" aria-live="polite">
            {(x.messages ?? []).map((m) => (
              <div key={m.uuid} className={`ev-msg${m.est_moi ? ' is-moi' : ''}`}>
                {m.contenu}
                <small>{m.est_moi ? 'Vous' : m.cote === 'etablissement' ? 'Établissement' : 'Usager'} - {formatDateHeure(m.cree_le)}</small>
              </div>
            ))}
            <div ref={fin} />
          </div>
          {close && <p className="ap-hint">Cette réclamation est clôturée. Ouvrez-en une nouvelle si besoin.</p>}
          {x.lu_par_interlocuteur_le && <p className="ap-hint">Lu par {recues ? 'l\'usager' : 'l\'établissement'} le {formatDateHeure(x.lu_par_interlocuteur_le)}.</p>}
        </div>
      )}
    </Drawer>
  )
}

function NouvelleReclamation({ open, role, onClose, onCree }) {
  const notify = useNotify()
  const famille = FAMILLE.includes(role)
  const apprenants = useDonnees(() => demandesService.mesApprenants(), [], { actif: open && famille, initial: [] })
  const vide = { categorie: '', objet: '', message: '', beneficiaire: '' }
  const [f, setF] = useState(vide)
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const fermer = () => { if (!envoi) { setF(vide); setErreurs({}); onClose() } }

  const envoyer = async (ev) => {
    ev.preventDefault()
    const e = {}
    if (!f.categorie) e.categorie = 'Choisissez la catégorie.'
    if (f.objet.trim().length < 5) e.objet = 'Objet de 5 caractères au moins.'
    if (f.message.trim().length < 10) e.message = 'Message de 10 caractères au moins.'
    setErreurs(e)
    if (Object.keys(e).length) return
    setEnvoi(true)
    try {
      const r = await demandesService.ouvrirReclamation({
        categorie: f.categorie, objet: f.objet.trim(), message: f.message.trim(),
        ...(f.beneficiaire ? { beneficiaire_apprenant_uuid: f.beneficiaire } : {}),
      })
      notify.success('Réclamation envoyée', 'L\'établissement vous répondra ici.')
      setF(vide)
      onClose()
      onCree(r)
    } catch (err) {
      setErreurs(erreursChamps(err))
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Drawer open={open} title="Nouvelle réclamation" onClose={fermer} busy={envoi}
      footer={(
        <>
          <button type="button" className="ap-btn ap-btn--ghost" onClick={fermer} disabled={envoi}>Annuler</button>
          <button type="submit" form="ev-form-recl" className="ap-btn" disabled={envoi}>{envoi ? 'Envoi…' : 'Envoyer'}</button>
        </>
      )}>
      <form id="ev-form-recl" className="ev ev-form" onSubmit={envoyer} noValidate>
        <Champ id="ev-nr-cat" label="Catégorie" requis erreur={erreurs.categorie}>
          <select {...aria('ev-nr-cat', erreurs.categorie)} className="ap-input" value={f.categorie} onChange={(e) => setF((x) => ({ ...x, categorie: e.target.value }))}>
            <option value="">Choisir</option>
            {Object.entries(CATEGORIES_RECLAMATION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Champ>
        {famille && (apprenants.donnees ?? []).length > 0 && (
          <Champ id="ev-nr-benef" label="Apprenant concerné">
            <select {...aria('ev-nr-benef')} className="ap-input" value={f.beneficiaire} onChange={(e) => setF((x) => ({ ...x, beneficiaire: e.target.value }))}>
              <option value="">Non précisé</option>
              {apprenants.donnees.map((a) => <option key={a.uuid} value={a.uuid}>{nomBeneficiaire(a)}</option>)}
            </select>
          </Champ>
        )}
        <Champ id="ev-nr-objet" label="Objet" requis erreur={erreurs.objet}>
          <input {...aria('ev-nr-objet', erreurs.objet)} className="ap-input" maxLength={150} value={f.objet} placeholder="Exemple : Erreur sur mon relevé de notes"
            onChange={(e) => setF((x) => ({ ...x, objet: e.target.value }))} />
        </Champ>
        <Champ id="ev-nr-msg" label="Message" requis erreur={erreurs.message}>
          <textarea {...aria('ev-nr-msg', erreurs.message)} className="ap-textarea" rows={6} maxLength={4000} value={f.message}
            placeholder="Exemple : la note de mathématiques du 1er trimestre ne correspond pas à ma copie." onChange={(e) => setF((x) => ({ ...x, message: e.target.value }))} />
        </Champ>
      </form>
    </Drawer>
  )
}
