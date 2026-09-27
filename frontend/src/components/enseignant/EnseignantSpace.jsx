import React, { useState } from 'react';
import { initialApprenants, initialClasses } from '../../data/initialData';

const MON_EDT = {
  'Lundi':    [{ heure: '08h-09h', matiere: 'Mathématiques', classe: '3ème A', salle: 'Salle 12' }, { heure: '10h-11h', matiere: 'Mathématiques', classe: '2nde B', salle: 'Salle 07' }],
  'Mardi':    [{ heure: '09h-10h', matiere: 'Mathématiques', classe: '3ème A', salle: 'Salle 12' }],
  'Mercredi': [{ heure: '08h-10h', matiere: 'Mathématiques', classe: '1ère C', salle: 'Salle 03' }],
  'Jeudi':    [{ heure: '11h-12h', matiere: 'Mathématiques', classe: '2nde B', salle: 'Salle 07' }],
  'Vendredi': [{ heure: '08h-09h', matiere: 'Mathématiques', classe: 'Terminale D', salle: 'Salle 01' }],
};

const MES_CLASSES = ['3ème A', '2nde B', '1ère C', 'Terminale D'];

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

const COLORS = ['bg-blue-100 text-blue-800 border-blue-200', 'bg-indigo-100 text-indigo-800 border-indigo-200', 'bg-teal-100 text-teal-800 border-teal-200', 'bg-amber-100 text-amber-800 border-amber-200', 'bg-purple-100 text-purple-800 border-purple-200'];

export default function EnseignantSpace({ currentUser }) {
  const [tab, setTab] = useState('edt');
  const [selectedClasse, setSelectedClasse] = useState(null);
  const [searchApprenant, setSearchApprenant] = useState('');

  const apprenantsFiltres = initialApprenants.filter(a => {
    const classeMatch = selectedClasse ? a.classe_id === selectedClasse : MES_CLASSES.some(c => c === (initialClasses.find(cl => cl.id === a.classe_id)?.nom));
    const searchMatch = !searchApprenant || `${a.nom} ${a.prenom}`.toLowerCase().includes(searchApprenant.toLowerCase());
    return classeMatch && searchMatch;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-sigapei-canvas">

      {/* Header espace */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-sigapei-green mb-0.5">Espace Enseignant</div>
          <h1 className="text-lg font-black text-slate-900">{currentUser?.nom}</h1>
          <p className="text-xs text-slate-400">{currentUser?.etablissement} · Lecture seule</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 font-black uppercase tracking-wider">Enseignant</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 bg-white border-b border-slate-100 px-8">
        <div className="flex space-x-0 text-sm font-bold">
          {[
            { id: 'edt', label: 'Mon Emploi du Temps', icon: '🗓️' },
            { id: 'classes', label: 'Mes Classes', icon: '📚' },
            { id: 'apprenants', label: 'Dossiers Apprenants', icon: '👤' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-3.5 border-b-2 transition text-sm ${
                tab === t.id ? 'border-sigapei-green text-sigapei-green' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">

        {/* ── Emploi du Temps ── */}
        {tab === 'edt' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-800">Mon emploi du temps</h2>
              <p className="text-xs text-slate-400">Semaine en cours · Lecture seule</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {JOURS.map((jour, ji) => (
                <div key={jour} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-sigapei-sidebar px-4 py-2.5">
                    <span className="text-xs font-black text-sigapei-cream uppercase tracking-wider">{jour}</span>
                  </div>
                  <div className="p-3 space-y-2 min-h-[120px]">
                    {(MON_EDT[jour] || []).length === 0 ? (
                      <div className="text-center text-xs text-slate-300 pt-4">Libre</div>
                    ) : (
                      (MON_EDT[jour] || []).map((c, i) => (
                        <div key={i} className={`p-2.5 rounded-xl border text-xs ${COLORS[(ji + i) % COLORS.length]}`}>
                          <div className="font-black">{c.heure}</div>
                          <div className="font-semibold mt-0.5">{c.matiere}</div>
                          <div className="text-[10px] mt-1 opacity-70">{c.classe} · {c.salle}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Mes Classes ── */}
        {tab === 'classes' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-800">Mes classes affectées</h2>
              <p className="text-xs text-slate-400">{MES_CLASSES.length} classes · Lecture seule</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {MES_CLASSES.map((nom, i) => {
                const cl = initialClasses.find(c => c.nom === nom);
                const nb = cl ? cl.inscrits : Math.floor(20 + Math.random() * 15);
                const cap = cl ? cl.capacite : 45;
                const pct = Math.round((nb / cap) * 100);
                return (
                  <div key={nom} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${COLORS[i % COLORS.length].split(' ').slice(0,2).join(' ')}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      </svg>
                    </div>
                    <div className="font-black text-slate-800 text-sm">{nom}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{nb} élèves</div>
                    <div className="mt-3">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-sigapei-green rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">{nb} / {cap} places</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Dossiers Apprenants ── */}
        {tab === 'apprenants' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">Dossiers des apprenants</h2>
                <p className="text-xs text-slate-400">Lecture seule · Aucune modification possible</p>
              </div>
              <div className="flex items-center space-x-3">
                <select value={selectedClasse || ''} onChange={e => setSelectedClasse(e.target.value || null)}
                  className="px-3 py-2 rounded-xl border-2 border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-sigapei-green bg-white">
                  <option value="">Toutes mes classes</option>
                  {initialClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
                <input value={searchApprenant} onChange={e => setSearchApprenant(e.target.value)}
                  placeholder="Rechercher un élève…"
                  className="px-4 py-2 rounded-xl border-2 border-slate-200 text-xs outline-none focus:border-sigapei-green bg-white w-48" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Matricule', 'Nom & Prénom', 'Classe', 'Date de naissance', 'Contact parent'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {apprenantsFiltres.length === 0 ? (
                      <tr><td colSpan="5" className="px-5 py-8 text-center text-sm text-slate-400">Aucun apprenant trouvé.</td></tr>
                    ) : apprenantsFiltres.map(a => {
                      const cl = initialClasses.find(c => c.id === a.classe_id);
                      return (
                        <tr key={a.id} className="hover:bg-slate-50 transition">
                          <td className="px-5 py-3 font-mono text-xs text-slate-500">{a.matricule}</td>
                          <td className="px-5 py-3 font-bold text-slate-800">{a.nom} {a.prenom}</td>
                          <td className="px-5 py-3">
                            <span className="px-2 py-1 rounded-lg bg-sigapei-green/10 text-sigapei-green text-xs font-bold">{cl?.nom || '—'}</span>
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-500">{a.date_naissance}</td>
                          <td className="px-5 py-3 text-xs text-slate-500">{a.parent_nom} · {a.parent_tel}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center space-x-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs text-slate-500">Vous consultez ces dossiers en <strong>lecture seule</strong>. Toute modification doit passer par la Secrétaire ou l'Administrateur.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
