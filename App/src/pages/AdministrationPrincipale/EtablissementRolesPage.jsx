/**
 * EtablissementRolesPage - Rôles d'un établissement.
 * Structure et comportement identiques à EtablissementServicesPage.
 *
 * data = undefined  → chargement
 * data = null       → établissement introuvable
 * data = { etablissement, roles } → données
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Lock, Plus, ShieldCheck, Trash2, TriangleAlert } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import ConfirmDialog from '../../components/commun/ConfirmDialog'
import Loader from '../../components/commun/Loader'
import ChecklistDrawer from '../../components/administration/ChecklistDrawer'
import { EtabBadge } from '../../components/administration/Badges'
import { rolesEtablissementsService } from '../../services/identite/rolesEtablissements.service'
import { utilisateursService } from '../../services/identite/utilisateurs.service'
import { ADMIN_PATHS } from '../../config/etablissements/config'
import { dateFr } from './DemandesPage'
import './admin.css'
import '../../components/administration/admin-ui.css'

const FAMILLE_LABELS = {
  super_admin:      'Super Admin',
  personnel_admin:  'Personnel / Admin',
  parent_apprenant: 'Parent / Apprenant',
}

export default function EtablissementRolesPage() {
  const { uuid } = useParams()
  const notify   = useNotify()

  const [data,         setData]         = useState(undefined) // undefined | null | { etablissement, roles }
  const [rev,          setRev]          = useState(0)
  const [assignOuvert, setAssignOuvert] = useState(false)
  const [catalogue,    setCatalogue]    = useState([])
  const [chargeCat,    setChargeCat]    = useState(false)
  const [confirm,      setConfirm]      = useState(null)
  const [busy,         setBusy]         = useState(false)

  const recharger = () => setRev((r) => r + 1)

  /* Charger les rôles de l'établissement */
  const charger = useCallback(async () => {
    try {
      setData(await rolesEtablissementsService.rolesParEtablissement(uuid))
    } catch (err) {
      if (err?.status !== 404) notify.fromError(err)
      setData((p) => (p === undefined ? null : p))
    }
  }, [uuid, notify])

  useEffect(() => { charger() }, [charger, rev])

  /* Catalogue rôles personnalisés à l'ouverture du tiroir */
  useEffect(() => {
    if (!assignOuvert) return undefined
    let annule = false
    setChargeCat(true)
    utilisateursService.listerRoles()
      .then((r) => {
        if (annule) return
        const tous = Array.isArray(r?.data?.roles) ? r.data.roles
          : Array.isArray(r?.roles) ? r.roles
          : Array.isArray(r) ? r : []
        // Tous les rôles SAUF super_admin, non encore assignés à cet établissement
        const dejaUuids = new Set(
          (data?.roles ?? []).map((x) => x.uuid),
        )
        setCatalogue(tous.filter((role) => role.code !== 'super_admin' && !dejaUuids.has(role.uuid)))
      })
      .catch((err) => !annule && notify.fromError(err))
      .finally(() => !annule && setChargeCat(false))
    return () => { annule = true }
  }, [assignOuvert, data, notify])

  /* Assigner un rôle */
  const assigner = async (roleUuids) => {
    setBusy(true)
    try {
      const r = await rolesEtablissementsService.assigner(roleUuids[0], [uuid])
      const assignes = r?.assignes ?? r?.data?.assignes ?? 0
      notify.success(
        assignes > 0 ? 'Rôle assigné' : 'Déjà assigné',
        assignes > 0
          ? `Rôle ajouté à ${data?.etablissement?.nom ?? 'l\'établissement'}.`
          : 'Ce rôle était déjà assigné.',
      )
      setAssignOuvert(false)
      recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  /* Retirer un rôle */
  const retirer = async () => {
    if (!confirm) return
    setBusy(true)
    try {
      await rolesEtablissementsService.retirer(confirm.assignationUuid)
      notify.success('Rôle retiré', 'Les utilisateurs concernés ont été réattribués au rôle Personnel.')
      setConfirm(null)
      recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  /* ── États ── */
  if (data === undefined) return <div className="ap"><Loader mode="inline" label="Chargement des rôles…" /></div>

  if (data === null) {
    return (
      <div className="ap">
        <div className="ap-page-head">
          <Link to={ADMIN_PATHS.etablissements} className="ap-btn ap-btn--ghost ap-btn--sm">
            Retour aux établissements
          </Link>
        </div>
        <div className="ap-card ap-empty">
          <TriangleAlert size={32} aria-hidden="true" />
          <p>Cet établissement n'existe pas ou n'est pas accessible.</p>
        </div>
      </div>
    )
  }

  const { etablissement, roles } = data
  // Tous les rôles viennent de role_etablissements - ils ont tous un assignationUuid
  const rolesPerso  = roles.filter((r) => r.estPersonnalise)
  const rolesSystem = roles.filter((r) => !r.estPersonnalise)
  const dejaUuids   = new Set(roles.map((r) => r.uuid))

  const itemsCatalogue = catalogue.map((r) => ({
    id:       r.uuid,
    title:    r.libelle,
    subtitle: r.code,
    note:     dejaUuids.has(r.uuid) ? 'Déjà assigné' : undefined,
    disabled: dejaUuids.has(r.uuid),
  }))

  return (
    <div className="ap">
      <nav className="ap-bread" aria-label="Fil d'ariane">
        <Link to={ADMIN_PATHS.etablissements}>Établissements</Link>
        <span className="ap-bread-sep" aria-hidden="true">/</span>
        <span>{etablissement.nom}</span>
        <span className="ap-bread-sep" aria-hidden="true">/</span>
        <span>Rôles</span>
      </nav>

      <div className="ap-page-head sv-rise">
        <div>
          <h2 className="ap-page-title">
            Rôles de {etablissement.nom} <EtabBadge statut={etablissement.statut} />
          </h2>
          <p className="ap-page-sub">
            Rôles personnalisés assignés et rôles système utilisés par cet établissement
          </p>
        </div>
        <div className="ap-page-actions">
          <button
            type="button"
            className="ap-btn"
            onClick={() => setAssignOuvert(true)}
            disabled={etablissement.statut === 'archive'}
          >
            <Plus size={16} aria-hidden="true" /> Assigner un rôle
          </button>
        </div>
      </div>

      {etablissement.statut !== 'actif' && (
        <div className="ap-alert ap-alert--danger" role="status">
          <TriangleAlert size={18} aria-hidden="true" />
          <div>
            <strong>Établissement {etablissement.statut === 'suspendu' ? 'suspendu' : 'archivé'}</strong>
            {' '}Les rôles sont conservés mais aucun utilisateur ne peut se connecter.
          </div>
        </div>
      )}

      {/* Statistiques */}
      <div className="sv-stats">
        <div className="ap-card sv-stat sv-rise" style={{ '--i': 1 }}>
          <p className="sv-stat-lbl">Rôles personnalisés</p>
          <p className="sv-stat-val">{rolesPerso.length}</p>
        </div>
        <div className="ap-card sv-stat sv-rise" style={{ '--i': 2 }}>
          <p className="sv-stat-lbl">Rôles système actifs</p>
          <p className="sv-stat-val">{rolesSystem.length}</p>
        </div>
        <div className="ap-card sv-stat sv-rise" style={{ '--i': 3 }}>
          <p className="sv-stat-lbl">Total utilisateurs</p>
          <p className="sv-stat-val">{roles.reduce((s, r) => s + (r.nbUtilisateurs ?? 0), 0)}</p>
        </div>
      </div>

      {/* Rôles personnalisés */}
      <h3 style={{ marginTop:24, marginBottom:10, fontSize:'0.82rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ap-muted)' }}>
        Rôles personnalisés
      </h3>
      {rolesPerso.length === 0 ? (
        <div className="ap-card ap-empty" style={{ marginBottom:24 }}>
          <ShieldCheck size={36} aria-hidden="true" />
          <p>Aucun rôle personnalisé assigné à cet établissement.</p>
          <button
            type="button"
            className="ap-btn"
            onClick={() => setAssignOuvert(true)}
            disabled={etablissement.statut === 'archive'}
          >
            <Plus size={16} aria-hidden="true" /> Assigner un rôle
          </button>
        </div>
      ) : (
        <div className="ap-card ap-card--flush" style={{ marginBottom:24 }}>
          <table className="ap-table">
            <thead>
              <tr>
                <th>Rôle</th>
                <th>Code</th>
                <th>Famille</th>
                <th>Utilisateurs</th>
                <th>Assigné le</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rolesPerso.map((r) => (
                <tr key={r.uuid}>
                  <td><strong>{r.libelle}</strong></td>
                  <td><span className="ap-code">{r.code}</span></td>
                  <td>
                    <span className="ap-badge ap-badge--neutral">
                      {FAMILLE_LABELS[r.familleAuth] ?? r.familleAuth}
                    </span>
                  </td>
                  <td>{r.nbUtilisateurs ?? 0}</td>
                  <td>{dateFr(r.dateCreation)}</td>
                  <td>
                    <button
                      type="button"
                      className="ap-btn ap-btn--ghost ap-btn--icon ap-btn--icon-danger"
                      aria-label={`Retirer ${r.libelle}`}
                      title="Retirer le rôle"
                      onClick={() => setConfirm({ assignationUuid: r.assignationUuid, libelle: r.libelle })}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rôles système utilisés */}
      {rolesSystem.length > 0 && (
        <>
          <h3 style={{ marginBottom:10, fontSize:'0.82rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ap-muted)' }}>
            Rôles système utilisés
          </h3>
          <div className="ap-card ap-card--flush">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Rôle</th>
                  <th>Code</th>
                  <th>Famille</th>
                  <th>Utilisateurs</th>
                  <th>Portée</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rolesSystem.map((r) => (
                  <tr key={r.uuid}>
                    <td><strong>{r.libelle}</strong></td>
                    <td><span className="ap-code">{r.code}</span></td>
                    <td>
                      <span className="ap-badge ap-badge--neutral">
                        {FAMILLE_LABELS[r.familleAuth] ?? r.familleAuth}
                      </span>
                    </td>
                    <td>{r.nbUtilisateurs ?? 0}</td>
                    <td style={{ display:'flex', alignItems:'center', gap:5, color:'var(--ap-muted)', fontSize:'0.82rem' }}>
                      <Lock size={12} aria-hidden="true" /> Système
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ap-btn ap-btn--ghost ap-btn--icon ap-btn--icon-danger"
                        aria-label={`Retirer ${r.libelle}`}
                        title="Retirer ce rôle de l'établissement"
                        onClick={() => setConfirm({ assignationUuid: r.assignationUuid, libelle: r.libelle })}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ChecklistDrawer
        open={assignOuvert}
        title="Assigner un rôle"
        subtitle={`Choisissez les rôles à ouvrir à ${etablissement.nom}.`}
        items={itemsCatalogue}
        loading={chargeCat}
        max={50}
        busy={busy}
        submitLabel="Assigner"
        searchPlaceholder="Rechercher un rôle…"
        emptyLabel="Tous les rôles disponibles sont déjà assignés à cet établissement."
        onSubmit={assigner}
        onClose={() => setAssignOuvert(false)}
      />

      <ConfirmDialog
        open={!!confirm}
        tone="danger"
        title="Retirer ce rôle ?"
        message={`Le rôle « ${confirm?.libelle ?? ''} » sera retiré de ${etablissement.nom}. Les utilisateurs qui avaient ce rôle seront réattribués au rôle Personnel.`}
        confirmLabel="Retirer"
        loading={busy}
        onConfirm={retirer}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
