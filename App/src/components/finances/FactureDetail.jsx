import { useEffect, useState } from 'react'
import { Ban, CreditCard, Download, HandCoins, Receipt } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { financesService } from '../../services/finances/finances.service'
import { AGREGATEURS_EN_LIGNE, MODES, NATURES, STATUTS_FACTURE, STATUTS_PAIEMENT, STATUTS_REGLEMENT, libelle } from '../../config/finances/constantes'
import Drawer from '../administration/Drawer'
import { Badge, Champ, Chargement, aria, erreursChamps, formatDate, formatDateHeure, entier, formatMontant, useDonnees } from '../modules/outils'

const aujourdhui = () => new Date().toISOString().slice(0, 10)
const EN_COURS = ['initie', 'en_attente']

/** Échéances avec leur état : les règlements couvrent les échéances dans l'ordre. */
function etatEcheances(f) {
  let cumul = 0
  return (f.echeances ?? []).map((e) => {
    cumul += Number(e.montant)
    const reglee = cumul <= Number(f.montant_regle)
    const du = Math.min(Number(e.montant), cumul - Number(f.montant_regle))
    return { ...e, reglee, du: reglee ? 0 : du, retard: !reglee && e.date_echeance <= aujourdhui() }
  })
}

/**
 * Détail d'une facture. Famille : paiement en ligne et reçus. Gestion (selon les droits) : saisie d'un règlement,
 * annulation, PDF. Les montants sont des entiers dans l'unité de la devise.
 */
