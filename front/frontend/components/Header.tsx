"use client";

import React from "react";

interface HeaderProps {
  isDark: boolean;
  onToggleDark: () => void;
  isSide: boolean;
  onToggleSide: () => void;
  activeNav: string;
}

export default function Header({
  isDark,
  onToggleDark,
  isSide,
  onToggleSide,
  activeNav,
}: HeaderProps) {
  return (
    <>
      <header id="hd">
        <div className="nav">
          <a href="#top" className="brand">
            <i className="lg" role="img" aria-label="Logo" />
            <span>E-Académique</span>
          </a>

          <nav className="links" aria-label="Navigation principale">
            <a href="#profils" className={activeNav === "profils" ? "act" : ""}>
              Pour qui
            </a>
            <a href="#modules" className={activeNav === "modules" ? "act" : ""}>
              Modules
            </a>
            <a href="#demarrer" className={activeNav === "demarrer" ? "act" : ""}>
              Démarrer
            </a>
            <a href="#securite" className={activeNav === "securite" ? "act" : ""}>
              Sécurité
            </a>
            <a href="#offres" className={activeNav === "offres" ? "act" : ""}>
              Offres
            </a>
          </nav>

          <div className="acts">
            {/* Theme Toggle Button */}
            <button
              className="ib"
              id="th"
              onClick={onToggleDark}
              aria-label="Basculer entre mode jour et nuit"
              title={isDark ? "Passer en mode jour" : "Passer en mode nuit"}
            >
              <svg className="sun" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
              <svg className="moon" viewBox="0 0 24 24">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            </button>

            {/* Layout Toggle Button (Navbar vs Sidebar) */}
            <button
              className="ib"
              id="lay"
              onClick={onToggleSide}
              aria-label="Basculer entre barre de navigation et barre latérale"
              aria-pressed={isSide}
              title={isSide ? "Passer en mode Topbar" : "Passer en mode Sidebar"}
            >
              <svg viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="16" rx="3" />
                <path d="M9 4v16" />
              </svg>
            </button>

            <a className="btn b-g" href="#final">
              Inscrire mon école
            </a>
          </div>
        </div>
      </header>

      {/* Scrim Overlay */}
      <div className="scrim" id="scrim" onClick={onToggleSide} />
    </>
  );
}
