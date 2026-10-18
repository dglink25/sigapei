import { useState, useEffect } from 'react'
import './Home.css'

/* ─── Données ─────────────────────────────────────────────────────── */
const profilesData = [
  {
    id: 'fondateur',
    title: 'Fondateur & Directeur Général',
    role: 'Supervision Globale & Contrôle Financier',
    desc: "Supervision globale du réseau ou de l'établissement, suivi des recettes en temps réel, statistiques d'assiduité et contrôle d'accès instantané.",
    features: [
      "Tableau de bord consolidé pour l'ensemble des établissements du groupe",
      "Gestion immédiate du statut d'accès (activation / suspension en un clic)",
      'Traçabilité intégrale de toutes les transactions et actes administratifs',
      'Suivi analytique du taux de recouvrement et des impayés',
    ],
    phoneTitle: 'Directeur Général',
    phoneSubtitle: '4 Écoles connectées',
    rows: [
      { label: 'Recettes ce mois', val: '48.2 M FCFA', status: 'ok', tag: '+14%' },
      { label: 'Taux de présence', val: '96.8 %', status: 'ok', tag: 'Optimal' },
      { label: 'Bulletins T1 validés', val: '100 %', status: 'ok', tag: 'Terminé' },
    ],
  },
  {
    id: 'enseignant',
    title: 'Enseignants & Équipe Pédagogique',
    role: 'Appel Numérique & Suivi des Notes',
    desc: "Saisie rapide des notes sur smartphone ou tablette, appel numérique en classe en 3 secondes, cahier de texte électronique et transmission des devoirs.",
    features: [
      "Faire l'appel en classe depuis n'importe quel smartphone",
      'Saisie simplifiée des notes avec calcul automatique des moyennes',
      'Partage direct des cours, exercices et devoirs à la maison',
      "Communication fluide avec l'administration et les parents",
    ],
    phoneTitle: 'Espace Enseignant',
    phoneSubtitle: 'Classe de Terminale C',
    rows: [
      { label: 'Appel du jour', val: '34 / 35 Présents', status: 'ok', tag: 'Fait' },
      { label: 'Devoir de Math', val: '28 Copie(s) rendue(s)', status: 'wa', tag: 'En cours' },
      { label: 'Moyenne Classe', val: '14.8 / 20', status: 'ok', tag: 'Satisfaisant' },
    ],
  },
  {
    id: 'apprenant',
    title: 'Apprenants & Étudiants',
    role: 'Emploi du Temps, Devoirs & Bulletins',
    desc: "Consultation de l'emploi du temps en direct, cahier de devoirs interactif, téléchargement des cours et accès sécurisé aux bulletins scolaires.",
    features: [
      "Accès 24h/24 à l'emploi du temps et aux salles de cours",
      'Dépôt en ligne des travaux et devoirs à domicile',
      'Téléchargement des bulletins trimestriels en PDF sécurisé',
      "Bibliothèque numérique et ressources d'apprentissage",
    ],
    phoneTitle: 'Espace Apprenant',
    phoneSubtitle: 'KOUASSI Jean-Marc',
    rows: [
      { label: 'Prochain cours', val: 'Physique - Salle 12', status: 'ok', tag: '14h00' },
      { label: 'Moyenne T1', val: '15.4 / 20', status: 'ok', tag: 'Rang: 2e' },
      { label: 'Devoirs à rendre', val: '2 Exercices', status: 'wa', tag: 'Demain' },
    ],
  },
  {
    id: 'parent',
    title: "Parents d'Élèves & Tuteurs",
    role: 'Alertes Instantanées & Paiements Mobile',
    desc: "Notifications instantanées des absences/retards, règlement des frais par Mobile Money (MTN, Orange, Moov, Wave), suivi des notes et demandes de documents.",
    features: [
      "Alertes instantanées SMS / WhatsApp en cas de retard ou d'absence",
      'Paiement rapide des frais de scolarité via Mobile Money ou Carte',
      'Consultation en temps réel des notes et appréciations des professeurs',
      'Demande et téléchargement des certificats de scolarité en ligne',
    ],
    phoneTitle: 'Portail Parent',
    phoneSubtitle: 'Suivi de 2 Enfants',
    rows: [
      { label: 'Paiement Scolarité', val: '25 000 FCFA', status: 'ok', tag: 'Validé' },
      { label: "Présence aujourd'hui", val: 'Présent en classe', status: 'ok', tag: '07h45' },
      { label: 'Alertes récents', val: '0 Absence', status: 'ok', tag: 'À jour' },
    ],
  },
  {
    id: 'secretariat',
    title: 'Secrétariat & Comptabilité',
    role: 'Inscriptions, Cartes QR-Code & Facturation',
    desc: "Gestion des candidatures, suivi des impayés, impression automatique des cartes scolaires avec QR-Code et édition des états financiers officiels.",
    features: [
      'Validation en ligne des dossiers de pré-inscription et réinscription',
      'Facturation automatique et relance ciblée des soldes impayés',
      "Génération et impression des cartes d'étudiants avec QR-Code sécurisé",
      'Édition automatique des registres matricules et attestations',
    ],
    phoneTitle: 'Secrétariat & Finance',
    phoneSubtitle: 'Gestion Administrative',
    rows: [
      { label: 'Nouvelles inscriptions', val: '+145 Dossiers', status: 'ok', tag: 'Validés' },
      { label: 'Cartes imprimées', val: '620 Cartes QR', status: 'ok', tag: 'Terminé' },
      { label: 'Relances scolarité', val: '12 Envoyer SMS', status: 'wa', tag: 'En attente' },
    ],
  },
]

