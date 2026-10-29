import { useState, useEffect } from 'react'
import {
  Menu, X, Users, GraduationCap, DollarSign, MessageSquare,
  LogOut, LayoutDashboard, Calendar, FileText, UserCheck,
} from 'lucide-react'
import { useAuth } from '../../context/identite/AuthContext'
import { ENV } from '../../config/commun/env'
import { portailService } from '../../services/identite/portail.service'
import useSlugEtablissement from '../../hooks/etablissements/useSlugEtablissement'
import ThemeToggle from '../commun/ThemeToggle'
import NotificationBell from '../commun/NotificationBell'
import './ParentLayout.css'

export default function ParentLayout({ children, ongletActif = 'dashboard', onChangerOnglet }) {
  const { user, logout } = useAuth()
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

  const nom = user?.nomComplet ?? user?.nom_complet ?? user?.nom ?? 'Parent / Tuteur'
  const initiales = nom.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const etabNom = etablissement?.nom ?? ENV.appName
  const etabLogo = etablissement?.logoUrl ?? '/sigapei.png'

  const navItems = [
    { id: 'dashboard', label: "Vue d'ensemble", icon: LayoutDashboard },
    { id: 'enfants', label: 'Suivi de mes enfants', icon: Users },
    { id: 'bulletins', label: 'Bulletins & Relevés', icon: GraduationCap },
    { id: 'finances', label: 'Scolarité & Facturation', icon: DollarSign },
    { id: 'messages', label: 'Correspondance & RDV', icon: MessageSquare },
  ]

  const handleNavClick = (id) => {
    if (onChangerOnglet) {
      onChangerOnglet(id)
    }
    setNavOuvert(false)
  }

  return (
    <div className="pl-shell-parent">
      {/* ── BACKDROP MOBILE ── */}
      <div
        className={`pl-backdrop-parent${navOuvert ? ' is-open' : ''}`}
        onClick={() => setNavOuvert(false)}
        aria-hidden="true"
      />

      {/* ── SIDEBAR PARENT ── */}
      <aside className={`pl-sidebar-parent${navOuvert ? ' is-open' : ''}`}>
        <div className="pl-sidebar-head-parent">
          <div className="pl-brand-parent">
            <span className="pl-brand-logo-parent">
              <img src={etabLogo} alt={etabNom} />
            </span>
            <div className="pl-brand-info-parent">
              <span className="pl-brand-name-parent">{etabNom}</span>
              <span className="pl-brand-badge-parent">Espace Parents</span>
            </div>
          </div>
        </div>

        <nav className="pl-nav-parent" aria-label="Menu principal parent">
          <span className="pl-nav-group-title-parent">Suivi Scolaire & Famille</span>
          {navItems.map((item) => {
            const Icon = item.icon
            const actif = ongletActif === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`pl-nav-link-parent${actif ? ' is-active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="pl-sidebar-footer-parent">
          <div className="pl-user-card-parent">
            <span className="pl-avatar-parent" aria-hidden="true">{initiales}</span>
            <div className="pl-brand-info-parent">
              <span className="pl-user-name-parent" title={nom}>{nom}</span>
              <span className="pl-user-role-parent">Parent / Tuteur</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
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

      {/* ── CORPS CENTRAL & HEADER ── */}
      <div className="pl-main-wrapper-parent">
        <header className="pl-topbar-parent">
          <div className="pl-topbar-left-parent">
            <button
              type="button"
              className="pl-menu-toggle-parent"
              onClick={() => setNavOuvert((v) => !v)}
              aria-label="Ouvrir le menu de navigation"
            >
              {navOuvert ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="pl-topbar-title-parent">Espace Parents & Tuteurs Légaux</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="al-badge-annee">
              <Calendar size={14} aria-hidden="true" />
              <span>Année académique 2026-2027</span>
            </span>
            <NotificationBell className="al-icon-btn" />
            <ThemeToggle />
          </div>
        </header>

        <main className="pl-content-parent">
          {children}
        </main>
      </div>
    </div>
  )
}
