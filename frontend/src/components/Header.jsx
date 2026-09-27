import React from 'react';

export default function Header({ currentSpace, setCurrentSpace, pendingCount }) {
  return (
    <header className="bg-sigapei-green text-white border-b border-sigapei-green-dark shrink-0 z-40 shadow-md">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* LOGO OFFICIEL SIGAPEI CONFORME AUX PAGES 3, 4 ET 12 DE LA CHARTE */}
          <div className="flex items-center space-x-5">
            <div 
              className="relative flex items-center cursor-pointer select-none group" 
              onClick={() => setCurrentSpace('admin')}
            >
              {/* Bloc principal : Carré aux angles fortement arrondis en Vert #006B3C */}
              <div className="w-12 h-12 rounded-[18px] bg-sigapei-green border-2 border-sigapei-cream/30 flex items-center justify-center shadow-lg relative group-hover:scale-105 transition-transform overflow-hidden">
                <span className="text-xs font-black tracking-wider text-sigapei-cream font-heading">SIG</span>
              </div>
              {/* Accent : Forme dorée inclinée #E9AA20 superposée en bas à droite */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-sigapei-gold rounded-sm rotate-45 border-2 border-sigapei-green shadow-sm"></div>
              {/* Signature « SIGAPEI » en capitales crème très contrasté */}
              <span className="ml-3 font-heading font-black text-xl tracking-wider text-sigapei-cream">SIGAPEI</span>
            </div>
            
            <div className="hidden lg:flex items-center space-x-3 border-l border-white/20 pl-5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-sigapei-gold border border-white/10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-white">Complexe Scolaire Jean-Marie</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-sigapei-gold text-sigapei-black">TENANT #1</span>
                </div>
                <p className="text-[11px] text-sigapei-cream/80">Cotonou, Bénin • Année 2026-2027</p>
              </div>
            </div>
          </div>

          {/* SÉLECTEUR D'ESPACES (PAS DE SITE VITRINE) */}
          <div className="flex items-center bg-black/25 p-1 rounded-2xl border border-white/15">
            <button 
              onClick={() => setCurrentSpace('admin')} 
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                currentSpace === 'admin' 
                  ? 'bg-sigapei-gold text-sigapei-black shadow-md' 
                  : 'text-sigapei-cream/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Administration & Scolarité</span>
            </button>

            <button 
              onClick={() => setCurrentSpace('candidat')} 
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                currentSpace === 'candidat' 
                  ? 'bg-sigapei-gold text-sigapei-black shadow-md' 
                  : 'text-sigapei-cream/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg className={`w-4 h-4 ${currentSpace === 'candidat' ? 'text-sigapei-black' : 'text-sigapei-gold'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>Admissions & Inscriptions</span>
            </button>

            <button 
              onClick={() => setCurrentSpace('parent')} 
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                currentSpace === 'parent' 
                  ? 'bg-sigapei-gold text-sigapei-black shadow-md' 
                  : 'text-sigapei-cream/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg className={`w-4 h-4 ${currentSpace === 'parent' ? 'text-sigapei-black' : 'text-sigapei-gold'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Espace Parent & Élève</span>
            </button>
          </div>

          {/* Profil & Statut Microservices */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center gap-2 text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-medium text-sigapei-cream text-[11px]">Ports 4003 & 4004 Connectés</span>
            </div>

            <div className="flex items-center space-x-2.5 pl-2 border-l border-white/20">
              <div className="w-9 h-9 rounded-xl bg-sigapei-cream text-sigapei-green font-black text-xs flex items-center justify-center shadow-md border border-sigapei-gold">
                HK
              </div>
              <div className="hidden xl:block text-left text-xs leading-tight">
                <p className="font-bold text-white">Harold MIKPONHOUE</p>
                <p className="text-[10px] text-sigapei-gold font-medium">Chef de Scolarité</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
