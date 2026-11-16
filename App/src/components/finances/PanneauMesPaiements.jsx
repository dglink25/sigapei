import { Wallet } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { financesService } from '../../services/finances/finances.service'
import { STATUTS_FACTURE, libelle } from '../../config/finances/constantes'
import { Badge, Chargement, EtatVide, formatDate, formatMontant, useDonnees } from '../modules/outils'
import FactureDetail from './FactureDetail'

/** Apprenant ou parent : situation de chaque apprenant rattaché, factures et paiement en ligne. */
export default function PanneauMesPaiements({ role, filtres, setFiltres }) {
  const notify = useNotify()
  const d = useDonnees(() => financesService.mesFinances(), [], { initial: [], onErreur: notify.fromError })
  const liste = d.donnees ?? []

  return (
    <section className="ev" aria-labelledby="ev-titre-mp">
      <div>
        <h2 className="ap-page-title" id="ev-titre-mp">{role === 'parent' ? 'Scolarité de mes enfants' : 'Ma scolarité'}</h2>
        <p className="ap-page-sub">Ce qui est dû, ce qui est réglé et les prochaines échéances. Paiement en ligne sécurisé, reçu disponible dès la confirmation.</p>
      </div>
      {d.chargement ? <Chargement label="Chargement…" /> : liste.length === 0 ? (
        <EtatVide icone={Wallet} titre="Aucune facture" texte={role === 'parent' ? 'Aucun enfant rattaché à votre compte n\'a de facture pour le moment.' : 'Aucune facture pour le moment.'} />
      ) : liste.map(({ apprenant: a, solde: s, factures }) => (
        <div key={a.uuid} className="ap-card" style={{ padding: 18, display: 'grid', gap: 14 }}>
          <div className="ev-entete">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{[a.nom, a.prenom].filter(Boolean).join(' ')}</h3>
              <p className="ap-page-sub" style={{ margin: '2px 0 0' }}>{[a.classe, a.matricule && `Matricule ${a.matricule}`].filter(Boolean).join(' - ')}</p>
            </div>
            {s.a_jour ? <Badge ton="success">À jour</Badge> : <Badge ton="danger">En retard depuis le {formatDate(s.en_retard_depuis)}</Badge>}
          </div>
          <div className="ev-synthese">
            <div className="ev-chiffre"><span>Total facturé</span><strong>{formatMontant(s.total_facture, s.devise)}</strong></div>
            <div className="ev-chiffre"><span>Réglé</span><strong>{formatMontant(s.total_regle, s.devise)}</strong></div>
            <div className="ev-chiffre"><span>Reste à payer</span><strong>{formatMontant(s.reste_a_payer, s.devise)}</strong></div>
            {s.montant_echu_impaye > 0 && <div className="ev-chiffre"><span>Échu impayé</span><strong style={{ color: '#c0392b' }}>{formatMontant(s.montant_echu_impaye, s.devise)}</strong></div>}
          </div>
          {factures.length > 0 && (
            <div className="ap-card ap-card--flush ev-table-wrap">
              <table className="ap-table">
                <caption className="ap-sr">Factures</caption>
                <thead><tr><th scope="col">Facture</th><th scope="col">Objet</th><th scope="col" className="ev-num">Reste</th><th scope="col">Prochaine échéance</th><th scope="col">Statut</th><th scope="col"><span className="ap-sr">Ouvrir</span></th></tr></thead>
                <tbody>
                  {factures.map((f) => (
                    <tr key={f.uuid}>
                      <td><span className="ap-code">{f.numero}</span></td>
                      <td>{f.libelle ?? f.annee_scolaire}</td>
                      <td className="ev-num ev-fort">{formatMontant(f.reste_a_payer, s.devise)}</td>
                      <td>{f.reste_a_payer > 0 ? formatDate(f.prochaine_echeance) : '-'}</td>
                      <td><Badge ton={libelle(STATUTS_FACTURE, f.statut).badge}>{libelle(STATUTS_FACTURE, f.statut).libelle}</Badge></td>
                      <td style={{ textAlign: 'right' }}>
                        <button type="button" className={`ap-btn ap-btn--sm${f.reste_a_payer > 0 ? '' : ' ap-btn--ghost'}`} onClick={() => setFiltres({ facture: f.uuid })}>
                          {f.reste_a_payer > 0 ? 'Voir et payer' : 'Voir'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
      <FactureDetail uuid={filtres.facture || null} famille onClose={() => { setFiltres({ facture: '' }); d.recharger() }} onChange={d.recharger} />
    </section>
  )
}