export default function FactureDetail({ uuid, famille = false, actions = [], onClose, onChange }) {
  const notify = useNotify()
  const fac = useDonnees(() => financesService.facture(uuid), [uuid], { actif: !!uuid, onErreur: notify.fromError })
  const pai = useDonnees(async () => {
    const liste = await financesService.paiements(uuid)
    // Un paiement encore en cours est relu chez Paiement (retour de la page de paiement, notification en retard).
    const enCours = liste.filter((p) => EN_COURS.includes(p.statut)).slice(0, 3)
    if (!enCours.length) return liste
    const relus = await Promise.all(enCours.map((p) => financesService.paiement(p.uuid).catch(() => p)))
    const maj = new Map(relus.map((p) => [p.uuid, p]))
    return liste.map((p) => maj.get(p.uuid) ?? p)
  }, [uuid], { actif: !!uuid && (famille || actions.includes('consulter_finances')), initial: [] })
  const [envoi, setEnvoi] = useState(false)
  const [paiement, setPaiement] = useState(false)
  const [saisie, setSaisie] = useState(false)
  const [annulation, setAnnulation] = useState(false)
  const f = fac.donnees
  const devise = f?.devise ?? 'XOF'
  const echeances = f ? etatEcheances(f) : []
  const echu = echeances.filter((e) => e.retard).reduce((s, e) => s + e.du, 0)
  const ouverte = f && ['emise', 'partiellement_reglee'].includes(f.statut)
  const acquisEnCours = (pai.donnees ?? []).some((p) => p.acquis) && f?.statut !== 'reglee'

  useEffect(() => {
    // Un paiement confirmé entre-temps modifie la facture : on la relit une fois.
    if (acquisEnCours) fac.recharger()
  }, [acquisEnCours]) // eslint-disable-line react-hooks/exhaustive-deps

  const agir = async (fn) => {
    setEnvoi(true)
    try { await fn() } catch (err) { notify.fromError(err) } finally { setEnvoi(false) }
  }

  return (
    <>
      <Drawer open={!!uuid} title={f ? `Facture ${f.numero}` : 'Facture'} subtitle={f ? `${f.apprenant_nom ?? ''}${f.classe_nom ? ` - ${f.classe_nom}` : ''} - ${f.annee_scolaire}` : undefined}
        onClose={() => !envoi && onClose()} busy={envoi}
        footer={f && (
          <div className="ev-actions" style={{ width: '100%', justifyContent: 'flex-end' }}>
            <button type="button" className="ap-btn ap-btn--ghost" disabled={envoi} onClick={() => agir(() => financesService.telechargerFacture(f.uuid))}>
              <Download size={15} aria-hidden="true" /> PDF
            </button>
            {!famille && ouverte && actions.includes('annuler_facture') && f.montant_regle === 0 && (
              <button type="button" className="ap-btn ap-btn--ghost" disabled={envoi} onClick={() => setAnnulation(true)}><Ban size={15} aria-hidden="true" /> Annuler la facture</button>
            )}
            {!famille && ouverte && actions.includes('saisir_reglement') && (
              <button type="button" className="ap-btn" disabled={envoi} onClick={() => setSaisie(true)}><HandCoins size={15} aria-hidden="true" /> Enregistrer un règlement</button>
            )}
            {famille && ouverte && (
              <button type="button" className="ap-btn" disabled={envoi} onClick={() => setPaiement(true)}><CreditCard size={15} aria-hidden="true" /> Payer en ligne</button>
            )}
          </div>
        )}>
        {fac.chargement && !f ? <Chargement label="Chargement de la facture…" /> : f && (
          <div className="ev ev-large" style={{ gap: 14 }}>
            <p style={{ margin: 0 }}><Badge ton={libelle(STATUTS_FACTURE, f.statut).badge}>{libelle(STATUTS_FACTURE, f.statut).libelle}</Badge>{' '}
              <span className="ev-muet">Émise le {formatDate(f.emise_le)}</span></p>
            {f.annulation && <div className="ap-alert ap-alert--danger"><Ban size={18} aria-hidden="true" /><div><strong>Facture annulée le {formatDate(f.annulation.le)}</strong>{f.annulation.motif}</div></div>}
            <div className="ev-synthese">
              <div className="ev-chiffre"><span>Montant</span><strong>{formatMontant(f.montant_total, devise)}</strong></div>
              <div className="ev-chiffre"><span>Réglé</span><strong>{formatMontant(f.montant_regle, devise)}</strong></div>
              <div className="ev-chiffre"><span>Reste à payer</span><strong>{formatMontant(f.reste_a_payer, devise)}</strong></div>
              {echu > 0 && ouverte && <div className="ev-chiffre"><span>Échu impayé</span><strong style={{ color: '#c0392b' }}>{formatMontant(echu, devise)}</strong></div>}
            </div>

            <Tableau titre="Détail" entetes={['Libellé', 'Nature', 'Montant']} lignes={(f.lignes ?? []).map((l) => [l.libelle, NATURES[l.nature] ?? l.nature, formatMontant(l.montant, devise)])} />
            <Tableau titre="Échéancier" entetes={['Échéance', 'Date', 'Montant', 'État']}
              lignes={echeances.map((e) => [e.libelle || `Échéance ${e.rang}`, formatDate(e.date_echeance), formatMontant(e.montant, devise),
                e.reglee ? <Badge key="b" ton="success">Réglée</Badge> : e.retard ? <Badge key="b" ton="danger">En retard ({formatMontant(e.du, devise)})</Badge> : <Badge key="b" ton="neutral">À venir</Badge>])} />
            {(f.reglements ?? []).length > 0 && (
              <Tableau titre="Règlements" entetes={['Date', 'Mode', 'Montant', 'Statut', '']}
                lignes={f.reglements.map((r) => [formatDate(r.date_reglement), MODES[r.mode] ?? r.mode, formatMontant(r.montant, devise),
                  <Badge key="s" ton={libelle(STATUTS_REGLEMENT, r.statut).badge}>{libelle(STATUTS_REGLEMENT, r.statut).libelle}</Badge>,
                  r.recu_disponible ? (
                    <button key="r" type="button" className="ap-btn ap-btn--ghost ap-btn--sm" disabled={envoi} onClick={() => agir(() => financesService.telechargerRecu(r.uuid))}>
                      <Receipt size={14} aria-hidden="true" /> Reçu {r.numero_recu}
                    </button>
                  ) : ''])} />
            )}
            {(pai.donnees ?? []).length > 0 && (
              <Tableau titre="Paiements en ligne" entetes={['Le', 'Montant', 'État']}
                lignes={pai.donnees.map((p) => [formatDateHeure(p.cree_le), formatMontant(p.montant, devise),
                  <Badge key="p" ton={libelle(STATUTS_PAIEMENT, p.statut).badge}>{libelle(STATUTS_PAIEMENT, p.statut).libelle}</Badge>])} />
            )}
          </div>
        )}
      </Drawer>

      {f && famille && <PayerEnLigne open={paiement} facture={f} suggere={echu || f.reste_a_payer} onClose={() => setPaiement(false)} />}
      {f && !famille && <SaisieReglement open={saisie} facture={f} onClose={() => setSaisie(false)} onSaisi={() => { fac.recharger(); onChange?.() }} />}
      {f && !famille && <Annulation open={annulation} facture={f} onClose={() => setAnnulation(false)} onAnnulee={() => { fac.recharger(); onChange?.() }} />}
    </>
  )
}

