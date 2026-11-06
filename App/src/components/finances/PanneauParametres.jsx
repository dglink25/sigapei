import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { financesService } from '../../services/finances/finances.service'
import { Champ, Chargement, aria, erreursChamps, useDonnees } from '../modules/outils'

/** Paramètres financiers de l'établissement (administrateur). */
export default function PanneauParametres() {
  const notify = useNotify()
  const p = useDonnees(() => financesService.parametres(), [], { onErreur: notify.fromError })
  const [f, setF] = useState(null)
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    if (!p.donnees) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setF({ ...p.donnees, relance_jours_apres: (p.donnees.relance_jours_apres ?? []).join(', '), mentions_recu: p.donnees.mentions_recu ?? '' })
  }, [p.donnees])

  const enregistrer = async (ev) => {
    ev.preventDefault()
    const e = {}
    const apres = f.relance_jours_apres.split(/[,;\s]+/).filter(Boolean).map(Number)
    if (apres.some((n) => !Number.isInteger(n) || n < 1 || n > 120) || new Set(apres).size !== apres.length || apres.length > 6) e.relance_jours_apres = 'Jusqu\'à 6 nombres distincts de 1 à 120, séparés par des virgules.'
    const avant = Number(f.relance_jours_avant)
    if (!Number.isInteger(avant) || avant < 0 || avant > 60) e.relance_jours_avant = 'De 0 (aucune) à 60 jours.'
    setErreurs(e)
    if (Object.keys(e).length) return
    setEnvoi(true)
    try {
      await financesService.enregistrerParametres({
        devise: f.devise, double_validation_reglements: !!f.double_validation_reglements, relance_jours_avant: avant,
        relance_jours_apres: apres, mentions_recu: f.mentions_recu.trim() || null,
      })
      notify.success('Paramètres enregistrés')
      p.recharger()
    } catch (err) {
      setErreurs(erreursChamps(err))
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <section className="ev" aria-labelledby="ev-titre-par">
      <div>
        <h2 className="ap-page-title" id="ev-titre-par">Paramètres financiers</h2>
        <p className="ap-page-sub">Devise, contrôle des règlements, relances automatiques et mentions des reçus.</p>
      </div>
      {!f ? <Chargement label="Chargement…" /> : (
        <form className="ap-card" style={{ padding: 18 }} onSubmit={enregistrer} noValidate>
          <div className="ev-deux">
            <Champ id="ev-pa-dev" label="Devise" requis erreur={erreurs.devise} aide="Figée dès la première facture émise.">
              <select {...aria('ev-pa-dev', erreurs.devise, true)} className="ap-input" value={f.devise} onChange={(e) => setF((x) => ({ ...x, devise: e.target.value }))}>
                <option value="XOF">Franc CFA (UEMOA)</option><option value="XAF">Franc CFA (CEMAC)</option><option value="GNF">Franc guinéen</option>
              </select>
            </Champ>
            <Champ id="ev-pa-av" label="Rappel avant l'échéance (jours)" requis erreur={erreurs.relance_jours_avant} aide="0 : pas de rappel avant.">
              <input {...aria('ev-pa-av', erreurs.relance_jours_avant, true)} type="number" min={0} max={60} className="ap-input" value={f.relance_jours_avant} placeholder="Exemple : 7"
                onChange={(e) => setF((x) => ({ ...x, relance_jours_avant: e.target.value }))} />
            </Champ>
            <Champ id="ev-pa-ap" label="Relances après l'échéance (jours de retard)" erreur={erreurs.relance_jours_apres} aide="Séparés par des virgules.">
              <input {...aria('ev-pa-ap', erreurs.relance_jours_apres, true)} className="ap-input" maxLength={40} value={f.relance_jours_apres} placeholder="Exemple : 1, 7, 15"
                onChange={(e) => setF((x) => ({ ...x, relance_jours_apres: e.target.value }))} />
            </Champ>
          </div>
          <label className="ev-case" htmlFor="ev-pa-dv" style={{ marginBottom: 6 }}>
            <input id="ev-pa-dv" type="checkbox" checked={!!f.double_validation_reglements} onChange={(e) => setF((x) => ({ ...x, double_validation_reglements: e.target.checked }))} />
            Double validation des règlements saisis au guichet (recommandé)
          </label>
          {!f.double_validation_reglements && <p className="ap-hint" role="alert" style={{ color: '#a07010', marginBottom: 14 }}>Sans double validation, un règlement est définitif dès sa saisie. Ce choix est journalisé.</p>}
          <Champ id="ev-pa-men" label="Mentions sur les reçus">
            <textarea {...aria('ev-pa-men')} className="ap-textarea" rows={3} maxLength={1000} value={f.mentions_recu} placeholder="Exemple : Les sommes versées ne sont pas remboursables."
              onChange={(e) => setF((x) => ({ ...x, mentions_recu: e.target.value }))} />
          </Champ>
          <div className="ev-actions" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="ap-btn" disabled={envoi}><Save size={15} aria-hidden="true" /> {envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      )}
    </section>
  )
}
