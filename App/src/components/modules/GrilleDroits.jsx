import { useMemo, useState } from 'react'
import { Save, ShieldCheck } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { permissionsRoleService } from '../../services/identite/permissionsRole.service'
import { Champ, Chargement, EtatVide, aria, useDonnees } from './outils'

const NON_CONFIGURABLES = ['administrateur', 'super_admin']

/**
 * Grille rôle x action d'un module (administrateur). Les rôles viennent d'Identité (rôles de l'établissement,
 * y compris personnalisés) ; l'administrateur a toujours toutes les actions et n'apparaît pas.
 *  - charger() -> { actions: [{ code, libelle }], roles: { [role_code]: [action] } }
 *  - enregistrer(role_code, actions) : liste complète des actions du rôle.
 */
export default function GrilleDroits({ module, charger, enregistrer }) {
  const notify = useNotify()
  const grille = useDonnees(charger, [], { onErreur: notify.fromError })
  const roles = useDonnees(async () => {
    const r = await permissionsRoleService.listerRoles()
    return (r?.data?.roles ?? r?.roles ?? []).filter((x) => x?.code && !NON_CONFIGURABLES.includes(x.code))
  }, [], { initial: [] })
  const [roleChoisi, setRole] = useState('')
  const [edition, setEdition] = useState({}) // { [role_code]: actions cochées non enregistrées }
  const [envoi, setEnvoi] = useState(false)

  const listeRoles = useMemo(() => {
    const m = new Map((roles.donnees ?? []).map((r) => [r.code, r.libelle || r.code]))
    Object.keys(grille.donnees?.roles ?? {}).forEach((c) => { if (!m.has(c) && !NON_CONFIGURABLES.includes(c)) m.set(c, c) })
    return [...m.entries()].map(([code, libelle]) => ({ code, libelle })).sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'))
  }, [roles.donnees, grille.donnees])

  const role = roleChoisi || listeRoles[0]?.code || ''
  const initiales = grille.donnees?.roles?.[role] ?? []
  const coches = edition[role] ?? initiales
  const setCoches = (f) => setEdition((e) => ({ ...e, [role]: f(e[role] ?? initiales) }))
  const modifie = coches.length !== initiales.length || coches.some((a) => !initiales.includes(a))

  const sauver = async () => {
    setEnvoi(true)
    try {
      await enregistrer(role, coches)
      notify.success('Droits enregistrés', `${listeRoles.find((r) => r.code === role)?.libelle ?? role} - ${module}.`)
      setEdition((e) => { const n = { ...e }; delete n[role]; return n })
      grille.recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <section className="ev" aria-labelledby="ev-titre-droits">
      <div>
        <h2 className="ap-page-title" id="ev-titre-droits">Droits par rôle</h2>
        <p className="ap-page-sub">Choisissez ce que chaque rôle peut faire dans le module {module}. L'administrateur a toujours tous les droits.</p>
      </div>
      {grille.chargement || roles.chargement ? <Chargement label="Chargement des droits…" /> : !grille.donnees ? (
        <EtatVide icone={ShieldCheck} titre="Droits indisponibles" texte="La grille des droits n'a pas pu être chargée." />
      ) : listeRoles.length === 0 ? (
        <EtatVide icone={ShieldCheck} titre="Aucun rôle à configurer" texte="Créez d'abord les rôles de l'établissement (configuration de l'établissement)." />
      ) : (
        <div className="ap-card" style={{ padding: 18 }}>
          <div className="ev-deux">
            <Champ id="ev-d-role" label="Rôle" requis>
              <select {...aria('ev-d-role')} className="ap-input" value={role} onChange={(e) => setRole(e.target.value)}>
                {listeRoles.map((r) => <option key={r.code} value={r.code}>{r.libelle}</option>)}
              </select>
            </Champ>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: '0 0 16px' }}>
            <legend className="ap-label" style={{ marginBottom: 10 }}>Actions autorisées</legend>
            <div style={{ display: 'grid', gap: 10 }}>
              {grille.donnees.actions.map((a) => (
                <label key={a.code} className="ev-case" htmlFor={`ev-d-${a.code}`}>
                  <input id={`ev-d-${a.code}`} type="checkbox" checked={coches.includes(a.code)}
                    onChange={(e) => setCoches((c) => (e.target.checked ? [...c, a.code] : c.filter((x) => x !== a.code)))} />
                  {a.libelle}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="ev-actions" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="ap-btn" onClick={sauver} disabled={envoi || !modifie}>
              <Save size={15} aria-hidden="true" /> {envoi ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
