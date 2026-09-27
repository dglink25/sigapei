import React, { useState } from 'react';

const PAIEMENTS = [
  { 
    id: 1, 
    matricule: 'MAT-2026-6A-0012', 
    nom: 'KOFFI Jean-Luc',     
    classe: '6ème A',    
    montant: 150000, 
    paye: 150000, 
    reste: 0,      
    statut: 'complet',    
    date_dernier: '2026-09-05',
    tranches: [
      { num: 1, label: 'Tranche 1 (Rentrée)', attendu: 60000, paye: 60000, echeance: '2026-09-15', regle: true },
      { num: 2, label: 'Tranche 2 (Mi-parcours)', attendu: 50000, paye: 50000, echeance: '2027-01-15', regle: true },
      { num: 3, label: 'Tranche 3 (Fin d’année)', attendu: 40000, paye: 40000, echeance: '2027-04-15', regle: true },
    ]
  },
  { 
    id: 2, 
    matricule: 'MAT-2026-5B-0004', 
    nom: 'DUBOIS Alexandre',   
    classe: '5ème Bilingue', 
    montant: 200000, 
    paye: 100000, 
    reste: 100000, 
    statut: 'partiel',  
    date_dernier: '2026-09-12',
    tranches: [
      { num: 1, label: 'Tranche 1 (Rentrée)', attendu: 100000, paye: 100000, echeance: '2026-09-15', regle: true },
      { num: 2, label: 'Tranche 2 (Mi-parcours)', attendu: 60000, paye: 0, echeance: '2027-01-15', regle: false },
      { num: 3, label: 'Tranche 3 (Fin d’année)', attendu: 40000, paye: 0, echeance: '2027-04-15', regle: false },
    ]
  },
  { 
    id: 3, 
    matricule: 'MAT-2026-2C-0033', 
    nom: 'MENSAH Arnaud',      
    classe: 'Seconde C',  
    montant: 175000, 
    paye: 0,      
    reste: 175000, 
    statut: 'impaye',    
    date_dernier: '—',
    tranches: [
      { num: 1, label: 'Tranche 1 (Rentrée)', attendu: 75000, paye: 0, echeance: '2026-09-15', regle: false },
      { num: 2, label: 'Tranche 2 (Mi-parcours)', attendu: 60000, paye: 0, echeance: '2027-01-15', regle: false },
      { num: 3, label: 'Tranche 3 (Fin d’année)', attendu: 40000, paye: 0, echeance: '2027-04-15', regle: false },
    ]
  },
  { 
    id: 4, 
    matricule: 'MAT-2026-TD-0021', 
    nom: 'AGOSSA Fatoumata',   
    classe: 'Terminale D', 
    montant: 180000, 
    paye: 180000, 
    reste: 0,     
    statut: 'complet',   
    date_dernier: '2026-09-01',
    tranches: [
      { num: 1, label: 'Tranche 1 (Rentrée)', attendu: 80000, paye: 80000, echeance: '2026-09-15', regle: true },
      { num: 2, label: 'Tranche 2 (Mi-parcours)', attendu: 60000, paye: 60000, echeance: '2027-01-15', regle: true },
      { num: 3, label: 'Tranche 3 (Fin d’année)', attendu: 40000, paye: 40000, echeance: '2027-04-15', regle: true },
    ]
  },
  { 
    id: 5, 
    matricule: 'MAT-2026-6B-0008', 
    nom: 'HOUNWANOU Chantal',  
    classe: '6ème B',    
    montant: 150000, 
    paye: 75000,  
    reste: 75000,  
    statut: 'partiel',   
    date_dernier: '2026-09-18',
    tranches: [
      { num: 1, label: 'Tranche 1 (Rentrée)', attendu: 75000, paye: 75000, echeance: '2026-09-15', regle: true },
      { num: 2, label: 'Tranche 2 (Mi-parcours)', attendu: 45000, paye: 0, echeance: '2027-01-15', regle: false },
      { num: 3, label: 'Tranche 3 (Fin d’année)', attendu: 30000, paye: 0, echeance: '2027-04-15', regle: false },
    ]
  },
  { 
    id: 6, 
    matricule: 'MAT-2026-CM-0003', 
    nom: 'AMOUSSOU Pierre',    
    classe: 'CM2 Excellence', 
    montant: 120000, 
    paye: 120000, 
    reste: 0,  
    statut: 'complet',  
    date_dernier: '2026-08-30',
    tranches: [
      { num: 1, label: 'Tranche 1 (Rentrée)', attendu: 50000, paye: 50000, echeance: '2026-09-15', regle: true },
      { num: 2, label: 'Tranche 2 (Mi-parcours)', attendu: 40000, paye: 40000, echeance: '2027-01-15', regle: true },
      { num: 3, label: 'Tranche 3 (Fin d’année)', attendu: 30000, paye: 30000, echeance: '2027-04-15', regle: true },
    ]
  },
];

