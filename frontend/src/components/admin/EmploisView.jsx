import React from 'react';
import { timetableSchedule } from '../../data/initialData';

export default function EmploisView() {
  const jours = ['Heures', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

  return (
    <div className="space-y-6 fade-enter">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-sigapei-black font-heading">Gestion des Emplois du Temps (Censeur)</h2>
          <p className="text-xs text-slate-500 mt-1">Attribution des créneaux horaires, salles de cours et répartition des professeurs.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700">
            <option>Classe : 6ème A (Générale)</option>
            <option>Classe : 5ème Bilingue</option>
            <option>Classe : Seconde C</option>
          </select>
          <button className="px-4 py-2 rounded-xl bg-sigapei-gold text-sigapei-black font-black text-xs shadow-sm hover:bg-sigapei-gold-hover transition">
            Modifier Planning
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-card border border-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-extrabold text-sigapei-black uppercase tracking-wider">Planning Hebdomadaire — 6ème A (Semestre 1)</span>
          <span className="text-[11px] font-bold text-slate-500">28 Heures de cours / semaine</span>
        </div>

        <div className="grid grid-cols-6 gap-2.5 text-center">
          {jours.map(j => (
            <div key={j} className="p-2.5 font-bold text-xs bg-slate-100 rounded-xl text-slate-700">
              {j}
            </div>
          ))}

          {timetableSchedule.map((row, idx) => (
            <React.Fragment key={idx}>
              <div className="p-2.5 text-xs font-bold text-slate-500 bg-slate-50 rounded-xl flex items-center justify-center font-mono">
                {row.h}
              </div>
              <div className="p-2.5 bg-blue-50/80 border border-blue-200/70 rounded-xl text-left text-[11px] font-medium">
                <strong className="text-blue-900 block">{row.c1}</strong> Salle B2
              </div>
              <div className="p-2.5 bg-amber-50/80 border border-sigapei-gold/40 rounded-xl text-left text-[11px] font-medium">
                <strong className="text-amber-900 block">{row.c2}</strong> Salle B2
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 text-xs flex items-center justify-center">
                {row.c3}
              </div>
              <div className="p-2.5 bg-indigo-50/80 border border-indigo-200/70 rounded-xl text-left text-[11px] font-medium">
                <strong className="text-indigo-900 block">{row.c4}</strong> Salle B2
              </div>
              <div className="p-2.5 bg-teal-50/80 border border-teal-200/70 rounded-xl text-left text-[11px] font-medium">
                <strong className="text-teal-900 block">{row.c5}</strong> Salle B2
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

    </div>
  );
}
