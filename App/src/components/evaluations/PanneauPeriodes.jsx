import { useMemo, useState } from 'react'
import { CalendarRange, Lock, Plus, RefreshCw } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { evaluationsService } from '../../services/evaluations/evaluations.service'
import { CYCLES, STATUTS_PERIODE, anneeScolaireCourante, libelleCycle } from '../../config/evaluations/constantes'
import Drawer from '../administration/Drawer'
import ConfirmDialog from '../commun/ConfirmDialog'
import { aria, Badge, Champ, Chargement, erreursChamps, EtatVide, formatDate, useDonnees } from '../modules/outils'

const VIDE = { annee_scolaire: anneeScolaireCourante(), cycle: 'secondaire', type: 'trimestre', numero: '1', libelle: '', date_debut: '', date_fin: '' }

/** Périodes d'évaluation (administrateur) : création et clôture, qui archive les bulletins. */
export default function PanneauPeriodes() {
  const notify = useNotify()
  const [annee, setAnnee] = useState(anneeScolaireCourante())
  const [cycle, setCycle] = useState('')
  const { donnees, chargement, recharger } = useDonnees(
    () => evaluationsService.periodes({ annee_scolaire: /^\d{4}-\d{4}$/.test(annee) ? annee : undefined, cycle }),
    [annee, cycle],
    { initial: { elements: [] }, onErreur: notify.fromError },
  )
  const [form, setForm] = useState(null)
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const [aCloturer, setACloturer] = useState(null)

  const periodes = donnees?.elements ?? []

  const ouvrir = () => { setErreurs({}); setForm({ ...VIDE, annee_scolaire: annee || VIDE.annee_scolaire, cycle: cycle || VIDE.cycle }) }
  const maj = (k) => (e) => setForm((f) => {
    const suivant = { ...f, [k]: e.target.value }
    if (k === 'type' && e.target.value === 'semestre' && Number(f.numero) > 2) suivant.numero = '1'
    return suivant
  })

  const libelleSuggere = useMemo(() => {
    if (!form) return ''
    const n = Number(form.numero)
    return `${n === 1 ? '1er' : `${n}e`} ${form.type === 'semestre' ? 'semestre' : 'trimestre'}`
  }, [form])

  const valider = () => {
    const e = {}
    if (!/^\d{4}-\d{4}$/.test(form.annee_scolaire) || Number(form.annee_scolaire.slice(5)) !== Number(form.annee_scolaire.slice(0, 4)) + 1) {
      e.annee_scolaire = "Format attendu : 2026-2027 (deux années qui se suivent)."
    }
    if (!form.date_debut) e.date_debut = 'Indiquez la date de début.'
    if (!form.date_fin) e.date_fin = 'Indiquez la date de fin.'
    if (form.date_debut && form.date_fin && form.date_fin <= form.date_debut) e.date_fin = 'La fin doit être après le début.'
    return e
  }

  const enregistrer = async (ev) => {
    ev.preventDefault()
    const e = valider()
    setErreurs(e)
    if (Object.keys(e).length) return
    setEnvoi(true)
    try {
      await evaluationsService.creerPeriode({ ...form, numero: Number(form.numero), libelle: form.libelle.trim() || libelleSuggere })
      notify.success('Période créée', `${form.libelle.trim() || libelleSuggere} - ${libelleCycle(form.cycle)} ${form.annee_scolaire}.`)
      setForm(null)
      recharger()
    } catch (err) {
      setErreurs(erreursChamps(err))
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  const cloturer = async () => {
    setEnvoi(true)
    try {
      await evaluationsService.cloturerPeriode(aCloturer.uuid)
      notify.success('Clôture lancée', 'Les bulletins sont en cours de calcul et d\'archivage. Actualisez dans quelques instants.')
      setACloturer(null)
      recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <section className="ev" aria-labelledby="ev-titre-periodes">
      <div className="ev-entete">
        <div>
          <h2 className="ap-page-title" id="ev-titre-periodes">Périodes d'évaluation</h2>
          <p className="ap-page-sub">Trimestres ou semestres par cycle. La clôture fige les notes et archive les bulletins.</p>
        </div>
        <div className="ev-actions">
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={recharger} disabled={chargement}>
            <RefreshCw size={15} className={chargement ? 'ap-spin' : ''} aria-hidden="true" /> Actualiser
          </button>
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrir}>
            <Plus size={15} aria-hidden="true" /> Nouvelle période
          </button>
        </div>
      </div>

      <div className="ap-card ev-filtres">
        <Champ id="ev-p-annee" label="Année scolaire" aide="Exemple : 2026-2027">
          <input {...aria('ev-p-annee', null, true)} className="ap-input" value={annee} maxLength={9} inputMode="numeric"
            placeholder="Exemple : 2026-2027" onChange={(e) => setAnnee(e.target.value.trim())} />
        </Champ>
        <Champ id="ev-p-cycle" label="Cycle">
          <select {...aria('ev-p-cycle')} className="ap-input" value={cycle} onChange={(e) => setCycle(e.target.value)}>
            <option value="">Tous les cycles</option>
            {CYCLES.map((c) => <option key={c.code} value={c.code}>{c.libelle}</option>)}
          </select>
        </Champ>
      </div>

      {chargement ? <Chargement label="Chargement des périodes…" /> : periodes.length === 0 ? (
        <EtatVide icone={CalendarRange} titre="Aucune période" texte="Créez les trimestres ou semestres de l'année pour chaque cycle avant de saisir des évaluations.">
          <button type="button" className="ap-btn ap-btn--sm" onClick={ouvrir}><Plus size={15} aria-hidden="true" /> Créer une période</button>
        </EtatVide>
      ) : (
        <div className="ap-card ap-card--flush ev-table-wrap">
          <table className="ap-table">
            <caption className="ap-sr">Périodes d'évaluation</caption>
            <thead>
              <tr><th scope="col">Période</th><th scope="col">Cycle</th><th scope="col">Année</th><th scope="col">Du</th><th scope="col">Au</th><th scope="col">Statut</th><th scope="col"><span className="ap-sr">Actions</span></th></tr>
            </thead>
            <tbody>
              {periodes.map((p) => {
                const s = STATUTS_PERIODE[p.statut] ?? { libelle: p.statut, badge: 'neutral' }
                return (
                  <tr key={p.uuid}>
                    <td><strong>{p.libelle}</strong></td>
                    <td>{libelleCycle(p.cycle)}</td>
                    <td>{p.annee_scolaire}</td>
                    <td>{formatDate(p.date_debut)}</td>
                    <td>{formatDate(p.date_fin)}</td>
                    <td><Badge ton={s.badge}>{s.libelle}</Badge></td>
                    <td style={{ textAlign: 'right' }}>
                      {p.statut === 'ouverte' && (
                        <button type="button" className="ap-btn ap-btn--warn ap-btn--sm" onClick={() => setACloturer(p)}>
                          <Lock size={14} aria-hidden="true" /> Clôturer
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={!!form}
        title="Nouvelle période"
        subtitle="Les dates ne doivent pas chevaucher une autre période du même cycle."
        onClose={() => !envoi && setForm(null)}
        busy={envoi}
        footer={(
          <>
            <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setForm(null)} disabled={envoi}>Annuler</button>
            <button type="submit" form="ev-form-periode" className="ap-btn" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Créer la période'}</button>
          </>
        )}
      >
        {form && (
          <form id="ev-form-periode" className="ev ev-form" onSubmit={enregistrer} noValidate>
            <div className="ev-deux">
              <Champ id="ev-f-annee" label="Année scolaire" requis erreur={erreurs.annee_scolaire}>
                <input {...aria('ev-f-annee', erreurs.annee_scolaire)} className="ap-input" value={form.annee_scolaire} maxLength={9}
                  placeholder="Exemple : 2026-2027" onChange={maj('annee_scolaire')} required />
              </Champ>
              <Champ id="ev-f-cycle" label="Cycle" requis erreur={erreurs.cycle}>
                <select {...aria('ev-f-cycle', erreurs.cycle)} className="ap-input" value={form.cycle} onChange={maj('cycle')} required>
                  {CYCLES.map((c) => <option key={c.code} value={c.code}>{c.libelle}</option>)}
                </select>
              </Champ>
              <Champ id="ev-f-type" label="Découpage" requis erreur={erreurs.type}>
                <select {...aria('ev-f-type', erreurs.type)} className="ap-input" value={form.type} onChange={maj('type')} required>
                  <option value="trimestre">Trimestre</option>
                  <option value="semestre">Semestre</option>
                </select>
              </Champ>
              <Champ id="ev-f-numero" label="Numéro" requis erreur={erreurs.numero}>
                <select {...aria('ev-f-numero', erreurs.numero)} className="ap-input" value={form.numero} onChange={maj('numero')} required>
                  {(form.type === 'semestre' ? [1, 2] : [1, 2, 3]).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Champ>
            </div>
            <Champ id="ev-f-libelle" label="Libellé" erreur={erreurs.libelle} aide={`Laissé vide : « ${libelleSuggere} ».`}>
              <input {...aria('ev-f-libelle', erreurs.libelle, true)} className="ap-input" value={form.libelle} maxLength={60}
                placeholder={`Exemple : ${libelleSuggere}`} onChange={maj('libelle')} />
            </Champ>
            <div className="ev-deux">
              <Champ id="ev-f-debut" label="Date de début" requis erreur={erreurs.date_debut}>
                <input {...aria('ev-f-debut', erreurs.date_debut)} type="date" className="ap-input" value={form.date_debut} onChange={maj('date_debut')} required />
              </Champ>
              <Champ id="ev-f-fin" label="Date de fin" requis erreur={erreurs.date_fin}>
                <input {...aria('ev-f-fin', erreurs.date_fin)} type="date" className="ap-input" value={form.date_fin} min={form.date_debut || undefined} onChange={maj('date_fin')} required />
              </Champ>
            </div>
          </form>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!aCloturer}
        tone="warning"
        title="Clôturer la période ?"
        message={aCloturer ? `« ${aCloturer.libelle} » (${libelleCycle(aCloturer.cycle)} ${aCloturer.annee_scolaire}) : les notes seront figées et les bulletins archivés. Une note ne pourra plus être modifiée que par correction motivée.` : ''}
        confirmLabel="Clôturer"
        loading={envoi}
        onConfirm={cloturer}
        onCancel={() => !envoi && setACloturer(null)}
      />
    </section>
  )
}
