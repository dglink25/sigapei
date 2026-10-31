import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import {
  UserCheck,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Plus,
  Megaphone,
  Calendar,
  CalendarDays,
  Clock,
  Layers,
  FileText,
  DollarSign,
  Edit2,
  Trash2,
  AlertTriangle,
  StopCircle,
  Users,
  CheckCircle2,
  School,
  BookOpen,
  GraduationCap,
  Building2,
  ChevronRight,
} from 'lucide-react'

import { lienEtablissement } from '../../lib/etablissements/subdomain'
import { portailService } from '../../services/identite/portail.service'
import { inscriptionService } from '../../services/inscription/inscription.service'
import { anneesService, cyclesService } from '../../services/etablissements/configurationAcademique.service'
import { monEtablissementService } from '../../services/etablissements/monEtablissement.service'
import useSlugEtablissement from '../../hooks/etablissements/useSlugEtablissement'
import usePageTitle from '../../hooks/commun/usePageTitle'

import ModuleLayout from '../../components/commun/ModuleLayout'
import Loader from '../../components/commun/Loader'
import ModalAppelCandidature from './ModalAppelCandidature'

import '../AdministrationPrincipale/admin.css'
import '../../components/administration/admin-ui.css'
import '../etablissements/ConfigurationPage.css'
import '../etablissements/ScolaritePage.css'
import './inscription.css'

const CYCLE_LABELS = {
  maternelle: 'Maternelle',
  primaire: 'Primaire',
  secondaire: 'Secondaire',
  universitaire: 'Université',
}

const CYCLE_ICONES = {
  maternelle: School,
  primaire: BookOpen,
  secondaire: GraduationCap,
  universitaire: Building2,
}

const LIBELLES_STATUT = {
  en_cours: 'En cours',
  a_venir: 'À venir',
  termine: 'Terminée',
  suspendu: 'Suspendue',
}

/* ── Navigation sidebar Inscription ── */
function buildNavInscription(base, section, cycleParam, cyclesActifsValides) {
  const cycleItems = cyclesActifsValides.map((c) => ({
    label: CYCLE_LABELS[c.cycle] ?? c.cycle,
    href: `${base}?cycle=${c.cycle}`,
    Icon: CYCLE_ICONES[c.cycle] ?? School,
    actif: cycleParam === c.cycle,
    enfants: [
      {
        label: 'Appels',
        href: `${base}?cycle=${c.cycle}&section=appels`,
        actif: cycleParam === c.cycle && (section === 'appels' || !section),
      },
      {
        label: 'Candidatures',
        href: `${base}?cycle=${c.cycle}&section=candidatures`,
        actif: cycleParam === c.cycle && section === 'candidatures',
      },
    ],
  }))

  return [
    {
      groupe: 'GESTION',
      items: [
        { label: "Vue d'ensemble", href: base, actif: !section && !cycleParam, Icon: UserCheck },
        { label: 'Appels à candidatures', href: `${base}?section=appels`, actif: section === 'appels' && !cycleParam, Icon: Megaphone },
        { label: 'Dossiers de candidature', href: `${base}?section=candidatures`, actif: section === 'candidatures' && !cycleParam, Icon: Users },
      ],
    },
    ...(cycleItems.length > 0 ? [{ groupe: 'PAR CYCLE', items: cycleItems }] : []),
  ]
}

