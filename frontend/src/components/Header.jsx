import React from 'react';

export default function Header({ 
  currentSpace, 
  setCurrentSpace, 
  pendingCount, 
  currentUser, 
  onLogout,
  academicYear = '2026-2027',
  onSelectAcademicYear
}) {
  const getInitials = (name) => {
    if (!name) return 'SP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const roleLabel = {
    admin: 'Administrateur',
    secretaire: 'Secrétaire de Scolarité',
    censeur: 'Censeur des Études',
    enseignant: 'Enseignant',
    comptable: 'Comptable',
    parent: 'Parent Référent',
    candidat: 'Candidat / Visiteur'
  }[currentUser?.role] || 'Utilisateur';

  return (
    <header className="bg-sigapei-green text-white border-b border-sigapei-green-dark shrink-0 z-40 shadow-md">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-18 py-1">
          
          {/* LOGO OFFICIEL SIGAPEI */}
          <div className="flex items-center space-x-5">
            <div 
              className="relative flex items-center cursor-pointer select-none group" 
              onClick={() => setCurrentSpace && setCurrentSpace('admin')}
            >
              <img 
                src="/logo-sigapei.png" 
                alt="Logo Officiel SIGAPEI" 
                className="w-13 h-13 sm:w-14 sm:h-14 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
              />
              <span className="ml-3 font-heading font-black text-2xl tracking-wider text-sigapei-cream">SIGAPEI</span>
            </div>
            
            <div className="hidden lg:flex items-center space-x-3 border-l border-white/20 pl-5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-sigapei-gold border border-white/10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-white">{currentUser?.etablissement || 'Collège Saint-Michel de Cotonou'}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-sigapei-gold text-sigapei-black">ACTIF</span>
                </div>
                <p className="text-[11px] text-sigapei-cream/80">Cotonou, Bénin</p>
              </div>
            </div>
          </div>

          {/* Sélecteur d'Année Académique & Profil */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* SÉLECTEUR ANNÉE ACADÉMIQUE */}
            <div className="flex items-center gap-2 bg-black/25 px-3 py-1.5 rounded-xl border border-white/15">
              <span className="text-xs">📅</span>
              <div className="flex flex-col text-left">
                <span className="text-[9px] text-sigapei-gold font-black uppercase tracking-wider leading-none">Année Scolaire</span>
                <select
                  value={academicYear}
                  onChange={e => onSelectAcademicYear && onSelectAcademicYear(e.target.value)}
                  className="bg-transparent text-xs font-black text-sigapei-cream outline-none cursor-pointer mt-0.5"
                >
                  <option value="2026-2027" className="text-slate-900 font-bold">2026-2027 (Active)</option>
                  <option value="2025-2026" className="text-slate-900 font-bold">2025-2026 (Archivée)</option>
                  <option value="2027-2028" className="text-slate-900 font-bold">2027-2028 (Préinscriptions)</option>
                </select>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-medium text-sigapei-cream text-[11px]">Microservices Connectés</span>
            </div>

            <div className="flex items-center space-x-3 pl-2 border-l border-white/20">
              <div className="w-9 h-9 rounded-xl bg-sigapei-cream text-sigapei-green font-black text-xs flex items-center justify-center shadow-md border border-sigapei-gold">
                {getInitials(currentUser?.nom)}
              </div>
              <div className="hidden sm:block text-left text-xs leading-tight">
                <p className="font-bold text-white">{currentUser?.nom || 'Utilisateur'}</p>
                <p className="text-[10px] text-sigapei-gold font-medium">{roleLabel}</p>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Se déconnecter"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-black/20 hover:bg-black/35 text-sigapei-cream border border-white/15 text-xs font-bold transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Quitter</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
