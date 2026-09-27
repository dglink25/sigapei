import React, { useState } from 'react';

const STEPS = [
  { id: 1, label: 'Établissement', sub: 'Informations de base' },
  { id: 2, label: 'Programme',     sub: 'Pédagogie & cycles' },
  { id: 3, label: 'Structure',     sub: 'Niveaux & filières' },
  { id: 4, label: 'Fondateur',     sub: 'Compte administrateur' },
];

export default function RegisterEtablissementPage({ onBack, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    // Step 1
    nom: '', ville: '', pays: 'Bénin', type: '',
    // Step 2
    programme: '', cycles: [],
    // Step 3
    niveaux: [], filieres: [],
    // Step 4
    fondateur_prenom: '', fondateur_nom: '', fondateur_email: '', fondateur_password: '', fondateur_password2: ''
  });
  const [errors, setErrors] = useState({});

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const toggleArray = (field, val) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(val) ? f[field].filter(v => v !== val) : [...f[field], val]
    }));
  };

  const validate = () => {
    const e = {};
    if (step === 1) {
      if (!form.nom.trim()) e.nom = 'Nom requis';
      if (!form.ville.trim()) e.ville = 'Ville requise';
      if (!form.type) e.type = 'Type requis';
    }
    if (step === 2) {
      if (!form.programme) e.programme = 'Choisissez un programme';
      if (!form.cycles.length) e.cycles = 'Sélectionnez au moins un cycle';
    }
    if (step === 3) {
      if (!form.niveaux.length) e.niveaux = 'Sélectionnez au moins un niveau';
    }
    if (step === 4) {
      if (!form.fondateur_prenom.trim()) e.fondateur_prenom = 'Prénom requis';
      if (!form.fondateur_nom.trim()) e.fondateur_nom = 'Nom requis';
      if (!form.fondateur_email.trim()) e.fondateur_email = 'Email requis';
      if (!form.fondateur_password) e.fondateur_password = 'Mot de passe requis';
      else if (form.fondateur_password.length < 6) e.fondateur_password = 'Minimum 6 caractères';
      if (form.fondateur_password !== form.fondateur_password2) e.fondateur_password2 = 'Les mots de passe ne correspondent pas';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const prev = () => setStep(s => s - 1);

  const submit = () => {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
    }, 1500);
  };

  const TYPES = ['Collège privé', 'Lycée privé', 'École primaire privée', 'Institut polytechnique', 'Complexe scolaire'];
  const CYCLES_BENO = ['CI-CM2 (Primaire)', 'Sixième–Troisième (Collège)', 'Seconde–Terminale (Lycée)'];
  const CYCLES_FR   = ['CM1-CM2', 'Sixième–Troisième', 'Seconde–Terminale BTS'];
  const NIVEAUX_LIST = form.cycles.flatMap(c => {
    if (c.includes('Primaire') || c.includes('CM')) return ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'];
    if (c.includes('Collège') || c.includes('Sixième')) return ['6ème', '5ème', '4ème', '3ème'];
    if (c.includes('Lycée') || c.includes('Seconde')) return ['2nde', '1ère', 'Terminale'];
    return [];
  }).filter((v, i, a) => a.indexOf(v) === i);

  const FILIERES = ['Générale A', 'Générale C', 'Générale D', 'Technique', 'Professionnelle', 'Sciences', 'Littéraire', 'Économique'];

  const Field = ({ label, name, type = 'text', placeholder }) => (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={e => set(name, e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition bg-white ${
          errors[name] ? 'border-red-400' : 'border-slate-200 focus:border-sigapei-green'
        }`}
      />
      {errors[name] && <p className="text-xs text-red-500">{errors[name]}</p>}
    </div>
  );

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sigapei-canvas p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-sigapei-green/10 flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-sigapei-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Établissement enregistré !</h2>
            <p className="text-sm text-slate-500 mt-2">
              <span className="font-bold text-sigapei-green">{form.nom}</span> est maintenant sur SIGAPEI.<br/>
              Un email de confirmation a été envoyé à <span className="font-mono text-slate-700">{form.fondateur_email}</span>.
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-8 py-3 bg-sigapei-green text-white font-black rounded-xl text-sm hover:bg-[#005530] transition shadow-md"
          >
            Aller à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-sigapei-canvas">

      {/* Branding gauche */}
      <div className="hidden lg:flex w-[38%] bg-sigapei-sidebar flex-col justify-between p-12 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3 pointer-events-none" />

        <div className="relative z-10 flex items-center space-x-3">
          <img 
            src="/logo-sigapei.png" 
            alt="Logo SIGAPEI" 
            className="w-11 h-11 object-contain drop-shadow-md" 
          />
          <span className="text-sigapei-gold font-black text-xl">SIGAPEI</span>
        </div>

        {/* Stepper vertical */}
        <div className="relative z-10 space-y-0">
          <h2 className="text-white font-black text-xl mb-6">Enregistrer votre établissement</h2>
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-start space-x-4">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition ${
                  step > s.id ? 'bg-sigapei-gold text-sigapei-black' :
                  step === s.id ? 'bg-white text-sigapei-black' :
                  'bg-white/20 text-white/50'
                }`}>
                  {step > s.id ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s.id}
                </div>
                {i < STEPS.length - 1 && <div className="w-0.5 h-8 bg-white/20 mt-1" />}
              </div>
              <div className="pt-1 pb-8">
                <div className={`text-sm font-bold ${step === s.id ? 'text-white' : step > s.id ? 'text-sigapei-gold' : 'text-white/40'}`}>{s.label}</div>
                <div className={`text-xs ${step === s.id ? 'text-sigapei-cream/70' : 'text-white/30'}`}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 text-[11px] text-sigapei-cream/40">© 2026 SIGAPEI</div>
      </div>

      {/* Formulaire */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">

          {/* Mobile: stepper horizontal */}
          <div className="flex lg:hidden items-center justify-between mb-4">
            {STEPS.map(s => (
              <div key={s.id} className={`flex-1 h-1.5 rounded-full mx-0.5 transition-all ${step >= s.id ? 'bg-sigapei-green' : 'bg-slate-200'}`} />
            ))}
          </div>

          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Étape {step} / {STEPS.length}</div>
            <h2 className="text-xl font-black text-slate-900">{STEPS[step-1].label}</h2>
            <p className="text-sm text-slate-500">{STEPS[step-1].sub}</p>
          </div>

          {/* ── Étape 1 ── */}
          {step === 1 && (
            <div className="space-y-4">
              <Field label="Nom de l'établissement" name="nom" placeholder="Ex: Collège Saint-Michel de Cotonou" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ville" name="ville" placeholder="Cotonou" />
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pays</label>
                  <select value={form.pays} onChange={e => set('pays', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-sigapei-green bg-white">
                    {['Bénin','Togo','Côte d\'Ivoire','Sénégal','Mali','Cameroun','France'].map(p => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Type d'établissement</label>
                <div className="grid grid-cols-1 gap-2">
                  {TYPES.map(t => (
                    <button key={t} type="button" onClick={() => set('type', t)}
                      className={`px-4 py-2.5 rounded-xl border-2 text-xs font-semibold text-left transition ${
                        form.type === t ? 'border-sigapei-green bg-sigapei-green/10 text-sigapei-green' : 'border-slate-200 text-slate-600 hover:border-sigapei-green/40'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
                {errors.type && <p className="text-xs text-red-500">{errors.type}</p>}
              </div>
            </div>
          )}

          {/* ── Étape 2 ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Programme pédagogique</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Béninois','Français'].map(p => (
                    <button key={p} type="button" onClick={() => { set('programme', p); setForm(f => ({...f, cycles: [], niveaux: []})); }}
                      className={`p-4 rounded-xl border-2 text-center transition ${
                        form.programme === p ? 'border-sigapei-green bg-sigapei-green/10' : 'border-slate-200 hover:border-sigapei-green/40'
                      }`}>
                      <div className="text-2xl mb-1">{p === 'Béninois' ? '🇧🇯' : '🇫🇷'}</div>
                      <div className={`text-sm font-bold ${form.programme === p ? 'text-sigapei-green' : 'text-slate-700'}`}>{p}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {p === 'Béninois' ? 'Accès élève via parent' : 'Compte élève autonome (secondaire)'}
                      </div>
                    </button>
                  ))}
                </div>
                {errors.programme && <p className="text-xs text-red-500">{errors.programme}</p>}
              </div>

              {form.programme && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cycles proposés</label>
                  <div className="space-y-2">
                    {(form.programme === 'Béninois' ? CYCLES_BENO : CYCLES_FR).map(c => (
                      <button key={c} type="button" onClick={() => toggleArray('cycles', c)}
                        className={`w-full px-4 py-2.5 rounded-xl border-2 text-xs font-semibold text-left flex items-center space-x-3 transition ${
                          form.cycles.includes(c) ? 'border-sigapei-green bg-sigapei-green/10 text-sigapei-green' : 'border-slate-200 text-slate-600'
                        }`}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                          form.cycles.includes(c) ? 'bg-sigapei-green border-sigapei-green' : 'border-slate-300'
                        }`}>
                          {form.cycles.includes(c) && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span>{c}</span>
                      </button>
                    ))}
                  </div>
                  {errors.cycles && <p className="text-xs text-red-500">{errors.cycles}</p>}
                </div>
              )}
            </div>
          )}

          {/* ── Étape 3 ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Niveaux disponibles</label>
                {NIVEAUX_LIST.length === 0 && (
                  <p className="text-xs text-amber-600 italic">Retournez à l'étape 2 pour sélectionner des cycles d'abord.</p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {NIVEAUX_LIST.map(n => (
                    <button key={n} type="button" onClick={() => toggleArray('niveaux', n)}
                      className={`py-2 rounded-xl border-2 text-xs font-bold transition ${
                        form.niveaux.includes(n) ? 'border-sigapei-green bg-sigapei-green text-white' : 'border-slate-200 text-slate-600 hover:border-sigapei-green/40'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
                {errors.niveaux && <p className="text-xs text-red-500">{errors.niveaux}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filières (optionnel)</label>
                <div className="grid grid-cols-2 gap-2">
                  {FILIERES.map(f => (
                    <button key={f} type="button" onClick={() => toggleArray('filieres', f)}
                      className={`py-2 px-3 rounded-xl border-2 text-xs font-semibold text-left transition ${
                        form.filieres.includes(f) ? 'border-sigapei-gold bg-sigapei-gold/10 text-amber-800' : 'border-slate-200 text-slate-600'
                      }`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Étape 4 ── */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <span className="font-bold">Ce compte aura tous les droits administrateur</span> sur l'établissement <span className="font-bold">{form.nom}</span>.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prénom" name="fondateur_prenom" placeholder="Jean" />
                <Field label="Nom" name="fondateur_nom" placeholder="AHOUANSOU" />
              </div>
              <Field label="Email" name="fondateur_email" type="email" placeholder="directeur@monecole.bj" />
              <Field label="Mot de passe" name="fondateur_password" type="password" placeholder="••••••••" />
              <Field label="Confirmer le mot de passe" name="fondateur_password2" type="password" placeholder="••••••••" />
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={step === 1 ? onBack : prev}
              className="flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span>{step === 1 ? 'Retour connexion' : 'Précédent'}</span>
            </button>

            {step < 4 ? (
              <button type="button" onClick={next}
                className="flex items-center space-x-2 px-6 py-3 bg-sigapei-green text-white rounded-xl text-xs font-black hover:bg-[#005530] transition shadow-md">
                <span>Suivant</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={loading}
                className="flex items-center space-x-2 px-6 py-3 bg-sigapei-green text-white rounded-xl text-xs font-black hover:bg-[#005530] transition shadow-md disabled:opacity-60">
                {loading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>
                    <span>Créer l'établissement</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