export default function InscriptionPage() {
  usePageTitle('Inscriptions')
  const slug = useSlugEtablissement()
  const [searchParams, setSearchParams] = useSearchParams()

  const section = searchParams.get('section') ?? ''
  const cycleParam = searchParams.get('cycle') ?? ''
  const anneeUuidParam = searchParams.get('annee_uuid') ?? ''

  // 1. Contrôle d'accès & permission de rôle via portailService.lire()
  const [acces, setAcces] = useState('chargement')

  useEffect(() => {
    let cancel = false
    portailService.lire()
      .then((r) => {
        if (cancel) return
        const svc = r?.services?.find((s) => s.code === 'inscription')
        if (!svc || !svc.accessible) {
          setAcces('refuse')
          return
        }
        setAcces('autorise')
      })
      .catch(() => {
        if (!cancel) setAcces('refuse')
      })
    return () => { cancel = true }
  }, [])

  // 2. Années académiques et cycles autorisés
  const [toutesAnnees, setToutesAnnees] = useState([])
  const [anneeActive, setAnneeActive] = useState(null)
  const [cyclesAutorises, setCyclesAutorises] = useState([])
  const [cyclesActifs, setCyclesActifs] = useState([])

  useEffect(() => {
    if (acces !== 'autorise') return
    let cancel = false

    Promise.all([anneesService.lister(), monEtablissementService.lire()])
      .then(([rAnnees, profil]) => {
        if (cancel) return
        const liste = Array.isArray(rAnnees?.data) ? rAnnees.data : Array.isArray(rAnnees) ? rAnnees : []
        setToutesAnnees(liste)

        let annee = null
        if (anneeUuidParam) {
          annee = liste.find((a) => a.uuid === anneeUuidParam) ?? null
        }
        if (!annee) {
          annee = liste.find((a) => a.statut === 'en_cours') ?? liste[0] ?? null
        }
        setAnneeActive(annee)

        if (annee && !anneeUuidParam) {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            next.set('annee_uuid', annee.uuid)
            return next
          }, { replace: true })
        }

        const autorises = (profil?.cyclesAutorises ?? [])
          .filter((x) => x.statut === 'actif')
          .map((x) => x.cycle)
        setCyclesAutorises(autorises)
      })
      .catch(() => {})

    return () => { cancel = true }
  }, [acces]) // eslint-disable-line

  // 3. Charger les cycles actifs pour l'année
  useEffect(() => {
    if (!anneeActive?.uuid) return
    let cancel = false
    cyclesService.lister(anneeActive.uuid)
      .then((r) => {
        if (!cancel) {
          setCyclesActifs((r?.data ?? r ?? []).filter((x) => x.actif))
        }
      })
      .catch(() => {})
    return () => { cancel = true }
  }, [anneeActive?.uuid])

  // Cycles valides (autorisés ET actifs pour l'année en cours)
  const cyclesActifsValides = useMemo(() => {
    return cyclesActifs.filter((c) => cyclesAutorises.includes(c.cycle))
  }, [cyclesActifs, cyclesAutorises])

  const cyclesDisponiblesIds = useMemo(() => {
    return cyclesActifsValides.map((c) => c.cycle)
  }, [cyclesActifsValides])

  // --- Données Appels à candidatures ---
  const [appels, setAppels] = useState([])
  const [chargementAppels, setChargementAppels] = useState(false)
  const [filtreCycleAppel, setFiltreCycleAppel] = useState(cycleParam || '')
  const [filtreStatutAppel, setFiltreStatutAppel] = useState('')
  const [rechercheAppel, setRechercheAppel] = useState('')
  const [modalAppelOuverte, setModalAppelOuverte] = useState(false)
  const [appelEnEdition, setAppelEnEdition] = useState(null)
  const [actionEnCoursAppel, setActionEnCoursAppel] = useState(false)

  // Synchroniser le filtre de cycle si cycleParam est dans l'URL
  useEffect(() => {
    if (cycleParam) {
      setFiltreCycleAppel(cycleParam)
    }
  }, [cycleParam])

  // --- Données Candidatures ---
  const [candidatures, setCandidatures] = useState([])
  const [chargementCandidatures, setChargementCandidatures] = useState(true)
  const [erreurCandidatures, setErreurCandidatures] = useState('')
  const [filtreStatutCandidature, setFiltreStatutCandidature] = useState('tous')
  const [rechercheCandidature, setRechercheCandidature] = useState('')
  const [actionLoadingCandidature, setActionLoadingCandidature] = useState(null)

  // Charger les appels
  const chargerAppels = useCallback(async () => {
    setChargementAppels(true)
    try {
      const filtres = {}
      const cycleAChercher = cycleParam || filtreCycleAppel
      if (cycleAChercher) filtres.cycle = cycleAChercher
      if (filtreStatutAppel) filtres.statut = filtreStatutAppel
      const res = await inscriptionService.listerAppels(filtres)
      setAppels(Array.isArray(res) ? res : res?.data ?? [])
    } catch (err) {
      console.error('Erreur chargement appels:', err)
    } finally {
      setChargementAppels(false)
    }
  }, [cycleParam, filtreCycleAppel, filtreStatutAppel])

  // Charger les candidatures
  const chargerCandidatures = useCallback(async () => {
    setChargementCandidatures(true)
    setErreurCandidatures('')
    try {
      const data = await inscriptionService.listerCandidatures()
      setCandidatures(Array.isArray(data) ? data : data?.data ?? [])
    } catch (err) {
      setErreurCandidatures(err?.message || 'Erreur lors du chargement des candidatures.')
    } finally {
      setChargementCandidatures(false)
    }
  }, [])

  useEffect(() => {
    if (acces === 'autorise') {
      chargerAppels()
      chargerCandidatures()
    }
  }, [acces, chargerAppels, chargerCandidatures])

  const changerAnnee = useCallback((annee) => {
    setAnneeActive(annee)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('annee_uuid', annee.uuid)
      return next
    })
  }, [setSearchParams])

  // Actions appels
  const handleOuvrirCreationAppel = () => {
    setAppelEnEdition(null)
    setModalAppelOuverte(true)
  }

  const handleEditerAppel = (appel) => {
    setAppelEnEdition(appel)
    setModalAppelOuverte(true)
  }

  const handleEnregistrerAppel = async (donnees) => {
    setActionEnCoursAppel(true)
    try {
      if (appelEnEdition?.uuid) {
        await inscriptionService.modifierAppel(appelEnEdition.uuid, donnees)
      } else {
        await inscriptionService.creerAppel(donnees)
      }
      setModalAppelOuverte(false)
      await chargerAppels()
    } catch (err) {
      alert(err?.message || "Erreur lors de l'enregistrement de l'appel.")
    } finally {
      setActionEnCoursAppel(false)
    }
  }

  const handleTerminerAppel = async (uuid) => {
    if (!window.confirm('Confirmez-vous la clôture définitive de cet appel à candidature ?')) return
    try {
      await inscriptionService.terminerAppel(uuid)
      await chargerAppels()
    } catch (err) {
      alert(err?.message || "Erreur lors de la clôture de l'appel.")
    }
  }

  const handleSupprimerAppel = async (uuid) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet appel à candidature ?')) return
    try {
      await inscriptionService.supprimerAppel(uuid)
      await chargerAppels()
    } catch (err) {
      alert(err?.message || 'Erreur lors de la suppression.')
    }
  }

  // Actions candidatures
  const handleValiderCandidature = async (uuid) => {
    if (!window.confirm('Confirmer la validation de cette candidature ?')) return
    setActionLoadingCandidature(uuid)
    try {
      await inscriptionService.validerCandidature(uuid)
      await chargerCandidatures()
    } catch (err) {
      alert(err?.message || 'Erreur lors de la validation.')
    } finally {
      setActionLoadingCandidature(null)
    }
  }

  const handleRejeterCandidature = async (uuid) => {
    const motif = window.prompt('Veuillez saisir le motif du rejet :')
    if (!motif) return
    setActionLoadingCandidature(uuid)
    try {
      await inscriptionService.rejeterCandidature(uuid, motif)
      await chargerCandidatures()
    } catch (err) {
      alert(err?.message || 'Erreur lors du rejet.')
    } finally {
      setActionLoadingCandidature(null)
    }
  }

  const base = lienEtablissement(slug, '/inscription')

  if (acces === 'refuse') {
    return <Navigate to={lienEtablissement(slug, '/portail')} replace />
  }

  if (acces === 'chargement') {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <Loader mode="inline" label="Vérification de l'accès aux inscriptions…" />
      </div>
    )
  }

  const navInscription = buildNavInscription(base, section, cycleParam, cyclesActifsValides)

  // Filtrages locaux
  const filteredAppels = appels.filter((a) => {
    const s = rechercheAppel.toLowerCase()
    const matchCycle = !filtreCycleAppel || a.cycle === filtreCycleAppel
    const matchStatut = !filtreStatutAppel || a.statut === filtreStatutAppel
    const matchRecherche =
      !s ||
      (a.titre || '').toLowerCase().includes(s) ||
      (a.description || '').toLowerCase().includes(s) ||
      (a.cycle || '').toLowerCase().includes(s)
    return matchCycle && matchStatut && matchRecherche
  })

  const filteredCandidatures = candidatures.filter((c) => {
    const matchStatut = filtreStatutCandidature === 'tous' || c.statut === filtreStatutCandidature
    const s = rechercheCandidature.toLowerCase()
    const matchSearch =
      !s ||
      `${c.nom ?? ''} ${c.prenom ?? ''}`.toLowerCase().includes(s) ||
      (c.uuid ?? '').toLowerCase().includes(s)
    return matchStatut && matchSearch
  })

  const formaterDateHeure = (dStr) => {
    if (!dStr) return '-'
    const d = new Date(dStr)
    return isNaN(d.getTime())
      ? dStr
      : d.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
  }

  // Fil d'ariane
  const migettes = [
    <Link key="p" to={lienEtablissement(slug, '/portail')}>Portail</Link>,
    <span key="s1" className="ap-bread-sep">/</span>,
    <Link key="sc" to={base}>Inscriptions</Link>,
  ]

  if (cycleParam) {
    migettes.push(<span key="s2" className="ap-bread-sep">/</span>)
    migettes.push(<span key="cy">{CYCLE_LABELS[cycleParam] ?? cycleParam}</span>)
    if (section) {
      const labels = { appels: 'Appels', candidatures: 'Candidatures' }
      migettes.push(<span key="s3" className="ap-bread-sep">/</span>)
      migettes.push(<span key="sec">{labels[section] ?? section}</span>)
    }
  } else if (section) {
    const labels = { appels: 'Appels à candidatures', candidatures: 'Dossiers de candidature' }
    migettes.push(<span key="s2" className="ap-bread-sep">/</span>)
    migettes.push(<span key="sec">{labels[section] ?? section}</span>)
  }

  const estVueEnsemble = !section && !cycleParam

  // Rendu de la vue
  function renduContenu() {
    // Si cycle demandé dans l'URL mais pas autorisé / actif
    if (cycleParam) {
      const cycleTrouve = cyclesActifsValides.find((c) => c.cycle === cycleParam)
      if (!cycleTrouve) {
        return (
          <div className="ap-card ap-empty" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <AlertTriangle size={40} style={{ color: 'var(--sg-warning, #d97706)', margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700 }}>
              Cycle non autorisé ou inactif pour cette année
            </h3>
            <p style={{ maxWidth: 540, margin: '0 auto 16px', color: 'var(--sg-text-muted)' }}>
              Le cycle <strong>{CYCLE_LABELS[cycleParam] ?? cycleParam}</strong> n'est pas autorisé pour votre établissement ou n'a pas été activé pour l'année académique <strong>{anneeActive?.libelle}</strong>.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Link to={base} className="ap-btn ap-btn--ghost ap-btn--sm">
                Retour à la vue d'ensemble
              </Link>
              <Link to={lienEtablissement(slug, '/scolarite?section=cycles')} className="ap-btn ap-btn--sm">
                Activer des cycles dans Scolarité
              </Link>
            </div>
          </div>
        )
      }
    }

    // Vue 1 : Appels à candidatures (explicite ou par sous-onglet de cycle)
    if (section === 'appels' || (cycleParam && section !== 'candidatures')) {
      return (
        <div>
          <div className="ap-page-head">
            <div>
              <h2 className="ap-page-title">
                Appels à candidatures {cycleParam ? `• ${CYCLE_LABELS[cycleParam]}` : ''}
              </h2>
              <p className="ap-page-sub">
                Campagnes de recrutement ouvertes aux futurs apprenants et critères d'admission
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleOuvrirCreationAppel}
                className="ap-btn ap-btn--sm"
                style={{ gap: 6 }}
              >
                <Plus size={16} /> Lancer un appel
              </button>
              <button
                type="button"
                onClick={() => {
                  chargerAppels()
                  chargerCandidatures()
                }}
                className="ap-btn ap-btn--ghost ap-btn--sm"
                title="Actualiser les données"
              >
                <RefreshCw size={15} className={chargementAppels ? 'spin' : ''} /> Actualiser
              </button>
            </div>
          </div>

          {/* Outils & Filtres */}
          <div className="module-toolbar" style={{ marginBottom: 20 }}>
            <div className="module-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Rechercher par titre, description..."
                value={rechercheAppel}
                onChange={(e) => setRechercheAppel(e.target.value)}
              />
            </div>
            <div className="module-filters" style={{ flexWrap: 'wrap' }}>
              {!cycleParam && (
                <>
                  <button
                    type="button"
                    className={`module-filter-btn ${!filtreCycleAppel ? 'active' : ''}`}
                    onClick={() => setFiltreCycleAppel('')}
                  >
                    Tous les cycles
                  </button>
                  {cyclesActifsValides.map((c) => (
                    <button
                      key={c.cycle}
                      type="button"
                      className={`module-filter-btn ${filtreCycleAppel === c.cycle ? 'active' : ''}`}
                      onClick={() => setFiltreCycleAppel(c.cycle)}
                    >
                      {CYCLE_LABELS[c.cycle]}
                    </button>
                  ))}
                </>
              )}
              <select
                className="ap-input"
                style={{ maxWidth: 150, padding: '0.4rem 0.6rem', fontSize: '0.8125rem' }}
                value={filtreStatutAppel}
                onChange={(e) => setFiltreStatutAppel(e.target.value)}
                aria-label="Filtrer par statut"
              >
                <option value="">Tous les statuts</option>
                <option value="ouvert">Ouvert</option>
                <option value="brouillon">Brouillon</option>
                <option value="termine">Terminé</option>
                <option value="annule">Annulé</option>
              </select>
            </div>
          </div>

          {/* Liste des appels */}
          {chargementAppels ? (
            <div className="ap-card" style={{ padding: '3.5rem', display: 'flex', justifyContent: 'center' }}>
              <Loader mode="inline" label="Chargement des appels à candidature…" />
            </div>
          ) : filteredAppels.length === 0 ? (
            <div className="ap-card ap-empty" style={{ padding: '3.5rem', textAlign: 'center' }}>
              <Megaphone size={40} style={{ color: 'var(--sg-text-muted)', margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px', fontWeight: 600 }}>Aucun appel à candidature</h3>
              <p style={{ margin: '0 0 16px', color: 'var(--sg-text-muted)', fontSize: '0.9rem' }}>
                Créez une nouvelle campagne de recrutement selon les règles de votre cycle.
              </p>
              <button type="button" onClick={handleOuvrirCreationAppel} className="ap-btn ap-btn--sm">
                <Plus size={16} /> Lancer le premier appel
              </button>
            </div>
          ) : (
            <div className="appel-grid">
              {filteredAppels.map((appel) => {
                const criteres = Array.isArray(appel.criteres_eligibilite) ? appel.criteres_eligibilite : []
                const pieces = Array.isArray(appel.pieces_a_fournir) ? appel.pieces_a_fournir : []
                const critereAdmission = criteres.find((c) => c.type === 'type_inscription')

                return (
                  <div key={appel.uuid} className="appel-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span className="ap-badge ap-badge--info" style={{ textTransform: 'capitalize', fontWeight: 700 }}>
                            {CYCLE_LABELS[appel.cycle] ?? appel.cycle}
                          </span>
                          <span className={`status-pill status-pill--${appel.statut}`}>
                            {appel.statut}
                          </span>
                        </div>
                        <h3 style={{ margin: '4px 0 2px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {appel.titre}
                        </h3>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {appel.description ? (
                        <p style={{ margin: '0 0 8px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {appel.description}
                        </p>
                      ) : null}

                      {critereAdmission && (
                        <div style={{ background: 'var(--sg-surface-2, #f8fafc)', padding: '6px 10px', borderRadius: 6, marginBottom: 8, fontSize: '0.82rem' }}>
                          <strong>Modalité : </strong>
                          <span style={{ textTransform: 'capitalize' }}>{critereAdmission.mode || 'Libre'}</span>
                          {critereAdmission.matieres_composees && critereAdmission.matieres_composees.length > 0 && (
                            <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              <span style={{ fontWeight: 600 }}>Épreuves :</span>
                              {critereAdmission.matieres_composees.map((m, idx) => (
                                <span key={idx} className="ap-badge ap-badge--neutral" style={{ fontSize: '0.72rem' }}>
                                  {m}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.8rem', color: 'var(--sg-text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={13} color="var(--primary, #047857)" />
                          <span>Du : <strong>{formaterDateHeure(appel.date_debut)}</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={13} color="#b91c1c" />
                          <span>Au : <strong>{formaterDateHeure(appel.date_fin)}</strong></span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-color, #e5e7eb)' }}>
                        <div>
                          {appel.est_payant ? (
                            <span style={{ fontWeight: 700, color: 'var(--primary, #047857)', fontSize: '0.88rem' }}>
                              {Number(appel.frais_dossier).toLocaleString('fr-FR')} FCFA
                            </span>
                          ) : (
                            <span className="ap-badge ap-badge--success" style={{ fontSize: '0.75rem' }}>
                              Gratuit
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem' }}>
                          <FileText size={14} />
                          <span>{pieces.length} pièce(s) requise(s)</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 'auto', paddingTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleEditerAppel(appel)}
                        className="btn-action"
                        style={{ background: 'var(--sg-surface-2, #f1f5f9)', color: 'var(--text-primary)' }}
                        title="Modifier cet appel"
                      >
                        <Edit2 size={14} /> Modifier
                      </button>

                      {appel.statut !== 'termine' && (
                        <button
                          type="button"
                          onClick={() => handleTerminerAppel(appel.uuid)}
                          className="btn-action"
                          style={{ background: '#fef3c7', color: '#b45309' }}
                          title="Clôturer l'appel"
                        >
                          <StopCircle size={14} /> Clôturer
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSupprimerAppel(appel.uuid)}
                        className="btn-action btn-action--danger"
                        title="Supprimer définitivement"
                      >
                        <Trash2 size={14} /> Supprimer
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    // Vue 2 : Dossiers de candidature
    if (section === 'candidatures') {
      return (
        <div>
          <div className="ap-page-head">
            <div>
              <h2 className="ap-page-title">
                Dossiers de candidature {cycleParam ? `• ${CYCLE_LABELS[cycleParam]}` : ''}
              </h2>
              <p className="ap-page-sub">
                Instruction des dossiers déposés et validation des admissions
              </p>
            </div>
            <button
              type="button"
              onClick={chargerCandidatures}
              className="ap-btn ap-btn--ghost ap-btn--sm"
              title="Actualiser les candidatures"
            >
              <RefreshCw size={15} className={chargementCandidatures ? 'spin' : ''} /> Actualiser
            </button>
          </div>

          {erreurCandidatures && (
            <div className="ap-alert ap-alert--danger" style={{ marginBottom: 16 }}>
              {erreurCandidatures}
            </div>
          )}

          <div className="module-toolbar">
            <div className="module-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Rechercher par nom, prénom ou identifiant..."
                value={rechercheCandidature}
                onChange={(e) => setRechercheCandidature(e.target.value)}
              />
            </div>
            <div className="module-filters">
              {['tous', 'soumise', 'validee', 'rejetee'].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`module-filter-btn ${filtreStatutCandidature === st ? 'active' : ''}`}
                  onClick={() => setFiltreStatutCandidature(st)}
                >
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="ap-card ap-card--flush">
            {chargementCandidatures ? (
              <div style={{ padding: '3.5rem', display: 'flex', justifyContent: 'center' }}>
                <Loader mode="inline" label="Chargement des candidatures…" />
              </div>
            ) : filteredCandidatures.length === 0 ? (
              <div className="ap-empty" style={{ padding: '3rem', textAlign: 'center' }}>
                Aucune candidature trouvée.
              </div>
            ) : (
              <div className="module-table-wrap">
                <table className="ap-table" style={{ minWidth: 600 }}>
                  <thead>
                    <tr>
                      <th>Candidat</th>
                      <th>Classe / Formation visée</th>
                      <th>Contact parent</th>
                      <th>Statut</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidatures.map((c) => (
                      <tr key={c.uuid ?? c.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{c.nom} {c.prenom}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--sg-text-muted)' }}>
                            {c.sexe === 'M' ? 'Masculin' : 'Féminin'} • Né(e) le {c.date_naissance}
                          </div>
                        </td>
                        <td>{c.classe_visee?.nom ?? c.classe_nom ?? c.classe_visee_id ?? 'Non assignée'}</td>
                        <td>
                          <div>{c.parent_nom ?? c.nom_parent ?? '-'}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--sg-text-muted)' }}>{c.parent_telephone ?? c.telephone_parent ?? '-'}</div>
                        </td>
                        <td>
                          <span className={`status-pill status-pill--${c.statut}`}>
                            {c.statut}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {c.statut === 'soumise' || c.statut === 'en_attente' ? (
                            <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={() => handleValiderCandidature(c.uuid)}
                                disabled={actionLoadingCandidature === c.uuid}
                                className="btn-action btn-action--success"
                                title="Valider l'admission"
                              >
                                <CheckCircle size={15} /> Valider
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejeterCandidature(c.uuid)}
                                disabled={actionLoadingCandidature === c.uuid}
                                className="btn-action btn-action--danger"
                                title="Rejeter"
                              >
                                <XCircle size={15} /> Rejeter
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--sg-text-muted)' }}>Dossier traité</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )
    }

    // Vue 3 : Vue d'ensemble (Dashboard Inscriptions)
    return (
      <VueEnsembleInscription
        anneeActive={anneeActive}
        cyclesActifsValides={cyclesActifsValides}
        cyclesAutorises={cyclesAutorises}
        appels={appels}
        candidatures={candidatures}
        base={base}
        handleOuvrirCreationAppel={handleOuvrirCreationAppel}
      />
    )
  }

  return (
    <ModuleLayout titre="Inscriptions" icone={UserCheck} nav={navInscription}>
      <div className="ap cfg">
        {/* Fil d'ariane + bandeau année : comme Scolarité */}
        {!estVueEnsemble && (
          <>
            <nav className="ap-bread" aria-label="Fil d'ariane">{migettes}</nav>

            <div className="cfg-annee-bandeau" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarDays size={14} aria-hidden="true" />
                <span>Année :</span>
                <strong>{anneeActive?.libelle ?? '-'}</strong>
                {anneeActive && (
                  <span className={`cfg-statut-badge ${anneeActive.statut}`}>
                    {LIBELLES_STATUT[anneeActive.statut] ?? anneeActive.statut}
                  </span>
                )}
              </div>
              {toutesAnnees.length > 1 && (
                <select
                  className="ap-input"
                  style={{ maxWidth: 160, fontSize: '0.82rem', padding: '4px 8px', height: 'auto' }}
                  value={anneeActive?.uuid ?? ''}
                  onChange={(e) => {
                    const a = toutesAnnees.find((x) => x.uuid === e.target.value)
                    if (a) changerAnnee(a)
                  }}
                  aria-label="Choisir une année académique"
                >
                  {toutesAnnees.map((a) => (
                    <option key={a.uuid} value={a.uuid}>
                      {a.libelle} {a.statut === 'en_cours' ? '(En cours)' : a.statut === 'a_venir' ? '(À venir)' : '(Terminée)'}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </>
        )}

        {renduContenu()}
      </div>

      {/* Modale institutionnelle de création / édition d'appel */}
      <ModalAppelCandidature
        ouvert={modalAppelOuverte}
        onFermer={() => setModalAppelOuverte(false)}
        onEnregistrer={handleEnregistrerAppel}
        appelInitial={appelEnEdition}
        enCours={actionEnCoursAppel}
        cyclesDisponibles={cyclesDisponiblesIds}
        anneeActive={anneeActive}
      />
    </ModuleLayout>
  )
}

/* ── Vue d'ensemble du module Inscriptions ── */
function VueEnsembleInscription({
  anneeActive,
  cyclesActifsValides,
  cyclesAutorises,
  appels,
  candidatures,
  base,
  handleOuvrirCreationAppel,
}) {
  const appelsOuverts = appels.filter((a) => a.statut === 'ouvert').length
  const candidaturesAttente = candidatures.filter((c) => c.statut === 'soumise' || c.statut === 'en_attente').length
  const candidaturesValidees = candidatures.filter((c) => c.statut === 'validee' || c.statut === 'admis').length

  const inactifs = cyclesAutorises.filter((id) => !cyclesActifsValides.some((c) => c.cycle === id))

  return (
    <>
      {/* Bandeau accueil institutionnel */}
      <section className="sc-welcome">
        <div>
          <h2 className="sc-welcome-title">Inscriptions & Admissions</h2>
          <p className="sc-welcome-sub">
            {anneeActive
              ? `Campagnes de recrutement pour l'année académique ${anneeActive.libelle}`
              : 'Gérez vos campagnes de recrutement et dossiers de candidature'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ap-btn ap-btn--ghost ap-btn--sm"
          >
            <RefreshCw size={14} /> Actualiser
          </button>
          <button
            type="button"
            onClick={handleOuvrirCreationAppel}
            className="ap-btn ap-btn--gold ap-btn--sm"
          >
            <Plus size={16} /> Lancer un appel
          </button>
        </div>
      </section>

      {/* Statistiques clés */}
      <div className="sc-stats">
        <div className="sc-stat sc-stat--success">
          <div className="sc-stat-icon"><Megaphone size={20} aria-hidden="true" /></div>
          <div>
            <p className="sc-stat-val">{appels.length}</p>
            <p className="sc-stat-lbl">Campagnes au total</p>
          </div>
        </div>
        <div className="sc-stat sc-stat--info">
          <div className="sc-stat-icon"><CheckCircle2 size={20} aria-hidden="true" /></div>
          <div>
            <p className="sc-stat-val">{appelsOuverts}</p>
            <p className="sc-stat-lbl">Campagnes ouvertes</p>
          </div>
        </div>
        <div className="sc-stat sc-stat--warn">
          <div className="sc-stat-icon"><Users size={20} aria-hidden="true" /></div>
          <div>
            <p className="sc-stat-val">{candidatures.length}</p>
            <p className="sc-stat-lbl">Candidatures reçues</p>
          </div>
        </div>
        <div className="sc-stat sc-stat--danger">
          <div className="sc-stat-icon"><Clock size={20} aria-hidden="true" /></div>
          <div>
            <p className="sc-stat-val">{candidaturesAttente}</p>
            <p className="sc-stat-lbl">En attente d'instruction</p>
          </div>
        </div>
      </div>

      {/* Alertes d'information */}
      {!anneeActive && (
        <div className="sc-info">
          <AlertTriangle size={17} aria-hidden="true" />
          <div>
            <strong>Aucune année académique active</strong>
            <p>Veuillez configurer ou activer une année dans Scolarité avant de lancer des appels.</p>
          </div>
        </div>
      )}

      {cyclesActifsValides.length === 0 && (
        <div className="sc-info">
          <AlertTriangle size={17} aria-hidden="true" />
          <div>
            <strong>Aucun cycle actif pour cette année</strong>
            <p>
              Rendez-vous dans <Link to="/scolarite?section=cycles">Scolarité • Activer des cycles</Link> pour activer les cycles de votre établissement.
            </p>
          </div>
        </div>
      )}

      {/* Cycles actifs - Campagnes par cycle */}
      {cyclesActifsValides.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h3 className="sc-section-title">Campagnes par cycle d'enseignement</h3>
          <div className="sc-grid">
            {cyclesActifsValides.map((c) => {
              const Icon = CYCLE_ICONES[c.cycle] ?? School
              const nbAppelsCycle = appels.filter((a) => a.cycle === c.cycle).length
              return (
                <Link
                  key={c.uuid}
                  to={`${base}?cycle=${c.cycle}&section=appels`}
                  className="sc-card"
                >
                  <div className="sc-card-icon"><Icon size={26} aria-hidden="true" /></div>
                  <p className="sc-card-label">{CYCLE_LABELS[c.cycle]}</p>
                  <p className="sc-card-desc">
                    {nbAppelsCycle > 0 ? `${nbAppelsCycle} appel(s) configuré(s)` : 'Aucun appel actif'}
                  </p>
                  <ChevronRight size={15} className="sc-card-arrow" aria-hidden="true" />
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Gestion globale */}
      <section style={{ marginBottom: 28 }}>
        <h3 className="sc-section-title">Gestion des recrutements</h3>
        <div className="sc-grid">
          <Link to={`${base}?section=appels`} className="sc-card">
            <div className="sc-card-icon"><Megaphone size={26} aria-hidden="true" /></div>
            <p className="sc-card-label">Appels à candidatures</p>
            <p className="sc-card-desc">Consulter, créer et paramétrer les appels</p>
            <ChevronRight size={15} className="sc-card-arrow" aria-hidden="true" />
          </Link>
          <Link to={`${base}?section=candidatures`} className="sc-card">
            <div className="sc-card-icon"><Users size={26} aria-hidden="true" /></div>
            <p className="sc-card-label">Dossiers de candidature</p>
            <p className="sc-card-desc">Examiner, valider ou rejeter les postulants</p>
            <ChevronRight size={15} className="sc-card-arrow" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  )
}
