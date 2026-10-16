import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Layers, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import ConfirmDialog from '../../components/commun/ConfirmDialog'
import ServiceDrawer from '../../components/administration/ServiceDrawer'
import Pagination from '../../components/administration/Pagination'
import ServiceIcon from '../../components/administration/ServiceIcon'
import { EtatBadge } from '../../components/administration/Badges'
import { Flash, useFlash } from '../../components/administration/Flash'
import { SkeletonList } from '../../components/administration/Skeleton'
import { useDebounced } from '../../hooks/administration/useDebounced'
import { servicesAcces } from '../../services/identite/servicesAcces.service'
import { SERVICE_PATHS } from '../../config/services/config'
import './admin.css'
import '../../components/administration/admin-ui.css'
import './services.css'

const TABS = [
  { id: 'tous', label: 'Tous' },
  { id: 'active', label: 'Actifs' },
  { id: 'inactive', label: 'Désactivés' },
]

export default function ServicesPage() {
  const notify = useNotify()
  const navigate = useNavigate()
  const [flash, showFlash] = useFlash()

  const [items, setItems] = useState(null)
  const [pagination, setPagination] = useState(null)
  const [compteurs, setCompteurs] = useState({ tous: 0, active: 0, inactive: 0 })
  const [tab, setTab] = useState('tous')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [rev, setRev] = useState(0)
  const [loading, setLoading] = useState(false)
  const [drawer, setDrawer] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const qDebounced = useDebounced(q.trim(), 300)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await servicesAcces.lister({
        page,
        limite: 20,
        status: tab === 'tous' ? undefined : tab,
        q: qDebounced || undefined,
      })
      setItems(r.services ?? [])
      setPagination(r.pagination ?? null)
      if (r.compteurs) setCompteurs(r.compteurs)
    } catch (err) {
      notify.fromError(err)
      setItems((p) => p ?? [])
    } finally {
      setLoading(false)
    }
  }, [page, tab, qDebounced, notify])

  useEffect(() => {
    load()
  }, [load, rev])

  const recharger = () => setRev((r) => r + 1)
  const changerOnglet = (id) => { setTab(id); setPage(1) }
  const changerRecherche = (v) => { setQ(v); setPage(1) }

  async function enregistrer(mode, item, f) {
    setBusy(true)
    try {
      const description = f.description.trim()
      if (mode === 'create') {
        await servicesAcces.creer({ code: f.code, nom: f.nom.trim(), ...(description ? { description } : {}) })
        notify.success('Service créé', `« ${f.nom.trim()} » est disponible au catalogue.`)
        setPage(1)
      } else {
        await servicesAcces.modifier(item.uuid, { nom: f.nom.trim(), description, status: f.actif ? 'active' : 'inactive' })
        showFlash('Service mis à jour.')
      }
      setDrawer(null)
      recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  async function confirmerAction() {
    const { type, item } = confirm
    setBusy(true)
    try {
      if (type === 'supprimer') {
        await servicesAcces.supprimer(item.uuid)
        notify.success('Service supprimé', `« ${item.nom} » a été retiré du catalogue.`)
      } else {
        await servicesAcces.modifier(item.uuid, { status: 'inactive' })
        showFlash(`« ${item.nom} » est désactivé.`)
      }
      recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const demanderSuppression = (item) => setConfirm({ type: item.nbEtablissements > 0 ? 'assigne' : 'supprimer', item })
  const vide = items !== null && items.length === 0
  const catalogueVide = vide && tab === 'tous' && !qDebounced

  return (
    <div className="ap">
      <div className="ap-page-head sv-rise">
        <div>
          <h2 className="ap-page-title">Catalogue des services</h2>
          <p className="ap-page-sub">Services de la plateforme et établissements qui y ont accès</p>
        </div>
        <div className="ap-page-actions">
          <button type="button" className="ap-btn ap-btn--ghost" onClick={recharger} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'ap-spin' : ''} aria-hidden="true" />
            Actualiser
          </button>
          <button type="button" className="ap-btn" onClick={() => setDrawer({ mode: 'create' })}>
            <Plus size={16} aria-hidden="true" />
            Nouveau service
          </button>
        </div>
      </div>

      <Flash flash={flash} />

      <div className="ap-filters sv-rise" style={{ '--i': 1, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button key={t.id} type="button" className={`ap-tab${tab === t.id ? ' is-active' : ''}`} onClick={() => changerOnglet(t.id)}>
              {t.label}
              <span>{compteurs[t.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="etab-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            placeholder="Rechercher un service…"
            value={q}
            onChange={(e) => changerRecherche(e.target.value)}
            aria-label="Rechercher un service"
          />
        </div>
      </div>

      <div className="ap-card ap-card--flush sv-rise" style={{ '--i': 2 }}>
        {items === null ? (
          <SkeletonList rows={5} />
        ) : vide ? (
          <div className="ap-empty">
            <Layers size={36} aria-hidden="true" />
            <p>{catalogueVide ? "Le catalogue est vide. Créez le premier service de la plateforme." : 'Aucun service ne correspond à votre recherche.'}</p>
            {catalogueVide && (
              <button type="button" className="ap-btn" onClick={() => setDrawer({ mode: 'create' })}>
                <Plus size={16} aria-hidden="true" /> Créer un service
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="ap-table-wrap">
              <table className="ap-table sv-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Code</th>
                    <th>Établissements</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((s, i) => (
                    <tr
                      key={s.uuid}
                      className="sv-row"
                      style={{ '--i': i }}
                      tabIndex={0}
                      onClick={() => navigate(SERVICE_PATHS.detail(s.uuid))}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(SERVICE_PATHS.detail(s.uuid))}
                    >
                      <td data-label="Service">
                        <div className="sv-svc">
                          <ServiceIcon code={s.code} />
                          <div className="sv-name">
                            <strong>{s.nom}</strong>
                            {s.description && <small>{s.description}</small>}
                          </div>
                        </div>
                      </td>
                      <td data-label="Code"><span className="ap-code">{s.code}</span></td>
                      <td data-label="Établissements">{s.nbEtablissements ?? 0}</td>
                      <td data-label="Statut"><EtatBadge actif={s.status === 'active'} labels={['Actif', 'Désactivé']} /></td>
                      <td className="sv-actions" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="ap-btn ap-btn--ghost ap-btn--icon" aria-label={`Modifier ${s.nom}`} title="Modifier" onClick={() => setDrawer({ mode: 'edit', item: s })}>
                          <Pencil size={15} aria-hidden="true" />
                        </button>
                        <button type="button" className="ap-btn ap-btn--ghost ap-btn--icon ap-btn--icon-danger" aria-label={`Supprimer ${s.nom}`} title="Supprimer" onClick={() => demanderSuppression(s)}>
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                        <ChevronRight size={16} aria-hidden="true" style={{ verticalAlign: 'middle', marginLeft: 6, color: 'var(--ap-muted)', opacity: 0.5 }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPage={setPage} unite="service" />
          </>
        )}
      </div>

      <ServiceDrawer drawer={drawer} busy={busy} onSubmit={enregistrer} onClose={() => setDrawer(null)} />

      <ConfirmDialog
        open={confirm?.type === 'supprimer'}
        tone="danger"
        title="Supprimer ce service ?"
        message={`« ${confirm?.item?.nom ?? ''} » sera définitivement retiré du catalogue. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        loading={busy}
        onConfirm={confirmerAction}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.type === 'assigne'}
        tone="warning"
        title="Suppression impossible"
        message={`« ${confirm?.item?.nom ?? ''} » est assigné à ${confirm?.item?.nbEtablissements ?? 0} établissement(s). Vous pouvez le désactiver : il sera inaccessible partout, sans perdre les assignations ni les droits.`}
        confirmLabel="Désactiver le service"
        loading={busy}
        onConfirm={confirmerAction}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
