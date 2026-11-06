import { BarChart3, RefreshCw } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { demandesService } from '../../services/demandes/demandes.service'
import { STATUTS_DEMANDE, STATUTS_RECLAMATION } from '../../config/demandes/constantes'
import { Chargement, EtatVide, useDonnees } from '../modules/outils'

const duree = (h) => (h == null ? '-' : h < 48 ? `${h} h` : `${Math.round(h / 24)} jours`)

/** Indicateurs du module (consulter_statistiques). */
export default function PanneauStatistiques() {
  const notify = useNotify()
  const s = useDonnees(() => demandesService.statistiques(), [], { onErreur: notify.fromError })
  const d = s.donnees

  return (
    <section className="ev" aria-labelledby="ev-titre-stats">
      <div className="ev-entete">
        <div>
          <h2 className="ap-page-title" id="ev-titre-stats">Indicateurs</h2>
          <p className="ap-page-sub">Charge de travail et délais du service des demandes.</p>
        </div>
        <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={s.recharger} disabled={s.chargement}>
          <RefreshCw size={15} className={s.chargement ? 'ap-spin' : ''} aria-hidden="true" /> Actualiser
        </button>
      </div>
      {s.chargement && !d ? <Chargement label="Calcul des indicateurs…" /> : !d ? <EtatVide icone={BarChart3} titre="Indicateurs indisponibles" /> : (
        <>
          <div className="ev-synthese">
            <div className="ev-chiffre"><span>Demandes à traiter</span><strong>{d.demandes.a_traiter}</strong></div>
            <div className="ev-chiffre"><span>Dont prioritaires</span><strong>{d.demandes.prioritaires}</strong></div>
            <div className="ev-chiffre"><span>Plus ancienne en attente</span><strong>{duree(d.demandes.plus_ancienne_en_attente_heures)}</strong></div>
            <div className="ev-chiffre"><span>Délai moyen (90 jours)</span><strong>{duree(d.demandes.delai_moyen_traitement_heures_90j)}</strong></div>
            <div className="ev-chiffre"><span>Absences à valider</span><strong>{d.permissions_absence.en_attente}</strong></div>
          </div>
          <div className="ev-deux" style={{ gap: 14 }}>
            <Tableau titre="Demandes par statut" lignes={Object.entries(STATUTS_DEMANDE).map(([k, v]) => [v.libelle, d.demandes.par_statut[k] ?? 0])} />
            <Tableau titre="Réclamations par statut" lignes={Object.entries(STATUTS_RECLAMATION).map(([k, v]) => [v.libelle, d.reclamations.par_statut[k] ?? 0])} />
          </div>
          <Tableau titre="Demandes par document" lignes={d.demandes.par_type.map((t) => [t.nom, t.nombre])} />
        </>
      )}
    </section>
  )
}

function Tableau({ titre, lignes }) {
  return (
    <div className="ap-card ap-card--flush ev-table-wrap">
      <table className="ap-table">
        <caption style={{ textAlign: 'left', padding: '14px 14px 4px', fontWeight: 700 }}>{titre}</caption>
        <tbody>
          {lignes.map(([l, n]) => <tr key={l}><th scope="row">{l}</th><td className="ev-num">{n}</td></tr>)}
        </tbody>
      </table>
    </div>
  )
}
