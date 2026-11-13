import { useMemo, useState } from 'react'
import { BookOpen, Pencil, Plus, RefreshCw, Scale, Search, Trash2 } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { evaluationsService } from '../../services/evaluations/evaluations.service'
import { CYCLES, libelleCycle } from '../../config/evaluations/constantes'
import Drawer from '../administration/Drawer'
import Switch from '../administration/Switch'
import { aria, Badge, Champ, Chargement, erreursChamps, EtatVide, formatNombre, useDonnees } from '../modules/outils'

const COEF = /^\d{1,2}(\.\d{1,2})?$/
const normaliserCoef = (v) => String(v ?? '').trim().replace(',', '.')

/** Référentiel des matières et coefficients par niveau (administrateur). */
export default function PanneauMatieres() {
  const notify = useNotify()
  const [toutes, setToutes] = useState(false)
  const [recherche, setRecherche] = useState('')
  const { donnees, chargement, recharger } = useDonnees(
    () => evaluationsService.matieres({ actives: !toutes }),
    [toutes],
    { initial: { elements: [] }, onErreur: notify.fromError },
  )
  const [form, setForm] = useState(null) // { uuid?, code, nom, coefficient_defaut, active }
  const [coefs, setCoefs] = useState(null) // { matiere, lignes: [{cycle, niveau, coefficient}] }
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const [bascule, setBascule] = useState(null)

  const matieres = useMemo(() => {
    const t = recherche.trim().toLocaleLowerCase('fr')
    const liste = donnees?.elements ?? []
    return t ? liste.filter((m) => `${m.code} ${m.nom}`.toLocaleLowerCase('fr').includes(t)) : liste
  }, [donnees, recherche])

  const enregistrer = async (ev) => {
    ev.preventDefault()
    const e = {}
    const coef = normaliserCoef(form.coefficient_defaut)
    if (!form.uuid && !/^[A-Za-z0-9_-]{1,30}$/.test(form.code.trim())) e.code = 'Lettres, chiffres, « - » ou « _ » (30 caractères au plus).'
    if (!form.nom.trim()) e.nom = 'Indiquez le nom de la matière.'
    if (!COEF.test(coef) || Number(coef) <= 0) e.coefficient_defaut = 'Coefficient positif, deux décimales au plus (exemple : 2 ou 1.5).'
    setErreurs(e)
    if (Object.keys(e).length) return
    setEnvoi(true)
    try {
      if (form.uuid) {
        await evaluationsService.modifierMatiere(form.uuid, { nom: form.nom.trim(), coefficient_defaut: coef })
        notify.success('Matière mise à jour', form.nom.trim())
      } else {
        await evaluationsService.creerMatiere({ code: form.code.trim().toUpperCase(), nom: form.nom.trim(), coefficient_defaut: coef })
        notify.success('Matière créée', form.nom.trim())
      }
      setForm(null)
      recharger()
    } catch (err) {
      setErreurs(erreursChamps(err))
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  const basculer = async (m) => {
    setBascule(m.uuid)
    try {
      await evaluationsService.modifierMatiere(m.uuid, { active: !m.active })
      notify.success(m.active ? 'Matière désactivée' : 'Matière réactivée', m.nom)
      recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBascule(null)
    }
  }

  const enregistrerCoefs = async (ev) => {
    ev.preventDefault()
    const e = {}
    const vus = new Set()
    coefs.lignes.forEach((l, i) => {
      const cle = `${l.cycle}|${l.niveau.trim().toLocaleLowerCase('fr')}`
      if (!l.niveau.trim()) e[`n${i}`] = 'Niveau obligatoire.'
      else if (vus.has(cle)) e[`n${i}`] = 'Ce niveau apparaît deux fois.'
      vus.add(cle)
      const c = normaliserCoef(l.coefficient)
      if (!COEF.test(c) || Number(c) <= 0) e[`c${i}`] = 'Coefficient invalide.'
    })
    setErreurs(e)
    if (Object.keys(e).length) return
    setEnvoi(true)
    try {
      await evaluationsService.coefficients(coefs.matiere.uuid, coefs.lignes.map((l) => ({
        cycle: l.cycle, niveau: l.niveau.trim(), coefficient: normaliserCoef(l.coefficient),
      })))
      notify.success('Coefficients enregistrés', coefs.matiere.nom)
      setCoefs(null)
      recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  const majLigne = (i, k, v) => setCoefs((c) => ({ ...c, lignes: c.lignes.map((l, j) => (j === i ? { ...l, [k]: v } : l)) }))

  return (
    <section className="ev" aria-labelledby="ev-titre-matieres">
      <div className="ev-entete">
        <div>
          <h2 className="ap-page-title" id="ev-titre-matieres">Matières et coefficients</h2>
          <p className="ap-page-sub">Coefficient par défaut, puis coefficient propre à un niveau si nécessaire (exemple : Mathématiques coefficient 4 en Terminale C).</p>
        </div>
        <div className="ev-actions">
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={recharger} disabled={chargement}>
            <RefreshCw size={15} className={chargement ? 'ap-spin' : ''} aria-hidden="true" /> Actualiser
          </button>
          <button type="button" className="ap-btn ap-btn--sm" onClick={() => { setErreurs({}); setForm({ code: '', nom: '', coefficient_defaut: '1' }) }}>
            <Plus size={15} aria-hidden="true" /> Nouvelle matière
          </button>
        </div>
      </div>

      <div className="ap-card ev-filtres">
        <div className="ap-field">
          <label className="ap-label" htmlFor="ev-m-recherche">Rechercher</label>
          <div className="ap-search" style={{ margin: 0 }}>
            <Search size={16} aria-hidden="true" />
            <input id="ev-m-recherche" type="search" className="ap-input" value={recherche} maxLength={60}
              placeholder="Exemple : Mathématiques" onChange={(e) => setRecherche(e.target.value)} />
          </div>
        </div>
        <label className="ev-case" htmlFor="ev-m-toutes">
          <input id="ev-m-toutes" type="checkbox" checked={toutes} onChange={(e) => setToutes(e.target.checked)} />
          Afficher aussi les matières désactivées
        </label>
      </div>

      {chargement ? <Chargement label="Chargement des matières…" /> : matieres.length === 0 ? (
        <EtatVide icone={BookOpen} titre={recherche ? 'Aucun résultat' : 'Aucune matière'}
          texte={recherche ? 'Aucune matière ne correspond à cette recherche.' : 'Ajoutez les matières enseignées et leur coefficient.'} />
      ) : (
        <div className="ap-card ap-card--flush ev-table-wrap">
          <table className="ap-table">
            <caption className="ap-sr">Matières</caption>
            <thead>
              <tr><th scope="col">Code</th><th scope="col">Matière</th><th scope="col" className="ev-num">Coefficient</th><th scope="col">Par niveau</th><th scope="col">Active</th><th scope="col"><span className="ap-sr">Actions</span></th></tr>
            </thead>
            <tbody>
              {matieres.map((m) => (
                <tr key={m.uuid}>
                  <td><span className="ap-code">{m.code}</span></td>
                  <td><strong>{m.nom}</strong></td>
                  <td className="ev-num">{formatNombre(m.coefficient_defaut)}</td>
                  <td>
                    {(m.coefficients ?? []).length === 0 ? <span className="ev-muet">Coefficient par défaut</span> : (
                      <span className="ev-notes-liste">
                        {m.coefficients.map((c) => (
                          <span key={`${c.cycle}-${c.niveau}`} className="ev-pastille">{c.niveau} : {formatNombre(c.coefficient)}</span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td><Switch checked={!!m.active} busy={bascule === m.uuid} label={`${m.active ? 'Désactiver' : 'Activer'} ${m.nom}`} onChange={() => basculer(m)} /></td>
                  <td>
                    <div className="ev-actions" style={{ justifyContent: 'flex-end' }}>
                      <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => { setErreurs({}); setForm({ uuid: m.uuid, code: m.code, nom: m.nom, coefficient_defaut: m.coefficient_defaut }) }}>
                        <Pencil size={14} aria-hidden="true" /> Modifier
                      </button>
                      <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => {
                        setErreurs({})
                        setCoefs({ matiere: m, lignes: (m.coefficients ?? []).map((c) => ({ cycle: c.cycle, niveau: c.niveau, coefficient: c.coefficient })) })
                      }}>
                        <Scale size={14} aria-hidden="true" /> Coefficients
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={!!form}
        title={form?.uuid ? 'Modifier la matière' : 'Nouvelle matière'}
        subtitle={form?.uuid ? 'Le code est une référence stable : il ne change pas.' : undefined}
        onClose={() => !envoi && setForm(null)}
        busy={envoi}
        footer={(
          <>
            <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setForm(null)} disabled={envoi}>Annuler</button>
            <button type="submit" form="ev-form-matiere" className="ap-btn" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
          </>
        )}
      >
        {form && (
          <form id="ev-form-matiere" className="ev ev-form" onSubmit={enregistrer} noValidate>
            <Champ id="ev-m-code" label="Code" requis={!form.uuid} erreur={erreurs.code} aide={form.uuid ? undefined : 'Exemple : MATH. Il ne pourra plus être modifié.'}>
              <input {...aria('ev-m-code', erreurs.code, !form.uuid)} className="ap-input ap-input--mono" value={form.code} maxLength={30}
                readOnly={!!form.uuid} placeholder="Exemple : MATH" onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
            </Champ>
            <Champ id="ev-m-nom" label="Nom" requis erreur={erreurs.nom}>
              <input {...aria('ev-m-nom', erreurs.nom)} className="ap-input" value={form.nom} maxLength={150}
                placeholder="Exemple : Mathématiques" onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} required />
            </Champ>
            <Champ id="ev-m-coef" label="Coefficient par défaut" requis erreur={erreurs.coefficient_defaut} aide="Appliqué à tous les niveaux sans coefficient propre.">
              <input {...aria('ev-m-coef', erreurs.coefficient_defaut, true)} className="ap-input" value={form.coefficient_defaut} inputMode="decimal" maxLength={5}
                placeholder="Exemple : 2" onChange={(e) => setForm((f) => ({ ...f, coefficient_defaut: e.target.value }))} required />
            </Champ>
          </form>
        )}
      </Drawer>

      <Drawer
        open={!!coefs}
        title="Coefficients par niveau"
        subtitle={coefs ? `${coefs.matiere.nom} - coefficient par défaut ${formatNombre(coefs.matiere.coefficient_defaut)}` : undefined}
        onClose={() => !envoi && setCoefs(null)}
        busy={envoi}
        footer={(
          <>
            <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setCoefs(null)} disabled={envoi}>Annuler</button>
            <button type="submit" form="ev-form-coefs" className="ap-btn" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
          </>
        )}
      >
        {coefs && (
          <form id="ev-form-coefs" className="ev ev-form" onSubmit={enregistrerCoefs} noValidate>
            <p className="ap-hint" style={{ marginBottom: 12 }}>
              Le niveau s'écrit comme dans la classe (exemple : 3e, Tle C). Sans ligne, le coefficient par défaut s'applique partout.
            </p>
            {coefs.lignes.map((l, i) => (
              <div key={i} className="ev-ligne-echelle">
                <select className="ap-input" aria-label={`Cycle de la ligne ${i + 1}`} value={l.cycle} onChange={(e) => majLigne(i, 'cycle', e.target.value)}>
                  {CYCLES.map((c) => <option key={c.code} value={c.code}>{libelleCycle(c.code)}</option>)}
                </select>
                <input className="ap-input" aria-label={`Niveau de la ligne ${i + 1}`} aria-invalid={!!erreurs[`n${i}`] || undefined} value={l.niveau} maxLength={50}
                  placeholder="Exemple : 3e" onChange={(e) => majLigne(i, 'niveau', e.target.value)} />
                <input className="ap-input" aria-label={`Coefficient de la ligne ${i + 1}`} aria-invalid={!!erreurs[`c${i}`] || undefined} value={l.coefficient} inputMode="decimal" maxLength={5}
                  placeholder="Exemple : 4" onChange={(e) => majLigne(i, 'coefficient', e.target.value)} />
                <button type="button" className="ap-btn ap-btn--ghost ap-btn--icon" aria-label={`Retirer la ligne ${i + 1}`}
                  onClick={() => setCoefs((c) => ({ ...c, lignes: c.lignes.filter((_, j) => j !== i) }))}>
                  <Trash2 size={15} aria-hidden="true" />
                </button>
                {(erreurs[`n${i}`] || erreurs[`c${i}`]) && <p className="ap-error" role="alert" style={{ gridColumn: '1 / -1' }}>{erreurs[`n${i}`] ?? erreurs[`c${i}`]}</p>}
              </div>
            ))}
            {coefs.lignes.length < 60 && (
              <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" style={{ justifySelf: 'start' }}
                onClick={() => setCoefs((c) => ({ ...c, lignes: [...c.lignes, { cycle: 'secondaire', niveau: '', coefficient: '' }] }))}>
                <Plus size={14} aria-hidden="true" /> Ajouter un niveau
              </button>
            )}
            {!coefs.matiere.active && <p style={{ marginTop: 12 }}><Badge ton="warning">Matière désactivée</Badge></p>}
          </form>
        )}
      </Drawer>
    </section>
  )
}
