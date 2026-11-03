import { useEffect, useMemo, useState } from 'react'
import { ArrowDownUp, BarChart3, RefreshCw } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { evaluationsService } from '../../services/evaluations/evaluations.service'
import { formatNombre, nomComplet } from '../../config/evaluations/constantes'
import Drawer from '../administration/Drawer'
import BulletinDetail from './BulletinDetail'
import { Badge, Champ, Chargement, EtatVide, aria, useDonnees } from './communs'
import { libelleClasse, libellePeriode, periodeParDefaut, useClassesAccessibles, usePeriodes } from './referentiels'

const TRIS = {
  rang: { libelle: 'Rang', cmp: (a, b) => (a.rang ?? Infinity) - (b.rang ?? Infinity) || nomComplet(a).localeCompare(nomComplet(b), 'fr') },
  nom: { libelle: 'Nom', cmp: (a, b) => nomComplet(a).localeCompare(nomComplet(b), 'fr') },
  moyenne: { libelle: 'Moyenne décroissante', cmp: (a, b) => (a.moyenne == null) - (b.moyenne == null) || Number(b.moyenne ?? 0) - Number(a.moyenne ?? 0) },
}

/** Résultats d'une classe (administrateur, enseignant affecté) : classement, statistiques, bulletin de chaque apprenant. */
export default function PanneauResultats({ role, filtres, setFiltres }) {
  const notify = useNotify()
  const ref = useClassesAccessibles(role, notify.fromError)
  const classe = ref.classes.find((c) => c.uuid === filtres.classe) ?? null
  const { periodes, chargement: chargementPeriodes } = usePeriodes(classe?.cycle, notify.fromError)
  const periode = periodes.find((p) => p.uuid === filtres.periode) ?? null
  const [tri, setTri] = useState('rang')
  const [ouvert, setOuvert] = useState(null)

  useEffect(() => {
    if (!filtres.classe && ref.classes.length === 1) setFiltres({ classe: ref.classes[0].uuid })
  }, [ref.classes]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (filtres.classe && !chargementPeriodes && !periodes.some((p) => p.uuid === filtres.periode)) {
      const p = periodeParDefaut(periodes)
      if (p) setFiltres({ periode: p.uuid })
    }
  }, [periodes, chargementPeriodes, filtres.classe]) // eslint-disable-line react-hooks/exhaustive-deps

  const pret = !!(filtres.classe && periode)
  const classement = useDonnees(() => evaluationsService.classement(filtres.classe, filtres.periode), [filtres.classe, filtres.periode],
    { actif: pret, onErreur: notify.fromError })
  const bulletin = useDonnees(() => evaluationsService.bulletin(ouvert.apprenant_uuid, filtres.periode), [ouvert?.apprenant_uuid, filtres.periode],
    { actif: !!ouvert, onErreur: notify.fromError })

  const c = classement.donnees
  const lignes = useMemo(() => [...(c?.apprenants ?? [])].sort(TRIS[c?.classement_actif ? tri : tri === 'rang' ? 'nom' : tri].cmp), [c, tri])

  return (
    <section className="ev" aria-labelledby="ev-titre-resultats">
      <div className="ev-entete">
        <div>
          <h2 className="ap-page-title" id="ev-titre-resultats">Résultats et bulletins</h2>
          <p className="ap-page-sub">Moyennes calculées selon les règles du cycle. Avant la clôture, les résultats sont provisoires.</p>
        </div>
        {pret && (
          <div className="ev-actions">
            <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={classement.recharger} disabled={classement.chargement}>
              <RefreshCw size={15} className={classement.chargement ? 'ap-spin' : ''} aria-hidden="true" /> Actualiser
            </button>
          </div>
        )}
      </div>

      <div className="ap-card ev-filtres">
        <Champ id="ev-r-classe" label="Classe" requis>
          <select {...aria('ev-r-classe')} className="ap-input" value={filtres.classe} disabled={ref.chargement}
            onChange={(e) => setFiltres({ classe: e.target.value, periode: '' })}>
            <option value="">{ref.chargement ? 'Chargement…' : 'Choisir une classe'}</option>
            {ref.classes.map((x) => <option key={x.uuid} value={x.uuid}>{libelleClasse(x)}</option>)}
          </select>
        </Champ>
        <Champ id="ev-r-periode" label="Période" requis>
          <select {...aria('ev-r-periode')} className="ap-input" value={periode ? filtres.periode : ''} disabled={!filtres.classe || chargementPeriodes}
            onChange={(e) => setFiltres({ periode: e.target.value })}>
            <option value="">Choisir une période</option>
            {periodes.map((p) => <option key={p.uuid} value={p.uuid}>{libellePeriode(p, !classe?.cycle)}{p.statut !== 'ouverte' ? ' (clôturée)' : ''}</option>)}
          </select>
        </Champ>
        <Champ id="ev-r-tri" label="Trier par">
          <select {...aria('ev-r-tri')} className="ap-input" value={tri} onChange={(e) => setTri(e.target.value)}>
            {Object.entries(TRIS).filter(([k]) => k !== 'rang' || c?.classement_actif !== false).map(([k, t]) => <option key={k} value={k}>{t.libelle}</option>)}
          </select>
        </Champ>
      </div>

      {!pret ? (
        <EtatVide icone={BarChart3} titre="Choisissez une classe et une période" />
      ) : classement.chargement && !c ? <Chargement label="Calcul des moyennes…" /> : !c ? (
        <EtatVide icone={BarChart3} titre="Résultats indisponibles" texte="Les règles de notation du cycle sont peut-être à configurer, ou un service est momentanément indisponible." />
      ) : (
        <>
          <div className="ev-synthese">
            <div className="ev-chiffre"><span>Moyenne de la classe</span><strong>{formatNombre(c.moyenne_classe)}</strong></div>
            <div className="ev-chiffre"><span>Apprenants classés</span><strong>{c.effectif_classes ?? c.effectif_classe}</strong></div>
            <div className="ev-chiffre"><span>Statut</span><strong style={{ fontSize: '1.05rem' }}>{c.periode?.statut === 'ouverte' ? 'Provisoire' : c.periode?.statut === 'cloturee' ? 'Bulletins archivés' : 'Clôture en cours'}</strong></div>
          </div>

          {lignes.length === 0 ? (
            <EtatVide icone={BarChart3} titre="Aucun résultat" texte="Aucune note n'est encore saisie pour cette période." />
          ) : (
            <div className="ap-card ap-card--flush ev-table-wrap">
              <table className="ap-table">
                <caption className="ap-sr">Classement de la classe {libelleClasse(classe)}, {libellePeriode(periode)}</caption>
                <thead>
                  <tr>
                    {c.classement_actif && <th scope="col" className="ev-num">Rang</th>}
                    <th scope="col">Apprenant</th><th scope="col" className="ev-num">Moyenne</th><th scope="col">Appréciation</th>
                    <th scope="col"><span className="ap-sr">Bulletin</span></th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l) => (
                    <tr key={l.apprenant_uuid}>
                      {c.classement_actif && <td className="ev-num">{l.rang ?? '-'}{l.ex_aequo ? ' ex æquo' : ''}</td>}
                      <th scope="row" style={{ textAlign: 'left' }}>{nomComplet(l)}</th>
                      <td className="ev-num ev-fort">{formatNombre(l.moyenne)}</td>
                      <td>{l.mention ?? '-'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => setOuvert(l)}>Voir le bulletin</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(c.distribution ?? []).length > 0 && (
            <div className="ap-card ap-card--flush ev-table-wrap">
              <table className="ap-table">
                <caption style={{ textAlign: 'left', padding: '14px 14px 4px', fontWeight: 700 }}>
                  <ArrowDownUp size={15} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Moyennes par matière
                </caption>
                <thead><tr><th scope="col">Matière</th><th scope="col" className="ev-num">Moyenne</th><th scope="col" className="ev-num">Minimum</th><th scope="col" className="ev-num">Maximum</th><th scope="col" className="ev-num">Notés</th></tr></thead>
                <tbody>
                  {c.distribution.map((d) => (
                    <tr key={d.matiere_uuid}>
                      <th scope="row" style={{ textAlign: 'left' }}>{d.matiere_nom}</th>
                      <td className="ev-num ev-fort">{formatNombre(d.moyenne)}</td>
                      <td className="ev-num">{formatNombre(d.min)}</td>
                      <td className="ev-num">{formatNombre(d.max)}</td>
                      <td className="ev-num">{d.effectif}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {c.periode?.statut !== 'ouverte' && <p className="ap-hint"><Badge ton="neutral">Archivé</Badge> Les bulletins de cette période sont figés ; une correction de note crée une nouvelle version.</p>}
        </>
      )}

      <Drawer open={!!ouvert} title="Bulletin" subtitle={ouvert ? nomComplet(ouvert) : undefined} onClose={() => setOuvert(null)}>
        {bulletin.chargement ? <Chargement label="Chargement du bulletin…" /> : bulletin.donnees && ouvert ? (
          <BulletinDetail bulletin={bulletin.donnees} periodeUuid={filtres.periode} />
        ) : <p className="ap-hint">Bulletin indisponible.</p>}
      </Drawer>
    </section>
  )
}
