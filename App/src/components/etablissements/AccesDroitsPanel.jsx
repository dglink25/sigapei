import { useCallback, useEffect, useRef, useState } from 'react'
import { Lock, Search, ShieldCheck, TriangleAlert, Users } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { accesAdmin } from '../../services/identite/accesAdmin.service'
import { useDebounced } from '../../hooks/administration/useDebounced'
import Drawer from '../administration/Drawer'
import Switch from '../administration/Switch'
import Pagination from '../administration/Pagination'
import ServiceIcon from '../administration/ServiceIcon'
import { Flash, useFlash } from '../administration/Flash'
import { SkeletonList } from '../administration/Skeleton'
import Loader from '../commun/Loader'
import '../administration/admin-ui.css'

const FILTRES = [
  { id: 'tous', label: 'Tous' },
  { id: 'avec', label: 'Avec accès' },
  { id: 'sans', label: 'Sans accès' },
]

/** Droits d'un utilisateur sur l'ensemble des services (tiroir). */
function DroitsUtilisateurDrawer({ user, onClose, onChanged }) {
  const notify = useNotify()
  const dernier = useRef(user)
  // eslint-disable-next-line react-hooks/refs
  if (user) dernier.current = user
  // eslint-disable-next-line react-hooks/refs
  const u = user ?? dernier.current
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    if (!user) return undefined
    let annule = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null)
    accesAdmin
      .droitsUtilisateur(user.uuid)
      .then((r) => !annule && setData(r))
      .catch((err) => {
        if (annule) return
        notify.fromError(err)
        onClose()
      })
    return () => { annule = true }
  }, [user, notify, onClose])

  async function basculer(s) {
    const cible = !s.autorise
    setBusy(s.uuid)
    try {
      await accesAdmin.definir(u.uuid, s.uuid, cible)
      setData((d) => ({ ...d, services: d.services.map((x) => (x.uuid === s.uuid ? { ...x, autorise: cible } : x)) }))
      onChanged()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Drawer
      open={user !== null}
      title={u?.nomComplet ?? 'Droits'}
      subtitle={u ? `Rôle : ${u.roleCode.replace(/_/g, ' ')}` : undefined}
      onClose={onClose}
      footer={<button type="button" className="ap-btn ap-btn--ghost" onClick={onClose}>Fermer</button>}
    >
      {data === null ? (
        <SkeletonList rows={4} />
      ) : (
        <>
          {data.implicite && (
            <p className="ap-hint" style={{ marginBottom: 14 }}>
              Les administrateurs disposent de tous les droits sur tous les services : ils ne sont pas modifiables.
            </p>
          )}
          {data.services.length === 0 ? (
            <p className="ap-hint">Aucun service n'est assigné à votre établissement.</p>
          ) : (
            <div className="cfg-list">
              {data.services.map((s) => (
                <div key={s.uuid} className="ap-switchline">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <ServiceIcon code={s.code} />
                    <div>
                      <strong>{s.nom}</strong>
                      <small>{s.actif ? s.code : 'Service bloqué : droits conservés mais inactifs'}</small>
                    </div>
                  </div>
                  {data.implicite
                    ? <ShieldCheck size={20} aria-label="Tous les droits" style={{ color: '#006B3C' }} />
                    : <Switch checked={s.autorise} busy={busy === s.uuid} label={`Accès au service ${s.nom}`} onChange={() => basculer(s)} />}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Drawer>
  )
}

/** Droits d'accès : par service, avec recherche, filtre, actions groupées et vue par utilisateur. */
export default function AccesDroitsPanel() {
  const notify = useNotify()
  const [flash, showFlash] = useFlash()

  const [services, setServices] = useState(null)
  const [serviceUuid, setServiceUuid] = useState(null)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [filtre, setFiltre] = useState('tous')
  const [data, setData] = useState(null)
  const [rev, setRev] = useState(0)
  const [selection, setSelection] = useState(() => new Set())
  const [busyUuid, setBusyUuid] = useState(null)
  const [busyLot, setBusyLot] = useState(false)
  const [drawerUser, setDrawerUser] = useState(null)
  const qDebounced = useDebounced(q.trim(), 300)

  const recharger = useCallback(() => setRev((r) => r + 1), [])
  const fermerDrawer = useCallback(() => setDrawerUser(null), [])

  /* Services de l'établissement */
  useEffect(() => {
    let annule = false
    accesAdmin
      .services()
      .then((r) => {
        if (annule) return
        const liste = r.services ?? []
        setServices(liste)
        setServiceUuid((prev) => prev ?? liste.find((s) => s.actif)?.uuid ?? liste[0]?.uuid ?? null)
      })
      .catch((err) => {
        if (annule) return
        notify.fromError(err)
        setServices([])
      })
    return () => { annule = true }
  }, [notify])

  /* Utilisateurs du service sélectionné */
  useEffect(() => {
    if (!serviceUuid) return undefined
    let annule = false
    accesAdmin
      .utilisateursDuService(serviceUuid, {
        page,
        limite: 20,
        q: qDebounced || undefined,
        autorise: filtre === 'avec' ? true : filtre === 'sans' ? false : undefined,
      })
      .then((r) => {
        if (annule) return
        setData(r)
        setSelection(new Set())
      })
      .catch((err) => !annule && notify.fromError(err))
    return () => { annule = true }
  }, [serviceUuid, page, qDebounced, filtre, rev, notify])

  const service = services?.find((s) => s.uuid === serviceUuid)
  const bloque = service && !service.actif

  function choisirService(uuid) {
    setServiceUuid(uuid)
    setData(null)
    setPage(1)
  }

  async function basculer(u) {
    const cible = !u.autorise
    setBusyUuid(u.uuid)
    try {
      await accesAdmin.definir(u.uuid, serviceUuid, cible)
      setData((d) => ({ ...d, utilisateurs: d.utilisateurs.map((x) => (x.uuid === u.uuid ? { ...x, autorise: cible } : x)) }))
      showFlash(cible ? `Accès accordé à ${u.nomComplet}.` : `Accès retiré à ${u.nomComplet}.`, cible ? 'success' : 'info')
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusyUuid(null)
    }
  }

  async function lot(autorise) {
    setBusyLot(true)
    try {
      const r = await accesAdmin.definirLot(serviceUuid, [...selection].map((utilisateurUuid) => ({ utilisateurUuid, autorise })))
      showFlash(`${r?.modifies ?? selection.size} utilisateur(s) : accès ${autorise ? 'accordé' : 'retiré'}.`, autorise ? 'success' : 'info')
      recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusyLot(false)
    }
  }

  /* ── Rendu ── */
  if (services === null) {
    return (
      <div className="ap-card" style={{ padding: '3.5rem', display: 'flex', justifyContent: 'center' }}>
        <Loader mode="inline" label="Chargement des droits d'accès…" />
      </div>
    )
  }

  if (services.length === 0) {
    return (
      <div className="ap-card ap-empty">
        <Users size={36} aria-hidden="true" />
        <p>Aucun service n'est encore assigné à votre établissement. Contactez l'administration de la plateforme.</p>
      </div>
    )
  }

  const lignes = data?.utilisateurs ?? []
  const selectionnables = lignes.filter((u) => !u.implicite)
  const toutCoche = selectionnables.length > 0 && selectionnables.every((u) => selection.has(u.uuid))
  const basculerSel = (uuid) =>
    setSelection((p) => {
      const n = new Set(p)
      if (n.has(uuid)) n.delete(uuid)
      else n.add(uuid)
      return n
    })

  return (
    <>
      <p className="cfg-hint">
        Choisissez un service, puis autorisez les utilisateurs qui peuvent l'utiliser. Les administrateurs ont tous les droits par défaut.
      </p>

      <div className="cfg-services" role="tablist" aria-label="Services">
        {services.map((s) => (
          <button
            key={s.uuid}
            type="button"
            role="tab"
            aria-selected={s.uuid === serviceUuid}
            className={`ap-tab${s.uuid === serviceUuid ? ' is-active' : ''}`}
            onClick={() => choisirService(s.uuid)}
          >
            {!s.actif && <Lock size={13} aria-hidden="true" />}
            {s.nom}
          </button>
        ))}
      </div>

      {bloque && (
        <div className="ap-alert ap-alert--warning" role="status">
          <TriangleAlert size={18} aria-hidden="true" />
          <div>
            <strong>Service bloqué pour votre établissement</strong>
            Les droits sont conservés mais inactifs, et ne peuvent pas être modifiés tant que la plateforme ne l'a pas réactivé.
          </div>
        </div>
      )}

      <Flash flash={flash} />

      <div className="cfg-bar">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {FILTRES.map((f) => (
            <button key={f.id} type="button" className={`ap-tab${filtre === f.id ? ' is-active' : ''}`} onClick={() => { setFiltre(f.id); setPage(1) }}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="etab-search">
          <Search size={15} aria-hidden="true" />
          <input type="search" placeholder="Rechercher un utilisateur…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} aria-label="Rechercher un utilisateur" />
        </div>
      </div>

      {selection.size > 0 && (
        <div className="sv-bulk" role="region" aria-label="Actions groupées">
          <strong>{selection.size} sélectionné{selection.size > 1 ? 's' : ''}</strong>
          <button type="button" className="ap-btn ap-btn--sm ap-btn--gold" disabled={busyLot || bloque} onClick={() => lot(true)}>Accorder l'accès</button>
          <button type="button" className="ap-btn ap-btn--sm" disabled={busyLot} onClick={() => lot(false)}>Retirer l'accès</button>
          <button type="button" className="ap-btn ap-btn--sm" onClick={() => setSelection(new Set())}>Désélectionner</button>
        </div>
      )}

      <div className="ap-card ap-card--flush">
        {data === null ? (
          <SkeletonList rows={5} />
        ) : lignes.length === 0 ? (
          <div className="ap-empty">
            <Users size={34} aria-hidden="true" />
            <p>{qDebounced || filtre !== 'tous' ? 'Aucun utilisateur ne correspond à ces critères.' : 'Aucun utilisateur dans votre établissement.'}</p>
          </div>
        ) : (
          <>
            <div className="ap-table-wrap">
              <table className="ap-table sv-table sv-static">
                <thead>
                  <tr>
                    <th className="sv-check">
                      <input type="checkbox" className="ap-check" aria-label="Tout sélectionner" checked={toutCoche} disabled={selectionnables.length === 0}
                        onChange={() => setSelection(toutCoche ? new Set() : new Set(selectionnables.map((u) => u.uuid)))} />
                    </th>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Accès</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((u, i) => (
                    <tr key={u.uuid} className="sv-row" style={{ '--i': i }}>
                      <td className="sv-check">
                        {!u.implicite && <input type="checkbox" className="ap-check" aria-label={`Sélectionner ${u.nomComplet}`} checked={selection.has(u.uuid)} onChange={() => basculerSel(u.uuid)} />}
                      </td>
                      <td data-label="Utilisateur">
                        <div className="sv-name"><strong>{u.nomComplet}</strong><small>{u.email ?? u.telephone ?? '-'}</small></div>
                      </td>
                      <td data-label="Rôle"><span className="ap-badge ap-badge--neutral">{u.roleCode.replace(/_/g, ' ')}</span></td>
                      <td data-label="Accès">
                        {u.implicite ? (
                          <span className="ap-badge ap-badge--success">Tous les droits</span>
                        ) : (
                          <div className="cfg-acces">
                            <Switch checked={u.autorise} busy={busyUuid === u.uuid} disabled={bloque} label={`Accès de ${u.nomComplet} au service`} onChange={() => basculer(u)} />
                            <span>{u.autorise ? 'Autorisé' : 'Non autorisé'}</span>
                          </div>
                        )}
                      </td>
                      <td className="sv-actions">
                        <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => setDrawerUser(u)}>Tous ses droits</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={data.pagination} onPage={setPage} unite="utilisateur" />
          </>
        )}
      </div>

      <DroitsUtilisateurDrawer user={drawerUser} onClose={fermerDrawer} onChanged={recharger} />
    </>
  )
}
