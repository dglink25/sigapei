/**
 * PanneauPermissionsRole - Configurer les droits par rôle.
 *
 * L'admin choisit un rôle dans la liste, puis coche/décoche :
 *   - les services accessibles à ce rôle
 *   - l'accès au portail
 *
 * L'administrateur a toujours accès implicite à tout (non modifiable).
 */
import { useEffect, useState } from 'react'
import { RefreshCw, Shield } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import { permissionsRoleService } from '../../../services/identite/permissionsRole.service'

export default function PanneauPermissionsRole() {
  const notify = useNotify()
  const [roles,        setRoles]        = useState([])
  const [roleActif,    setRoleActif]    = useState(null)
  const [droits,       setDroits]       = useState(null)  // { role, services }
  const [chargeListe,  setChargeListe]  = useState(true)
  const [chargeDroits, setChargeDroits] = useState(false)
  const [busy,         setBusy]         = useState({}) // { [serviceUuid|'portail']: bool }

  // Charger la liste des rôles
  const chargerRoles = async () => {
    setChargeListe(true)
    try {
      const r = await permissionsRoleService.listerRoles()
      const liste = r?.data?.roles ?? r?.roles ?? []
      setRoles(liste)
      if (liste.length > 0 && !roleActif) setRoleActif(liste[0])
    } catch (err) {
      notify.fromError(err)
    } finally {
      setChargeListe(false)
    }
  }

  // Charger les droits du rôle sélectionné
  const chargerDroits = async (role) => {
    if (!role) return
    setChargeDroits(true)
    try {
      const r = await permissionsRoleService.droitsParService(role.uuid)
      setDroits(r?.data ?? r)
    } catch (err) {
      notify.fromError(err)
    } finally {
      setChargeDroits(false)
    }
  }

  useEffect(() => { chargerRoles() }, []) // eslint-disable-line

  useEffect(() => {
    if (roleActif) chargerDroits(roleActif)
  }, [roleActif?.uuid]) // eslint-disable-line

  const toggleService = async (serviceUuid, actuel) => {
    if (!droits?.role?.peutVoirPortail) {
      notify.warning("Activez d'abord l'accès au portail pour pouvoir accorder des services à ce rôle.")
      return
    }
    setBusy((b) => ({ ...b, [serviceUuid]: true }))
    try {
      await permissionsRoleService.definirService(roleActif.uuid, serviceUuid, !actuel)
      // Mettre à jour localement
      setDroits((d) => ({
        ...d,
        services: d.services.map((s) =>
          s.uuid === serviceUuid ? { ...s, accorde: !actuel } : s,
        ),
      }))
      await chargerRoles() // maj compteur nbServicesAccordes
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy((b) => ({ ...b, [serviceUuid]: false }))
    }
  }

  const togglePortail = async (actuel) => {
    const nouveau = !actuel
    setBusy((b) => ({ ...b, portail: true }))
    try {
      await permissionsRoleService.definirPortail(roleActif.uuid, nouveau)
      setDroits((d) => ({
        ...d,
        role: { ...d.role, peutVoirPortail: nouveau },
        services: nouveau ? d.services : d.services.map((s) => ({ ...s, accorde: false })),
      }))
      setRoles((prev) =>
        prev.map((r) =>
          r.uuid === roleActif.uuid
            ? { ...r, peutVoirPortail: nouveau, nbServicesAccordes: nouveau ? r.nbServicesAccordes : 0 }
            : r,
        ),
      )
      await chargerRoles()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy((b) => ({ ...b, portail: false }))
    }
  }

  const estAdmin = roleActif?.code === 'administrateur'

  return (
    <div className="cfg-tab">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Permissions par rôle</h2>
          <p className="ap-page-sub">
            Configurez quels services sont accessibles à chaque rôle, et si le rôle peut accéder au portail.
            L'administrateur dispose toujours de tous les droits.
          </p>
        </div>
        <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={chargerRoles} disabled={chargeListe}>
          <RefreshCw size={14} className={chargeListe ? 'ap-spin' : ''} /> Actualiser
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:16, alignItems:'start' }}>

        {/* Liste des rôles */}
        <div className="ap-card" style={{ padding:0, overflow:'hidden' }}>
          <p style={{ padding:'10px 14px 6px', fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ap-muted)', margin:0 }}>
            Rôles
          </p>
          {chargeListe ? (
            <div style={{ padding:'10px 14px' }}>
              {[0,1,2].map((i) => <div key={i} className="ap-skel" style={{ height:36, marginBottom:6, borderRadius:6, '--i':i }} />)}
            </div>
          ) : roles.map((r) => (
            <button key={r.uuid} type="button"
              onClick={() => { setRoleActif(r); setDroits(null) }}
              style={{
                display:'flex', alignItems:'center', gap:8, width:'100%',
                padding:'9px 14px', border:0, borderLeft: roleActif?.uuid === r.uuid ? '3px solid #006B3C' : '3px solid transparent',
                background: roleActif?.uuid === r.uuid ? 'rgba(0,107,60,0.07)' : 'transparent',
                fontFamily:'inherit', fontSize:'0.88rem', fontWeight: roleActif?.uuid === r.uuid ? 700 : 400,
                color: roleActif?.uuid === r.uuid ? '#006B3C' : 'var(--sg-text)', cursor:'pointer', textAlign:'left',
              }}>
              <Shield size={14} aria-hidden="true" style={{ flexShrink:0, opacity: r.code === 'administrateur' ? 0.4 : 1 }} />
              <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.libelle}</span>
              {r.nbServicesAccordes > 0 && (
                <span style={{ fontSize:'0.72rem', fontWeight:700, background:'rgba(0,107,60,0.12)', color:'#006B3C', borderRadius:999, padding:'1px 7px' }}>
                  {r.nbServicesAccordes}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Droits du rôle sélectionné */}
        <div>
          {!roleActif && (
            <div className="ap-card ap-empty"><p>Sélectionnez un rôle.</p></div>
          )}

          {roleActif && estAdmin && (
            <div className="ap-alert ap-alert--warning">
              <Shield size={16} aria-hidden="true" />
              <div>
                <strong>Administrateur - droits implicites</strong>
                L'administrateur de l'établissement accède automatiquement à tous les services actifs.
                Ces droits ne sont pas modifiables.
              </div>
            </div>
          )}

          {roleActif && !estAdmin && (
            <>
              {/* Accès au portail */}
              <div className="ap-card" style={{ marginBottom:14 }}>
                <div className="ap-switchline">
                  <div>
                    <strong>Accès au portail</strong>
                    <small>Si désactivé, les utilisateurs avec ce rôle ne verront pas le portail des services.</small>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={droits?.role?.peutVoirPortail ?? true}
                    className={`ap-switch${(droits?.role?.peutVoirPortail ?? true) ? ' is-on' : ''}${busy.portail ? ' is-busy' : ''}`}
                    onClick={() => togglePortail(droits?.role?.peutVoirPortail ?? true)}
                    disabled={!!busy.portail || chargeDroits}
                  >
                    <span className="ap-switch-thumb" />
                  </button>
                </div>
              </div>

              {/* Avertissement si portail inactif */}
              {!(droits?.role?.peutVoirPortail ?? true) && (
                <div className="ap-alert ap-alert--warning" style={{ marginBottom: 14 }}>
                  <Shield size={16} aria-hidden="true" />
                  <div>
                    <strong>Accès au portail désactivé</strong>
                    L'accès aux services reste suspendu et ne peut être accordé tant que l'accès au portail n'est pas activé pour ce rôle.
                  </div>
                </div>
              )}

              {/* Services */}
              <div className="ap-card ap-card--flush">
                {chargeDroits ? (
                  <div style={{ padding:14 }}>
                    {[0,1,2,3].map((i) => <div key={i} className="ap-skel-row"><div className="ap-skel ap-skel--tile" style={{ '--i':i }} /><div className="ap-skel ap-skel--line" style={{ '--i':i }} /></div>)}
                  </div>
                ) : !droits ? null : droits.services.length === 0 ? (
                  <div className="ap-empty" style={{ padding:'32px 20px' }}>
                    <p>Aucun service assigné à votre établissement.</p>
                  </div>
                ) : (
                  <table className="ap-table">
                    <thead>
                      <tr><th>Service</th><th>Code</th><th>Disponible</th><th>Accordé à ce rôle</th></tr>
                    </thead>
                    <tbody>
                      {droits.services.map((s) => {
                        const peutVoirPortail = droits?.role?.peutVoirPortail ?? true
                        const estAccorde = Boolean(s.accorde && peutVoirPortail)
                        const estDesactive = !!busy[s.uuid] || !s.actif || !peutVoirPortail
                        return (
                          <tr key={s.uuid} style={{ opacity: peutVoirPortail ? 1 : 0.65 }}>
                            <td>
                              <strong>{s.nom}</strong>
                              {s.description && <small>{s.description}</small>}
                            </td>
                            <td><span className="ap-code">{s.code}</span></td>
                            <td>
                              <span className={`ap-badge ${s.actif ? 'ap-badge--success' : 'ap-badge--neutral'}`}>
                                {s.actif ? 'Actif' : 'Bloqué'}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={estAccorde}
                                className={`ap-switch${estAccorde ? ' is-on' : ''}${busy[s.uuid] ? ' is-busy' : ''}`}
                                onClick={() => toggleService(s.uuid, s.accorde)}
                                disabled={estDesactive}
                                title={!peutVoirPortail ? "Activez l'accès au portail pour ce rôle pour lui accorder des services" : !s.actif ? 'Service bloqué' : undefined}
                              >
                                <span className="ap-switch-thumb" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
