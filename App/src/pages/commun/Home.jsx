import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  Lock,
  Menu,
  MonitorPlay,
  School,
  ShieldCheck,
  Sparkles,
  Users,
  UserPlus,
  X,
} from 'lucide-react'
import './Home.css'

const MODULES = [
  {
    n: '01',
    icon: UserPlus,
    tag: 'Admission',
    titre: 'Inscriptions & Admissions',
    texte:
      'Formulaire en ligne multi-étapes, dépôt dématérialisé des pièces d’identité et d’autorisation, validation hiérarchique et attribution automatique des matricules.',
    points: ['Circuit de validation dirigé', 'Contrôle des pièces justificatives', 'Notification aux familles'],
  },
  {
    n: '02',
    icon: GraduationCap,
    tag: 'Cursus',
    titre: 'Scolarité & Dossiers Élèves',
    texte:
      'Gestion unifiée des effectifs, composition des classes par filière et cycle, archivage sécurisé du dossier individuel et édition instantanée des attestations scolaires.',
    points: ['Fiches élèves exhaustives', 'Gestion des passages de classe', 'Historique scolaire complet'],
  },
  {
    n: '03',
    icon: ClipboardCheck,
    tag: 'Pédagogie',
    titre: 'Évaluations & Bulletins',
    texte:
      'Saisie rapide des notes par les professeurs, calcul automatisé des moyennes avec coefficients, validation par la direction et génération des livrets officiels.',
    points: ['Coefficients personnalisables', 'Bulletins de notes infalsifiables', 'Transmission directe aux parents'],
  },
  {
    n: '04',
    icon: School,
    tag: 'Discipline',
    titre: 'Vie Scolaire & Présences',
    texte:
      'Pointage numérique des absences et retards par heure de cours, registre des faits disciplinaires, convocations et alertes automatiques vers les tuteurs légaux.',
    points: ['Appel digitalisé en classe', 'Suivi disciplinaire rigoureux', 'Alertes retards & absences'],
  },
  {
    n: '05',
    icon: MonitorPlay,
    tag: 'E-Learning',
    titre: 'Plateforme E-Learning',
    texte:
      'Espace pédagogique multimédia : diffusion des supports de cours, assignation de devoirs avec politique de remise, quiz auto-corrigés et bibliothèque partagée.',
    points: ['Dépôt de cours & devoirs', 'Quiz et tests d’évaluation', 'Ressources documentaires'],
  },
  {
    n: '06',
    icon: Users,
    tag: 'Personnel',
    titre: 'Ressources Humaines',
    texte:
      'Registre du personnel enseignant et administratif, gestion des contrats, plannings de service, suivi des présences et affectations par classe et matière.',
    points: ['Affectations matières/classes', 'Dossiers du personnel', 'Suivi des heures d’enseignement'],
  },
]

const ROLES = [
  {
    titre: 'Direction & Administration',
    role: 'Pilotage global',
    desc: 'Visibilité totale sur les indicateurs de présence, les flux d’inscription, la trésorerie et la conformité administrative de chaque site.',
    icon: Building2,
  },
  {
    titre: 'Enseignants & Pédagogues',
    role: 'Outils du quotidien',
    desc: 'Saisie simplifiée des notes, appel numérique en classe, partage de supports de cours et communication avec l’équipe éducative.',
    icon: BookOpen,
  },
  {
    titre: 'Élèves & Responsables Légaux',
    role: 'Transparence & Suivi',
    desc: 'Consultation sécurisée des bulletins, alertes d’absences en direct, devoirs à rendre et relevés d’assiduité depuis tout terminal.',
    icon: ShieldCheck,
  },
]

