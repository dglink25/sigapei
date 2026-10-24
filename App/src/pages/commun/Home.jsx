import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Lock,
  Menu,
  MonitorPlay,
  School,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import './Home.css'

const MODULES = [
  {
    id: 'admissions',
    n: '01',
    icon: UserPlus,
    tag: 'Admissions',
    titre: 'Inscriptions & Admissions',
    resume: 'Dossiers d’entrée en ligne et matricule unique',
    desc: 'Simplifiez l’accueil des nouveaux élèves. Les familles déposent leur dossier en ligne, votre secrétariat valide les pièces justificatives et le système attribue automatiquement le matricule officiel de chaque apprenant.',
    points: [
      'Formulaire d’inscription clair et accessible aux familles',
      'Contrôle rapide des pièces d’état civil et antécédents scolaires',
      'Génération automatique d’un matricule scolaire unique et définitif',
    ],
    exempleTitre: 'Parcours d’admission type',
    etapes: [
      'Dépôt du dossier par la famille',
      'Contrôle des pièces par le secrétariat',
      'Validation & matricule officiel attribué',
    ],
  },
  {
    id: 'scolarite',
    n: '02',
    icon: GraduationCap,
    tag: 'Scolarité',
    titre: 'Scolarité & Classes',
    resume: 'Gestion des effectifs, filières et livrets scolaires',
    desc: 'Organisez vos classes, séries et filières en quelques clics. Suivez le parcours de chaque élève d’une année sur l’autre et éditez instantanément les attestations et certificats de scolarité officiels.',
    points: [
      'Constitution facile des classes et répartition par filière',
      'Historique scolaire continu conservé tout au long de la scolarité',
      'Édition instantanée des certificats et listes officielles',
    ],
    exempleTitre: 'Organisation scolaire',
    etapes: [
      'Affectation dans la classe',
      'Suivi régulier du livret scolaire',
      'Édition des certificats en 1 clic',
    ],
  },
  {
    id: 'evaluations',
    n: '03',
    icon: ClipboardCheck,
    tag: 'Évaluations',
    titre: 'Notes & Bulletins',
    resume: 'Saisie rapide, moyennes automatiques et bulletins officiels',
    desc: 'Les enseignants saisissent les notes de leurs devoirs et examens. Le système applique vos coefficients réglementaires, calcule les moyennes et génère des bulletins clairs, prêts à imprimer ou à télécharger.',
    points: [
      'Saisie intuitive des évaluations par les professeurs habilités',
      'Calcul automatique des moyennes pondérées, rangs et mentions',
      'Bulletins trimestriels et semestriels conformes aux normes',
    ],
    exempleTitre: 'Cycle d’évaluation',
    etapes: [
      'Saisie des contrôles par le professeur',
      'Calcul instantané des moyennes',
      'Génération du bulletin officiel certifié',
    ],
  },
  {
    id: 'vie-scolaire',
    n: '04',
    icon: School,
    tag: 'Présences',
    titre: 'Vie Scolaire & Présences',
    resume: 'Appel en classe en 1 clic et alerte immédiate des absences',
    desc: 'Faites l’appel en début d’heure depuis un ordinateur ou un smartphone. Enregistrez les retards, suivez les motifs d’absence et informez directement les familles pour garantir la sécurité et l’assiduité.',
    points: [
      'Feuille d’appel numérique simple pour chaque séance de cours',
      'Enregistrement et classement rapide des justificatifs d’absence',
      'Communication directe avec les parents en cas d’imprévu',
    ],
    exempleTitre: 'Vie scolaire quotidienne',
    etapes: [
      'Pointage des présences en début de cours',
      'Vérification des justificatifs par la vie scolaire',
      'Information transmise aux parents',
    ],
  },
  {
    id: 'elearning',
    n: '05',
    icon: MonitorPlay,
    tag: 'Pédagogie',
    titre: 'E-Learning & Devoirs',
    resume: 'Supports de cours, devoirs à rendre et quiz interactifs',
    desc: 'Prolongez l’enseignement hors de la classe. Les professeurs partagent cours et documents de révision, fixent les devoirs avec date limite et créent des quiz d’entraînement autocorrigés pour les élèves.',
    points: [
      'Mise à disposition de documents et supports classés par matière',
      'Cahier de devoirs numérique avec calendrier des remises',
      'Quiz interactifs avec correction immédiate pour s’entraîner',
    ],
    exempleTitre: 'Continuité pédagogique',
    etapes: [
      'Partage du cours et consignes',
      'Dépôt du devoir par l’élève',
      'Correction et retour personnalisé',
    ],
  },
  {
    id: 'personnel',
    n: '06',
    icon: Users,
    tag: 'Personnel',
    titre: 'Personnel & Enseignants',
    resume: 'Affectations classe-matière et gestion des accès',
    desc: 'Tenez à jour le registre de vos enseignants et agents administratifs. Affectez chaque professeur à ses matières et ses classes pour verrouiller automatiquement les droits de saisie et protéger les données.',
    points: [
      'Dossier administratif complet pour chaque intervenant',
      'Affectation précise des professeurs par classe et par matière',
      'Droits de saisie strictement réservés aux enseignants concernés',
    ],
    exempleTitre: 'Gestion des équipes',
    etapes: [
      'Fiche enseignant créée',
      'Attribution des classes et matières',
      'Droits d’accès activés en toute sécurité',
    ],
  },
]

