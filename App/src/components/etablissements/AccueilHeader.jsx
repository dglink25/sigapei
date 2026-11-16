import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Building2, LogIn, LayoutGrid, Menu, X, Mail } from 'lucide-react'
import LienConnexion from './LienConnexion'
import { ENV } from '../../config/commun/env'
import './AccueilHeader.css'

/**
 * navItems peut contenir soit { id, label } (ancres) soit { id, label, href } (pages).
 * onScrollTo reçoit l'item complet.
 * currentPath optionnel pour marquer l'onglet actif en mode multi-pages.
 */
export default function AccueilHeader({ data, slug, connecte, lienEspace, navItems, onScrollTo, currentPath }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const path = currentPath ?? location.pathname

  function isActive(item) {
    if (item.href) {
      /* Page racine de l'établissement = "Présentation" */
      if (item.id === 'presentation') {
        return path === item.href || path === item.href + '/'
      }
      return path.startsWith(item.href)
    }
    return false
  }

  function handleNav(item) {
    onScrollTo(item)
    setMenuOpen(false)
  }

  return (
    <header className="aeh">

      {/* ══ BANDE 1 - fond vert ══ */}
      <div className="aeh-b1">

        <div className="aeh-logo-left">
          {data.logoUrl
            ? <img src={data.logoUrl} alt={data.nom} />
            : <div className="aeh-logo-ph"><Building2 size={22} /></div>
          }
        </div>

        <div className="aeh-b1-content">
          <div className="aeh-identity">
            <span className="aeh-nom-court">{data.nom}</span>
          </div>
          <div className="aeh-devise-inline" title={data.devise}>
            {data.devise || ''}
          </div>
          <div className="aeh-b1-actions">
            {data.email && (
              <a href={`mailto:${data.email}`} className="aeh-action-btn">
                <Mail size={13} /> Nous écrire
              </a>
            )}
          </div>
        </div>

        <div className="aeh-logo-right">
          <img src="/sigapei.png" alt={ENV.appName} />
        </div>

        <button
          type="button"
          className="aeh-burger"
          aria-label={menuOpen ? 'Fermer' : 'Menu'}
          onClick={() => setMenuOpen(v => !v)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ══ BANDE 2 - fond blanc ══ */}
      <div className="aeh-b2">
        <div className="aeh-b2-nav-wrap">
          <nav className="aeh-nav" aria-label="Navigation">
            {navItems.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`aeh-nav-btn${isActive(n) ? ' is-active' : ''}`}
                onClick={() => handleNav(n)}
              >
                {n.label}
              </button>
            ))}
          </nav>

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
            <button key={n.id} type="button" className="aeh-mobile-item" onClick={() => handleNav(n)}>
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