export default function Home() {
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [activeSection, setActiveSection] = useState('')

  useEffect(() => {
    const sectionIds = ['modules', 'apercu', 'rejoindre']
    const handleScroll = () => {
      // Si l'utilisateur est en bas de page (zone CTA / Footer)
      const isAtBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 140)
      if (isAtBottom) {
        setActiveSection('rejoindre')
        return
      }

      let current = ''
      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (el) {
          const rect = el.getBoundingClientRect()
          // La section est active quand elle occupe le champ de vision principal
          if (rect.top <= 280 && rect.bottom >= 140) {
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
      const y = el.getBoundingClientRect().top + window.scrollY - 76
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  return (
    <div className="sg-page">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER ÉQUILIBRÉ & PROPORTIONNÉ
      ───────────────────────────────────────────────────────────── */}
      <header className="sg-header">
        <div className="sg-container sg-header-inner">
          <a href="/" className="sg-brand" aria-label="SIGAPEI - Accueil">
            <img
              src="/images/sigapei-logo.png"
              alt="Logo SIGAPEI"
              className="sg-brand-logo"
            />
            <span className="sg-brand-name">SIGAPEI</span>
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
              href="#apercu"
              onClick={(e) => scrollTo(e, 'apercu')}
              className={`sg-nav-link ${activeSection === 'apercu' ? 'sg-nav-link-active' : ''}`}
            >
              Aperçu & Rôles
            </a>
            <a
              href="#rejoindre"
              onClick={(e) => scrollTo(e, 'rejoindre')}
              className={`sg-nav-link ${activeSection === 'rejoindre' ? 'sg-nav-link-active' : ''}`}
            >
              Adhésion
            </a>
          </nav>

          <div className="sg-header-actions">
            <a href="/login" className="sg-btn sg-btn-subtle">
              Connexion
            </a>
            <a href="/demande" className="sg-btn sg-btn-primary">
              Démarrer
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

        {/* Menu mobile rétractable */}
        {menuOuvert && (
          <div className="sg-mobile-drawer">
            <nav className="sg-mobile-nav" aria-label="Menu mobile">
              <a
                href="#modules"
                onClick={(e) => scrollTo(e, 'modules')}
                className={activeSection === 'modules' ? 'sg-mobile-link-active' : ''}
              >
                Modules opérationnels
              </a>
              <a
                href="#apercu"
                onClick={(e) => scrollTo(e, 'apercu')}
                className={activeSection === 'apercu' ? 'sg-mobile-link-active' : ''}
              >
                Aperçu & Rôles
              </a>
              <a
                href="#rejoindre"
                onClick={(e) => scrollTo(e, 'rejoindre')}
                className={activeSection === 'rejoindre' ? 'sg-mobile-link-active' : ''}
              >
                Inscrire un établissement
              </a>
              <a href="/login" onClick={() => setMenuOuvert(false)} className="sg-mobile-login">Espace Connexion</a>
              <a href="/demande" onClick={() => setMenuOuvert(false)} className="sg-btn sg-btn-primary sg-btn-block">
                Inscrire un établissement
                <ArrowRight size={16} />
              </a>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* ─────────────────────────────────────────────────────────────
            2. HERO SECTION : COMPOSITION ÉDITORIALE & VISUEL PRODUIT
        ───────────────────────────────────────────────────────────── */}
        <section className="sg-hero">
          <div className="sg-container sg-hero-grid">
            {/* Colonne éditoriale */}
            <div className="sg-hero-editorial">
              <div className="sg-kicker">
                <span className="sg-kicker-dot" aria-hidden="true" />
                <span className="sg-kicker-text">Plateforme de gestion académique unifiée</span>
              </div>

              <h1 className="sg-hero-title">
                Le système moderne pour piloter votre{' '}
                <span className="sg-text-green">établissement scolaire</span>.
              </h1>

              <p className="sg-hero-subtitle">
                SIGAPEI unifie les inscriptions, la scolarité, les évaluations, la vie
                scolaire et le e-learning au sein d'une plateforme sécurisée,
                conçue pour les écoles, collèges, lycées et universités.
              </p>

              <div className="sg-hero-actions">
                <a href="/demande" className="sg-btn sg-btn-gold">
                  Inscrire mon établissement
                  <ArrowRight size={17} />
                </a>
                <a href="/login" className="sg-btn sg-btn-outline">
                  <Lock size={15} />
                  Espace Connexion
                </a>
              </div>

              <div className="sg-hero-guarantees">
                <div className="sg-guarantee-item">
                  <CheckCircle2 size={16} className="sg-icon-green" />
                  <span>Multi-établissements</span>
                </div>
                <div className="sg-guarantee-item">
                  <ShieldCheck size={16} className="sg-icon-green" />
                  <span>Données hautement sécurisées</span>
                </div>
                <div className="sg-guarantee-item">
                  <Sparkles size={16} className="sg-icon-gold" />
                  <span>Déploiement rapide</span>
                </div>
              </div>
            </div>

            {/* Colonne visuelle : Mockup soigné & éléments concrets */}
            <div className="sg-hero-visual-wrapper">
              <div className="sg-app-window">
                {/* Barre de fenêtre supérieure */}
                <div className="sg-app-bar">
                  <div className="sg-bar-dots">
                    <span className="sg-dot sg-dot-red" />
                    <span className="sg-dot sg-dot-yellow" />
                    <span className="sg-dot sg-dot-green" />
                  </div>
                  <div className="sg-bar-url">
                    <Lock size={11} />
                    <span>sigapei.ci / portail-direction</span>
                  </div>
                  <span className="sg-bar-badge">Connecté</span>
                </div>

                {/* Corps de l'application avec aperçu réel */}
                <div className="sg-app-preview">
                  <img
                    src="/images/dashboard-preview.jpg"
                    alt="Aperçu du tableau de bord SIGAPEI"
                    className="sg-preview-image"
                    loading="eager"
                  />
                  <div className="sg-preview-gradient" aria-hidden="true" />
                </div>

                {/* Modules & accès réels de la plateforme */}
                <div className="sg-app-features-bar">
                  <div className="sg-feat-chip">
                    <Building2 size={15} className="sg-icon-green" />
                    <span>Portail Direction</span>
                  </div>
                  <div className="sg-feat-chip">
                    <Users size={15} className="sg-icon-green" />
                    <span>Espace Enseignants</span>
                  </div>
                  <div className="sg-feat-chip">
                    <MonitorPlay size={15} className="sg-icon-green" />
                    <span>Application Mobile</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            3. BANDEAU DE VALEUR : 4 CHIFFRES CLÉS
        ───────────────────────────────────────────────────────────── */}
        <section className="sg-kpi-banner">
          <div className="sg-container sg-kpi-grid">
            <div className="sg-kpi-cell">
              <span className="sg-kpi-val">06</span>
              <span className="sg-kpi-label">Modules interconnectés en temps réel</span>
            </div>
            <div className="sg-kpi-cell">
              <span className="sg-kpi-val">100 %</span>
              <span className="sg-kpi-label">Accessible sur web, tablette & mobile</span>
            </div>
            <div className="sg-kpi-cell">
              <span className="sg-kpi-val">Multi</span>
              <span className="sg-kpi-label">Gestion centralisée multi-établissements</span>
            </div>
            <div className="sg-kpi-cell">
              <span className="sg-kpi-val">Tous cycles</span>
              <span className="sg-kpi-label">Primaire, secondaire & enseignement supérieur</span>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            4. SECTION MODULES OPÉRATIONNELS (GRILLE 3x2 HARMONIEUSE)
        ───────────────────────────────────────────────────────────── */}
        <section className="sg-section sg-section-modules" id="modules">
          <div className="sg-container">
            <div className="sg-section-header">
              <span className="sg-section-kicker">Écosystème modulaire</span>
              <h2 className="sg-section-title">
                Six modules métiers conçus pour l’excellence pédagogique.
              </h2>
              <p className="sg-section-lead">
                Chaque module répond aux exigences quotidiennes de vos équipes,
                tout en alimentant automatiquement le dossier central de votre établissement.
              </p>
            </div>

            <div className="sg-modules-grid">
              {MODULES.map(({ n, icon: Icon, tag, titre, texte, points }) => (
                <article key={n} className="sg-module-card">
                  <div className="sg-card-top">
                    <div className="sg-module-icon">
                      <Icon size={22} />
                    </div>
                    <div className="sg-module-meta">
                      <span className="sg-module-tag">{tag}</span>
                      <span className="sg-module-index">{n}</span>
                    </div>
                  </div>

                  <h3 className="sg-module-title">{titre}</h3>
                  <p className="sg-module-desc">{texte}</p>

                  <ul className="sg-module-points">
                    {points.map((pt) => (
                      <li key={pt}>
                        <Check size={14} className="sg-check-icon" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="sg-card-footer">
                    <a href="/login" className="sg-card-link">
                      Accéder au module
                      <ArrowRight size={14} />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            5. APERÇU FONCTIONNEL : PROFILS & GESTION MULTI-RÔLES
        ───────────────────────────────────────────────────────────── */}
        <section className="sg-section sg-section-roles" id="apercu">
          <div className="sg-container">
            <div className="sg-roles-layout">
              <div className="sg-roles-intro">
                <span className="sg-section-kicker">Gouvernance & Sécurité</span>
                <h2 className="sg-section-title">
                  Une interface adaptée aux responsabilités de chacun.
                </h2>
                <p className="sg-section-lead">
                  Grâce à un cloisonnement strict par rôles, chaque utilisateur
                  accède exactement aux informations indispensables à sa mission.
                </p>

                <div className="sg-roles-cards">
                  {ROLES.map(({ titre, role, desc, icon: Icon }) => (
                    <div key={titre} className="sg-role-card">
                      <div className="sg-role-icon">
                        <Icon size={20} />
                      </div>
                      <div className="sg-role-body">
                        <div className="sg-role-header">
                          <h4>{titre}</h4>
                          <span className="sg-role-tag">{role}</span>
                        </div>
                        <p>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panneau institutionnel d'engagement */}
              <div className="sg-trust-panel">
                <div className="sg-trust-content">
                  <span className="sg-trust-badge">Garantie SIGAPEI</span>
                  <h3>Conformité académique & pérennité des données</h3>
                  <p>
                    La plateforme est conçue pour respecter fidèlement les normes
                    d'organisation scolaire, le calcul des moyennes et la gestion des
                    livrets conformément aux arrêtés ministériels.
                  </p>
                  <div className="sg-trust-divider" />
                  <div className="sg-trust-checks">
                    <div>
                      <strong>Multi-cursus</strong>
                      <span>Primaire, collège, lycée, enseignement supérieur</span>
                    </div>
                    <div>
                      <strong>Intégrité</strong>
                      <span>Traçabilité intégrale des modifications de notes</span>
                    </div>
                    <div>
                      <strong>Souveraineté</strong>
                      <span>Données hébergées en environnement hautement sécurisé</span>
                    </div>
                  </div>
                  <a href="/demande" className="sg-btn sg-btn-gold sg-btn-block">
                    Faire une demande pour mon école
                    <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            6. CTA FINAL D'ADHÉSION
        ───────────────────────────────────────────────────────────── */}
        <section className="sg-cta-section" id="rejoindre">
          <div className="sg-container">
            <div className="sg-cta-box">
              <div className="sg-cta-text">
                <span className="sg-cta-kicker">Rejoindre le réseau SIGAPEI</span>
                <h2>Votre établissement mérite une gestion d’exception.</h2>
                <p>
                  Déposez votre demande d'ouverture en ligne en moins de 10 minutes.
                  Notre service administratif vérifie votre dossier et active vos accès officiels.
                </p>
              </div>

              <div className="sg-cta-action-group">
                <a href="/demande" className="sg-btn sg-btn-gold sg-btn-lg">
                  Inscrire mon établissement
                  <ArrowRight size={18} />
                </a>
                <a href="/login" className="sg-btn sg-btn-ghost-dark sg-btn-lg">
                  Accès espace existant
                </a>
                <span className="sg-cta-note">
                  Validation administrative sous 24h à 48h ouvrées.
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          7. FOOTER ÉLÉGANT & INSTITUTIONNEL
      ───────────────────────────────────────────────────────────── */}
      <footer className="sg-footer">
        <div className="sg-container">
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
                  <span className="sg-footer-brand-sub">Système de gestion académique</span>
                </div>
              </a>
              <p className="sg-footer-desc">
                Système Intégré de Gestion Administrative et Pédagogique des
                Établissements d'Instruction. La référence numérique de la gouvernance scolaire.
              </p>
            </div>

            <div className="sg-footer-links-col">
              <h5>Navigation</h5>
              <ul>
                <li><a href="#modules" onClick={(e) => scrollTo(e, 'modules')}>Modules du système</a></li>
                <li><a href="#apercu" onClick={(e) => scrollTo(e, 'apercu')}>Gouvernance & Rôles</a></li>
                <li><a href="#rejoindre" onClick={(e) => scrollTo(e, 'rejoindre')}>Adhésion d'un établissement</a></li>
              </ul>
            </div>

            <div className="sg-footer-links-col">
              <h5>Portails d'accès</h5>
              <ul>
                <li><a href="/login">Connexion générale</a></li>
                <li><a href="/demande">Dépôt de candidature</a></li>
                <li><a href="/securite">Sécurité & Confidentialité</a></li>
              </ul>
            </div>
          </div>

          <div className="sg-footer-bottom">
            <p>© {new Date().getFullYear()} SIGAPEI - Tous droits réservés.</p>
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