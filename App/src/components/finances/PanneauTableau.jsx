import { useState } from 'react'
import { BarChart3, RefreshCw } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { financesService } from '../../services/finances/finances.service'
import { MODES } from '../../config/finances/constantes'
import { Champ, Chargement, EtatVide, aria, formatDate, formatMontant, useDonnees } from '../modules/outils'

const debutMois = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1, 12).toISOString().slice(0, 10) }
const aujourdhui = () => new Date().toISOString().slice(0, 10)

/** Synthèse financière (consulter_rapports) : encaissements de la période et situation des créances. */
export default function PanneauTableau({ onAller }) {
  const notify = useNotify()
  const [p, setP] = useState({ du: debutMois(), au: aujourdhui() })
  const s = useDonnees(() => financesService.synthese(p.du, p.au), [p.du, p.au], { actif: !!(p.du && p.au && p.du <= p.au), onErreur: notify.fromError })
  const d = s.donnees
  const dv = d?.devise

  return (
    <section className="ev" aria-labelledby="ev-titre-tb">
      <div className="ev-entete">
        <div>
          <h2 className="ap-page-title" id="ev-titre-tb">Tableau de bord financier</h2>
          <p className="ap-page-sub">Encaissements de la période choisie et situation globale des créances.</p>
        </div>
        <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={s.recharger} disabled={s.chargement}><RefreshCw size={15} className={s.chargement ? 'ap-spin' : ''} aria-hidden="true" /> Actualiser</button>
      </div>
      <div className="ap-card ev-filtres">
        <Champ id="ev-tb-du" label="Du" requis><input {...aria('ev-tb-du')} type="date" className="ap-input" value={p.du} max={p.au} onChange={(e) => setP((x) => ({ ...x, du: e.target.value }))} /></Champ>
        <Champ id="ev-tb-au" label="Au" requis><input {...aria('ev-tb-au')} type="date" className="ap-input" value={p.au} min={p.du} onChange={(e) => setP((x) => ({ ...x, au: e.target.value }))} /></Champ>
      </div>
      {s.chargement && !d ? <Chargement label="Calcul…" /> : !d ? <EtatVide icone={BarChart3} titre="Synthèse indisponible" texte="Vérifiez la période (un an au plus)." /> : (
        <>
          <div className="ev-synthese">
            <div className="ev-chiffre"><span>Encaissé sur la période</span><strong>{formatMontant(d.encaisse.total, dv)}</strong></div>
            <div className="ev-chiffre"><span>Factures émises</span><strong>{d.factures_emises.nombre}</strong></div>
            <div className="ev-chiffre"><span>Reste à recouvrer</span><strong>{formatMontant(d.situation.reste_a_recouvrer, dv)}</strong></div>
            <div className="ev-chiffre"><span>Taux de recouvrement</span><strong>{d.situation.taux_recouvrement == null ? '-' : `${String(d.situation.taux_recouvrement).replace('.', ',')} %`}</strong></div>
            <div className="ev-chiffre"><span>Apprenants en retard</span><strong>{d.situation.apprenants_en_retard}</strong></div>
            <button type="button" className="ev-chiffre ev-tuile" style={{ gap: 0 }} onClick={() => onAller('reglements')}>
              <span>Règlements à valider</span><strong>{d.reglements_a_valider.nombre} ({formatMontant(d.reglements_a_valider.montant, dv)})</strong>
            </button>
          </div>
          <div className="ev-deux" style={{ gap: 14 }}>
            <div className="ap-card ap-card--flush ev-table-wrap">
              <table className="ap-table">
                <caption style={{ textAlign: 'left', padding: '14px 14px 4px', fontWeight: 700 }}>Encaissé par mode</caption>
                <thead><tr><th scope="col">Mode</th><th scope="col" className="ev-num">Opérations</th><th scope="col" className="ev-num">Montant</th></tr></thead>
                <tbody>
                  {d.encaisse.par_mode.length === 0 ? <tr><td colSpan={3} className="ev-muet">Aucun encaissement</td></tr> : d.encaisse.par_mode.map((m) => (
                    <tr key={m.mode}><th scope="row">{MODES[m.mode] ?? m.mode}</th><td className="ev-num">{m.nombre}</td><td className="ev-num ev-fort">{formatMontant(m.montant, dv)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ap-card ap-card--flush ev-table-wrap" style={{ maxHeight: 360 }}>
              <table className="ap-table">
                <caption style={{ textAlign: 'left', padding: '14px 14px 4px', fontWeight: 700 }}>Encaissé par jour</caption>
                <thead><tr><th scope="col">Jour</th><th scope="col" className="ev-num">Montant</th></tr></thead>
                <tbody>
                  {d.encaisse.par_jour.length === 0 ? <tr><td colSpan={2} className="ev-muet">Aucun encaissement</td></tr> : [...d.encaisse.par_jour].reverse().map((j) => (
                    <tr key={j.jour}><th scope="row">{formatDate(j.jour)}</th><td className="ev-num">{formatMontant(j.montant, dv)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
