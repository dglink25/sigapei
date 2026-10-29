import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Menu, X, BookOpen, GraduationCap, Calendar, Clock,
  User, LogOut, Bell, LayoutDashboard, Building2,
} from 'lucide-react'
import { useAuth } from '../../context/identite/AuthContext'
import { ENV } from '../../config/commun/env'
import { portailService } from '../../services/identite/portail.service'
import { lienEtablissement } from '../../lib/etablissements/subdomain'
import useSlugEtablissement from '../../hooks/etablissements/useSlugEtablissement'
import ThemeToggle from '../commun/ThemeToggle'
import './ApprenantLayout.css'

export default function ApprenantLayout({ children, ongletActif = 'dashboard', onChangerOnglet }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const slug = useSlugEtablissement()
  const [navOuvert, setNavOuvert] = useState(false)
  const [etablissement, setEtablissement] = useState(null)

  useEffect(() => {
    let cancel = false
    portailService.lire()
      .then((r) => {
        if (!cancel && r?.etablissement) {
          setEtablissement(r.etablissement)
        }
      })
      .catch(() => {})
    return () => { cancel = true }
  }, [])

  const nom = user?.nomComplet ?? user?.nom_complet ?? user?.nom ?? 'Apprenant'
  const initiales = nom.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const etabNom = etablissement?.nom ?? ENV.appName
  const etabLogo = etablissement?.logoUrl ?? '/sigapei.png'

  const navItems = [
    { id: 'dashboard', label: "Vue d'ensemble", icon: LayoutDashboard },
    { id: 'cours', label: 'Mes Cours & Matières', icon: BookOpen },
    { id: 'notes', label: 'Notes & Évaluations', icon: GraduationCap },
    { id: 'emploi', label: 'Emploi du temps', icon: Calendar },
    { id: 'assiduite', label: 'Assiduité & Présences', icon: Clock },
    { id: 'profil', label: 'Mon profil apprenant', icon: User },
  ]

  const handleNavClick = (id) => {
    if (onChangerOnglet) {
      onChangerOnglet(id)
    }
    setNavOuvert(false)
  }

  return (
    <div className="al-shell">
      {/* ── BACKDROP MOBILE ── */}
      <div
        className={`al-backdrop${navOuvert ? ' is-open' : ''}`}
        onClick={() => setNavOuvert(false)}
        aria-hidden="true"
      />

      {/* ── SIDEBAR DESKTOP & TIROIR MOBILE ── */}
      <aside className={`al-sidebar${navOuvert ? ' is-open' : ''}`}>
        <div className="al-sidebar-head">
          <div className="al-brand">
            <span className="al-brand-logo">
              <img src={etabLogo} alt={etabNom} />
            </span>
            <div className="al-brand-info">
              <span className="al-brand-name">{etabNom}</span>
              <span className="al-brand-badge">Espace Apprenant</span>
            </div>
          </div>
        </div>

        <nav className="al-nav" aria-label="Menu principal apprenant">
          <span className="al-nav-group-title">Scolarité & Pédagogie</span>
          {navItems.map((item) => {
            const Icon = item.icon
            const actif = ongletActif === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`al-nav-link${actif ? ' is-active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="al-sidebar-footer">
          <div className="al-user-card">
            <span className="al-avatar" aria-hidden="true">{initiales}</span>
            <div className="al-user-info">
              <span className="al-user-name" title={nom}>{nom}</span>
              <span className="al-user-role">Apprenant</span>
            </div>
          </div>
          <div className="al-footer-actions">
            <ThemeToggle className="al-icon-btn" />
            <button
              type="button"
              className="al-icon-btn al-icon-btn--logout"
              onClick={() => logout('manual')}
              title="Déconnexion"
              aria-label="Déconnexion"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── CORPS CENTRAL & HEADER TOPBAR ── */}
      <div className="al-main-wrapper">
        <header className="al-topbar">
          <div className="al-topbar-left">
            <button
              type="button"
              className="al-menu-toggle"
              onClick={() => setNavOuvert((v) => !v)}
              aria-label="Ouvrir le menu de navigation"
            >
              {navOuvert ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="al-topbar-title">Espace Apprenant</h1>
          </div>

          <div className="al-topbar-right">
            <span className="al-badge-annee">
              <Calendar size={14} aria-hidden="true" />
              <span>Année académique en cours</span>
            </span>
          </div>
        </header>

        <main className="al-content">
          {children}
        </main>
      </div>
    </div>
  )
}