const STATUT_STYLES = {
  complet: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  partiel: 'bg-amber-100 text-amber-800 border border-amber-200',
  impaye:  'bg-red-100 text-red-700 border border-red-200',
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
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [filtreClasse, setFiltreClasse] = useState('tous');
  const [search, setSearch] = useState('');
  const [activeQuittance, setActiveQuittance] = useState(null);

  const classesList = Array.from(new Set(PAIEMENTS.map(p => p.classe)));

  const filtered = PAIEMENTS.filter(p => {
    const statusOk = filtreStatut === 'tous' || p.statut === filtreStatut;
    const classeOk = filtreClasse === 'tous' || p.classe === filtreClasse;
    const searchOk = !search || 
      p.nom.toLowerCase().includes(search.toLowerCase()) || 
      p.matricule.toLowerCase().includes(search.toLowerCase());
    return statusOk && classeOk && searchOk;
  });

  const totalMontant = PAIEMENTS.reduce((s, p) => s + p.montant, 0);
  const totalPaye    = PAIEMENTS.reduce((s, p) => s + p.paye, 0);
  const totalReste   = PAIEMENTS.reduce((s, p) => s + p.reste, 0);
  const txRecouvrement = Math.round((totalPaye / totalMontant) * 100);

  // Fonction d'export CSV
  const handleExportCSV = () => {
    const header = 'Matricule,Nom,Classe,Frais_Totaux,Montant_Paye,Reste_Du,Statut,Date_Dernier_Paiement\n';
    const rows = filtered.map(p => 
      `"${p.matricule}","${p.nom}","${p.classe}",${p.montant},${p.paye},${p.reste},"${p.statut}","${p.date_dernier}"`
    ).join('\n');
    
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SIGAPEI_Recouvrement_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const KPI = ({ label, value, sub, color, border = 'border-slate-200' }) => (
    <div className={`bg-white rounded-2xl border ${border} p-5 shadow-sm space-y-2`}>
      <div className={`text-[10px] font-black uppercase tracking-wider ${color}`}>{label}</div>
      <div className="text-2xl font-black text-slate-900 font-heading">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-sigapei-canvas">

      {/* Header Espace Comptable */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-sigapei-green mb-0.5">Espace Comptable</div>
          <h1 className="text-lg font-black text-slate-900">{currentUser?.nom}</h1>
          <p className="text-xs text-slate-400">{currentUser?.etablissement} • Suivi Financier & Recouvrement</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-[10px] px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 font-black uppercase tracking-wider">
            Comptabilité Scolarité
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-red-50 border border-red-200 text-[10px] font-black text-red-600 flex items-center gap-1">
            <span>🔒</span>
            <span>Lecture seule pure</span>
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">

        {/* 4 KPIs de suivi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI label="Total facturé scolarité" value={fmt(totalMontant)} sub={`${PAIEMENTS.length} apprenants inscrits`} color="text-slate-600" />
          <KPI label="Total encaissé" value={fmt(totalPaye)} sub={`Taux global : ${txRecouvrement}%`} color="text-emerald-600" border="border-emerald-100" />
          <KPI label="Reste à recouvrer" value={fmt(totalReste)} sub={`${PAIEMENTS.filter(p => p.reste > 0).length} dossiers en souffrance`} color="text-red-600" border="border-red-100" />
          <KPI 
            label="Taux de recouvrement" 
            value={`${txRecouvrement}%`} 
            sub={
              <div className="mt-2">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-sigapei-green rounded-full transition-all" style={{ width: `${txRecouvrement}%` }} />
                </div>
              </div>
            }
            color="text-sigapei-green" 
          />
        </div>

        {/* Barre d'actions & Filtres */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Filtre statut */}
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-bold">
              {[
                { val: 'tous', label: 'Tous' },
                { val: 'complet', label: 'Complets' },
                { val: 'partiel', label: 'Partiels' },
                { val: 'impaye', label: 'Impayés' },
              ].map(f => (
                <button key={f.val} onClick={() => setFiltreStatut(f.val)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filtreStatut === f.val ? 'bg-sigapei-green text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Filtre classe */}
            <select
              value={filtreClasse}
              onChange={e => setFiltreClasse(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700 outline-none focus:border-sigapei-green"
            >
              <option value="tous">Toutes les classes</option>
              {classesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Recherche élève / matricule…"
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-sigapei-green bg-white w-48 sm:w-56 font-medium"
            />

            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center space-x-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export CSV</span>
            </button>
          </div>

        </div>

        {/* Tableau des paiements */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Matricule</th>
                  <th className="py-3.5 px-5">Nom & Prénom</th>
                  <th className="py-3.5 px-5">Classe</th>
                  <th className="py-3.5 px-5">Scolarité totale</th>
                  <th className="py-3.5 px-5">Montant Encaissé</th>
                  <th className="py-3.5 px-5">Reste à payer</th>
                  <th className="py-3.5 px-5">Statut</th>
                  <th className="py-3.5 px-5 text-right">Détail Tranches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.length === 0 ? (
                  <tr><td colSpan="8" className="text-center py-8 text-slate-400">Aucun enregistrement ne correspond.</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5 font-mono font-bold text-slate-700">{p.matricule}</td>
                    <td className="py-3.5 px-5 font-extrabold text-slate-900">{p.nom}</td>
                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 rounded-lg bg-sigapei-green/10 text-sigapei-green font-bold">
                        {p.classe}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-800 font-bold">{fmt(p.montant)}</td>
                    <td className="py-3.5 px-5 text-emerald-700 font-bold">{fmt(p.paye)}</td>
                    <td className="py-3.5 px-5 text-red-600 font-bold">{p.reste > 0 ? fmt(p.reste) : '0 FCFA'}</td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${STATUT_STYLES[p.statut]}`}>
                        {STATUT_LABELS[p.statut]}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => setActiveQuittance(p)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition shadow-xs"
                      >
                        Échéancier →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{filtered.length} ligne(s) affichée(s)</span>
            <span>Microservice Inscription/Finances • Consultation en temps réel</span>
          </div>
        </div>

      </div>

      {/* Modal Détail Échéancier Tranches */}
      {activeQuittance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sigapei-black/60 backdrop-blur-sm fade-enter">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden">
            <div className="bg-sigapei-sidebar px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-sigapei-gold text-sigapei-black font-black flex items-center justify-center">
                  💳
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-white">
                    Échéancier de Paiement — {activeQuittance.nom}
                  </h3>
                  <p className="text-[11px] text-sigapei-gold font-mono">{activeQuittance.matricule} • {activeQuittance.classe}</p>
                </div>
              </div>
              <button onClick={() => setActiveQuittance(null)} className="text-white hover:text-white/80">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                  <p className="font-black text-slate-800 text-xs mt-0.5">{fmt(activeQuittance.montant)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Payé</span>
                  <p className="font-black text-emerald-700 text-xs mt-0.5">{fmt(activeQuittance.paye)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-red-600 uppercase">Reste</span>
                  <p className="font-black text-red-600 text-xs mt-0.5">{fmt(activeQuittance.reste)}</p>
                </div>
              </div>

              {/* Détail des 3 tranches */}
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-600 block">
                  Décomposition par tranches annuelles
                </span>

                {(activeQuittance.tranches || []).map(t => (
                  <div key={t.num} className="p-3 rounded-2xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                    <div>
                      <div className="font-extrabold text-slate-800">{t.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Échéance limite : {t.echeance}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-800">{fmt(t.attendu)}</div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        t.regle ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                      }`}>
                        {t.regle ? '✓ Réglé' : '✗ En attente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                ℹ️ Les paiements effectifs sont encaissés par le service Finances. Cette vue est alimentée automatiquement via la jointure inter-schémas `finances.factures`.
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setActiveQuittance(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
