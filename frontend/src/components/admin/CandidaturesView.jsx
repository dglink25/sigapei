import React, { useState } from 'react';

export default function CandidaturesView({ 
  candidatures, 
  classes, 
  onExamine 
}) {
  const [filter, setFilter] = useState('all');

  const filteredCandidatures = candidatures.filter(c => {
    if (filter === 'all') return true;
    return c.statut === filter;
  });

  return (
    <div className="space-y-6 fade-enter">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-sigapei-black font-heading">Instruction des Candidatures</h2>
          <p className="text-xs text-slate-500 mt-1">Examen des dossiers, vérification des pièces justificatives S3 MinIO et validation des admissions.</p>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs font-bold">
          <button 
            onClick={() => setFilter('all')} 
            className={`px-3 py-1.5 rounded-lg transition ${filter === 'all' ? 'bg-sigapei-green text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Tous ({candidatures.length})
          </button>
          <button 
            onClick={() => setFilter('en_attente')} 
            className={`px-3 py-1.5 rounded-lg transition ${filter === 'en_attente' ? 'bg-sigapei-gold text-sigapei-black font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            En attente ({candidatures.filter(c => c.statut === 'en_attente').length})
          </button>
          <button 
            onClick={() => setFilter('validee')} 
            className={`px-3 py-1.5 rounded-lg transition ${filter === 'validee' ? 'bg-sigapei-green text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Validées ({candidatures.filter(c => c.statut === 'validee').length})
          </button>
          <button 
            onClick={() => setFilter('rejetee')} 
            className={`px-3 py-1.5 rounded-lg transition ${filter === 'rejetee' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Rejetées ({candidatures.filter(c => c.statut === 'rejetee').length})
          </button>
        </div>
      </div>

      {/* Candidatures Table */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">UUID Dossier</th>
                <th className="py-3.5 px-4">Élève & Âge</th>
                <th className="py-3.5 px-4">Classe Voulue</th>
                <th className="py-3.5 px-4">Pièces S3</th>
                <th className="py-3.5 px-4">Test Admission</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredCandidatures.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400 italic">
                    Aucune candidature dans cette catégorie.
                  </td>
                </tr>
              ) : (
                filteredCandidatures.map(c => {
                  const cl = classes.find(x => x.id === c.classe_id) || classes[0];
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{c.uuid}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-sigapei-black block">{c.nom} {c.prenom}</span>
                        <span className="text-[10px] text-slate-400">Né(e) le {c.date_naissance} ({c.sexe})</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 block">{cl.nom}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{cl.programme}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                          <svg className="w-3.5 h-3.5 text-sigapei-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {c.pieces.length} doc(s) S3
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {c.test ? (
                          <span className={`font-bold font-mono ${c.test.note >= 12 ? 'text-sigapei-green' : 'text-red-600'}`}>
                            {c.test.note} / 20 ({c.test.avis.toUpperCase()})
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Non noté</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          c.statut === 'validee' ? 'bg-[#EAF5EF] text-sigapei-green border border-[#BDE3CE]' :
                          c.statut === 'rejetee' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}>
                          {c.statut}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button 
                          onClick={() => onExamine(c.id)} 
                          className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5 text-sigapei-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>Examiner</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
