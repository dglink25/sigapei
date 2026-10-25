/**
 * EtablissementRolesPage - Rôles personnalisés assignés à un établissement.
 * Miroir de EtablissementServicesPage mais pour les rôles.
 * Le super admin peut voir, assigner et retirer des rôles personnalisés.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import ConfirmDialog from '../../components/commun/ConfirmDialog'
import Loader from '../../components/commun/Loader'
import ChecklistDrawer from '../../components/administration/ChecklistDrawer'
import { rolesEtablissementsService } from '../../services/identite/rolesEtablissements.service'
import { utilisateursService } from '../../services/identite/utilisateurs.service'
import { adminService } from '../../services/etablissements/etablissement.service'
import { ADMIN_PATHS } from '../../config/etablissements/config'
import { dateFr } from './DemandesPage'
import './admin.css'
import '../../components/administration/admin-ui.css'

export default function EtablissementRolesPage() {
  const { uuid } = useParams()
  const notify = useNotify()

  const [etab,         setEtab]         = useState(undefined)
  const [roles,        setRoles]        = useState([])
  const [tousRoles,    setTousRoles]    = useState([])  // catalogue pour l'assignation
  const [chargement,   setChargement]   = useState(false)
  const [tiroir,       setTiroir]       = useState(false)
  const [dejaAssignes, setDejaAssignes] = useState(new Set())
  const [confirm,      setConfirm]      = useState(null)
  const [busy,         setBusy]         = useState(false)
  const [rev,          setRev]          = useState(0)

  const recharger = () => setRev((r) => r + 1)

  // Charger l'établissement depuis la liste
  useEffect(() => {
    let annule = false
    adminService.listerEtablissements().then((liste) => {
      if (annule) return
      const data = Array.isArray(liste) ? liste : liste?.etablissements ?? []
      setEtab(data.find((e) => e.uuid === uuid) ?? null)
    }).catch(() => setEtab(null))
    return () => { annule = true }
  }, [uuid])

  // Charger les rôles assignés
  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const r = await rolesEtablissementsService.rolesParEtablissement(uuid)
      const liste = r?.data ?? r ?? []
      setRoles(liste)
      setDejaAssignes(new Set(liste.map((x) => x.uuid)))
    } catch (err) {
      notify.fromError(err)
    } finally {
      setChargement(false)
    }
  }, [uuid, notify])

  useEffect(() => { charger() }, [charger, rev])

  // Charger le catalogue de rôles à l'ouverture du tiroir
  useEffect(() => {
    if (!tiroir) return
    let annule = false
    utilisateursService.listerRoles().then((r) => {
      if (!annule) setTousRoles((r?.data?.roles ?? r?.roles ?? []).filter((role) => role.estPersonnalise))
    }).catch(() => {})
    return () => { annule = true }
  }, [tiroir])

  const assigner = async (uuids) => {
    setBusy(true)
    try {
      await rolesEtablissementsService.assigner(uuids[0], [uuid])
      notify.success('Rôle assigné')
      setTiroir(false)
      recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  const retirer = async () => {
    if (!confirm) return
    setBusy(true)
    try {
      await rolesEtablissementsService.retirer(confirm.assignationUuid)
      notify.success('Rôle retiré')
      setConfirm(null)
      recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  if (etab === undefined) return <div className="ap"><Loader mode="inline" label="Chargement…" /></div>
  if (etab === null) return (
    <div className="ap">
      <div className="ap-page-head"><Link to={ADMIN_PATHS.etablissements} className="ap-btn ap-btn--ghost ap-btn--sm">Retour</Link></div>
      <div className="ap-card ap-empty"><TriangleAlert size={32} /><p>Établissement introuvable.</p></div>
    </div>
  )

  const itemsCatalogue = tousRoles.map((r) => ({
    id:       r.uuid,
    title:    r.libelle,
    subtitle: r.code,
    note:     dejaAssignes.has(r.uuid) ? 'Déjà assigné' : undefined,
    disabled: dejaAssignes.has(r.uuid),
  }))

  return (
    <div className="ap">
      <nav className="ap-bread" aria-label="Fil d'ariane">
        <Link to={ADMIN_PATHS.etablissements}>Établissements</Link>
        <span className="ap-bread-sep">/</span>
        <span>{etab.nom}</span>
        <span className="ap-bread-sep">/</span>
        <span>Rôles</span>
      </nav>

      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Rôles de {etab.nom}</h2>
          <p className="ap-page-sub">Rôles personnalisés assignés à cet établissement.</p>
        </div>
        <button type="button" className="ap-btn" onClick={() => setTiroir(true)}>
          <Plus size={16} /> Assigner un rôle
        </button>
      </div>

      {chargement ? (
        <div className="ap-card"><Loader mode="inline" label="Chargement…" /></div>
      ) : roles.length === 0 ? (
        <div className="ap-card ap-empty">
          <p>Aucun rôle personnalisé assigné à cet établissement.</p>
          <button type="button" className="ap-btn" onClick={() => setTiroir(true)}><Plus size={16} /> Assigner</button>
        </div>
      ) : (
        <div className="ap-card ap-card--flush">
          <table className="ap-table">
            <thead>
              <tr><th>Rôle</th><th>Code</th><th>Famille</th><th>Utilisateurs</th><th>Assigné le</th><th></th></tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.uuid}>
                  <td><strong>{r.libelle}</strong></td>
                  <td><span className="ap-code">{r.code}</span></td>
                  <td><span className="ap-badge ap-badge--neutral">{r.familleAuth}</span></td>
                  <td>{r.nbUtilisateurs ?? 0}</td>
                  <td>{dateFr(r.dateCreation)}</td>
                  <td>
                    <button type="button" className="ap-btn ap-btn--ghost ap-btn--icon ap-btn--icon-danger"
                      onClick={() => setConfirm({ assignationUuid: r.assignationUuid ?? r.uuid, libelle: r.libelle })}
                      aria-label="Retirer">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ChecklistDrawer
        open={tiroir}
        title="Assigner un rôle"
        subtitle={`Choisissez un rôle personnalisé à ouvrir à ${etab.nom}.`}
        items={itemsCatalogue}
        loading={false}
        max={1}
        busy={busy}
        submitLabel="Assigner"
        searchPlaceholder="Rechercher un rôle…"
        emptyLabel="Aucun rôle personnalisé disponible."
        onSubmit={assigner}
        onClose={() => setTiroir(false)}
      />

      <ConfirmDialog
        open={!!confirm}
        tone="danger"
        title="Retirer ce rôle ?"
        message={`Le rôle « ${confirm?.libelle ?? ''} » sera retiré de ${etab.nom}.`}
        confirmLabel="Retirer"
        loading={busy}
        onConfirm={retirer}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
