import { useState, useEffect } from 'react'
import {
  Menu, X, Briefcase, FileCheck, DollarSign, Clock,
  LogOut, LayoutDashboard, Calendar, FileText,
} from 'lucide-react'
import { useAuth } from '../../context/identite/AuthContext'
import { ENV } from '../../config/commun/env'
import { portailService } from '../../services/identite/portail.service'
import useSlugEtablissement from '../../hooks/etablissements/useSlugEtablissement'
import ThemeToggle from '../commun/ThemeToggle'
import './PrestataireLayout.css'

export default function PrestataireLayout({ children, ongletActif = 'dashboard', onChangerOnglet }) {
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

  const nom = user?.nomComplet ?? user?.nom_complet ?? user?.nom ?? 'Prestataire'
  const initiales = nom.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const etabNom = etablissement?.nom ?? ENV.appName
  const etabLogo = etablissement?.logoUrl ?? '/sigapei.png'

  const navItems = [
    { id: 'dashboard', label: "Vue d'ensemble", icon: LayoutDashboard },
    { id: 'missions', label: 'Missions & Interventions', icon: Briefcase },
    { id: 'commandes', label: 'Bons de commande', icon: FileCheck },
    { id: 'factures', label: 'Factures & Règlements', icon: DollarSign },
    { id: 'documents', label: 'Documents contractuels', icon: FileText },
  ]

  const handleNavClick = (id) => {
    if (onChangerOnglet) {
      onChangerOnglet(id)
    }
    setNavOuvert(false)
  }

  return (
    <div className="prl-shell">
      {/* ── BACKDROP MOBILE ── */}
      <div
        className={`prl-backdrop${navOuvert ? ' is-open' : ''}`}
        onClick={() => setNavOuvert(false)}
        aria-hidden="true"
      />

      {/* ── SIDEBAR PRESTATAIRE ── */}
      <aside className={`prl-sidebar${navOuvert ? ' is-open' : ''}`}>
        <div className="prl-sidebar-head">
          <div className="prl-brand">
            <span className="prl-brand-logo">
              <img src={etabLogo} alt={etabNom} />
            </span>
            <div className="prl-brand-info">
              <span className="prl-brand-name">{etabNom}</span>
              <span className="prl-brand-badge">Espace Prestataire</span>
            </div>
          </div>
        </div>

        <nav className="prl-nav" aria-label="Menu principal prestataire">
          <span className="prl-nav-group-title">Prestations & Marchés</span>
          {navItems.map((item) => {
            const Icon = item.icon
            const actif = ongletActif === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`prl-nav-link${actif ? ' is-active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="prl-sidebar-footer">
          <div className="prl-user-card">
            <span className="prl-avatar" aria-hidden="true">{initiales}</span>
            <div className="prl-brand-info">
              <span className="prl-user-name" title={nom}>{nom}</span>
              <span className="prl-user-role">Prestataire Externe</span>
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

      {/* ── MAIN CONTENT ── */}
      <div className="prl-main-wrapper">
        <header className="prl-topbar">
          <div className="prl-topbar-left">
            <button
              type="button"
              className="prl-menu-toggle"
              onClick={() => setNavOuvert((v) => !v)}
              aria-label="Ouvrir le menu de navigation"
            >
              {navOuvert ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="prl-topbar-title">Espace Prestataire & Partenaires</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="al-badge-annee">
              <Calendar size={14} aria-hidden="true" />
              <span>Exercice budgétaire 2026-2027</span>
            </span>
          </div>
        </header>

        <main className="prl-content">
          {children}
        </main>
      </div>
    </div>
  )
}
