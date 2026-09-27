import React, { useState } from 'react';

export default function ApprenantsView({ apprenants, classes, onTransfer }) {
  const [search, setSearch] = useState('');

  const filteredApprenants = apprenants.filter(a => {
    const q = search.toLowerCase();
    return a.nom.toLowerCase().includes(q) || 
           a.prenom.toLowerCase().includes(q) || 
           a.matricule.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 fade-enter">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-sigapei-black font-heading">Dossiers Apprenants & Mutations</h2>
          <p className="text-xs text-slate-500 mt-1">Gestion du cycle de vie des élèves, transferts internes sans duplication et règles d'accès selon le programme.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Rechercher par nom ou matricule..." 
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs w-64 focus:outline-none focus:border-sigapei-green"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Matricule Unique</th>
                <th className="py-3.5 px-4">Nom & Prénoms</th>
                <th className="py-3.5 px-4">Classe Actuelle</th>
                <th className="py-3.5 px-4">Programme</th>
                <th className="py-3.5 px-4">Compte Élève</th>
                <th className="py-3.5 px-4">Parent Référent</th>
                <th className="py-3.5 px-4">Historique Mutations</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredApprenants.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-400 italic">
                    Aucun apprenant trouvé.
                  </td>
                </tr>
              ) : (
                filteredApprenants.map(a => {
                  const cl = classes.find(x => x.id === a.classe_id) || classes[0];
                  const hasAccount = cl.programme === 'francais';

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{a.matricule}</td>
                      <td className="py-3.5 px-4 font-bold text-sigapei-black">{a.nom} {a.prenom}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{cl.nom}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          cl.programme === 'beninois' 
                            ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                            : 'bg-blue-100 text-blue-900 border border-blue-200'
                        }`}>
                          Prog. {cl.programme}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          hasAccount ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {hasAccount ? 'ACTIF (Secondaire FR)' : 'AUCUN (Règle Bénin)'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">{a.parent_nom}</td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-500">
                        {a.mutations && a.mutations.length > 0 ? (
                          <span className="text-sigapei-gold font-bold">{a.mutations.length} mutation(s)</span>
                        ) : (
                          'Admission initiale'
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button 
                          onClick={() => onTransfer(a.id)} 
                          className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5 text-sigapei-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          <span>Transférer</span>
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
