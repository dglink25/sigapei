import React from 'react';

export default function ClassesView({ classes, onOpenCreateClasse }) {
  return (
    <div className="space-y-6 fade-enter">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-sigapei-black font-heading">Classes & Suivi de Capacité</h2>
          <p className="text-xs text-slate-500 mt-1">Surveillance des effectifs par classe et application du contrôle bloquant d'admission.</p>
        </div>
        <button 
          onClick={onOpenCreateClasse} 
          className="px-4 py-2.5 rounded-xl bg-sigapei-green text-white font-bold text-xs hover:bg-sigapei-green-dark shadow-sm transition flex items-center gap-2"
        >
          <svg className="w-4 h-4 text-sigapei-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Créer une Nouvelle Classe</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map(c => {
          const percent = Math.round((c.inscrits / c.capacite) * 100);
          const isFull = c.inscrits >= c.capacite;
          const dispo = Math.max(0, c.capacite - c.inscrits);

          return (
            <div key={c.id} className="bg-white p-5 rounded-2xl shadow-card border border-slate-100 flex flex-col justify-between space-y-4 hover:shadow-card-hover transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-sigapei-black font-heading">{c.nom}</h3>
                  <p className="text-xs text-slate-400 capitalize">{c.cycle} • Niveau {c.niveau} ({c.filiere})</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                  c.programme === 'beninois' 
                    ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                    : 'bg-blue-100 text-blue-900 border border-blue-200'
                }`}>
                  Prog. {c.programme}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">Effectif : <strong>{c.inscrits} / {c.capacite}</strong></span>
                  <span className={`font-black ${isFull ? 'text-red-600' : 'text-sigapei-green'}`}>{percent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      isFull ? 'bg-red-600' : percent > 85 ? 'bg-amber-500' : 'bg-sigapei-green'
                    }`} 
                    style={{ width: `${Math.min(100, percent)}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Places d'admission :</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isFull ? 'bg-red-100 text-red-800' : 'bg-[#EAF5EF] text-sigapei-green border border-[#BDE3CE]'
                }`}>
                  {isFull ? 'COMPLÈTE (Bloquant)' : `${dispo} place${dispo > 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
