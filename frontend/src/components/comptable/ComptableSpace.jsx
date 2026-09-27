import React, { useState } from 'react';

const paiements = [
  { id: 1, matricule: 'MAT-2026-6A-0012', nom: 'KOFFI Jean-Luc',     classe: '6ème A',    montant: 150000, paye: 150000, reste: 0,      statut: 'complet',    date_dernier: '2026-09-05' },
  { id: 2, matricule: 'MAT-2026-5B-0004', nom: 'DUBOIS Alexandre',   classe: '5ème Bilingue', montant: 200000, paye: 100000, reste: 100000, statut: 'partiel',  date_dernier: '2026-09-12' },
  { id: 3, matricule: 'MAT-2026-2C-0033', nom: 'MENSAH Arnaud',      classe: 'Seconde C',  montant: 175000, paye: 0,      reste: 175000, statut: 'impaye',    date_dernier: '—' },
  { id: 4, matricule: 'MAT-2026-TD-0021', nom: 'AGOSSA Fatoumata',   classe: 'Terminale D', montant: 180000, paye: 180000, reste: 0,     statut: 'complet',   date_dernier: '2026-09-01' },
  { id: 5, matricule: 'MAT-2026-6B-0008', nom: 'HOUNWANOU Chantal',  classe: '6ème B',    montant: 150000, paye: 75000,  reste: 75000,  statut: 'partiel',   date_dernier: '2026-09-18' },
  { id: 6, matricule: 'MAT-2026-CM-0003', nom: 'AMOUSSOU Pierre',    classe: 'CM2 Excellence', montant: 120000, paye: 120000, reste: 0,  statut: 'complet',  date_dernier: '2026-08-30' },
];

const STATUT_STYLES = {
  complet: 'bg-emerald-100 text-emerald-800',
  partiel: 'bg-amber-100 text-amber-800',
  impaye:  'bg-red-100 text-red-700',
};
const STATUT_LABELS = {
  complet: '✓ Complet',
  partiel: '⚠ Partiel',
  impaye:  '✗ Impayé',
};

function fmt(n) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

export default function ComptableSpace({ currentUser }) {
  const [filtre, setFiltre] = useState('tous');
  const [search, setSearch] = useState('');

  const filtered = paiements.filter(p => {
    const statusOk = filtre === 'tous' || p.statut === filtre;
    const searchOk = !search || p.nom.toLowerCase().includes(search.toLowerCase()) || p.matricule.toLowerCase().includes(search.toLowerCase());
    return statusOk && searchOk;
  });

  const totalMontant = paiements.reduce((s, p) => s + p.montant, 0);
  const totalPaye    = paiements.reduce((s, p) => s + p.paye, 0);
  const totalReste   = paiements.reduce((s, p) => s + p.reste, 0);
  const txRecouvrement = Math.round((totalPaye / totalMontant) * 100);

  const KPI = ({ label, value, sub, color }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className={`text-xs font-black uppercase tracking-wider mb-2 ${color}`}>{label}</div>
      <div className="text-2xl font-black text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-sigapei-canvas">

      {/* Header */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-sigapei-green mb-0.5">Espace Comptable</div>
          <h1 className="text-lg font-black text-slate-900">{currentUser?.nom}</h1>
          <p className="text-xs text-slate-400">{currentUser?.etablissement} · Lecture seule stricte</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 font-black uppercase tracking-wider">Comptable</span>
          <span className="px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-[10px] font-black text-red-600">🔒 Aucune écriture</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI label="Total attendu" value={fmt(totalMontant)} sub={`${paiements.length} apprenants`} color="text-slate-600" />
          <KPI label="Total encaissé" value={fmt(totalPaye)} sub={`Taux : ${txRecouvrement}%`} color="text-emerald-600" />
          <KPI label="Reste à recouvrer" value={fmt(totalReste)} sub={`${paiements.filter(p => p.reste > 0).length} dossiers en souffrance`} color="text-red-600" />
          <KPI label="Taux de recouvrement"
            value={`${txRecouvrement}%`}
            sub={
              <div className="mt-2">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-sigapei-green rounded-full transition-all" style={{ width: `${txRecouvrement}%` }} />
                </div>
              </div>
            }
            color="text-sigapei-green" />
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            {[
              { val: 'tous', label: 'Tous' },
              { val: 'complet', label: '✓ Complets' },
              { val: 'partiel', label: '⚠ Partiels' },
              { val: 'impaye', label: '✗ Impayés' },
            ].map(f => (
              <button key={f.val} onClick={() => setFiltre(f.val)}
                className={`px-4 py-2 text-xs font-bold transition ${
                  filtre === f.val ? 'bg-sigapei-green text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou matricule…"
            className="px-4 py-2 rounded-xl border-2 border-slate-200 text-xs outline-none focus:border-sigapei-green bg-white w-64"
          />
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Matricule', 'Nom & Prénom', 'Classe', 'Frais totaux', 'Montant payé', 'Reste dû', 'Statut', 'Dernier paiement'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan="8" className="px-5 py-8 text-center text-sm text-slate-400">Aucun résultat.</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.matricule}</td>
                    <td className="px-5 py-3 font-bold text-slate-800 whitespace-nowrap">{p.nom}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-1 rounded-lg bg-sigapei-green/10 text-sigapei-green text-xs font-bold">{p.classe}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-700 font-semibold whitespace-nowrap">{fmt(p.montant)}</td>
                    <td className="px-5 py-3 text-xs font-bold text-emerald-700 whitespace-nowrap">{fmt(p.paye)}</td>
                    <td className="px-5 py-3 text-xs font-bold text-red-600 whitespace-nowrap">{p.reste > 0 ? fmt(p.reste) : '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black ${STATUT_STYLES[p.statut]}`}>
                        {STATUT_LABELS[p.statut]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">{p.date_dernier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">{filtered.length} enregistrement(s)</span>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs text-slate-500 font-semibold">Consultation uniquement · Aucune saisie autorisée</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
