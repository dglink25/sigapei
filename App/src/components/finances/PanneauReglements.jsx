import { useState } from 'react'
import { Check, HandCoins, Receipt, RefreshCw, Search, X } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { financesService } from '../../services/finances/finances.service'
import { MODES, STATUTS_REGLEMENT, libelle } from '../../config/finances/constantes'
import Drawer from '../administration/Drawer'
import Pagination from '../administration/Pagination'
import ConfirmDialog from '../commun/ConfirmDialog'
import { Badge, Champ, Chargement, EtatVide, aria, formatDate, formatMontant, useDonnees } from '../modules/outils'

/** Règlements : file de validation (séparation des tâches), historique et reçus. */
export default function PanneauReglements({ actions, devise, setFiltres }) {
  const notify = useNotify()
  const valideur = actions.includes('valider_reglement')
  const [f, setF] = useState({ statut: valideur ? 'a_valider' : '', mode: '', du: '', au: '', recherche: '', tri: 'recents', page: 1 })
  const [saisieRecherche, setSaisieRecherche] = useState('')
  const liste = useDonnees(() => financesService.reglements(f), [f.statut, f.mode, f.du, f.au, f.recherche, f.tri, f.page],
    { initial: { elements: [], meta: null }, onErreur: notify.fromError })
  const [aValider, setAValider] = useState(null)
  const [aRejeter, setARejeter] = useState(null)
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const maj = (k, v) => setF((x) => ({ ...x, [k]: v, page: k === 'page' ? v : 1 }))
  const elements = liste.donnees?.elements ?? []

  const agir = async (fn, message, apres) => {
    setEnvoi(true)
    try { await fn(); if (message) notify.success(message); apres?.(); liste.recharger() } catch (err) { notify.fromError(err) } finally { setEnvoi(false) }
  }

  return (
    <section className="ev" aria-labelledby="ev-titre-reg">
      <div className="ev-entete">
        <div>
          <h2 className="ap-page-title" id="ev-titre-reg">Règlements</h2>
          <p className="ap-page-sub">Un règlement saisi au guichet est validé par un autre profil ; le reçu est numéroté à la validation.</p>
        </div>
        <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={liste.recharger} disabled={liste.chargement}>
          <RefreshCw size={15} className={liste.chargement ? 'ap-spin' : ''} aria-hidden="true" /> Actualiser
        </button>
      </div>

      <div className="ap-card ev-filtres">
        <Champ id="ev-rg-st" label="Statut">
          <select {...aria('ev-rg-st')} className="ap-input" value={f.statut} onChange={(e) => maj('statut', e.target.value)}>
            <option value="">Tous</option>
            {Object.entries(STATUTS_REGLEMENT).map(([k, v]) => <option key={k} value={k}>{v.libelle}</option>)}
          </select>
        </Champ>
        <Champ id="ev-rg-md" label="Mode">
          <select {...aria('ev-rg-md')} className="ap-input" value={f.mode} onChange={(e) => maj('mode', e.target.value)}>
            <option value="">Tous</option>
            {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Champ>
        <Champ id="ev-rg-du" label="Du"><input {...aria('ev-rg-du')} type="date" className="ap-input" value={f.du} onChange={(e) => maj('du', e.target.value)} /></Champ>
        <Champ id="ev-rg-au" label="Au"><input {...aria('ev-rg-au')} type="date" className="ap-input" value={f.au} min={f.du || undefined} onChange={(e) => maj('au', e.target.value)} /></Champ>
        <form className="ap-field" onSubmit={(e) => { e.preventDefault(); maj('recherche', saisieRecherche.trim()) }}>
          <label className="ap-label" htmlFor="ev-rg-rech">Rechercher</label>
          <div className="ap-search" style={{ margin: 0 }}>
            <Search size={16} aria-hidden="true" />
            <input id="ev-rg-rech" type="search" className="ap-input" maxLength={80} value={saisieRecherche} placeholder="Exemple : RE-2026-000003"
              onChange={(e) => { setSaisieRecherche(e.target.value); if (!e.target.value) maj('recherche', '') }} />
          </div>
        </form>
      </div>

      {liste.chargement && !elements.length ? <Chargement label="Chargement des règlements…" /> : elements.length === 0 ? (
        <EtatVide icone={HandCoins} titre="Aucun règlement" texte={f.statut === 'a_valider' ? 'Aucun règlement en attente de validation.' : 'Aucun règlement dans cette sélection.'} />
      ) : (
        <div className="ap-card ap-card--flush">
          <div className="ev-table-wrap">
            <table className="ap-table">
              <caption className="ap-sr">Règlements</caption>
              <thead><tr><th scope="col">Date</th><th scope="col">Facture</th><th scope="col">Apprenant</th><th scope="col">Mode</th><th scope="col">Pièce</th><th scope="col" className="ev-num">Montant</th><th scope="col">Statut</th><th scope="col"><span className="ap-sr">Actions</span></th></tr></thead>
              <tbody>
                {elements.map((r) => (
                  <tr key={r.uuid}>
                    <td>{formatDate(r.date_reglement)}</td>
                    <td><button type="button" className="ev-pastille" onClick={() => setFiltres({ section: 'factures', facture: r.facture?.uuid })}>{r.facture?.numero}</button></td>
                    <td>{r.facture?.apprenant_nom ?? '-'}{r.facture?.classe_nom && <small>{r.facture.classe_nom}</small>}</td>
                    <td>{MODES[r.mode] ?? r.mode}</td>
                    <td>{r.piece_reference ?? '-'}</td>
                    <td className={`ev-num ev-fort${r.montant < 0 ? ' ev-muet' : ''}`}>{formatMontant(r.montant, devise)}</td>
                    <td><Badge ton={libelle(STATUTS_REGLEMENT, r.statut).badge}>{libelle(STATUTS_REGLEMENT, r.statut).libelle}</Badge>{r.motif_rejet && <small>{r.motif_rejet}</small>}</td>
                    <td>
                      <div className="ev-actions" style={{ justifyContent: 'flex-end' }}>
                        {r.statut === 'a_valider' && valideur && (
                          <>
                            <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" disabled={envoi} onClick={() => { setARejeter(r); setMotif(''); setErreur(null) }}><X size={14} aria-hidden="true" /> Rejeter</button>
                            <button type="button" className="ap-btn ap-btn--sm" disabled={envoi} onClick={() => setAValider(r)}><Check size={14} aria-hidden="true" /> Valider</button>
                          </>
                        )}
                        {r.recu_disponible && (
                          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" disabled={envoi} onClick={() => agir(() => financesService.telechargerRecu(r.uuid))}><Receipt size={14} aria-hidden="true" /> Reçu</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={liste.donnees?.meta} onPage={(p) => maj('page', p)} unite="règlement" />
        </div>
      )}

      <ConfirmDialog open={!!aValider} tone="primary" title="Valider ce règlement ?"
        message={aValider ? `${formatMontant(aValider.montant, devise)} en ${(MODES[aValider.mode] ?? aValider.mode).toLowerCase()}, pièce ${aValider.piece_reference}, facture ${aValider.facture?.numero}. Vérifiez la pièce avant de valider : le reçu sera émis.` : ''}
        confirmLabel="Valider" loading={envoi}
        onConfirm={() => agir(() => financesService.valider(aValider.uuid), 'Règlement validé, reçu émis.', () => setAValider(null))}
        onCancel={() => !envoi && setAValider(null)} />

      <Drawer open={!!aRejeter} title="Rejeter le règlement" subtitle={aRejeter ? `${formatMontant(aRejeter.montant, devise)} - ${aRejeter.facture?.numero}` : undefined}
        onClose={() => !envoi && setARejeter(null)} busy={envoi}
        footer={(
          <>
            <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setARejeter(null)} disabled={envoi}>Annuler</button>
            <button type="submit" form="ev-form-rejet" className="ap-btn ap-btn--danger" disabled={envoi}>Rejeter</button>
          </>
        )}>
        <form id="ev-form-rejet" className="ev ev-form" noValidate onSubmit={(e) => {
          e.preventDefault()
          if (motif.trim().length < 10) { setErreur('Motif de 10 caractères au moins.'); return }
          agir(() => financesService.rejeter(aRejeter.uuid, motif.trim()), 'Règlement rejeté.', () => setARejeter(null))
        }}>
          <Champ id="ev-rj-motif" label="Motif" requis erreur={erreur}>
            <textarea {...aria('ev-rj-motif', erreur)} className="ap-textarea" rows={4} maxLength={1000} value={motif} placeholder="Exemple : chèque sans provision signalé par la banque." onChange={(e) => setMotif(e.target.value)} />
          </Champ>
        </form>
      </Drawer>
    </section>
  )
}