const tickerItems = [
  'sigapei • SIGAPEI',
  'Une seule base de vérité',
  'Présences en temps réel',
  'Inscriptions en ligne',
  'Bulletins certifiés PDF',
  'Paiements Mobile Money & Banque',
  'Cartes QR-Code sécurisées',
  "Du primaire à l'université",
]

const headlineWords = ['Toute', 'la', 'vie', 'de', 'votre', 'école,', 'dans', 'une', 'seule', 'plateforme.']

export default function Home() {
  const [isDark, setIsDark] = useState(false)
  const [isSide, setIsSide] = useState(false)
  const [isSuspended, setIsSuspended] = useState(false)
  const [activeNav, setActiveNav] = useState('top')
  const [activeTab, setActiveTab] = useState(0)

  const [apprenants, setApprenants] = useState(0)
  const [presence, setPresence] = useState(0)
  const [recettes, setRecettes] = useState(0)

  // Animate KPI numbers on mount
  useEffect(() => {
    let start = 0
    const interval = setInterval(() => {
      start += 1
      if (start <= 100) {
        setApprenants(Math.floor((620 * start) / 100))
        setPresence(Math.floor((96 * start) / 100))
        setRecettes(parseFloat(((8.4 * start) / 100).toFixed(1)))
      } else {
        clearInterval(interval)
      }
    }, 20)
    return () => clearInterval(interval)
  }, [])

  // Scroll listener - parallax + active nav
  useEffect(() => {
    const root = document.getElementById('hp')
    if (!root) return
    const handleScroll = () => {
      const sy = window.scrollY
      root.querySelectorAll('.hp-par').forEach((el) => {
        const d = parseFloat(el.getAttribute('data-d') || '0')
        el.style.transform = `translateY(${sy * d * 0.015}px)`
      })
      const sections = root.querySelectorAll('section[id]')
      let current = 'top'
      sections.forEach((sec) => {
        const top = sec.offsetTop - 140
        if (sy >= top) current = sec.id
      })
      setActiveNav(current)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Intersection Observer - scroll reveal
  useEffect(() => {
    const root = document.getElementById('hp')
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            if (entry.target.id === 'hp-chart') {
              entry.target.querySelectorAll('i[data-h]').forEach((bar) => {
                const h = bar.getAttribute('data-h')
                if (h) bar.style.height = `${h}%`
              })
            }
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    root.querySelectorAll('.hp-rv, .hp-steps, #hp-chart').forEach((el) => observer.observe(el))

    const secObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('sec-in')
        })
      },
      { threshold: 0.05 }
    )
    root.querySelectorAll('.hp-sec-rv').forEach((el) => secObserver.observe(el))

    return () => { observer.disconnect(); secObserver.disconnect() }
  }, [])

  const current = profilesData[activeTab]

  return (
    <div
      id="hp"
      data-theme={isDark ? 'dark' : 'light'}
      data-side={isSide ? 'true' : 'false'}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header id="hp-hd">
        <div className="hp-nav">
          <a href="#hp-top" className="hp-brand">
            <i className="hp-lg" role="img" aria-label="Logo" />
            <span>SIGAPEI</span>
          </a>

          <nav className="hp-links" aria-label="Navigation principale">
            <a href="#hp-profils" className={activeNav === 'hp-profils' ? 'act' : ''}>Pour qui</a>
            <a href="#hp-modules" className={activeNav === 'hp-modules' ? 'act' : ''}>Modules</a>
            <a href="#hp-demarrer" className={activeNav === 'hp-demarrer' ? 'act' : ''}>Démarrer</a>
            <a href="#hp-securite" className={activeNav === 'hp-securite' ? 'act' : ''}>Sécurité</a>
            <a href="#hp-offres" className={activeNav === 'hp-offres' ? 'act' : ''}>Offres</a>
          </nav>

          <div className="hp-acts">
            <button
              className="hp-ib"
              onClick={() => setIsDark(!isDark)}
              aria-label="Basculer entre mode jour et nuit"
            >
              <svg className="hp-sun" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
              <svg className="hp-moon" viewBox="0 0 24 24">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            </button>

            <button
              className="hp-ib"
              id="hp-lay"
              onClick={() => setIsSide(!isSide)}
              aria-label="Basculer entre barre de navigation et barre latérale"
              aria-pressed={isSide}
            >
              <svg viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="16" rx="3" />
                <path d="M9 4v16" />
              </svg>
            </button>

            <a className="hp-btn hp-b-g" href="/demande">Inscrire mon école</a>
          </div>
        </div>
      </header>

      {/* Scrim overlay */}
      <div className="hp-scrim" onClick={() => setIsSide(false)} />

      {/* ── Page ───────────────────────────────────────────────────── */}
      <div id="hp-page">
        <main id="hp-top">

          {/* ── Hero ─────────────────────────────────────────────── */}
          <section className="hp-hero hp-sec-rv">
            <div className="hp-par p1" data-d="30"><div className="hp-sh" /></div>
            <div className="hp-par p2" data-d="-22"><div className="hp-sh" /></div>
            <div className="hp-par p3" data-d="18"><div className="hp-sh" /></div>
            <div className="hp-par p4" data-d="-34"><div className="hp-sh" /></div>

            <div className="hp-w">
              <div>
                <h1 id="hp-h1">
                  {headlineWords.map((word, idx) => (
                    <span key={idx}>
                      <span className="hp-wd" style={{ animationDelay: `${0.1 + idx * 0.08}s` }}>{word}</span>
                      {' '}
                    </span>
                  ))}
                </h1>

                <p className="hp-lead hp-hi">
                  Inscriptions, notes, bulletins, paiements, présences et demandes de documents.
                  Une seule base de vérité pour le fondateur, l&apos;enseignant, l&apos;apprenant et le parent.
                </p>

                <div className="hp-cta hp-hi">
                  <a className="hp-btn hp-b-o" href="/demande">Inscrire mon établissement</a>
                  <a className="hp-btn hp-b-l" href="#hp-modules">Découvrir les modules</a>
                </div>

                <div className="hp-cyc hp-hi">
                  <span><i className="hp-dia" />Primaire</span>
                  <span><i className="hp-dia" />Secondaire</span>
                  <span><i className="hp-dia" />Universitaire</span>
                  <span><i className="hp-dia" />Installable sur mobile</span>
                </div>
              </div>

              <div className="hp-vis">
                <div className="hp-chip hp-c1">
                  <i className="hp-dia" />
                  <div>Paiement reçu<small>MTN MoMo · 25 000 FCFA</small></div>
                </div>
                <div className="hp-chip hp-c2">
                  <i className="hp-dia" />
                  <div>Bulletin publié<small>6e A · parents notifiés</small></div>
                </div>
                <div className="hp-chip hp-c3">
                  <i className="hp-dia" />
                  <div>Absence signalée<small>Parent prévenu en direct</small></div>
                </div>

                <div className={`hp-dash${isSuspended ? ' off' : ''}`} aria-label="Aperçu du tableau de bord">
                  <div className="hp-bar">
                    <i /><i /><i />
                    <b>app.sigapei.com/les-flamboyants/administration</b>
                  </div>

                  <div className="hp-dbody">
                    <div className="hp-dash-side">
                      <div className="on">Tableau de bord</div>
                      <div>Apprenants</div>
                      <div>Notes</div>
                      <div>Finances</div>
                      <div>Demandes</div>
                      <div>Personnel</div>
                    </div>

                    <div className="hp-dmain">
                      <div className="hp-dtop">
                        <strong>Les Flamboyants</strong>
                        <button
                          className="hp-sw"
                          onClick={() => setIsSuspended(!isSuspended)}
                          aria-pressed={isSuspended}
                          aria-label="Simuler une suspension"
                        >
                          <b>{isSuspended ? 'Suspendu' : 'Actif'}</b>
                          <span />
                        </button>
                      </div>

                      <div className="hp-kp">
                        <div><small>Apprenants</small><b>{apprenants}</b></div>
                        <div><small>Présence</small><b><span>{presence}</span> %</b></div>
                        <div><small>Recettes FCFA</small><b><span>{recettes}</span> M</b></div>
                      </div>

                      <div className="hp-chart" id="hp-chart" aria-hidden="true">
                        <i data-h="45" />
                        <i data-h="60" />
                        <i data-h="52" />
                        <i data-h="74" />
                        <i data-h="68" />
                        <i className="a" data-h="88" />
                        <i data-h="80" />
                      </div>

                      <div className="hp-alert">
                        <i className="hp-dia" />
                        12 soldes impayés depuis plus de 30 jours
                      </div>
                    </div>
                  </div>

                  <div className="hp-lock">
                    <strong>Accès suspendu</strong>
                    Cet établissement est suspendu. Contactez la plateforme E-Académique.
                    <small>Effet immédiat, une seule écriture en base.</small>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Marquee Ticker ───────────────────────────────────── */}
          <div className="hp-tk" aria-hidden="true">
            <div className="hp-tr2">
              <span>
                {tickerItems.map((item, idx) => (
                  <span key={idx}><i className="hp-dia" /><span>{item}</span></span>
                ))}
              </span>
              <span>
                {tickerItems.map((item, idx) => (
                  <span key={`r${idx}`}><i className="hp-dia" /><span>{item}</span></span>
                ))}
              </span>
            </div>
          </div>

          {/* ── Profiles Section ─────────────────────────────────── */}
          <section id="hp-profils" className="hp-sec-rv hp-sect-alt">
            <div className="hp-w">
              <h2 className="hp-rv">Un espace pensé pour chacun.</h2>
              <p className="hp-lead hp-rv">
                Chaque profil voit uniquement ce qui lui sert, avec des droits définis par le fondateur.
              </p>

              <div className="hp-tabs hp-rv" role="tablist">
                {profilesData.map((p, idx) => (
                  <button
                    key={p.id}
                    className="hp-tab"
                    role="tab"
                    aria-selected={activeTab === idx}
                    onClick={() => setActiveTab(idx)}
                  >
                    {p.title.split('&')[0]}
                  </button>
                ))}
              </div>

              <div className="hp-panel hp-rv" role="tabpanel">
                <div>
                  <span className="hp-tag hp-ok" style={{ marginBottom: 8, display: 'inline-block' }}>{current.role}</span>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--hp-head)', marginTop: 4, marginBottom: 12 }}>
                    {current.title}
                  </h3>
                  <p style={{ color: 'var(--hp-mut)', fontSize: '0.95rem', lineHeight: 1.6 }}>{current.desc}</p>
                  <ul>
                    {current.features.map((feat, fIdx) => (
                      <li key={fIdx}>
                        <i className="hp-dia" />
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="hp-phone">
                  <div className="hp-scr">
                    <div>
                      <h4>{current.phoneTitle}</h4>
                      <small>{current.phoneSubtitle}</small>
                    </div>
                    {current.rows.map((r, rIdx) => (
                      <div key={rIdx} className="hp-row">
                        <div>
                          <div style={{ fontSize: '11px', color: '#5B6B62', fontWeight: 600 }}>{r.label}</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F241A' }}>{r.val}</div>
                        </div>
                        <span className={`hp-tag hp-${r.status}`}>{r.tag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Modules Section ──────────────────────────────────── */}
          <section id="hp-modules" className="hp-sec-rv">
            <div className="hp-w">
              <h2 className="hp-rv">Tout ce dont un établissement a besoin.</h2>
              <p className="hp-lead hp-rv">
                Chaque information existe à un seul endroit. Elle est partagée entre modules, jamais recopiée.
              </p>

              <div className="hp-mods">
                <div className="hp-mod hp-big hp-rv">
                  <i className="hp-dia" />
                  <h3>Finances et paiements</h3>
                  <p>Frais de scolarité, reçus automatiques, intégration Mobile Money (MTN, Orange, Moov, Wave) et banques. Suivi en direct des impayés et recouvrement.</p>
                </div>
                <div className="hp-mod hp-rv">
                  <i className="hp-dia" />
                  <h3>Scolarité &amp; Bulletins</h3>
                  <p>Calcul automatique des moyennes, gestion des coefficients par série et édition des bulletins officiels en PDF sécurisés.</p>
                </div>
                <div className="hp-mod hp-rv">
                  <i className="hp-dia" />
                  <h3>Vie Scolaire &amp; Présences</h3>
                  <p>Appel numérique en classe sur mobile, gestion des retards/absences et alertes directes transmises aux parents.</p>
                </div>
                <div className="hp-mod hp-rv">
                  <i className="hp-dia" />
                  <h3>Inscriptions &amp; Réinscriptions</h3>
                  <p>Portail de pré-inscription en ligne, numérisation des pièces justificatives et validation des dossiers d&apos;admission.</p>
                </div>
                <div className="hp-mod hp-rv">
                  <i className="hp-dia" />
                  <h3>E-Learning &amp; Devoirs</h3>
                  <p>Bibliothèque numérique, dépôt de cours, devoirs à rendre et quiz d&apos;évaluation accessibles 24/7.</p>
                </div>
                <div className="hp-mod hp-rv">
                  <i className="hp-dia" />
                  <h3>Supervision Multi-Écoles</h3>
                  <p>Consolidation des données pour les groupes scolaires, comparatifs inter-écoles et tableaux de bord consolidés.</p>
                </div>
                <div className="hp-mod hp-rv">
                  <i className="hp-dia" />
                  <h3>Identité &amp; Cartes QR-Code</h3>
                  <p>Gestion fine des rôles et génération automatique des cartes d&apos;étudiants sécurisées avec QR-Code.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Steps Section ────────────────────────────────────── */}
          <section id="hp-demarrer" className="hp-sec-rv hp-sect-alt">
            <div className="hp-w">
              <h2 className="hp-rv">Comment démarrer avec sigapei ?</h2>
              <p className="hp-lead hp-rv">
                Une mise en service rapide en 4 étapes simples, sans infrastructure lourde ni installation complexe.
              </p>

              <div className="hp-steps in">
                <div className="hp-st">
                  <em>01</em>
                  <h3>Inscription de l&apos;école</h3>
                  <p>Création de votre espace établissement personnalisé en moins de 2 minutes.</p>
                </div>
                <div className="hp-st">
                  <em>02</em>
                  <h3>Import des effectifs</h3>
                  <p>Importation facile des apprenants et enseignants via fichier Excel / CSV.</p>
                </div>
                <div className="hp-st">
                  <em>03</em>
                  <h3>Paramétrage des cycles</h3>
                  <p>Configuration des classes, séries, coefficients et frais de scolarité.</p>
                </div>
                <div className="hp-st">
                  <em>04</em>
                  <h3>Ouverture des accès</h3>
                  <p>Envoi des identifiants sécurisés aux enseignants, apprenants et parents.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Final CTA ────────────────────────────────────────── */}
          <section id="hp-final" className="hp-final hp-sec-rv">
            <div className="hp-w">
              <div className="hp-final-logo-wrap">
                <i className="hp-lg hp-final-logo" role="img" aria-label="Logo sigapei" />
              </div>
              <h2 className="hp-rv hp-final-title">Prêt à moderniser la gestion de votre établissement ?</h2>
              <p className="hp-rv hp-final-text">
                Rejoignez les centaines d&apos;écoles qui font confiance à sigapei pour leur transformation numérique.
              </p>
              <div className="hp-cta hp-rv hp-final-actions" style={{ marginTop: 24 }}>
                <a className="hp-btn hp-b-o" href="/demande">Inscrire mon établissement</a>
                <a className="hp-btn hp-b-l" href="#hp-profils">Explorer les fonctionnalités</a>
              </div>
            </div>
          </section>

        </main>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <footer className="hp-footer">
          <div className="hp-w hp-footer-inner">
            <div className="hp-footer-brand">
              <div className="hp-footer-logo">
                <i className="hp-lg" style={{ width: 36, height: 36 }} role="img" aria-label="Logo SIGAPEI" />
              </div>
              <div>
                <div className="hp-ft-brand">SIGAPEI</div>
                <p>Plateforme de gestion scolaire</p>
              </div>
            </div>

            <div className="hp-footer-col">
              <div className="hp-footer-label">Entreprise</div>
              <a href="#hp-profils">Pourquoi nous</a>
              <a href="#hp-modules">Modules</a>
              <a href="#hp-offres">Tarifs</a>
            </div>

            <div className="hp-footer-col">
              <div className="hp-footer-label">Ressources</div>
              <a href="#hp-demarrer">Démarrer</a>
              <a href="#hp-securite">Sécurité</a>
              <a href="#hp-final">Devis</a>
            </div>

            <div className="hp-footer-col hp-footer-contact">
              <div className="hp-footer-label">Contact</div>
              <a href="mailto:contact@sigapei.com">contact@sigapei.com</a>
              <a href="tel:+22500000000">+225 00 00 00 00</a>
              <span>Abidjan, Côte d’Ivoire</span>
            </div>
          </div>

          <div className="hp-w hp-footer-bottom">
            <div>© 2026 SIGAPEI. Tous droits réservés.</div>
            <div className="hp-footer-legal">
              <a href="#">Mentions légales</a>
              <a href="#">Confidentialité</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
