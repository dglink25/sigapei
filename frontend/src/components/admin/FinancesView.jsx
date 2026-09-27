import React from 'react';

export default function FinancesView() {
  return (
    <div className="space-y-6 fade-enter">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-sigapei-black font-heading">Suivi des Frais de Scolarité</h2>
          <p className="text-xs text-slate-500 mt-1">Vue consolidée en <strong>lecture seule pure</strong> issue des données du microservice Finances.</p>
        </div>
        <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black">
          Accès Comptable (Lecture Seule)
        </span>
      </div>

      {/* Warning banner */}
      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-950">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-sigapei-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Conformément au cahier des charges, le service scolarité n'encaisse <strong>aucun règlement</strong>. Toute saisie monétaire reste sous le périmètre exclusif du microservice Finances.</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-card border border-slate-100">
          <span className="text-xs font-bold text-slate-400 uppercase">Échéancier Annuel Global</span>
          <p className="text-3xl font-black text-sigapei-black mt-2 font-heading">266,7 M <span className="text-xs text-slate-500 font-sans font-bold">FCFA</span></p>
          <span className="text-[11px] text-slate-400 mt-1 block">1 482 apprenants inscrits</span>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-card border border-slate-100">
          <span className="text-xs font-bold text-sigapei-green uppercase">Montant Encaissé (Finances)</span>
          <p className="text-3xl font-black text-sigapei-green mt-2 font-heading">184,5 M <span className="text-xs text-sigapei-green font-sans font-bold">FCFA</span></p>
          <span className="text-[11px] text-slate-400 mt-1 block">Taux de recouvrement : 69.1 %</span>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-card border border-slate-100">
          <span className="text-xs font-bold text-amber-900 uppercase">Restant Dû / Relances</span>
          <p className="text-3xl font-black text-amber-900 mt-2 font-heading">82,2 M <span className="text-xs text-amber-800 font-sans font-bold">FCFA</span></p>
          <span className="text-[11px] text-slate-400 mt-1 block">Échéance 2ème tranche : 15 Nov</span>
        </div>
      </div>

      {/* Installments Breakdown Table */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-sigapei-black uppercase tracking-wider">État Général des Règlements par Tranche</h3>
          <span className="text-[10px] text-slate-400">Synchronisé via RabbitMQ `finances.paiement.effectue`</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
            <tr>
              <th className="p-3.5">Tranche de Frais</th>
              <th className="p-3.5">Date Butoir</th>
              <th className="p-3.5">Montant Par Élève</th>
              <th className="p-3.5">Statut Global</th>
              <th className="p-3.5 text-right">Apprenants en Règle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            <tr>
              <td className="p-3.5 font-bold text-slate-900">1ère Tranche — Frais d'inscription & Rentrée</td>
              <td className="p-3.5 text-slate-500">15 Septembre 2026</td>
              <td className="p-3.5 font-mono">60 000 FCFA</td>
              <td className="p-3.5"><span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EAF5EF] text-sigapei-green border border-[#BDE3CE]">CLÔTURÉE (98%)</span></td>
              <td className="p-3.5 text-right font-mono font-bold text-sigapei-green">1 452 / 1 482</td>
            </tr>
            <tr>
              <td className="p-3.5 font-bold text-slate-900">2ème Tranche — Premier Trimestre</td>
              <td className="p-3.5 text-slate-500">15 Novembre 2026</td>
              <td className="p-3.5 font-mono">60 000 FCFA</td>
              <td className="p-3.5"><span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">EN COURS D'APPEL</span></td>
              <td className="p-3.5 text-right font-mono font-bold text-amber-800">890 / 1 482</td>
            </tr>
            <tr>
              <td className="p-3.5 font-bold text-slate-900">3ème Tranche — Solde Fin d'Année</td>
              <td className="p-3.5 text-slate-500">15 Février 2027</td>
              <td className="p-3.5 font-mono">60 000 FCFA</td>
              <td className="p-3.5"><span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600">NON ÉCHUE</span></td>
              <td className="p-3.5 text-right font-mono font-bold text-slate-400">120 / 1 482</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}
