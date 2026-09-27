import React from 'react';

export default function Sidebar({ currentNav, setCurrentNav, pendingCount }) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      badge: null
    },
    {
      id: 'candidatures',
      label: 'Instruction Candidatures',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
      badge: pendingCount > 0 ? (
        <span className="px-2 py-0.5 rounded-full text-[10px] bg-sigapei-gold text-sigapei-black font-black">
          {pendingCount}
        </span>
      ) : null
    },
    {
      id: 'classes',
      label: 'Classes & Capacité',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
        </svg>
      ),
      badge: <span className="text-[10px] text-sigapei-cream/60">Jauges</span>
    },
    {
      id: 'apprenants',
      label: 'Dossiers & Mutations',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      badge: <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-sigapei-cream font-bold">Sans doublon</span>
    },
    {
      id: 'emplois',
      label: 'Emplois du Temps',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      badge: <span className="text-[10px] text-sigapei-cream/60">Censeur</span>
    },
    {
      id: 'finances',
      label: 'Frais de Scolarité',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      badge: <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/15 text-sigapei-gold font-bold">Lecture Seule</span>
    }
  ];

  return (
    <aside className="w-72 bg-sigapei-sidebar text-white flex flex-col justify-between shrink-0 shadow-xl border-r border-sigapei-sidebar-deep hidden md:flex z-30">
      <div className="p-6 space-y-6">
        
        {/* TITRE DU MODULE SELON CHARTE PAGE 8 */}
        <div className="pb-4 border-b border-sigapei-sidebar-deep flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-sigapei-gold block">Direction Pédagogique</span>
            <span className="text-sm font-extrabold text-sigapei-cream font-heading">Gestion Scolarité</span>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm animate-pulse"></span>
        </div>

        {/* NAVIGATION DE LA SIDEBAR */}
        <nav className="space-y-2 text-xs font-semibold">
          {navItems.map(item => {
            const isActive = currentNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentNav(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${
                  isActive
                    ? 'font-bold bg-sigapei-gold text-sigapei-black shadow-md'
                    : 'text-sigapei-cream/90 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={isActive ? 'text-sigapei-black' : 'text-sigapei-gold'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge}
              </button>
            );
          })}
        </nav>
      </div>

      {/* PIED DE SIDEBAR : INFRASTRUCTURE ET ACTEURS DU CAHIER DES CHARGES */}
      <div className="p-4 bg-sigapei-sidebar-deep border-t border-white/10 space-y-3">
        <div className="flex items-center justify-between text-[10px] font-black text-sigapei-gold uppercase tracking-wider">
          <span>Rôles Cahier des Charges</span>
          <span>Acteurs</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <span className="px-2 py-1 rounded bg-white/10 text-white font-medium text-center">Secrétaire</span>
          <span className="px-2 py-1 rounded bg-white/10 text-white font-medium text-center">Administrateur</span>
          <span className="px-2 py-1 rounded bg-white/10 text-white font-medium text-center">Censeur</span>
          <span className="px-2 py-1 rounded bg-white/10 text-white font-medium text-center">Comptable</span>
        </div>
        <div className="pt-1 text-[10px] text-slate-300 border-t border-white/10 flex items-center justify-between">
          <span>Base PostgreSQL Neon</span>
          <span className="text-emerald-400 font-mono font-bold">Schéma Scolarité</span>
        </div>
      </div>
    </aside>
  );
}
