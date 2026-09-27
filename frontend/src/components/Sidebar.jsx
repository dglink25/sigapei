import React from 'react';

// Navigation items avec restrictions par rôle
const ALL_NAV_ITEMS = [
  // ── ADMIN / DIRECTION ──
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    roles: ['admin'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    badge: null
  },
  {
    id: 'candidatures',
    label: 'Instruction Candidatures',
    roles: ['admin', 'secretaire'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    ),
    badge: 'pending'
  },
  {
    id: 'classes',
    label: 'Classes & Capacité',
    roles: ['admin'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
      </svg>
    ),
    badge: <span className="text-[10px] text-sigapei-cream/60">Jauges</span>
  },
  {
    id: 'apprenants',
    label: 'Dossiers & Mutations',
    roles: ['admin', 'secretaire', 'censeur'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    badge: <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-sigapei-cream font-bold">Sans doublon</span>
  },
  {
    id: 'emplois',
    label: 'Emplois du Temps',
    roles: ['admin', 'censeur'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    badge: <span className="text-[10px] text-sigapei-cream/60">Censeur</span>
  },
  {
    id: 'finances',
    label: 'Frais de Scolarité',
    roles: ['admin', 'secretaire'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    badge: <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/15 text-sigapei-gold font-bold">Lecture Seule</span>
  },
  {
    id: 'matieres',
    label: 'Matières & Notes',
    roles: ['admin', 'censeur'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    badge: <span className="text-[9px] px-1.5 py-0.5 rounded bg-sigapei-gold text-sigapei-black font-black">Coefficients</span>
  },
  {
    id: 'annees',
    label: 'Années Scolaires',
    roles: ['admin'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    badge: <span className="text-[10px] text-sigapei-cream/70">Rentrée</span>
  },

  // ── ENSEIGNANT ──
  {
    id: 'ens_edt',
    label: 'Mon Emploi du Temps',
    roles: ['enseignant'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    badge: <span className="text-[10px] text-sigapei-gold font-bold">Semaine</span>
  },
  {
    id: 'ens_appel',
    label: 'Feuille d’Appel',
    roles: ['enseignant'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    badge: <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Présences</span>
  },
  {
    id: 'ens_classes',
    label: 'Mes Classes',
    roles: ['enseignant'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
      </svg>
    ),
    badge: null
  },
  {
    id: 'ens_dossiers',
    label: 'Dossiers Apprenants',
    roles: ['enseignant'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    badge: null
  },
  {
    id: 'ens_notes',
    label: 'Saisie des Notes',
    roles: ['enseignant'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    badge: <span className="text-[9px] px-1.5 py-0.5 rounded bg-sigapei-gold text-sigapei-black font-black">Évaluations</span>
  },

  // ── COMPTABLE / CAISSIER (OPÉRATIONNEL !) ──
  {
    id: 'cpt_caisse',
    label: 'Guichet d’Encaissement',
    roles: ['comptable'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    badge: <span className="text-[9px] px-1.5 py-0.5 rounded bg-sigapei-gold text-sigapei-black font-black">+ Nouveau Reçu</span>
  },
  {
    id: 'cpt_echeanciers',
    label: 'Échéanciers & Soldes',
    roles: ['comptable'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    badge: null
  },
  {
    id: 'cpt_relances',
    label: 'Relances & Moratoires',
    roles: ['comptable'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    badge: <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">Impayés</span>
  },
  {
    id: 'cpt_cloture',
    label: 'Journal & Clôture Caisse',
    roles: ['comptable'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    badge: <span className="text-[10px] text-sigapei-cream/70">Quotidien</span>
  },
  {
    id: 'cpt_dashboard',
    label: 'Vue Synthétique KPIs',
    roles: ['comptable'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    badge: null
  },

  // ── PARENT / ÉLÈVE ──
  {
    id: 'par_dashboard',
    label: 'Vue d’Ensemble Enfant',
    roles: ['parent'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    badge: null
  },
  {
    id: 'par_bulletin',
    label: 'Relevé & Bulletins',
    roles: ['parent'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    badge: <span className="text-[9px] px-1.5 py-0.5 rounded bg-sigapei-gold text-sigapei-black font-black">Notes</span>
  },
  {
    id: 'par_edt',
    label: 'Emploi du Temps',
    roles: ['parent'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    badge: null
  },
  {
    id: 'par_finances',
    label: 'Frais & Paiements',
    roles: ['parent'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    badge: <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Reçus</span>
  },
  {
    id: 'par_historique',
    label: 'Assiduité & Parcours',
    roles: ['parent'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    badge: null
  },

  // ── CANDIDAT / VISITEUR ──
  {
    id: 'cand_form',
    label: 'Nouvelle Candidature',
    roles: ['candidat'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
      </svg>
    ),
    badge: null
  },
  {
    id: 'cand_suivi',
    label: 'Suivi de Dossier',
    roles: ['candidat'],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    badge: null
  }
];

const ROLE_LABELS = {
  admin:      { label: 'Administrateur',        module: 'Direction Générale' },
  secretaire: { label: 'Secrétaire de Scolarité', module: 'Admissions & Guichet' },
  censeur:    { label: 'Censeur des Études',    module: 'Pédagogie & Notes' },
  enseignant: { label: 'Enseignant Certifié',   module: 'Espace Pédagogique' },
  comptable:  { label: 'Comptable & Caissier',  module: 'Gestion Financière' },
  parent:     { label: 'Parent Référent',       module: 'Espace Famille & Élève' },
  candidat:   { label: 'Candidat / Visiteur',   module: 'Portail Admission' }
};

export default function Sidebar({ 
  currentNav, 
  setCurrentNav, 
  pendingCount = 0, 
  role = 'admin',
  isOpenMobile = false,
  onCloseMobile = () => {}
}) {
  const visibleItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(role));

  // Redirection automatique si le nav actif n'est pas autorisé pour ce rôle
  const effectiveNav = visibleItems.find(i => i.id === currentNav) ? currentNav : (visibleItems[0]?.id || 'dashboard');

  const roleInfo = ROLE_LABELS[role] || ROLE_LABELS.admin;

  const content = (
    <div className="flex flex-col h-full bg-sigapei-sidebar text-white shadow-2xl border-r border-sigapei-sidebar-deep">
      
      {/* En-tête de la sidebar avec titre du rôle & module */}
      <div className="p-6 pb-4 border-b border-sigapei-sidebar-deep flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-sigapei-gold block">
            {roleInfo.module}
          </span>
          <span className="text-sm font-extrabold text-sigapei-cream font-heading">
            {roleInfo.label}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm animate-pulse" />
          {/* Bouton de fermeture mobile */}
          <button 
            onClick={onCloseMobile}
            className="md:hidden text-sigapei-cream hover:text-white p-1 rounded-lg bg-white/10"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Navigation filtrée */}
      <div className="p-4 flex-1 overflow-y-auto space-y-1.5 text-xs font-semibold">
        {visibleItems.map(item => {
          const isActive = effectiveNav === item.id;
          const badge = item.badge === 'pending'
            ? (pendingCount > 0
                ? <span className="px-2 py-0.5 rounded-full text-[10px] bg-sigapei-gold text-sigapei-black font-black">{pendingCount}</span>
                : null)
            : item.badge;

          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentNav(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition ${
                isActive
                  ? 'font-black bg-sigapei-gold text-sigapei-black shadow-md'
                  : 'text-sigapei-cream/90 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                <span className={isActive ? 'text-sigapei-black' : 'text-sigapei-gold'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              {badge}
            </button>
          );
        })}
      </div>

      {/* Pied de sidebar */}
      <div className="p-4 border-t border-sigapei-sidebar-deep bg-sigapei-sidebar-deep/40">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-sigapei-gold/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-sigapei-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black text-sigapei-gold uppercase tracking-wider">{roleInfo.label}</div>
            <div className="text-[11px] text-sigapei-cream/60 truncate">{visibleItems.length} module(s) actif(s)</div>
          </div>
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* ── Version Desktop Fixe ── */}
      <aside className="w-72 shrink-0 hidden md:block h-full z-30">
        {content}
      </aside>

      {/* ── Version Mobile / Tablette Drawer ── */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-sigapei-black/60 backdrop-blur-sm transition-opacity" 
            onClick={onCloseMobile} 
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-50">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
