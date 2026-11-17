import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Building2, LogIn, LayoutGrid, Menu, X, Mail, ChevronDown } from 'lucide-react'
import LienConnexion from './LienConnexion'
import { ENV } from '../../config/commun/env'
import './AccueilHeader.css'

export default function AccueilHeader({ data, slug, connecte, lienEspace, navItems, onScrollTo, currentPath }) {
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(null)
  const dropRef = useRef(null)
  const location = useLocation()
  const path = currentPath ?? location.pathname

  /* Fermer le dropdown au clic extérieur */
  useEffect(() => {
    if (!dropdownOpen) return
    function handleClickOutside(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropdownOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  function isActive(item) {
    if (!item.href) return false
    if (item.id === 'accueil') {
      return path === item.href || path === item.href + '/' ||
        path.startsWith(`${item.href}/actualites`) ||
        path.startsWith(`${item.href}/galerie`) ||
        path.startsWith(`${item.href}/contact`)
    }
    if (item.id === 'formations') return path.startsWith(item.href)
    if (item.id === 'presentation') return path === item.href || path === item.href + '/'
    return path.startsWith(item.href)
  }

  function handleNav(item) {
    setMenuOpen(false)
    setDropdownOpen(null)
    onScrollTo(item)
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
            {navItems.map((n) => {
              const actif = isActive(n)
              const hasSub = n.sousMenu && n.sousMenu.length > 0

              if (hasSub) {
                return (
                  <div key={n.id} className="aeh-nav-item-wrap" ref={dropRef}>
                    <button
                      type="button"
                      className={`aeh-nav-btn${actif ? ' is-active' : ''}`}
                      onClick={() => setDropdownOpen((v) => v === n.id ? null : n.id)}
                      aria-haspopup="true"
                      aria-expanded={dropdownOpen === n.id}
                    >
                      {n.label}
                      <ChevronDown size={12} style={{
                        marginLeft: 4,
                        transition: 'transform 0.2s',
                        transform: dropdownOpen === n.id ? 'rotate(180deg)' : 'none',
                      }} />
                    </button>

                    {dropdownOpen === n.id && (
                      <div className="aeh-dropdown" role="menu">
                        {n.sousMenu.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            className={`aeh-dropdown-item${
                              path === sub.href || (sub.href !== '/' && path.startsWith(sub.href + '/'))
                                ? ' is-active' : ''
                            }`}
                            role="menuitem"
                            onMouseDown={(e) => { e.preventDefault(); handleNav(sub) }}
                          >
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <button
                  key={n.id}
                  type="button"
                  className={`aeh-nav-btn${actif ? ' is-active' : ''}`}
                  onClick={() => handleNav(n)}
                >
                  {n.label}
                </button>
              )
            })}
          </nav>

          <div className="aeh-b2-actions">
            {connecte
              ? <a href={lienEspace} className="aeh-auth-green"><LayoutGrid size={13} /> Mon espace</a>
              : <LienConnexion slug={slug} className="aeh-auth-green"><LogIn size={13} /> Se connecter</LienConnexion>
            }
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div className="aeh-mobile-menu">
          {navItems.map(n => (
            <div key={n.id}>
              <button type="button" className="aeh-mobile-item" onClick={() => handleNav(n)}>
                {n.label}
              </button>
              {n.sousMenu && n.sousMenu.map(sub => (
                <button
                  key={sub.id}
                  type="button"
                  className="aeh-mobile-item aeh-mobile-item--sub"
                  onMouseDown={(e) => { e.preventDefault(); handleNav(sub) }}
                >
                  · {sub.label}
                </button>
              ))}
            </div>
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
