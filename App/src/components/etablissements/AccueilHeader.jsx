import { useState } from 'react'
import { Building2, LogIn, LayoutGrid, Menu, X, Mail } from 'lucide-react'
import LienConnexion from './LienConnexion'
import { ENV } from '../../config/commun/env'
import './AccueilHeader.css'

export default function AccueilHeader({ data, slug, connecte, lienEspace, navItems, onScrollTo }) {
  const [menuOpen, setMenuOpen] = useState(false)

  function handleNav(id) {
    onScrollTo(id)
    setMenuOpen(false)
  }

  return (
    <header className="aeh">

      {/* ══════════════════════════════════════════════════
          BANDE 1  -  fond vert
      ══════════════════════════════════════════════════ */}
      <div className="aeh-b1">

        {/* Logo établissement */}
        <div className="aeh-logo-left">
          {data.logoUrl
            ? <img src={data.logoUrl} alt={data.nom} />
            : <div className="aeh-logo-ph"><Building2 size={22} /></div>
          }
        </div>

        <div className="aeh-b1-content">
          {/* 1. Nom à gauche */}
          <div className="aeh-identity">
            <span className="aeh-nom-court">{data.nom}</span>
          </div>

          {/* 2. Devise au centre */}
          <div className="aeh-devise-inline" title={data.devise}>
            {data.devise || ''}
          </div>

          {/* 3. Bouton Nous écrire tout à droite */}
          <div className="aeh-b1-actions">
            {data.email && (
              <a href={`mailto:${data.email}`} className="aeh-action-btn">
                <Mail size={13} /> Nous écrire
              </a>
            )}
          </div>
        </div>

        {/* Logo SIGAPEI */}
        <div className="aeh-logo-right">
          <img src="/sigapei.png" alt={ENV.appName} />
        </div>

        {/* Burger mobile */}
        <button
          type="button"
          className="aeh-burger"
          aria-label={menuOpen ? 'Fermer' : 'Menu'}
          onClick={() => setMenuOpen(v => !v)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          BANDE 2  -  fond blanc : navigation + Se connecter
      ══════════════════════════════════════════════════ */}
      <div className="aeh-b2">
        <div className="aeh-b2-nav-wrap">
          <nav className="aeh-nav" aria-label="Navigation">
            {navItems.map((n, i) => (
              <button
                key={n.id}
                type="button"
                className={`aeh-nav-btn${i === 0 ? ' is-active' : ''}`}
                onClick={() => handleNav(n.id)}
              >
                {n.label}
              </button>
            ))}
          </nav>

          {/* Se connecter - avec la même structure que "Nous écrire" */}
          <div className="aeh-b2-actions">
            {connecte
              ? <a href={lienEspace} className="aeh-auth-green">
                  <LayoutGrid size={13} /> Mon espace
                </a>
              : <LienConnexion slug={slug} className="aeh-auth-green">
                  <LogIn size={13} /> Se connecter
                </LienConnexion>
            }
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div className="aeh-mobile-menu">
          {navItems.map(n => (
            <button key={n.id} type="button" className="aeh-mobile-item" onClick={() => handleNav(n.id)}>
              {n.label}
            </button>
          ))}
          <div className="aeh-mobile-btns">
            {connecte
              ? <a href={lienEspace} className="aeh-action-btn"><LayoutGrid size={13} /> Mon espace</a>
              : <LienConnexion slug={slug} className="aeh-action-btn"><LogIn size={13} /> Se connecter</LienConnexion>
            }
            {data.email && <a href={`mailto:${data.email}`} className="aeh-action-btn"><Mail size={13} /> Nous écrire</a>}
          </div>
        </div>
      )}
    </header>
  )
}