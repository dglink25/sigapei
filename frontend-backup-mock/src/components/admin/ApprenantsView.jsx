import React, { useState } from 'react';

/**
 * Normalise un apprenant du backend vers le format attendu par l'UI.
 * Le backend renvoie : uuid, matricule, nom, prenom, classe (objet), programme, etc.
 */
function normalizeApprenant(a) {
  return {
    uuid: a.uuid,
    id: a.id,
    matricule: a.matricule,
    nom: a.nom,
    prenom: a.prenom,
    date_naissance: a.date_naissance,
    classe_id: a.classe?.id || a.classe_id,
    classe_nom: a.classe?.nom || '',
    programme: a.classe?.programme || a.programme || '',
    cycle: a.classe?.cycle || '',
    parent_nom: a.parent_nom || '',
    parent_tel: a.parent_tel || '',
    compte_utilisateur_actif: a.compte_utilisateur_actif || false,
    historique_classes: a.historique_classes || [],
  };
}

export default function ApprenantsView({ apprenants = [], classes = [], onTransfer }) {
  const [search, setSearch] = useState('');

  const normalized = apprenants.map(normalizeApprenant);

  const filteredApprenants = normalized.filter(a => {
    const q = search.toLowerCase();
    return a.nom?.toLowerCase().includes(q) ||
           a.prenom?.toLowerCase().includes(q) ||
           a.matricule?.toLowerCase().includes(q);
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
                  const cl = classes.find(x => x.id === Number(a.classe_id)) || classes[0];
                  // Règle du programme : compte élève seulement si français+secondaire ou universitaire
                  const hasAccount = a.compte_utilisateur_actif ||
                    (cl && (cl.programme === 'francais' && cl.cycle === 'secondaire') ||
                     (cl && cl.cycle === 'universitaire'));

                  return (
                    <tr key={a.uuid || a.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono text-sigapei-green font-bold">{a.matricule}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{a.nom} {a.prenom}</div>
                        <div className="text-[10px] text-slate-400">{a.date_naissance}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sigapei-green/10 text-sigapei-green">
                          {cl?.nom || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          cl?.programme === 'beninois'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-blue-100 text-blue-900'
                        }`}>
                          {cl?.programme || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {hasAccount ? (
                          <span className="text-emerald-600 font-bold text-[10px]">✓ Actif</span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Aucun</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{a.parent_nom || '—'}</td>
                      <td className="py-3 px-4">
                        {a.historique_classes?.length > 0 ? (
                          <span className="text-amber-600 font-bold text-[10px]">
                            {a.historique_classes.length} mutation(s)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {onTransfer && (
                          <button
                            onClick={() => onTransfer(a.uuid)}
                            className="px-3 py-1.5 rounded-lg bg-sigapei-gold text-sigapei-black text-[10px] font-black hover:bg-sigapei-gold-hover transition"
                          >
                            Transférer
                          </button>
                        )}
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