const ROLES = [
  {
    titre: 'Directeurs & Administration',
    role: 'Pilotage & Supervision',
    icon: Building2,
    badge: 'Direction générale',
    desc: 'Pilotez l’établissement en toute visibilité : suivez les effectifs, contrôlez les ouvertures de classes, validez les bulletins de fin de trimestre et éditez tous les documents officiels.',
    points: [
      'Tableau de bord des inscriptions et effectifs par classe',
      'Validation officielle et clôture des périodes de bulletins',
      'Édition rapide des certificats, attestations et bilans de scolarité',
    ],
  },
  {
    titre: 'Corps Enseignant',
    role: 'Pratique pédagogique',
    icon: BookOpen,
    badge: 'Enseignement & Notes',
    desc: 'Concentrez-vous sur l’enseignement : faites l’appel en début de cours en quelques secondes, enregistrez vos notes selon vos coefficients et partagez vos devoirs facilement.',
    points: [
      'Appel numérique fluide au début de chaque heure de cours',
      'Carnet de notes clair avec calcul automatique des moyennes',
      'Partage simple des cours, fiches de travail et devoirs',
    ],
  },
  {
    titre: 'Vie Scolaire & Éducation',
    role: 'Assiduité & Climat scolaire',
    icon: School,
    badge: 'Vie scolaire',
    desc: 'Suivez la présence des élèves heure par heure, enregistrez les retards, vérifiez les justificatifs et maintenez un lien de confiance fluide avec les familles.',
    points: [
      'Suivi en direct des absences signalées par les enseignants',
      'Gestion claire des justificatifs médicaux et billets de retard',
      'Alertes transmises aux responsables légaux en cas de besoin',
    ],
  },
  {
    titre: 'Élèves & Parents d’élèves',
    role: 'Suivi du cursus & Transparence',
    icon: ShieldCheck,
    badge: 'Espace Famille',
    desc: 'Accédez à un portail clair depuis n’importe quel téléphone ou ordinateur pour suivre la scolarité : consultez les notes, les devoirs à faire et les livrets officiels.',
    points: [
      'Consultation en direct des notes, moyennes et classements',
      'Cahier de texte à jour pour ne rien manquer des devoirs',
      'Téléchargement sécurisé des bulletins trimestriels officiels',
    ],
  },
]

const ETAPES_DEPLOYEMENT = [
  {
    num: '01',
    delai: 'Étape 1',
    titre: 'Demande en ligne',
    desc: 'Remplissez le formulaire d’inscription en 2 minutes avec les informations de votre école.',
  },
  {
    num: '02',
    delai: 'Étape 2',
    titre: 'Configuration sur-mesure',
    desc: 'Notre équipe configure vos cycles, vos filières et vos barèmes de notation officiels.',
  },
  {
    num: '03',
    delai: 'Étape 3',
    titre: 'Import de vos données',
    desc: 'Intégrez facilement vos listes d’élèves et d’enseignants depuis vos fichiers Excel.',
  },
  {
    num: '04',
    delai: 'Étape 4',
    titre: 'Démarrage immédiat',
    desc: 'Vos équipes reçoivent leurs accès sécurisés et démarrent avec un outil prêt à l’emploi.',
  },
]

