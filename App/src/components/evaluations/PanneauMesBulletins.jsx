import { useEffect } from 'react'
import { GraduationCap, RefreshCw } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { evaluationsService } from '../../services/evaluations/evaluations.service'
import BulletinDetail from './BulletinDetail'
import { aria, Champ, Chargement, EtatVide, nomComplet, trierParNom, useDonnees } from '../modules/outils'
import { libellePeriode, periodeParDefaut, usePeriodes } from './referentiels'

/** Apprenant : ses résultats ; parent : ceux de chaque enfant rattaché (liste fournie par Scolarité). */
export default function PanneauMesBulletins({ role, filtres, setFiltres }) {
  const notify = useNotify()
  const enfants = useDonnees(async () => trierParNom(await evaluationsService.mesApprenants()), [], { initial: [], onErreur: notify.fromError })
  const liste = enfants.donnees ?? []
  const apprenant = liste.find((a) => a.uuid === filtres.apprenant) ?? null
  const { periodes, chargement: chargementPeriodes } = usePeriodes(apprenant?.classe?.cycle, notify.fromError)
  const periode = periodes.find((p) => p.uuid === filtres.periode) ?? null

  useEffect(() => {
    if (liste.length && !apprenant) setFiltres({ apprenant: liste[0].uuid, periode: '' })
  }, [liste]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (apprenant && !chargementPeriodes && !periode) {
      const p = periodeParDefaut(periodes)
      if (p) setFiltres({ periode: p.uuid })
    }
  }, [periodes, chargementPeriodes, apprenant?.uuid]) // eslint-disable-line react-hooks/exhaustive-deps

  const bulletin = useDonnees(() => evaluationsService.bulletin(apprenant.uuid, periode.uuid), [apprenant?.uuid, periode?.uuid],
    { actif: !!(apprenant && periode) })

  return (
    <section className="ev" aria-labelledby="ev-titre-bulletins">
      <div className="ev-entete">
        <div>
          <h2 className="ap-page-title" id="ev-titre-bulletins">{role === 'parent' ? 'Résultats de mes enfants' : 'Mes résultats'}</h2>
          <p className="ap-page-sub">Notes, moyennes et bulletins. Le PDF est disponible après la clôture de la période.</p>
        </div>
        {apprenant && periode && (
          <div className="ev-actions">
            <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={bulletin.recharger} disabled={bulletin.chargement}>
              <RefreshCw size={15} className={bulletin.chargement ? 'ap-spin' : ''} aria-hidden="true" /> Actualiser
            </button>
          </div>
        )}
      </div>

      {enfants.chargement ? <Chargement label="Chargement…" /> : liste.length === 0 ? (
        <EtatVide icone={GraduationCap} titre="Aucun dossier rattaché"
          texte={role === 'parent' ? 'Aucun enfant n\'est rattaché à votre compte. Rapprochez-vous de l\'établissement.' : 'Votre dossier d\'apprenant n\'est pas encore rattaché à votre compte.'} />
      ) : (
        <>
          <div className="ap-card ev-filtres">
            {liste.length > 1 && (
              <Champ id="ev-mb-enfant" label="Enfant" requis>
                <select {...aria('ev-mb-enfant')} className="ap-input" value={filtres.apprenant} onChange={(e) => setFiltres({ apprenant: e.target.value, periode: '' })}>
                  {liste.map((a) => <option key={a.uuid} value={a.uuid}>{nomComplet(a)}{a.classe?.nom ? ` - ${a.classe.nom}` : ''}</option>)}
                </select>
              </Champ>
            )}
            <Champ id="ev-mb-periode" label="Période" requis>
              <select {...aria('ev-mb-periode')} className="ap-input" value={periode ? filtres.periode : ''} disabled={chargementPeriodes}
                onChange={(e) => setFiltres({ periode: e.target.value })}>
                <option value="">Choisir une période</option>
                {periodes.map((p) => <option key={p.uuid} value={p.uuid}>{libellePeriode(p)}{p.statut === 'ouverte' ? ' (en cours)' : ''}</option>)}
              </select>
            </Champ>
          </div>

          {!periode ? (
            <EtatVide icone={GraduationCap} titre={periodes.length ? 'Choisissez une période' : 'Aucune période'}
              texte={periodes.length ? undefined : 'Aucune période d\'évaluation n\'est encore ouverte pour cette classe.'} />
          ) : bulletin.chargement ? <Chargement label="Chargement du bulletin…" /> : bulletin.donnees ? (
            <div className="ap-card" style={{ padding: 18 }}>
              <BulletinDetail bulletin={bulletin.donnees} periodeUuid={periode.uuid} peutContester />
            </div>
          ) : (
            <EtatVide icone={GraduationCap} titre="Pas encore de résultats"
              texte={bulletin.erreur?.status === 404 || bulletin.erreur?.status === 409
                ? bulletin.erreur.message
                : 'Les résultats ne sont pas disponibles pour le moment. Réessayez plus tard.'} />
          )}
        </>
      )}
    </section>
  )
}
