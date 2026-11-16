import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Building2, LogIn, LayoutGrid, Menu, X, Mail, ChevronDown } from 'lucide-react'
import LienConnexion from './LienConnexion'
import { ENV } from '../../config/commun/env'
import './AccueilHeader.css'

/* Groupes de navigation : un onglet "parent" peut regrouper plusieurs enfants.
   Si vous voulez regrouper d'autres onglets plus tard, ajoutez une entrée ici. */
const GROUPES = [
  { id: 'accueil', label: 'Accueil', children: ['presentation', 'actualites', 'galerie', 'contact'] },
]

export default function AccueilHeader({
  data,
  slug,
  connecte,
  lienEspace,
  navItems = [],
  onScrollTo,
  currentPath,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState(null) // id du groupe ouvert (desktop ou mobile)
  const location = useLocation()
  const path = currentPath ?? location.pathname
  const navRef = useRef(null)

  /* ── Fermer le dropdown au clic/tap extérieur + à la touche Échap ── */
  useEffect(() => {
    function onPointerDown(e) {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenGroup(null)
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpenGroup(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown, { passive: true })
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  /* ── Construit la liste affichée : on remplace les items appartenant à un
        groupe par un seul onglet parent contenant ses enfants. ── */
  const itemsAffiches = useMemo(() => {
    const result = []
    const groupesDejaAjoutes = new Set()

    for (const n of navItems) {
      const groupeParent = GROUPES.find((g) => g.children.includes(n.id))
      if (groupeParent) {
        if (groupesDejaAjoutes.has(groupeParent.id)) continue
        groupesDejaAjoutes.add(groupeParent.id)
        const enfants = navItems.filter((x) => groupeParent.children.includes(x.id))
        if (enfants.length > 0) {
          result.push({
            id: groupeParent.id,
            label: groupeParent.label,
            children: enfants,
          })
        }
        continue
      }
      result.push(n)
    }
    return result
  }, [navItems])

  /* ── Détermine si un item (ou un de ses enfants) est actif ── */
  const isActive = useCallback(
    (item) => {
      if (item.children) return item.children.some(isActive)
      if (!item.href) return false
      if (item.id === 'presentation') {
        return path === item.href || path === item.href + '/'
      }
      return path.startsWith(item.href)
    },
    [path]
  )

  /* ── Clic sur un onglet parent ou simple ── */
  function handleNav(item) {
    if (item.children) {
      // Ouvre/ferme le sous-menu, ne scrolle pas
      setOpenGroup((v) => (v === item.id ? null : item.id))
      return
    }
    onScrollTo?.(item)
    setMenuOpen(false)
    setOpenGroup(null)
  }

  /* ── Clic sur un enfant du sous-menu ── */
  function handleChildClick(child) {
    onScrollTo?.(child)
    setMenuOpen(false)
    setOpenGroup(null)
  }

  /* ── Ouverture/fermeture du burger : on referme le sous-menu ── */
  function toggleBurger() {
    setMenuOpen((v) => !v)
    setOpenGroup(null)
  }

  return (
    <header className="aeh">
      {/* ══ BANDE 1 - fond vert ══ */}
      <div className="aeh-b1">
        <div className="aeh-logo-left">
          {data.logoUrl ? (
            <img src={data.logoUrl} alt={data.nom} />
          ) : (
            <div className="aeh-logo-ph">
              <Building2 size={22} />
            </div>
          )}
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
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          onClick={toggleBurger}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ══ BANDE 2 - fond blanc ══ */}
      <div className="aeh-b2">
        <div className="aeh-b2-nav-wrap" ref={navRef}>
          <nav className="aeh-nav" aria-label="Navigation principale">
            {itemsAffiches.map((n) => {
              const active = isActive(n)
              return (
                <div key={n.id} className="aeh-nav-item">
                  <button
                    type="button"
                    className={`aeh-nav-btn${active ? ' is-active' : ''}${
                      n.children ? ' has-children' : ''
                    }`}
                    onClick={() => handleNav(n)}
                    aria-haspopup={n.children ? true : undefined}
                    aria-expanded={n.children ? openGroup === n.id : undefined}
                    aria-current={active ? 'page' : undefined}
                  >
                    {n.label}
                    {n.children && <ChevronDown size={14} className="aeh-chevron" />}
                  </button>

                  {n.children && openGroup === n.id && (
                    <div className="aeh-dropdown" role="menu">
                      {n.children.map((child) => {
                        const childActive = isActive(child)
                        return (
                          <button
                            key={child.id}
                            type="button"
                            role="menuitem"
                            className={`aeh-dropdown-item${childActive ? ' is-active' : ''}`}
                            aria-current={childActive ? 'page' : undefined}
                            onClick={() => handleChildClick(child)}
                          >
                            {child.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          <div className="aeh-b2-actions">
            {connecte ? (
              <a href={lienEspace} className="aeh-auth-green">
                <LayoutGrid size={13} /> Mon espace
              </a>
            ) : (
              <LienConnexion slug={slug} className="aeh-auth-green">
                <LogIn size={13} /> Se connecter
              </LienConnexion>
            )}
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div className="aeh-mobile-menu">
          {itemsAffiches.map((n) =>
            n.children ? (
              <div key={n.id} className="aeh-mobile-group">
                <button
                  type="button"
                  className="aeh-mobile-item aeh-mobile-item--parent"
                  aria-expanded={openGroup === n.id}
                  onClick={() => setOpenGroup((v) => (v === n.id ? null : n.id))}
                >
                  {n.label}
                  <ChevronDown
                    size={16}
                    className={`aeh-mobile-chevron${openGroup === n.id ? ' is-open' : ''}`}
                  />
                </button>
                {openGroup === n.id && (
                  <div className="aeh-mobile-sub">
                    {n.children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        className={`aeh-mobile-item aeh-mobile-item--child${
                          isActive(child) ? ' is-active' : ''
                        }`}
                        aria-current={isActive(child) ? 'page' : undefined}
                        onClick={() => handleChildClick(child)}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                key={n.id}
                type="button"
                className="aeh-mobile-item"
                onClick={() => handleNav(n)}
              >
                {n.label}
              </button>
            )
          )}

          <div className="aeh-mobile-btns">
            {connecte ? (
              <a href={lienEspace} className="aeh-action-btn">
                <LayoutGrid size={13} /> Mon espace
              </a>
            ) : (
              <LienConnexion slug={slug} className="aeh-action-btn">
                <LogIn size={13} /> Se connecter
              </LienConnexion>
            )}
            {data.email && (
              <a href={`mailto:${data.email}`} className="aeh-action-btn">
                <Mail size={13} /> Nous écrire
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  )
}