export default function Home() {
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [selectedModule, setSelectedModule] = useState(0)

  const modActif = MODULES[selectedModule] || MODULES[0]
  const ModIcon = modActif.icon

  useEffect(() => {
    const sectionIds = ['modules', 'gouvernance', 'adhesion']
    const handleScroll = () => {
      const isAtBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 140
      if (isAtBottom) {
        setActiveSection('adhesion')
        return
      }

      let current = ''
      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= 200 && rect.bottom >= 100) {
            current = id
            break
          }
        }
      }
      setActiveSection(current)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = (e, id) => {
    e.preventDefault()
    setMenuOuvert(false)
    setActiveSection(id)
    const el = document.getElementById(id)
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 68
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  return (
    <div className="sg-page">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER PLEINE LARGEUR & FLUIDE
      ───────────────────────────────────────────────────────────── */}
      <header className="sg-header">
        <div className="sg-wrap sg-wrap-header sg-header-inner">
          <a href="/" className="sg-brand" aria-label="SIGAPEI - Accueil">
            <img
              src="/images/sigapei-logo.png"
              alt="Logo SIGAPEI"
              className="sg-brand-logo"
            />
            <div className="sg-brand-text">
              <span className="sg-brand-name">SIGAPEI</span>
              <span className="sg-brand-caption">Gestion scolaire</span>
            </div>
          </a>

          <nav className="sg-nav" aria-label="Navigation principale">
            <a
              href="#modules"
              onClick={(e) => scrollTo(e, 'modules')}
              className={`sg-nav-link ${activeSection === 'modules' ? 'sg-nav-link-active' : ''}`}
            >
              Modules
            </a>
            <a
              href="#gouvernance"
              onClick={(e) => scrollTo(e, 'gouvernance')}
              className={`sg-nav-link ${activeSection === 'gouvernance' ? 'sg-nav-link-active' : ''}`}
            >
              Pour qui ?
            </a>
            <a
              href="#adhesion"
              onClick={(e) => scrollTo(e, 'adhesion')}
              className={`sg-nav-link ${activeSection === 'adhesion' ? 'sg-nav-link-active' : ''}`}
            >
              Comment démarrer
            </a>
          </nav>

          <div className="sg-header-actions">
            <a href="/login" className="sg-btn sg-btn-subtle">
              <Lock size={14} />
              Connexion
            </a>
            <a href="/demande" className="sg-btn sg-btn-primary">
              Inscrire un établissement
              <ArrowRight size={15} />
            </a>
          </div>

          <button
            type="button"
            className="sg-burger"
            onClick={() => setMenuOuvert(!menuOuvert)}
            aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOuvert}
          >
            {menuOuvert ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Menu mobile */}
        {menuOuvert && (
          <div className="sg-mobile-drawer">
            <nav className="sg-mobile-nav" aria-label="Menu mobile">
              <a
                href="#modules"
                onClick={(e) => scrollTo(e, 'modules')}
                className={activeSection === 'modules' ? 'sg-mobile-link-active' : ''}
              >
                Modules
              </a>
              <a
                href="#gouvernance"
                onClick={(e) => scrollTo(e, 'gouvernance')}
                className={activeSection === 'gouvernance' ? 'sg-mobile-link-active' : ''}
              >
                Pour qui ?
              </a>
              <a
                href="#adhesion"
                onClick={(e) => scrollTo(e, 'adhesion')}
                className={activeSection === 'adhesion' ? 'sg-mobile-link-active' : ''}
              >
                Comment démarrer
              </a>
              <div className="sg-mobile-cta-group">
                <a href="/login" onClick={() => setMenuOuvert(false)} className="sg-btn sg-btn-outline sg-btn-block">
                  <Lock size={15} />
                  Espace Connexion
                </a>
                <a href="/demande" onClick={() => setMenuOuvert(false)} className="sg-btn sg-btn-primary sg-btn-block">
                  Inscrire un établissement
                  <ArrowRight size={16} />
                </a>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="sg-main">
        {/* ─────────────────────────────────────────────────────────────
            2. HERO SECTION : MODERNE, CLAIR ET HUMAIN
        ───────────────────────────────────────────────────────────── */}
        <section className="sg-hero">
          <div className="sg-wrap sg-wrap-hero sg-hero-grid">
            <div className="sg-hero-editorial">
              <div className="sg-kicker">
                <span className="sg-kicker-dot" aria-hidden="true" />
                <span className="sg-kicker-text">Plateforme de gestion scolaire</span>
              </div>

              <h1 className="sg-hero-title">
                La gestion de votre école,{' '}
                <span className="sg-text-green">enfin simple et fluide</span>.
              </h1>

              <p className="sg-hero-subtitle">
                SIGAPEI simplifie le quotidien de vos équipes : inscriptions, scolarité,
                notes, présences et cours en ligne. Un outil moderne, intuitif et conforme
                aux normes éducatives, pensé pour faire gagner du temps à tous.
              </p>

              <div className="sg-hero-actions">
                <a href="/demande" className="sg-btn sg-btn-gold sg-btn-hero">
                  Inscrire mon établissement
                  <ArrowRight size={16} />
                </a>
                <a href="/login" className="sg-btn sg-btn-outline sg-btn-hero">
                  <Lock size={15} />
                  Espace Connexion
                </a>
              </div>

              <div className="sg-hero-credentials">
                <div className="sg-cred-item">
                  <ShieldCheck size={15} className="sg-icon-green" />
                  <span>Primaire, Secondaire & Supérieur</span>
                </div>
                <div className="sg-cred-sep" aria-hidden="true" />
                <div className="sg-cred-item">
                  <Award size={15} className="sg-icon-gold" />
                  <span>Bulletins & moyennes certifiés</span>
                </div>
                <div className="sg-cred-sep" aria-hidden="true" />
                <div className="sg-cred-item">
                  <Lock size={14} className="sg-icon-green" />
                  <span>Données scolaires protégées</span>
                </div>
              </div>
            </div>

            {/* Aperçu du produit */}
            <div className="sg-hero-visual-wrapper">
              <div className="sg-app-frame">
                <div className="sg-app-bar">
                  <div className="sg-bar-meta">
                    <span className="sg-bar-org">Établissement Scolaire</span>
                    <span className="sg-bar-sep">/</span>
                    <span className="sg-bar-year">Année en cours</span>
                  </div>
                  <div className="sg-bar-status">
                    <span className="sg-status-indicator" />
                    <span>Plateforme active</span>
                  </div>
                </div>

                <div className="sg-app-screen">
                  <img
                    src="/images/dashboard-preview.jpg"
                    alt="Tableau de bord SIGAPEI"
                    className="sg-preview-image"
                    loading="eager"
                  />
                </div>

                <div className="sg-app-legend">
                  <span>Direction</span>
                  <span className="sg-legend-sep">•</span>
                  <span>Enseignants</span>
                  <span className="sg-legend-sep">•</span>
                  <span>Vie Scolaire</span>
                  <span className="sg-legend-sep">•</span>
                  <span>Parents</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            3. BANDEAU DE VALEUR (CONCRET & COMPRÉHENSIBLE EN 5 SECONDES)
        ───────────────────────────────────────────────────────────── */}
        <section className="sg-reperes-strip">
          <div className="sg-wrap sg-wrap-reperes sg-reperes-grid">
            <div className="sg-repere-item">
              <div className="sg-repere-icon-box">
                <CheckCircle2 size={17} className="sg-icon-green" />
              </div>
              <div>
                <h4 className="sg-repere-title">Zéro double saisie</h4>
                <p className="sg-repere-desc">Les inscriptions alimentent directement les classes, les listes d'appel et les livrets.</p>
              </div>
            </div>

            <div className="sg-repere-item">
              <div className="sg-repere-icon-box">
                <ClipboardCheck size={17} className="sg-icon-green" />
              </div>
              <div>
                <h4 className="sg-repere-title">Bulletins en 1 clic</h4>
                <p className="sg-repere-desc">Saisie des notes par les professeurs, calcul automatique des moyennes pondérées et rangs.</p>
              </div>
            </div>

            <div className="sg-repere-item">
              <div className="sg-repere-icon-box">
                <School size={17} className="sg-icon-green" />
              </div>
              <div>
                <h4 className="sg-repere-title">Suivi des présences</h4>
                <p className="sg-repere-desc">Pointage de l’appel en classe et notification immédiate des absences aux parents d’élèves.</p>
              </div>
            </div>

            <div className="sg-repere-item">
              <div className="sg-repere-icon-box">
                <ShieldCheck size={17} className="sg-icon-green" />
              </div>
              <div>
                <h4 className="sg-repere-title">Espace sécurisé</h4>
                <p className="sg-repere-desc">Chaque établissement dispose d’une base de données dédiée, protégée et confidentielle.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            4. LES 6 MODULES DE SIGAPEI (CLARITÉ TOTALE & NAVIGATION FLUIDE)
        ───────────────────────────────────────────────────────────── */}
        <section className="sg-section sg-section-modules" id="modules">
          <div className="sg-wrap sg-wrap-modules">
            <div className="sg-section-header-split">
              <div className="sg-header-left">
                <span className="sg-section-kicker">La suite logicielle complète</span>
                <h2 className="sg-section-title">
                  Tous les outils nécessaires pour gérer votre école.
                </h2>
              </div>
              <div className="sg-header-right">
                <p className="sg-section-lead">
                  Six modules interconnectés pour gérer l’établissement de bout en bout,
                  sans ressaisie d’informations et avec une prise en main immédiate.
                </p>
              </div>
            </div>

            {/* Explorer des 6 modules */}
            <div className="sg-mod-explorer">
              {/* Sélecteur des 6 modules */}
              <div className="sg-mod-tabs" role="tablist" aria-label="Modules du logiciel">
                {MODULES.map((m, idx) => {
                  const isSelected = selectedModule === idx
                  const Icon = m.icon
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setSelectedModule(idx)}
                      className={`sg-mod-tab ${isSelected ? 'sg-mod-tab-active' : ''}`}
                    >
                      <div className="sg-mod-tab-icon">
                        <Icon size={17} />
                      </div>
                      <div className="sg-mod-tab-info">
                        <div className="sg-mod-tab-line">
                          <span className="sg-mod-tab-num">{m.n}</span>
                          <span className="sg-mod-tab-title">{m.titre}</span>
                        </div>
                        <p className="sg-mod-tab-summary">{m.resume}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Présentation détaillée du module sélectionné */}
              <div className="sg-mod-panel" key={modActif.id}>
                <div className="sg-mod-panel-body">
                  <div className="sg-mod-panel-badge">
                    <ModIcon size={15} />
                    <span>Module {modActif.n} · {modActif.tag}</span>
                  </div>

                  <h3 className="sg-mod-panel-title">{modActif.titre}</h3>
                  <p className="sg-mod-panel-desc">{modActif.desc}</p>

                  <div className="sg-mod-panel-points">
                    <span className="sg-mod-points-label">Fonctionnalités clés :</span>
                    <ul>
                      {modActif.points.map((pt, i) => (
                        <li key={i}>
                          <CheckCircle2 size={15} className="sg-icon-green" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="sg-mod-panel-action">
                    <a href="/demande" className="sg-btn sg-btn-primary">
                      Demander une démonstration
                      <ArrowRight size={15} />
                    </a>
                  </div>
                </div>

                {/* Carte de déroulement concret (En pratique) */}
                <div className="sg-mod-panel-aside">
                  <div className="sg-workflow-card">
                    <div className="sg-workflow-head">
                      <span className="sg-workflow-tag">{modActif.exempleTitre}</span>
                      <span className="sg-workflow-sub">En pratique</span>
                    </div>

                    <div className="sg-workflow-steps">
                      {modActif.etapes.map((step, i) => (
                        <div key={i} className="sg-workflow-step">
                          <div className="sg-workflow-bullet">{i + 1}</div>
                          <div className="sg-workflow-text">
                            <strong>Étape {i + 1}</strong>
                            <span>{step}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="sg-workflow-footer">
                      <ShieldCheck size={14} className="sg-icon-green" />
                      <span>Données synchronisées automatiquement sans double saisie</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            5. GOUVERNANCE & RÔLES : PENSÉ POUR CHAQUE PROFIL
        ───────────────────────────────────────────────────────────── */}
        <section className="sg-section sg-section-gouvernance" id="gouvernance">
          <div className="sg-wrap sg-wrap-gouvernance">
            <div className="sg-section-header-split">
              <div className="sg-header-left">
                <span className="sg-section-kicker">Pour toute l’équipe éducative</span>
                <h2 className="sg-section-title">
                  Un espace pensé pour les besoins de chaque métier.
                </h2>
              </div>
              <div className="sg-header-right">
                <p className="sg-section-lead">
                  Directeurs, professeurs, surveillants ou parents d’élèves : chacun accède
                  à une interface dédiée avec les droits et informations qui le concernent.
                </p>
              </div>
            </div>

            {/* Grille des 4 profils utilisateurs (Architecture Persona) */}
            <div className="sg-persona-grid">
              {ROLES.map(({ titre, role, badge, icon: Icon, desc, points }) => (
                <div key={titre} className="sg-persona-card">
                  <div className="sg-persona-top">
                    <div className="sg-persona-icon-box">
                      <Icon size={20} />
                    </div>
                    <span className="sg-persona-badge">{badge}</span>
                  </div>

                  <div className="sg-persona-head">
                    <span className="sg-persona-role">{role}</span>
                    <h3 className="sg-persona-title">{titre}</h3>
                  </div>

                  <p className="sg-persona-desc">{desc}</p>

                  <div className="sg-persona-features">
                    <span className="sg-persona-features-label">Au quotidien :</span>
                    <ul className="sg-persona-points-list">
                      {points.map((pt, i) => (
                        <li key={i} className="sg-persona-point">
                          <CheckCircle2 size={14} className="sg-icon-green" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="sg-persona-footer">
                    <span className="sg-persona-footer-tag">Espace dédié & sécurisé</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            6. PROCÉDURE DE DÉPLOIEMENT (TIMELINE ÉLÉGANTE ET SIMPLE)
        ───────────────────────────────────────────────────────────── */}
        <section className="sg-section sg-section-timeline" id="adhesion">
          <div className="sg-wrap sg-wrap-timeline">
            <div className="sg-section-header-split">
              <div className="sg-header-left">
                <span className="sg-section-kicker">Mise en place simple</span>
                <h2 className="sg-section-title">
                  Comment démarrer avec SIGAPEI ?
                </h2>
              </div>
              <div className="sg-header-right">
                <p className="sg-section-lead">
                  Une démarche claire en 4 étapes rapides, accompagnée par notre équipe
                  pour garantir une transition fluide dans votre établissement.
                </p>
              </div>
            </div>

            {/* Timeline ordonnée épurée & compacte */}
            <div className="sg-timeline-wrapper">
              <div className="sg-timeline-track" aria-hidden="true" />

              <div className="sg-timeline-grid">
                {ETAPES_DEPLOYEMENT.map(({ num, delai, titre, desc }) => (
                  <div key={num} className="sg-timeline-item">
                    <div className="sg-timeline-node">
                      <span className="sg-timeline-num">{num}</span>
                    </div>

                    <div className="sg-timeline-card">
                      <span className="sg-timeline-badge">{delai}</span>
                      <h3 className="sg-timeline-card-title">{titre}</h3>
                      <p className="sg-timeline-card-desc">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions CTA post-timeline */}
            <div className="sg-cta-timeline-actions">
              <div className="sg-cta-actions">
                <a href="/demande" className="sg-btn sg-btn-gold sg-btn-lg">
                  Inscrire mon établissement
                  <ArrowRight size={17} />
                </a>
                <a href="/login" className="sg-btn sg-btn-outline sg-btn-lg">
                  <Lock size={15} />
                  Accès espace existant
                </a>
              </div>

              <span className="sg-cta-notice">
                Démarche dématérialisée ouverte pour écoles primaires, collèges, lycées et établissements d’enseignement supérieur.
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          7. FOOTER INSTITUTIONNEL PLEINE LARGEUR
      ───────────────────────────────────────────────────────────── */}
      <footer className="sg-footer">
        <div className="sg-wrap sg-wrap-footer">
          <div className="sg-footer-main">
            <div className="sg-footer-brand-col">
              <a href="/" className="sg-footer-brand-link" aria-label="SIGAPEI - Accueil">
                <img
                  src="/images/sigapei-logo.png"
                  alt="Logo SIGAPEI"
                  className="sg-footer-brand-logo"
                />
                <div className="sg-footer-brand-text">
                  <span className="sg-footer-brand-title">SIGAPEI</span>
                  <span className="sg-footer-brand-sub">Gestion scolaire</span>
                </div>
              </a>
              <p className="sg-footer-desc">
                Système d’Information de Gestion Administrative et Pédagogique des Écoles et Institutions.
                La solution complète pour la gestion scolaire unifiée, fiable et sécurisée.
              </p>
            </div>

            <div className="sg-footer-links-col">
              <h5>Navigation</h5>
              <ul>
                <li><a href="#modules" onClick={(e) => scrollTo(e, 'modules')}>Modules</a></li>
                <li><a href="#gouvernance" onClick={(e) => scrollTo(e, 'gouvernance')}>Pour qui ?</a></li>
                <li><a href="#adhesion" onClick={(e) => scrollTo(e, 'adhesion')}>Comment démarrer</a></li>
              </ul>
            </div>

            <div className="sg-footer-links-col">
              <h5>Portails d’accès</h5>
              <ul>
                <li><a href="/login">Espace Connexion</a></li>
                <li><a href="/demande">Inscrire un établissement</a></li>
                <li><a href="/securite">Sécurité & Confidentialité</a></li>
              </ul>
            </div>
          </div>

          <div className="sg-footer-bottom">
            <p>© {new Date().getFullYear()} SIGAPEI — Tous droits réservés.</p>
            <div className="sg-footer-chips">
              <span>Primaire</span>
              <span>Secondaire</span>
              <span>Supérieur</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
