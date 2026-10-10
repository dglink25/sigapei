import React, { useState } from 'react';
import { authenticate } from '../services/auth';
import { ROLE_LABELS } from '../config/roles';

const ROLES = [
  {
    id: 'admin',
    label: 'Administrateur',
    sub: 'Direction & configuration',
    color: 'gold',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    id: 'secretaire',
    label: 'Secrétaire',
    sub: 'Candidatures & dossiers',
    color: 'green',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    ),
  },
  {
    id: 'censeur',
    label: 'Censeur',
    sub: 'Emplois du temps & salles',
    color: 'green',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'enseignant',
    label: 'Enseignant',
    sub: 'Mon EDT & mes classes',
    color: 'green',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    id: 'comptable',
    label: 'Comptable',
    sub: 'Suivi paiements (lecture)',
    color: 'green',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'parent',
    label: 'Parent / Élève',
    sub: 'Suivi dossier & scolarité',
    color: 'green',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function LoginPage({ onLogin, onGoRegister }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedRole) { setError('Veuillez sélectionner votre rôle.'); return; }
    if (!email || !password) { setError('Email et mot de passe requis.'); return; }

    setLoading(true);
    try {
      const user = await authenticate(email, password);
      if (!user) {
        setError('Identifiants incorrects ou service indisponible.');
        setLoading(false);
        return;
      }
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Erreur de connexion.');
      setLoading(false);
    }
  };

  const selectedRoleData = ROLES.find(r => r.id === selectedRole);

  return (
    <div className="min-h-screen flex bg-sigapei-canvas">

      {/* ─── Colonne gauche : branding ─────────────────────────────── */}
      <div className="hidden lg:flex w-[45%] bg-sigapei-sidebar flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-sigapei-gold/5 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center space-x-4 mb-2">
            <img
              src="/logo-sigapei.png"
              alt="Logo SIGAPEI"
              className="w-20 h-20 object-contain drop-shadow-2xl"
            />
            <div>
              <span className="block text-sigapei-gold font-black text-3xl tracking-tight leading-none">SIGAPEI</span>
              <span className="block text-sigapei-cream/70 text-xs font-semibold tracking-widest uppercase mt-1">Plateforme Scolaire</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-3xl font-black text-white leading-snug">
            Gérez votre établissement<br />
            <span className="text-sigapei-gold">avec précision.</span>
          </h1>
          <p className="text-sigapei-cream/70 text-sm leading-relaxed max-w-xs">
            Inscriptions, scolarité, emplois du temps, finances — un seul outil,
            tous les acteurs de votre école, chacun à sa place.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { val: '7', label: 'Rôles acteurs' },
              { val: '100%', label: 'Sans doublon' },
              { val: '2', label: 'Programmes' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black text-sigapei-gold">{s.val}</div>
                <div className="text-[11px] text-sigapei-cream/60 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-sigapei-cream/40">
          © 2026 SIGAPEI · Bénin · v1.0
        </div>
      </div>

      {/* ─── Colonne droite : formulaire ───────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-8">

          <div className="flex items-center space-x-3.5">
            <img
              src="/logo-sigapei.png"
              alt="Logo SIGAPEI"
              className="w-14 h-14 object-contain drop-shadow-md"
            />
            <div>
              <h2 className="text-2xl font-black text-slate-900 font-heading">Connexion SIGAPEI</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sélectionnez votre rôle puis validez vos accès.</p>
            </div>
          </div>

          {/* Sélecteur de rôle */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Votre rôle</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ROLES.map(role => {
                const isActive = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleSelect(role.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all text-center space-y-1 ${
                      isActive
                        ? 'border-sigapei-green bg-sigapei-green text-white shadow-md scale-[1.02]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-sigapei-green/50 hover:bg-slate-50'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-sigapei-green'}>{role.icon}</span>
                    <span className="text-[11px] font-bold leading-tight">{role.label}</span>
                    <span className={`text-[10px] leading-tight ${isActive ? 'text-white/80' : 'text-slate-400'}`}>{role.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@etablissement.bj"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-sigapei-green transition"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-sigapei-green transition"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-red-700 font-medium">{error}</span>
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-sigapei-green text-white font-black text-sm tracking-wide hover:bg-[#005530] transition disabled:opacity-60 flex items-center justify-center space-x-2 shadow-md"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Vérification…</span>
                </>
              ) : (
                <span>Se connecter</span>
              )}
            </button>
          </form>

          {/* Séparateur */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-xs text-slate-400 bg-sigapei-canvas px-3">ou</div>
          </div>

          {/* Accès public */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onLogin({ role: 'candidat', nom: 'Visiteur', etablissement: '' })}
              className="py-2.5 rounded-xl border-2 border-slate-200 text-xs font-bold text-slate-600 hover:border-sigapei-green hover:text-sigapei-green hover:bg-slate-50 transition flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Déposer un dossier</span>
            </button>
            <button
              onClick={() => onLogin({ role: 'parent', nom: 'Parent Visiteur', etablissement: '' })}
              className="py-2.5 rounded-xl border-2 border-slate-200 text-xs font-bold text-slate-600 hover:border-sigapei-green hover:text-sigapei-green hover:bg-slate-50 transition flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Suivi parent / élève</span>
            </button>
          </div>

          {/* Inscription établissement */}
          <p className="text-center text-xs text-slate-400">
            Nouvel établissement ?{' '}
            <button onClick={onGoRegister} className="text-sigapei-green font-bold hover:underline">
              Enregistrer mon école →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
