/**
 * PanneauServicesEtablissement - Services assignés & Demandes d'accès.
 *
 * Design institutionnel SIGAPEI conforme à EtablissementServicesPage et ServicesPage :
 *   - Grille sv-grid et cartes sv-card avec ServiceIcon et EtatBadge
 *   - Indicateurs sv-stats
 *   - Tableau institutionnel ap-table pour le suivi des demandes
 *   - Tiroir latéral Drawer officiel pour la formulation de nouvelles demandes
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight, Clock, Layers, Lock, Plus, RefreshCw,
  Search, Send, X, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import { portailService } from '../../../services/identite/portail.service'
import { demandesServiceEtabService } from '../../../services/identite/demandesService.service'
import { lienEtablissement } from '../../../lib/etablissements/subdomain'
import useSlugEtablissement from '../../../hooks/etablissements/useSlugEtablissement'
import ServiceIcon from '../../administration/ServiceIcon'
import { EtatBadge } from '../../administration/Badges'
import Drawer from '../../administration/Drawer'
import { Flash, useFlash } from '../../administration/Flash'
import { SkeletonList } from '../../administration/Skeleton'
import Loader from '../../commun/Loader'
import '../../../pages/AdministrationPrincipale/admin.css'
import '../../../pages/AdministrationPrincipale/services.css'
import '../../administration/admin-ui.css'

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

export default function PanneauServicesEtablissement() {
  const notify = useNotify()
  const slug = useSlugEtablissement()
  const [flash, showFlash] = useFlash()

  const [tab, setTab] = useState('services') // 'services' | 'demandes'
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  // Données
  const [servicesAssignes, setServicesAssignes] = useState([])
  const [demandes, setDemandes] = useState([])
  const [servicesDispo, setServicesDispo] = useState([])
  const [etablissement, setEtablissement] = useState(null)

  // Tiroir de demande
  const [tiroirOuvert, setTiroirOuvert] = useState(false)
  const [serviceChoisi, setServiceChoisi] = useState('')
  const [motif, setMotif] = useState('')
  const [busy, setBusy] = useState(false)
  const [erreurs, setErreurs] = useState({})

  // Chargement des données
  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const [rPortail, rDemandes] = await Promise.all([
        portailService.lire().catch(() => null),
        demandesServiceEtabService.listerMesDemandes().catch(() => []),
      ])

      const etabInfo = rPortail?.etablissement ?? null
      setEtablissement(etabInfo)

      const sAssignes = rPortail?.services ?? []
      setServicesAssignes(sAssignes)

      const dListe = Array.isArray(rDemandes?.data)
        ? rDemandes.data
        : Array.isArray(rDemandes)
        ? rDemandes
        : []
      setDemandes(dListe)

      // Services actifs du catalogue disponibles pour demande
      const dispo = await demandesServiceEtabService.listerServicesDisponibles(etabInfo?.uuid)
      setServicesDispo(dispo)
      if (dispo.length > 0 && !serviceChoisi) {
        setServiceChoisi(dispo[0].uuid)
      }
    } catch (err) {
      notify.fromError(err)
    } finally {
      setLoading(false)
    }
  }, [notify, serviceChoisi])

  useEffect(() => {
    charger()
  }, [charger])

  // Ouvrir le tiroir de demande
  const ouvrirTiroir = () => {
    if (servicesDispo.length > 0) {
      setServiceChoisi(servicesDispo[0].uuid)
    }
    setMotif('')
    setErreurs({})
    setTiroirOuvert(true)
  }

  // Soumettre la demande
  const soumettreDemande = async (e) => {
    e?.preventDefault()
    const errs = {}
    if (!serviceChoisi) {
      errs.service = 'Veuillez sélectionner un service.'
    }
    const motifNet = motif.trim()
    if (!motifNet || motifNet.length < 10) {
      errs.motif = 'Le motif doit comporter au moins 10 caractères.'
    }
    if (Object.keys(errs).length > 0) {
      setErreurs(errs)
      return
    }

    setBusy(true)
    try {
      const srvSelectionne = servicesDispo.find((s) => s.uuid === serviceChoisi)
      await demandesServiceEtabService.soumettre({
        serviceUuid: serviceChoisi,
        motif: motifNet,
        service: srvSelectionne,
        etablissement,
      })

      showFlash(`Votre demande pour le service « ${srvSelectionne?.nom ?? 'demandé'} » a été transmise au Super Admin.`, 'success')
      setTiroirOuvert(false)
      setTab('demandes')
      await charger()
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
    }
  }

  // Annuler une demande
  const annulerDemande = async (uuid) => {
    if (!window.confirm('Voulez-vous vraiment annuler cette demande ?')) return
    try {
      await demandesServiceEtabService.annuler(uuid)
      showFlash('Demande de service annulée.', 'info')
      await charger()
    } catch (err) {
      notify.fromError(err)
    }
  }

  // Filtrage local pour la recherche
  const qNormalise = q.trim().toLowerCase()
  const servicesFiltres = useMemo(() => {
    if (!qNormalise) return servicesAssignes
    return servicesAssignes.filter((s) => {
      const nom = (s.nom ?? '').toLowerCase()
      const code = (s.code ?? '').toLowerCase()
      const desc = (s.description ?? '').toLowerCase()
      return nom.includes(qNormalise) || code.includes(qNormalise) || desc.includes(qNormalise)
    })
  }, [servicesAssignes, qNormalise])

  const demandesFiltrees = useMemo(() => {
    if (!qNormalise) return demandes
    return demandes.filter((d) => {
      const nom = (d.service?.nom ?? '').toLowerCase()
      const code = (d.service?.code ?? '').toLowerCase()
      const mot = (d.motif ?? '').toLowerCase()
      return nom.includes(qNormalise) || code.includes(qNormalise) || mot.includes(qNormalise)
    })
  }, [demandes, qNormalise])

  const demandesEnAttente = useMemo(
    () => demandes.filter((d) => d.statut === 'en_attente'),
    [demandes],
  )
  const nbActifs = useMemo(
    () => servicesAssignes.filter((s) => s.statut !== 'bloque' && s.status !== 'inactive').length,
    [servicesAssignes],
  )

  return (
    <div className="ap cfg-services-page">
      {/* ── En-tête institutionnel ── */}
      <div className="ap-page-head sv-rise">
        <div>
          <h2 className="ap-page-title">Services assignés</h2>
          <p className="ap-page-sub">
            Modules applicatifs actifs pour votre établissement et demandes d'extension d'accès.
          </p>
        </div>
        <div className="ap-page-actions">
          <button
            type="button"
            className="ap-btn ap-btn--ghost"
            onClick={charger}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'ap-spin' : ''} aria-hidden="true" />
            Actualiser
          </button>
          <button
            type="button"
            className="ap-btn ap-btn--gold"
            onClick={ouvrirTiroir}
            disabled={loading || servicesDispo.length === 0}
            title={servicesDispo.length === 0 ? 'Tous les services du catalogue sont déjà assignés' : undefined}
          >
            <Plus size={16} aria-hidden="true" />
            Demander un nouveau service
          </button>
        </div>
      </div>

      <Flash flash={flash} />

      {/* ── Indicateurs institutionnels (sv-stats) ── */}
      <div className="sv-stats">
        <div className="ap-card sv-stat sv-rise" style={{ '--i': 1 }}>
          <p className="sv-stat-lbl">Services assignés</p>
          <p className="sv-stat-val">
            {loading ? <span className="cf-stat-loading"><span className="ld-spin--mini" /></span> : servicesAssignes.length}
          </p>
        </div>
        <div className="ap-card sv-stat sv-rise" style={{ '--i': 2 }}>
          <p className="sv-stat-lbl">Actifs</p>
          <p className="sv-stat-val">
            {loading ? <span className="cf-stat-loading"><span className="ld-spin--mini" /></span> : nbActifs}
          </p>
        </div>
        <div
          className={`ap-card sv-stat sv-rise ${demandesEnAttente.length > 0 ? 'sv-stat--gold' : ''}`}
          style={{ '--i': 3 }}
        >
          <p className="sv-stat-lbl">Demandes en cours</p>
          <p className="sv-stat-val">
            {loading ? <span className="cf-stat-loading"><span className="ld-spin--mini" /></span> : demandesEnAttente.length}
          </p>
        </div>
      </div>

      {/* ── Filtres & Onglets officiels ── */}
      <div className="ap-filters sv-rise" style={{ '--i': 2, justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`ap-tab${tab === 'services' ? ' is-active' : ''}`}
            onClick={() => setTab('services')}
          >
            Services assignés
            <span>{servicesAssignes.length}</span>
          </button>
          <button
            type="button"
            className={`ap-tab${tab === 'demandes' ? ' is-active' : ''}`}
            onClick={() => setTab('demandes')}
          >
            Mes demandes d'accès
            {demandesEnAttente.length > 0 ? (
              <span className="ap-tab-badge" style={{ marginLeft: 6 }}>
                {demandesEnAttente.length}
              </span>
            ) : (
              <span>{demandes.length}</span>
            )}
          </button>
        </div>
        <div className="etab-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            placeholder="Filtrer les services…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filtrer les services"
          />
        </div>
      </div>

      {/* ── Contenu selon onglet actif ── */}
      {tab === 'services' ? (
        loading && servicesAssignes.length === 0 ? (
          <div className="ap-card" style={{ padding: '3.5rem', display: 'flex', justifyContent: 'center' }}>
            <Loader mode="inline" label="Chargement des services assignés…" />
          </div>
        ) : servicesFiltres.length === 0 ? (
          <div className="ap-card ap-empty">
            <Layers size={36} aria-hidden="true" />
            <p>
              {qNormalise
                ? 'Aucun service assigné ne correspond à votre recherche.'
                : 'Aucun service n\'est actuellement assigné à votre établissement.'}
            </p>
            {servicesDispo.length > 0 && !qNormalise && (
              <button type="button" className="ap-btn ap-btn--gold" onClick={ouvrirTiroir}>
                <Plus size={16} aria-hidden="true" /> Demander un premier service
              </button>
            )}
          </div>
        ) : (
          <div className="sv-grid">
            {servicesFiltres.map((s, i) => {
              const estActif = s.statut !== 'bloque' && s.status !== 'inactive'
              return (
                <article
                  key={s.uuid || s.code}
                  className={`ap-card sv-card${estActif ? '' : ' is-off'}`}
                  style={{ '--i': i }}
                >
                  <div className="sv-card-top">
                    <ServiceIcon code={s.code} large />
                    <div className="sv-card-title">
                      <strong>{s.nom}</strong>
                      <span className="ap-code">{s.code}</span>
                    </div>
                    <EtatBadge actif={estActif} labels={['Actif', 'Suspendu']} />
                  </div>

                  <p className="sv-card-desc">
                    {s.description || 'Module applicatif officiel SIGAPEI.'}
                  </p>

                  {!estActif && s.motifBlocage && (
                    <p className="sv-note">
                      <Lock size={14} aria-hidden="true" />
                      Motif de suspension : {s.motifBlocage}
                    </p>
                  )}

                  <div className="sv-card-foot">
                    <span className="sv-meta">
                      {estActif ? 'Opérationnel' : 'Accès temporairement suspendu'}
                    </span>
                    {estActif && s.accessible !== false ? (
                      <Link
                        to={lienEtablissement(slug, `/${s.code}`)}
                        className="ap-btn ap-btn--sm ap-btn--ghost"
                      >
                        Ouvrir <ArrowUpRight size={14} aria-hidden="true" style={{ marginLeft: 4 }} />
                      </Link>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--ap-muted)' }}>
                        Inaccessible
                      </span>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )
      ) : (
        /* ── Onglet 2 : Demandes de service ── */
        loading && demandes.length === 0 ? (
          <div className="ap-card ap-card--flush">
            <SkeletonList rows={4} />
          </div>
        ) : demandesFiltrees.length === 0 ? (
          <div className="ap-card ap-empty">
            <Clock size={36} aria-hidden="true" />
            <p>
              {qNormalise
                ? 'Aucune demande ne correspond à votre recherche.'
                : 'Aucune demande d\'accès à un service n\'a été formulée pour le moment.'}
            </p>
            {servicesDispo.length > 0 && !qNormalise && (
              <button type="button" className="ap-btn ap-btn--gold" onClick={ouvrirTiroir}>
                <Plus size={16} aria-hidden="true" /> Faire une demande
              </button>
            )}
          </div>
        ) : (
          <div className="ap-card ap-card--flush sv-rise" style={{ '--i': 1 }}>
            <div className="ap-table-wrap">
              <table className="ap-table sv-table sv-static">
                <thead>
                  <tr>
                    <th>Service demandé</th>
                    <th>Code</th>
                    <th>Motif formulé</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Instruction</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {demandesFiltrees.map((d, i) => {
                    const estEnAttente = d.statut === 'en_attente'
                    const estAcceptee = d.statut === 'acceptee'
                    const srv = d.service ?? {}

                    return (
                      <tr key={d.uuid || i} className="sv-row" style={{ '--i': i }}>
                        <td>
                          <div className="sv-svc">
                            <ServiceIcon code={srv.code} />
                            <div className="sv-name">
                              <strong>{srv.nom ?? 'Service'}</strong>
                              {srv.description && <small>{srv.description}</small>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="ap-code">{srv.code ?? 'service'}</span>
                        </td>
                        <td style={{ maxWidth: 280 }}>
                          <span style={{ fontSize: '0.86rem', color: 'var(--ap-text)', fontStyle: 'italic' }}>
                            « {d.motif} »
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--ap-muted)' }}>
                          {dateFr(d.createdAt)}
                        </td>
                        <td>
                          <span
                            className={`ap-badge ${
                              estEnAttente
                                ? 'ap-badge--warning'
                                : estAcceptee
                                ? 'ap-badge--success'
                                : 'ap-badge--danger'
                            }`}
                          >
                            {estEnAttente ? 'En attente' : estAcceptee ? 'Acceptée' : 'Refusée'}
                          </span>
                        </td>
                        <td style={{ maxWidth: 220 }}>
                          {d.noteInstruction ? (
                            <div style={{ fontSize: '0.82rem' }}>
                              <strong>Note : </strong>
                              <span>{d.noteInstruction}</span>
                            </div>
                          ) : estEnAttente ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--ap-muted)', fontStyle: 'italic' }}>
                              En cours d'instruction…
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {estEnAttente ? (
                            <button
                              type="button"
                              className="ap-btn ap-btn--ghost ap-btn--sm"
                              style={{ color: '#c0392b', borderColor: 'rgba(192,57,43,0.35)' }}
                              onClick={() => annulerDemande(d.uuid)}
                            >
                              <X size={13} aria-hidden="true" />
                              Annuler
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--ap-muted)' }}>
                              Traité
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
        )
      )}

      {/* ── Tiroir officiel SIGAPEI (Drawer) pour nouvelle demande ── */}
      <Drawer
        open={tiroirOuvert}
        title="Demander un nouveau service"
        subtitle="Sélectionnez un service actif du catalogue non encore assigné à votre établissement."
        onClose={() => !busy && setTiroirOuvert(false)}
        busy={busy}
        footer={
          <>
            <button
              type="button"
              className="ap-btn ap-btn--ghost"
              onClick={() => setTiroirOuvert(false)}
              disabled={busy}
            >
              Annuler
            </button>
            <button
              type="button"
              className="ap-btn ap-btn--gold"
              onClick={soumettreDemande}
              disabled={busy || servicesDispo.length === 0}
            >
              {busy ? (
                <>
                  <RefreshCw size={14} className="ap-spin" aria-hidden="true" />
                  Transmission…
                </>
              ) : (
                <>
                  <Send size={15} aria-hidden="true" />
                  Transmettre la demande
                </>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={soumettreDemande}>
          {servicesDispo.length === 0 ? (
            <div className="ap-alert ap-alert--warning" role="status">
              <AlertTriangle size={18} aria-hidden="true" />
              <div>
                <strong>Tous les services sont déjà assignés</strong>
                Votre établissement dispose déjà de tous les services actifs répertoriés au catalogue de la plateforme.
              </div>
            </div>
          ) : (
            <>
              {/* Choix du service en ap-checklist */}
              <div className={`ap-field ${erreurs.service ? 'has-error' : ''}`}>
                <label className="ap-label">
                  Service souhaité <em>*</em>
                </label>
                <div className="ap-checklist" role="radiogroup" aria-label="Choisir un service">
                  {servicesDispo.map((s, idx) => {
                    const estCoche = serviceChoisi === s.uuid
                    return (
                      <div
                        key={s.uuid}
                        className={`ap-check-row${estCoche ? ' is-on' : ''}`}
                        style={{ '--i': idx }}
                        onClick={() => setServiceChoisi(s.uuid)}
                        role="radio"
                        aria-checked={estCoche}
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && setServiceChoisi(s.uuid)}
                      >
                        <input
                          type="radio"
                          name="service_selection"
                          className="ap-check"
                          checked={estCoche}
                          onChange={() => setServiceChoisi(s.uuid)}
                          tabIndex={-1}
                        />
                        <ServiceIcon code={s.code} />
                        <div className="ap-check-info">
                          <strong>{s.nom}</strong>
                          <small>{s.description || `Module technique (${s.code})`}</small>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {erreurs.service && <p className="ap-error">{erreurs.service}</p>}
              </div>

              {/* Justification / Motif */}
              <div className={`ap-field ${erreurs.motif ? 'has-error' : ''}`}>
                <label htmlFor="demande-motif" className="ap-label">
                  Justification ou motif de la demande <em>*</em>
                </label>
                <textarea
                  id="demande-motif"
                  className="ap-textarea"
                  rows={4}
                  placeholder="Ex : Nous souhaitons déployer ce module pour la gestion académique des apprenants lors du prochain semestre…"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  disabled={busy}
                />
                <p className="ap-hint">
                  Expliquez le contexte et le besoin de votre établissement. Le Super Administrateur évaluera votre demande selon ces éléments.
                </p>
                {erreurs.motif && <p className="ap-error">{erreurs.motif}</p>}
              </div>
            </>
          )}
        </form>
      </Drawer>
    </div>
  )
}