function Tableau({ titre, entetes, lignes }) {
  if (!lignes.length) return null
  return (
    <div className="ap-card ap-card--flush ev-table-wrap">
      <table className="ap-table">
        <caption style={{ textAlign: 'left', padding: '12px 14px 4px', fontWeight: 700 }}>{titre}</caption>
        <thead><tr>{entetes.map((e, i) => <th key={i} scope="col">{e || <span className="ap-sr">Action</span>}</th>)}</tr></thead>
        <tbody>{lignes.map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

function PayerEnLigne({ open, facture, suggere, onClose }) {
  const notify = useNotify()
  const [montant, setMontant] = useState('')
  const [agregateur, setAgregateur] = useState(AGREGATEURS_EN_LIGNE[0].code)
  const [erreur, setErreur] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  useEffect(() => { if (open) { setMontant(String(suggere)); setErreur(null) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  const payer = async (ev) => {
    ev.preventDefault()
    const m = entier(montant)
    if (!Number.isInteger(m) || m < 100 || m > facture.reste_a_payer) { setErreur(`Montant entier entre 100 et ${formatMontant(facture.reste_a_payer, facture.devise)}.`); return }
    setEnvoi(true)
    try {
      const retour = new URL(window.location.href)
      retour.searchParams.set('section', 'mes-paiements')
      retour.searchParams.set('facture', facture.uuid)
      const p = await financesService.payer(facture.uuid, { montant: m, agregateur }, retour.toString())
      const url = new URL(p?.url_paiement ?? '')
      if (url.protocol !== 'https:') throw new Error('Adresse de paiement non sécurisée.')
      window.location.assign(url.toString())
    } catch (err) {
      setErreur(erreursChamps(err).montant ?? null)
      notify.fromError(err)
      setEnvoi(false)
    }
  }

  return (
    <Drawer open={open} title="Payer en ligne" subtitle={`Facture ${facture.numero} - reste ${formatMontant(facture.reste_a_payer, facture.devise)}`} onClose={() => !envoi && onClose()} busy={envoi}
      footer={(
        <>
          <button type="button" className="ap-btn ap-btn--ghost" onClick={onClose} disabled={envoi}>Annuler</button>
          <button type="submit" form="ev-form-payer" className="ap-btn" disabled={envoi}><CreditCard size={15} aria-hidden="true" /> {envoi ? 'Redirection…' : 'Continuer vers le paiement'}</button>
        </>
      )}>
      <form id="ev-form-payer" className="ev ev-form" onSubmit={payer} noValidate>
        <Champ id="ev-pay-montant" label={`Montant (${facture.devise === 'GNF' ? 'GNF' : 'FCFA'})`} requis erreur={erreur} aide="Vous pouvez payer tout ou partie du reste. Le montant échu est proposé par défaut.">
          <input {...aria('ev-pay-montant', erreur, true)} className="ap-input" inputMode="numeric" maxLength={14} value={montant} placeholder="Exemple : 50000"
            onChange={(e) => setMontant(e.target.value.replace(/[^\d\s]/g, ''))} />
        </Champ>
        <Champ id="ev-pay-agregateur" label="Moyen de paiement" requis>
          <select {...aria('ev-pay-agregateur')} className="ap-input" value={agregateur} onChange={(e) => setAgregateur(e.target.value)}>
            {AGREGATEURS_EN_LIGNE.map((a) => <option key={a.code} value={a.code}>{a.libelle}</option>)}
          </select>
        </Champ>
        <p className="ap-hint">Vous allez être redirigé vers la page sécurisée de paiement (mobile money ou carte). La facture est mise à jour dès que le paiement est confirmé ; le reçu apparaît alors ici.</p>
      </form>
    </Drawer>
  )
}

function SaisieReglement({ open, facture, onClose, onSaisi }) {
  const notify = useNotify()
  const vide = () => ({ mode: 'especes', montant: String(facture.reste_a_payer), date_reglement: aujourdhui(), piece_reference: '', commentaire: '' })
  const [f, setF] = useState(vide)
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)
  useEffect(() => { if (open) { setF(vide()); setErreurs({}) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  const maj = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const enregistrer = async (ev) => {
    ev.preventDefault()
    const e = {}
    const m = entier(f.montant)
    if (!Number.isInteger(m) || m < 1 || m > facture.reste_a_payer) e.montant = `Montant entier de 1 à ${formatMontant(facture.reste_a_payer, facture.devise)}.`
    if (!f.date_reglement || f.date_reglement > aujourdhui()) e.date_reglement = 'Date du jour ou passée.'
    if (f.piece_reference.trim().length < 2) e.piece_reference = 'Référence du bordereau, du virement ou du chèque.'
    setErreurs(e)
    if (Object.keys(e).length) return
    setEnvoi(true)
    try {
      const r = await financesService.saisir(facture.uuid, { mode: f.mode, montant: m, date_reglement: f.date_reglement, piece_reference: f.piece_reference.trim(), ...(f.commentaire.trim() ? { commentaire: f.commentaire.trim() } : {}) })
      notify.success('Règlement enregistré', r?.message)
      onClose()
      onSaisi()
    } catch (err) {
      setErreurs(erreursChamps(err))
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Drawer open={open} title="Enregistrer un règlement" subtitle={`Facture ${facture.numero} - reste ${formatMontant(facture.reste_a_payer, facture.devise)}`} onClose={() => !envoi && onClose()} busy={envoi}
      footer={(
        <>
          <button type="button" className="ap-btn ap-btn--ghost" onClick={onClose} disabled={envoi}>Annuler</button>
          <button type="submit" form="ev-form-reglement" className="ap-btn" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      )}>
      <form id="ev-form-reglement" className="ev ev-form" onSubmit={enregistrer} noValidate>
        <div className="ev-deux">
          <Champ id="ev-rg-mode" label="Mode" requis>
            <select {...aria('ev-rg-mode')} className="ap-input" value={f.mode} onChange={maj('mode')}>
              <option value="especes">Espèces</option><option value="virement">Virement</option><option value="cheque">Chèque</option>
            </select>
          </Champ>
          <Champ id="ev-rg-montant" label="Montant" requis erreur={erreurs.montant}>
            <input {...aria('ev-rg-montant', erreurs.montant)} className="ap-input" inputMode="numeric" maxLength={14} value={f.montant} placeholder="Exemple : 50000"
              onChange={(e) => setF((x) => ({ ...x, montant: e.target.value.replace(/[^\d\s]/g, '') }))} />
          </Champ>
          <Champ id="ev-rg-date" label="Date" requis erreur={erreurs.date_reglement}>
            <input {...aria('ev-rg-date', erreurs.date_reglement)} type="date" className="ap-input" max={aujourdhui()} value={f.date_reglement} onChange={maj('date_reglement')} />
          </Champ>
          <Champ id="ev-rg-piece" label="Pièce justificative" requis erreur={erreurs.piece_reference}>
            <input {...aria('ev-rg-piece', erreurs.piece_reference)} className="ap-input" maxLength={100} value={f.piece_reference} placeholder="Exemple : BORD-2026-0142" onChange={maj('piece_reference')} />
          </Champ>
        </div>
        <Champ id="ev-rg-com" label="Commentaire">
          <textarea {...aria('ev-rg-com')} className="ap-textarea" rows={3} maxLength={500} value={f.commentaire} placeholder="Exemple : versé par le père au guichet." onChange={maj('commentaire')} />
        </Champ>
        <p className="ap-hint">Si la double validation est active, le règlement devient définitif (et le reçu disponible) après validation par un autre profil habilité.</p>
      </form>
    </Drawer>
  )
}

function Annulation({ open, facture, onClose, onAnnulee }) {
  const notify = useNotify()
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const fermer = () => { if (!envoi) { setMotif(''); setErreur(null); onClose() } }
  const envoyer = async (ev) => {
    ev.preventDefault()
    if (motif.trim().length < 10) { setErreur('Motif de 10 caractères au moins (conservé au journal).'); return }
    setEnvoi(true)
    try {
      await financesService.annuler(facture.uuid, motif.trim())
      notify.success('Facture annulée', facture.numero)
      setMotif('')
      onClose()
      onAnnulee()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }
  return (
    <Drawer open={open} title="Annuler la facture" subtitle={`${facture.numero} - ${formatMontant(facture.montant_total, facture.devise)}`} onClose={fermer} busy={envoi}
      footer={(
        <>
          <button type="button" className="ap-btn ap-btn--ghost" onClick={fermer} disabled={envoi}>Retour</button>
          <button type="submit" form="ev-form-annul" className="ap-btn ap-btn--danger" disabled={envoi}>Annuler la facture</button>
        </>
      )}>
      <form id="ev-form-annul" className="ev ev-form" onSubmit={envoyer} noValidate>
        <Champ id="ev-an-motif" label="Motif" requis erreur={erreur}>
          <textarea {...aria('ev-an-motif', erreur)} className="ap-textarea" rows={4} maxLength={1000} value={motif} placeholder="Exemple : facture émise sur la mauvaise classe." onChange={(e) => setMotif(e.target.value)} />
        </Champ>
      </form>
    </Drawer>
  )
}
