import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Building2, Pencil, Plus, Power, RotateCcw, Trash2, TriangleAlert } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import ConfirmDialog from '../../components/commun/ConfirmDialog'
import Loader from '../../components/commun/Loader'
import ServiceDrawer from '../../components/administration/ServiceDrawer'
import ChecklistDrawer from '../../components/administration/ChecklistDrawer'
import JournalPanel from '../../components/administration/JournalPanel'
import Pagination from '../../components/administration/Pagination'
import ServiceIcon from '../../components/administration/ServiceIcon'
import { EtabBadge, EtatBadge } from '../../components/administration/Badges'
import { Flash, useFlash } from '../../components/administration/Flash'
import { SkeletonList } from '../../components/administration/Skeleton'
import { adminService } from '../../services/etablissements/etablissement.service'
import { servicesAcces } from '../../services/identite/servicesAcces.service'
import { MAX_ETABLISSEMENTS_PAR_LOT, SERVICE_PATHS } from '../../config/services/config'
import { dateFr } from './DemandesPage'
import './admin.css'
import '../../components/administration/admin-ui.css'
import './services.css'

export default function ServiceDetailPage() {
  const { uuid } = useParams()
  const notify = useNotify()
  const [flash, showFlash] = useFlash()

  const [service, setService] = useState(undefined) // undefined = chargement, null = introuvable
  const [assign, setAssign] = useState(null)
  const [page, setPage] = useState(1)
  const [rev, setRev] = useState(0)
  const [tab, setTab] = useState('etablissements')
  const [selection, setSelection] = useState(() => new Set())
  const [edition, setEdition] = useState(null)
  const [assignOuvert, setAssignOuvert] = useState(false)
  const [etabs, setEtabs] = useState([])
  const [dejaAssignes, setDejaAssignes] = useState(() => new Set())
  const [chargementEtabs, setChargementEtabs] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [motif, setMotif] = useState('')
  const [busy, setBusy] = useState(false)

  const recharger = () => setRev((r) => r + 1)

  const charger = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        servicesAcces.obtenir(uuid),
        servicesAcces.listerParService(uuid, { page, limite: 20 }),
      ])
      setService(s.service)
      setAssign({ items: a.assignations ?? [], pagination: a.pagination ?? null })
      setSelection(new Set())
    } catch (err) {
      if (err?.status !== 404) notify.fromError(err)
      setService((p) => (p === undefined ? null : p))
      setAssign((p) => p ?? { items: [], pagination: null })
    }
  }, [uuid, page, notify])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger()
  }, [charger, rev])

  /* Chargement des établissements à l'ouverture du tiroir d'assignation */
  useEffect(() => {
    if (!assignOuvert) return undefined
    let annule = false
    setChargementEtabs(true)
    Promise.all([adminService.listerEtablissements(), servicesAcces.toutesAssignationsDuService(uuid)])
      .then(([liste, assigns]) => {
        if (annule) return
        setEtabs(Array.isArray(liste) ? liste : [])
        setDejaAssignes(new Set(assigns.map((a) => a.etablissement?.uuid).filter(Boolean)))
      })
      .catch((err) => !annule && notify.fromError(err))
      .finally(() => !annule && setChargementEtabs(false))
    return () => {
      annule = true
    }
  }, [assignOuvert, uuid, notify])

  async function enregistrerService(mode, item, f) {
    setBusy(true)
    try {
      await servicesAcces.modifier(item.uuid, {
        nom: f.nom.trim(),
        description: f.description.trim(),
        status: f.actif ? 'active' : 'inactive',
      })
      showFlash('Service mis à jour.')
      setEdition(null)
      recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  async function assigner(ids) {
    setBusy(true)
    try {
      const r = await servicesAcces.assignerEtablissements(uuid, ids)
      const n = r?.assignations?.length ?? 0
      notify.success(
        n > 0 ? 'Service assigné' : 'Aucun changement',
        n > 0
          ? `${n} établissement${n > 1 ? 's ont' : ' a'} maintenant accès à « ${service.nom} ».`
          : 'Tous les établissements choisis avaient déjà accès à ce service.',
      )
      setAssignOuvert(false)
      setPage(1)
      recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  async function reactiver(liste) {
    setBusy(true)
    try {
      if (liste.length === 1) await servicesAcces.reactiver(liste[0].uuid)
      else await servicesAcces.changerStatutLot(liste.map((i) => i.uuid), 'active')
      showFlash(liste.length === 1 ? 'Assignation réactivée.' : `${liste.length} assignations réactivées.`)
      recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  function fermerConfirm() {
    setConfirm(null)
    setMotif('')
  }

  async function confirmer() {
    const { type, items } = confirm
    setBusy(true)
    try {
      if (type === 'bloquer') {
        const m = motif.trim()
        if (items.length === 1) await servicesAcces.bloquer(items[0].uuid, m)
        else await servicesAcces.changerStatutLot(items.map((i) => i.uuid), 'inactive', m)
        showFlash(items.length === 1 ? 'Assignation bloquée.' : `${items.length} assignations bloquées.`, 'info')
      } else {
        const r = await servicesAcces.retirer(items[0].uuid)
        notify.success('Service retiré', `${r?.droitsSupprimes ?? 0} droit(s) utilisateur supprimé(s).`)
      }
      recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
      fermerConfirm()
    }
  }

  /* ── États ── */
  if (service === undefined) return <div className="ap"><Loader mode="inline" label="Chargement du service…" /></div>

  if (service === null) {
    return (
      <div className="ap">
        <div className="ap-page-head">
          <Link to={SERVICE_PATHS.liste} className="ap-btn ap-btn--ghost ap-btn--sm">Retour au catalogue</Link>
        </div>
        <div className="ap-card ap-empty">
          <TriangleAlert size={32} aria-hidden="true" />
          <p>Ce service n'existe pas ou n'est pas accessible.</p>
        </div>
      </div>
    )
  }

  const items = assign?.items ?? []
  const actif = service.status === 'active'
  const toutCoche = items.length > 0 && items.every((i) => selection.has(i.uuid))
  const choisis = items.filter((i) => selection.has(i.uuid))
  const basculerUn = (id) =>
    setSelection((p) => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const itemsEtabs = etabs
    .filter((e) => e.statut !== 'archive')
    .map((e) => ({
      id: e.uuid,
      title: e.nom ?? '-',
      subtitle: e.code ? `Code ${e.code}` : undefined,
      note: dejaAssignes.has(e.uuid) ? 'Déjà assigné' : undefined,
      disabled: dejaAssignes.has(e.uuid),
      badge: e.statut === 'suspendu' ? <EtabBadge statut="suspendu" /> : undefined,
    }))

  return (
    <div className="ap">
      <nav className="ap-bread" aria-label="Fil d'ariane">
        <Link to={SERVICE_PATHS.liste}>Services</Link>
        <span className="ap-bread-sep" aria-hidden="true">/</span>
        <span>{service.nom}</span>
      </nav>

      <div className="ap-page-head sv-rise">
        <div className="sv-head">
          <ServiceIcon code={service.code} large />
          <div>
            <h2 className="ap-page-title">{service.nom} <EtatBadge actif={actif} labels={['Actif', 'Désactivé']} /></h2>
            <p className="ap-page-sub">
              <span className="ap-code">{service.code}</span>
              {service.description ? ` · ${service.description}` : ''}
            </p>
          </div>
        </div>
        <div className="ap-page-actions">
          <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setEdition({ mode: 'edit', item: service })}>
            <Pencil size={15} aria-hidden="true" /> Modifier
          </button>
          <button type="button" className="ap-btn" onClick={() => setAssignOuvert(true)} disabled={!actif} title={actif ? undefined : 'Service désactivé : assignation impossible'}>
            <Plus size={16} aria-hidden="true" /> Assigner à des établissements
          </button>
        </div>
      </div>

      {!actif && (
        <div className="ap-alert ap-alert--warning" role="status">
          <TriangleAlert size={18} aria-hidden="true" />
          <div>
            <strong>Service désactivé au catalogue</strong>
            Il est inaccessible pour tous les établissements, quel que soit l'état de leur assignation.
          </div>
        </div>
      )}

      <div className="sv-stats">
        <div className="ap-card sv-stat sv-rise" style={{ '--i': 1 }}>
          <p className="sv-stat-lbl">Établissements</p>
          <p className="sv-stat-val">{service.nbEtablissements ?? 0} <small>assigné(s)</small></p>
        </div>
        <div className={`ap-card sv-stat sv-rise${actif ? '' : ' sv-stat--danger'}`} style={{ '--i': 2 }}>
          <p className="sv-stat-lbl">Catalogue</p>
          <p className="sv-stat-val">{actif ? 'Actif' : 'Désactivé'}</p>
        </div>
        <div className="ap-card sv-stat sv-stat--gold sv-rise" style={{ '--i': 3 }}>
          <p className="sv-stat-lbl">Créé le</p>
          <p className="sv-stat-val">{dateFr(service.createdAt)}</p>
        </div>
      </div>

      <Flash flash={flash} />

      <div className="ap-filters">
        <button type="button" className={`ap-tab${tab === 'etablissements' ? ' is-active' : ''}`} onClick={() => setTab('etablissements')}>
          Établissements <span>{service.nbEtablissements ?? 0}</span>
        </button>
        <button type="button" className={`ap-tab${tab === 'historique' ? ' is-active' : ''}`} onClick={() => setTab('historique')}>
          Historique
        </button>
      </div>

      {tab === 'historique' ? (
        <div className="ap-card ap-card--flush"><JournalPanel serviceUuid={uuid} /></div>
      ) : (
        <>
          {choisis.length > 0 && (
            <div className="sv-bulk" role="region" aria-label="Actions groupées">
              <strong>{choisis.length} sélectionnée{choisis.length > 1 ? 's' : ''}</strong>
              <button type="button" className="ap-btn ap-btn--sm" disabled={busy} onClick={() => reactiver(choisis)}>
                <RotateCcw size={14} aria-hidden="true" /> Réactiver
              </button>
              <button type="button" className="ap-btn ap-btn--sm ap-btn--gold" disabled={busy} onClick={() => setConfirm({ type: 'bloquer', items: choisis })}>
                <Power size={14} aria-hidden="true" /> Bloquer
              </button>
              <button type="button" className="ap-btn ap-btn--sm" onClick={() => setSelection(new Set())}>Désélectionner</button>
            </div>
          )}

          <div className="ap-card ap-card--flush">
            {assign === null ? (
              <SkeletonList rows={4} />
            ) : items.length === 0 ? (
              <div className="ap-empty">
                <Building2 size={36} aria-hidden="true" />
                <p>Ce service n'est assigné à aucun établissement.</p>
                {actif && (
                  <button type="button" className="ap-btn" onClick={() => setAssignOuvert(true)}>
                    <Plus size={16} aria-hidden="true" /> Assigner à des établissements
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="ap-table-wrap">
                  <table className="ap-table sv-table sv-static">
                    <thead>
                      <tr>
                        <th className="sv-check">
                          <input type="checkbox" className="ap-check" checked={toutCoche} aria-label="Tout sélectionner"
                            onChange={() => setSelection(toutCoche ? new Set() : new Set(items.map((i) => i.uuid)))} />
                        </th>
                        <th>Établissement</th>
                        <th>Accès</th>
                        <th>Utilisateurs</th>
                        <th>Assigné le</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((a, i) => (
                        <tr key={a.uuid} className="sv-row" style={{ '--i': i }}>
                          <td className="sv-check">
                            <input type="checkbox" className="ap-check" checked={selection.has(a.uuid)} onChange={() => basculerUn(a.uuid)} aria-label={`Sélectionner ${a.etablissement?.nom ?? 'cet établissement'}`} />
                          </td>
                          <td data-label="Établissement">
                            <div className="sv-name">
                              <strong>{a.etablissement?.nom ?? '-'}</strong>
                              {a.etablissement?.statut && a.etablissement.statut !== 'actif' && <EtabBadge statut={a.etablissement.statut} />}
                            </div>
                          </td>
                          <td data-label="Accès">
                            <div>
                              <EtatBadge actif={a.status === 'active'} labels={['Ouvert', 'Bloqué']} />
                              {a.status !== 'active' && a.motif && <span className="sv-motif-line">{a.motif}</span>}
                            </div>
                          </td>
                          <td data-label="Utilisateurs">{a.nbUtilisateursAvecAcces ?? 0}</td>
                          <td data-label="Assigné le">{dateFr(a.createdAt)}</td>
                          <td className="sv-actions">
                            {a.etablissement?.uuid && (
                              <Link className="ap-btn ap-btn--ghost ap-btn--sm" to={SERVICE_PATHS.etablissement(a.etablissement.uuid)}>
                                <Building2 size={14} aria-hidden="true" /> Gérer
                              </Link>
                            )}
                            {a.status === 'active' ? (
                              <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" disabled={busy} onClick={() => setConfirm({ type: 'bloquer', items: [a] })}>
                                <Power size={14} aria-hidden="true" /> Bloquer
                              </button>
                            ) : (
                              <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" disabled={busy} onClick={() => reactiver([a])}>
                                <RotateCcw size={14} aria-hidden="true" /> Réactiver
                              </button>
                            )}
                            <button type="button" className="ap-btn ap-btn--ghost ap-btn--icon ap-btn--icon-danger" aria-label="Retirer le service" title="Retirer le service" disabled={busy} onClick={() => setConfirm({ type: 'retirer', items: [a] })}>
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination pagination={assign.pagination} onPage={setPage} unite="établissement" />
              </>
            )}
          </div>
        </>
      )}

      <ServiceDrawer drawer={edition} busy={busy} onSubmit={enregistrerService} onClose={() => setEdition(null)} />

      <ChecklistDrawer
        open={assignOuvert}
        title="Assigner à des établissements"
        subtitle={`« ${service.nom} » sera accessible à leurs administrateurs, qui en répartiront les droits.`}
        items={itemsEtabs}
        loading={chargementEtabs}
        max={MAX_ETABLISSEMENTS_PAR_LOT}
        busy={busy}
        submitLabel="Assigner"
        searchPlaceholder="Rechercher un établissement…"
        emptyLabel="Aucun établissement disponible."
        onSubmit={assigner}
        onClose={() => setAssignOuvert(false)}
      />

      <ConfirmDialog
        open={confirm?.type === 'bloquer'}
        tone="warning"
        title={confirm?.items?.length > 1 ? `Bloquer ${confirm.items.length} assignations ?` : "Bloquer l'accès à ce service ?"}
        message="Les utilisateurs de l'établissement perdent immédiatement l'accès. Leurs droits sont conservés et reviennent à la réactivation."
        confirmLabel="Bloquer"
        loading={busy}
        onConfirm={confirmer}
        onCancel={fermerConfirm}
      >
        <div className="ap-field sv-motif-field">
          <label className="ap-label" htmlFor="sv-motif">Motif (facultatif)</label>
          <textarea id="sv-motif" className="ap-textarea" rows={2} maxLength={255} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. Abonnement impayé" />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm?.type === 'retirer'}
        tone="danger"
        title="Retirer ce service ?"
        message={`Les droits de ${confirm?.items?.[0]?.nbUtilisateursAvecAcces ?? 0} utilisateur(s) sur ce service seront définitivement supprimés pour cet établissement.`}
        confirmLabel="Retirer"
        loading={busy}
        onConfirm={confirmer}
        onCancel={fermerConfirm}
      />
    </div>
  )
}
