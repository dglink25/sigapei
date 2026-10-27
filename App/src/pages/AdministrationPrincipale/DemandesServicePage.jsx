
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check, CheckCircle2, Clock, Inbox, Layers,
  RefreshCw, Search, ShieldAlert, X, XCircle,
} from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import usePageTitle from '../../hooks/commun/usePageTitle'
import ServiceIcon from '../../components/administration/ServiceIcon'
import Drawer from '../../components/administration/Drawer'
import { Flash, useFlash } from '../../components/administration/Flash'
import { SkeletonList } from '../../components/administration/Skeleton'
import { demandesServiceAdminService } from '../../services/identite/demandesService.service'
import './admin.css'
import './services.css'
import '../../components/administration/admin-ui.css'

const TABS = [
  { id: 'en_attente', label: 'À instruire' },
  { id: 'acceptee',   label: 'Acceptées' },
  { id: 'refusee',    label: 'Refusées' },
  { id: 'tous',       label: 'Toutes' },
]

const STATUT_BADGES = {
  en_attente: { cls: 'ap-badge--warning', label: 'En attente' },
  acceptee:   { cls: 'ap-badge--success', label: 'Acceptée' },
  refusee:    { cls: 'ap-badge--danger',  label: 'Refusée' },
}

const dateFr = (d) => {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

export default function DemandesServicePage() {
  usePageTitle("Demandes d'accès aux services")
  const notify = useNotify()
  const [flash, showFlash] = useFlash()

  const [onglet, setOnglet] = useState('en_attente')
  const [demandes, setDemandes] = useState(null)
  const [compteurs, setCompteurs] = useState({ enAttente: 0, acceptees: 0, refusees: 0, total: 0 })
  const [charge, setCharge] = useState(false)
  const [recherche, setRecherche] = useState('')

  // Tiroir d'instruction
  const [cible, setCible] = useState(null) // { demande, action: 'accepter' | 'refuser' }
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const charger = useCallback(async () => {
    setCharge(true)
    try {
      const [rD, rStats] = await Promise.all([
        demandesServiceAdminService.listerToutesDemandes(onglet),
        demandesServiceAdminService.compteurs(),
      ])
      setDemandes(Array.isArray(rD?.data) ? rD.data : Array.isArray(rD) ? rD : [])
      if (rStats) setCompteurs(rStats)
    } catch (err) {
      notify.fromError(err)
      setDemandes([])
    } finally {
      setCharge(false)
    }
  }, [onglet, notify])

  useEffect(() => {
    charger()
  }, [charger])

  const ouvrirAction = (demande, action) => {
    setCible({ demande, action })
    setNote('')
  }

  const fermerTiroir = () => {
    if (busy) return
    setCible(null)
    setNote('')
  }

  const confirmerAction = async (e) => {
    e?.preventDefault()
    if (!cible) return

    if (cible.action === 'refuser' && note.trim().length < 10) {
      notify.warning(
        'Motif requis',
        'Veuillez renseigner un motif de refus d\'au moins 10 caractères pour expliquer la décision.',
      )
      return
    }

    setBusy(true)
    try {
      if (cible.action === 'accepter') {
        await demandesServiceAdminService.accepter(cible.demande.uuid, {
          note: note.trim(),
          etablissementUuid: cible.demande.etablissementUuid || cible.demande.etablissement?.uuid,
          serviceUuid: cible.demande.serviceUuid || cible.demande.service?.uuid,
        })
        const nomEtab = cible.demande.etablissement?.nom ?? 'l\'établissement'
        const nomSrv = cible.demande.service?.nom ?? 'le service'
        showFlash(`Le service « ${nomSrv} » a été activé et assigné avec succès à ${nomEtab}.`, 'success')
      } else {
        await demandesServiceAdminService.refuser(cible.demande.uuid, note.trim())
        showFlash('La demande a été rejetée et le motif a été transmis à l\'établissement.', 'info')
      }
      setCible(null)
      await charger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  // Filtrage local pour la recherche
  const qNormalise = recherche.trim().toLowerCase()
  const demandesFiltrees = useMemo(() => {
    if (!demandes) return []
    if (!qNormalise) return demandes
    return demandes.filter((d) => {
      const nomEtab = (d.etablissement?.nom ?? '').toLowerCase()
      const nomSrv = (d.service?.nom ?? '').toLowerCase()
      const codeSrv = (d.service?.code ?? '').toLowerCase()
      const mot = (d.motif ?? '').toLowerCase()
      return nomEtab.includes(qNormalise) || nomSrv.includes(qNormalise) || codeSrv.includes(qNormalise) || mot.includes(qNormalise)
    })
  }, [demandes, qNormalise])

  return (
    <div className="ap">
      {/* ── En-tête institutionnel ── */}
      <div className="ap-page-head sv-rise">
        <div>
          <h2 className="ap-page-title">Demandes d'accès aux services</h2>
          <p className="ap-page-sub">
            Instruisez et validez les demandes d'activation de services formulées par les établissements.
          </p>
        </div>
        <div className="ap-page-actions">
          <button
            type="button"
            className="ap-btn ap-btn--ghost"
            onClick={charger}
            disabled={charge}
          >
            <RefreshCw size={15} className={charge ? 'ap-spin' : ''} aria-hidden="true" />
            Actualiser
          </button>
        </div>
      </div>

      <Flash flash={flash} />

      {/* ── Indicateurs institutionnels (sv-stats) ── */}
      <div className="sv-stats">
        <div className={`ap-card sv-stat sv-rise ${compteurs.enAttente > 0 ? 'sv-stat--gold' : ''}`} style={{ '--i': 1 }}>
          <p className="sv-stat-lbl">À instruire</p>
          <p className="sv-stat-val">{compteurs.enAttente}</p>
        </div>
        <div className="ap-card sv-stat sv-rise" style={{ '--i': 2 }}>
          <p className="sv-stat-lbl">Acceptées</p>
          <p className="sv-stat-val">{compteurs.acceptees}</p>
        </div>
        <div className="ap-card sv-stat sv-rise" style={{ '--i': 3 }}>
          <p className="sv-stat-lbl">Refusées</p>
          <p className="sv-stat-val">{compteurs.refusees}</p>
        </div>
      </div>

      {/* ── Filtres, Onglets & Recherche officiels ── */}
      <div className="ap-filters sv-rise" style={{ '--i': 2, justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {TABS.map((t) => {
            const count =
              t.id === 'en_attente'
                ? compteurs.enAttente
                : t.id === 'acceptee'
                ? compteurs.acceptees
                : t.id === 'refusee'
                ? compteurs.refusees
                : compteurs.total
            return (
              <button
                key={t.id}
                type="button"
                className={`ap-tab${onglet === t.id ? ' is-active' : ''}`}
                onClick={() => setOnglet(t.id)}
              >
                {t.label}
                <span>{count}</span>
              </button>
            )
          })}
        </div>

        <div className="etab-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            placeholder="Rechercher établissement, service…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            aria-label="Rechercher une demande"
          />
        </div>
      </div>

      {/* ── Tableau institutionnel ── */}
      {charge && !demandes ? (
        <div className="ap-card ap-card--flush">
          <SkeletonList rows={5} />
        </div>
      ) : demandesFiltrees.length === 0 ? (
        <div className="ap-card ap-empty">
          <Inbox size={36} aria-hidden="true" />
          <p>
            {qNormalise
              ? 'Aucune demande ne correspond à votre recherche.'
              : onglet === 'en_attente'
              ? 'Toutes les demandes de service ont été instruites.'
              : 'Aucun enregistrement dans cette catégorie.'}
          </p>
        </div>
      ) : (
        <div className="ap-card ap-card--flush sv-rise" style={{ '--i': 1 }}>
          <div className="ap-table-wrap">
            <table className="ap-table sv-table sv-static">
              <thead>
                <tr>
                  <th>Établissement</th>
                  <th>Service requis</th>
                  <th>Code</th>
                  <th>Motif de la demande</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {demandesFiltrees.map((d, i) => {
                  const srv = d.service ?? {}
                  const etab = d.etablissement ?? {}
                  const estEnAttente = d.statut === 'en_attente'
                  const cfgBadge = STATUT_BADGES[d.statut] ?? STATUT_BADGES.en_attente

                  return (
                    <tr key={d.uuid || i} className="sv-row" style={{ '--i': i }}>
                      {/* Établissement */}
                      <td>
                        <strong style={{ display: 'block', fontSize: '0.92rem' }}>
                          {etab.nom ?? 'Établissement'}
                        </strong>
                        <small style={{ color: 'var(--ap-muted)' }}>
                          {etab.slug ? `@${etab.slug}` : (etab.type ?? 'Établissement')}
                        </small>
                      </td>

                      {/* Service requis */}
                      <td>
                        <div className="sv-svc">
                          <ServiceIcon code={srv.code} />
                          <div className="sv-name">
                            <strong>{srv.nom ?? 'Service'}</strong>
                            {srv.description && <small>{srv.description}</small>}
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td>
                        <span className="ap-code">{srv.code ?? 'service'}</span>
                      </td>

                      {/* Motif & note éventuelle */}
                      <td style={{ maxWidth: 280 }}>
                        <span style={{ fontSize: '0.86rem', color: 'var(--ap-text)', fontStyle: 'italic' }}>
                          « {d.motif} »
                        </span>
                        {d.noteInstruction && (
                          <div style={{ marginTop: 4, fontSize: '0.78rem', color: 'var(--ap-muted)' }}>
                            <strong>Note : </strong>
                            <span>{d.noteInstruction}</span>
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--ap-muted)' }}>
                        {dateFr(d.createdAt)}
                      </td>

                      {/* Statut */}
                      <td>
                        <span className={`ap-badge ${cfgBadge.cls}`}>
                          {cfgBadge.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {estEnAttente ? (
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              type="button"
                              className="ap-btn ap-btn--gold ap-btn--sm"
                              onClick={() => ouvrirAction(d, 'accepter')}
                              title="Valider et assigner le service"
                            >
                              <Check size={14} aria-hidden="true" /> Accepter
                            </button>
                            <button
                              type="button"
                              className="ap-btn ap-btn--ghost ap-btn--sm"
                              style={{ color: '#c0392b', borderColor: 'rgba(192,57,43,0.35)' }}
                              onClick={() => ouvrirAction(d, 'refuser')}
                              title="Refuser la demande"
                            >
                              <X size={14} aria-hidden="true" /> Refuser
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--ap-muted)' }}>
                            {d.dateInstruction ? `Traité le ${dateFr(d.dateInstruction)}` : 'Traité'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tiroir officiel SIGAPEI (Drawer) pour instruction ── */}
      <Drawer
        open={cible !== null}
        title={
          cible?.action === 'accepter'
            ? 'Valider et assigner le service'
            : 'Refuser la demande de service'
        }
        subtitle={
          cible?.demande
            ? `${cible.demande.etablissement?.nom ?? 'Établissement'} · Service « ${cible.demande.service?.nom ?? 'demandé'} »`
            : undefined
        }
        onClose={fermerTiroir}
        busy={busy}
        footer={
          <>
            <button
              type="button"
              className="ap-btn ap-btn--ghost"
              onClick={fermerTiroir}
              disabled={busy}
            >
              Annuler
            </button>
            <button
              type="button"
              className={`ap-btn ${cible?.action === 'accepter' ? 'ap-btn--gold' : 'ap-btn--danger'}`}
              onClick={confirmerAction}
              disabled={busy || (cible?.action === 'refuser' && note.trim().length < 10)}
            >
              {busy ? (
                <>
                  <RefreshCw size={14} className="ap-spin" aria-hidden="true" />
                  Traitement…
                </>
              ) : cible?.action === 'accepter' ? (
                <>
                  <Check size={15} aria-hidden="true" />
                  Valider et assigner
                </>
              ) : (
                <>
                  <X size={15} aria-hidden="true" />
                  Confirmer le rejet
                </>
              )}
            </button>
          </>
        }
      >
        {cible && (
          <form onSubmit={confirmerAction}>
            {/* Récapitulatif du service */}
            <div className="ap-switchline" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ServiceIcon code={cible.demande.service?.code} />
                <div>
                  <strong>{cible.demande.service?.nom}</strong>
                  <small>Code : {cible.demande.service?.code}</small>
                </div>
              </div>
            </div>

            {/* Motif formulé par l'établissement */}
            <div className="ap-field">
              <label className="ap-label">Motif formulé par l'établissement :</label>
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--ap-border)',
                  background: 'var(--ap-hover)',
                  fontSize: '0.88rem',
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}
              >
                « {cible.demande.motif} »
              </div>
            </div>

            {/* Note d'information sur la conséquence */}
            {cible.action === 'accepter' ? (
              <div className="ap-alert ap-alert--warning" role="status">
                <CheckCircle2 size={18} aria-hidden="true" style={{ color: '#006B3C' }} />
                <div>
                  <strong>Assignation automatique</strong>
                  En validant, le service sera directement activé et assigné à cet établissement. Il sera visible immédiatement sur son portail.
                </div>
              </div>
            ) : (
              <div className="ap-alert ap-alert--danger" role="status">
                <ShieldAlert size={18} aria-hidden="true" />
                <div>
                  <strong>Motif obligatoire</strong>
                  Le motif saisi ci-dessous sera transmis à l'administrateur de l'établissement dans son espace de configuration.
                </div>
              </div>
            )}

            {/* Champ de note d'instruction */}
            <div className="ap-field">
              <label htmlFor="instruction-note" className="ap-label">
                {cible.action === 'accepter'
                  ? 'Note d\'instruction (facultative)'
                  : 'Motif du refus (obligatoire, min. 10 car.)'}
                {cible.action === 'refuser' && <em>*</em>}
              </label>
              <textarea
                id="instruction-note"
                className="ap-textarea"
                rows={3}
                placeholder={
                  cible.action === 'accepter'
                    ? 'Ex : Accès accordé suite à la convention annuelle...'
                    : 'Ex : Prérequis académiques non remplis ou convention non finalisée...'
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={busy}
              />
              <p className="ap-hint">
                {cible.action === 'accepter'
                  ? 'Commentaire interne ou précision à destination de l\'établissement.'
                  : 'Expliquez clairement les raisons du refus pour guider l\'établissement.'}
              </p>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  )
}
