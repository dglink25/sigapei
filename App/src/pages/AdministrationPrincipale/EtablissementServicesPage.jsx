import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Info, Layers, Lock, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import ConfirmDialog from '../../components/commun/ConfirmDialog'
import Loader from '../../components/commun/Loader'
import ChecklistDrawer from '../../components/administration/ChecklistDrawer'
import JournalPanel from '../../components/administration/JournalPanel'
import ServiceIcon from '../../components/administration/ServiceIcon'
import Switch from '../../components/administration/Switch'
import { EtabBadge, EtatBadge } from '../../components/administration/Badges'
import { Flash, useFlash } from '../../components/administration/Flash'
import { SkeletonCards } from '../../components/administration/Skeleton'
import { servicesAcces } from '../../services/identite/servicesAcces.service'
import { ADMIN_PATHS } from '../../config/etablissements/config'
import { MAX_SERVICES_PAR_ASSIGNATION, SERVICE_PATHS } from '../../config/services/config'
import { dateFr } from './DemandesPage'
import './admin.css'
import '../../components/administration/admin-ui.css'
import './services.css'

export default function EtablissementServicesPage() {
  const { uuid } = useParams()
  const notify = useNotify()
  const [flash, showFlash] = useFlash()

  const [data, setData] = useState(undefined) // undefined = chargement, null = introuvable
  const [rev, setRev] = useState(0)
  const [tab, setTab] = useState('services')
  const [assignOuvert, setAssignOuvert] = useState(false)
  const [catalogue, setCatalogue] = useState([])
  const [chargementCat, setChargementCat] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [motif, setMotif] = useState('')
  const [busy, setBusy] = useState(false)

  const recharger = () => setRev((r) => r + 1)

  const charger = useCallback(async () => {
    try {
      setData(await servicesAcces.listerParEtablissement(uuid))
    } catch (err) {
      if (err?.status !== 404) notify.fromError(err)
      setData((p) => (p === undefined ? null : p))
    }
  }, [uuid, notify])

  useEffect(() => {
    charger()
  }, [charger, rev])

  /* Catalogue chargé à l'ouverture du tiroir d'assignation */
  useEffect(() => {
    if (!assignOuvert) return undefined
    let annule = false
    setChargementCat(true)
    servicesAcces
      .lister({ status: 'active', limite: 100 })
      .then((r) => !annule && setCatalogue(r?.services ?? []))
      .catch((err) => !annule && notify.fromError(err))
      .finally(() => !annule && setChargementCat(false))
    return () => {
      annule = true
    }
  }, [assignOuvert, notify])

  const majItem = (a) =>
    setData((d) => ({ ...d, assignations: d.assignations.map((x) => (x.uuid === a.uuid ? { ...x, ...a } : x)) }))

  async function reactiver(item) {
    setBusyId(item.uuid)
    try {
      const r = await servicesAcces.reactiver(item.uuid)
      majItem(r.assignation)
      showFlash(`« ${item.service.nom} » est de nouveau accessible.`)
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusyId(null)
    }
  }

  function basculer(item) {
    if (item.status === 'active') setConfirm({ type: 'bloquer', item })
    else reactiver(item)
  }

  function fermerConfirm() {
    setConfirm(null)
    setMotif('')
  }

  async function confirmer() {
    const { type, item } = confirm
    setBusy(true)
    try {
      if (type === 'bloquer') {
        const r = await servicesAcces.bloquer(item.uuid, motif.trim())
        majItem(r.assignation)
        showFlash(`« ${item.service.nom} » est bloqué pour cet établissement.`, 'info')
      } else {
        const r = await servicesAcces.retirer(item.uuid)
        setData((d) => ({ ...d, assignations: d.assignations.filter((x) => x.uuid !== item.uuid) }))
        notify.success('Service retiré', `${r?.droitsSupprimes ?? 0} droit(s) utilisateur supprimé(s).`)
      }
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
      fermerConfirm()
    }
  }

  async function assigner(ids) {
    setBusy(true)
    try {
      const r = await servicesAcces.assigner(uuid, ids)
      const n = r?.assignations?.length ?? 0
      notify.success(
        n > 0 ? 'Services assignés' : 'Aucun changement',
        n > 0 ? `${n} service${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''} à ${data.etablissement.nom}.` : 'Ces services étaient déjà assignés.',
      )
      setAssignOuvert(false)
      recharger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  /* ── États ── */
  if (data === undefined) return <div className="ap"><Loader mode="inline" label="Chargement des services…" /></div>

  if (data === null) {
    return (
      <div className="ap">
        <div className="ap-page-head">
          <Link to={ADMIN_PATHS.etablissements} className="ap-btn ap-btn--ghost ap-btn--sm">Retour aux établissements</Link>
        </div>
        <div className="ap-card ap-empty">
          <TriangleAlert size={32} aria-hidden="true" />
          <p>Cet établissement n'existe pas ou n'est pas accessible.</p>
        </div>
      </div>
    )
  }

  const { etablissement, assignations } = data
  const effectif = (a) => a.status === 'active' && a.service.status === 'active'
  const nbActifs = assignations.filter(effectif).length
  const nbBloques = assignations.length - nbActifs
  const dejaAssignes = new Set(assignations.map((a) => a.service.uuid))
  const itemsCatalogue = catalogue.map((s) => ({
    id: s.uuid,
    title: s.nom,
    subtitle: s.code,
    note: dejaAssignes.has(s.uuid) ? 'Déjà assigné' : undefined,
    disabled: dejaAssignes.has(s.uuid),
    leading: <ServiceIcon code={s.code} />,
  }))

  return (
    <div className="ap">
      <nav className="ap-bread" aria-label="Fil d'ariane">
        <Link to={ADMIN_PATHS.etablissements}>Établissements</Link>
        <span className="ap-bread-sep" aria-hidden="true">/</span>
        <span>{etablissement.nom}</span>
        <span className="ap-bread-sep" aria-hidden="true">/</span>
        <span>Services</span>
      </nav>

      <div className="ap-page-head sv-rise">
        <div>
          <h2 className="ap-page-title">Services de {etablissement.nom} <EtabBadge statut={etablissement.statut} /></h2>
          <p className="ap-page-sub">Services auxquels cet établissement a accès, et état de chaque accès</p>
        </div>
        <div className="ap-page-actions">
          <button type="button" className="ap-btn" onClick={() => setAssignOuvert(true)} disabled={etablissement.statut === 'archive'}>
            <Plus size={16} aria-hidden="true" /> Assigner des services
          </button>
        </div>
      </div>

      {etablissement.statut !== 'actif' && (
        <div className="ap-alert ap-alert--danger" role="status">
          <TriangleAlert size={18} aria-hidden="true" />
          <div>
            <strong>Établissement {etablissement.statut === 'suspendu' ? 'suspendu' : 'archivé'}</strong>
            Tous ses services sont inaccessibles, quel que soit l'état indiqué ci-dessous.
          </div>
        </div>
      )}

      <div className="sv-stats">
        <div className="ap-card sv-stat sv-rise" style={{ '--i': 1 }}>
          <p className="sv-stat-lbl">Services assignés</p>
          <p className="sv-stat-val">{assignations.length}</p>
        </div>
        <div className="ap-card sv-stat sv-rise" style={{ '--i': 2 }}>
          <p className="sv-stat-lbl">Accessibles</p>
          <p className="sv-stat-val">{nbActifs}</p>
        </div>
        <div className={`ap-card sv-stat sv-rise ${nbBloques > 0 ? 'sv-stat--danger' : 'sv-stat--gold'}`} style={{ '--i': 3 }}>
          <p className="sv-stat-lbl">Bloqués</p>
          <p className="sv-stat-val">{nbBloques}</p>
        </div>
      </div>

      <Flash flash={flash} />

      <div className="ap-filters">
        <button type="button" className={`ap-tab${tab === 'services' ? ' is-active' : ''}`} onClick={() => setTab('services')}>
          Services <span>{assignations.length}</span>
        </button>
        <button type="button" className={`ap-tab${tab === 'historique' ? ' is-active' : ''}`} onClick={() => setTab('historique')}>
          Historique
        </button>
      </div>

      {tab === 'historique' ? (
        <div className="ap-card ap-card--flush"><JournalPanel etablissementUuid={uuid} /></div>
      ) : assignations.length === 0 ? (
        <div className="ap-card ap-empty">
          <Layers size={36} aria-hidden="true" />
          <p>Aucun service n'est encore assigné à cet établissement.</p>
          <button type="button" className="ap-btn" onClick={() => setAssignOuvert(true)}>
            <Plus size={16} aria-hidden="true" /> Assigner des services
          </button>
        </div>
      ) : (
        <div className="sv-grid">
          {assignations.map((a, i) => {
            const ok = effectif(a)
            return (
              <article key={a.uuid} className={`ap-card sv-card${ok ? '' : ' is-off'}`} style={{ '--i': i }}>
                <div className="sv-card-top">
                  <ServiceIcon code={a.service.code} large />
                  <div className="sv-card-title">
                    <strong>{a.service.nom}</strong>
                    <span className="ap-code">{a.service.code}</span>
                  </div>
                  <EtatBadge actif={ok} />
                </div>
                <p className="sv-card-desc">{a.service.description || 'Aucune description.'}</p>
                {a.service.status !== 'active' && (
                  <p className="sv-note"><Info size={14} aria-hidden="true" />Désactivé au catalogue : inaccessible pour tous les établissements.</p>
                )}
                {a.status !== 'active' && a.motif && (
                  <p className="sv-note"><Lock size={14} aria-hidden="true" />Motif : {a.motif}</p>
                )}
                <p className="sv-meta">
                  {a.nbUtilisateursAvecAcces ?? 0} utilisateur{(a.nbUtilisateursAvecAcces ?? 0) > 1 ? 's' : ''} avec accès · assigné le {dateFr(a.createdAt)}
                </p>
                <div className="sv-card-foot">
                  <div className="sv-card-state">
                    <Switch
                      checked={a.status === 'active'}
                      busy={busyId === a.uuid}
                      onChange={() => basculer(a)}
                      label={`Accès au service ${a.service.nom}`}
                    />
                    <span>{a.status === 'active' ? 'Accès ouvert' : 'Accès bloqué'}</span>
                  </div>
                  <button
                    type="button"
                    className="ap-btn ap-btn--ghost ap-btn--icon ap-btn--icon-danger"
                    aria-label={`Retirer ${a.service.nom}`}
                    title="Retirer le service"
                    onClick={() => setConfirm({ type: 'retirer', item: a })}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <ChecklistDrawer
        open={assignOuvert}
        title="Assigner des services"
        subtitle={`Choisissez les services à ouvrir à ${etablissement.nom}. Son administrateur en répartira ensuite les droits.`}
        items={itemsCatalogue}
        loading={chargementCat}
        max={MAX_SERVICES_PAR_ASSIGNATION}
        busy={busy}
        submitLabel="Assigner"
        searchPlaceholder="Rechercher un service…"
        emptyLabel="Aucun service actif dans le catalogue."
        onSubmit={assigner}
        onClose={() => setAssignOuvert(false)}
      />

      <ConfirmDialog
        open={confirm?.type === 'bloquer'}
        tone="warning"
        title="Bloquer ce service ?"
        message={`Tous les utilisateurs de ${etablissement.nom} perdent immédiatement l'accès à « ${confirm?.item?.service?.nom ?? ''} ». Leurs droits sont conservés.`}
        confirmLabel="Bloquer"
        loading={busy}
        onConfirm={confirmer}
        onCancel={fermerConfirm}
      >
        <div className="ap-field sv-motif-field">
          <label className="ap-label" htmlFor="sv-motif-etab">Motif (facultatif)</label>
          <textarea id="sv-motif-etab" className="ap-textarea" rows={2} maxLength={255} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. Abonnement impayé" />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm?.type === 'retirer'}
        tone="danger"
        title="Retirer ce service ?"
        message={`« ${confirm?.item?.service?.nom ?? ''} » sera retiré de ${etablissement.nom}. Les droits de ${confirm?.item?.nbUtilisateursAvecAcces ?? 0} utilisateur(s) seront définitivement supprimés.`}
        confirmLabel="Retirer"
        loading={busy}
        onConfirm={confirmer}
        onCancel={fermerConfirm}
      />
    </div>
  )
}
