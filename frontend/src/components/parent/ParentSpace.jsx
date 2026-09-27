import React, { useState } from 'react';
import { timetableSchedule } from '../../data/initialData';

export default function ParentSpace() {
  const [parentSubTab, setParentSubTab] = useState('edt'); // 'edt' | 'finances' | 'historique'

  const days = [
    { name: 'Lundi', c1: 'Mathématiques (08h - 10h)', c2: 'Français (10h - 12h)', c3: 'SVT (15h - 17h)' },
    { name: 'Mardi', c1: 'Histoire-Géo (08h - 10h)', c2: 'Anglais (10h - 12h)', c3: 'Informatique (15h - 17h)' },
    { name: 'Mercredi', c1: '—', c2: 'EPS (Stade) (10h - 12h)', c3: '—' },
    { name: 'Jeudi', c1: 'Mathématiques (08h - 10h)', c2: 'Français (10h - 12h)', c3: 'Histoire-Géo (15h - 17h)' },
    { name: 'Vendredi', c1: 'Physique-Chimie (08h - 10h)', c2: 'SVT (10h - 12h)', c3: 'Arts Plastiques (15h - 17h)' }
  ];

  return (
    <section className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 max-w-5xl mx-auto w-full fade-enter">
      
      {/* Student Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-slate-100 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-sigapei-green text-sigapei-cream font-black text-2xl flex items-center justify-center border-2 border-sigapei-gold shadow-md">
              KJ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-sigapei-black font-heading">KOFFI Jean-Luc</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sigapei-gold text-sigapei-black border border-sigapei-gold-hover">
                  INSCRIT ACTIF
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Matricule : <strong className="text-slate-800 font-mono">MAT-2026-6A-0012</strong> • Né le 14/05/2012
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Classe actuelle : <strong className="text-sigapei-green">6ème A (Cycle Secondaire)</strong>
              </p>
            </div>
          </div>

          {/* Benin Program Rule Banner */}
          <div className="bg-sigapei-cream/70 border border-sigapei-gold/50 rounded-2xl p-3.5 max-w-xs text-right">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Statut Programme Pédagogique</span>
            <p className="text-xs font-black text-sigapei-green mt-0.5">Programme Béninois</p>
            <p className="text-[11px] text-slate-700 mt-1 leading-snug">
              Aucun compte élève propre (téléphone interdit en milieu scolaire). Consultation 100 % sous le compte du parent référent (Marc Koffi).
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 pt-2 border-b border-slate-100">
          <button 
            onClick={() => setParentSubTab('edt')} 
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              parentSubTab === 'edt' 
                ? 'bg-sigapei-green text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Emploi du Temps Hebdomadaire
          </button>
          <button 
            onClick={() => setParentSubTab('finances')} 
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              parentSubTab === 'finances' 
                ? 'bg-sigapei-green text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Situation Frais Scolaires (Lecture Seule)
          </button>
          <button 
            onClick={() => setParentSubTab('historique')} 
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              parentSubTab === 'historique' 
                ? 'bg-sigapei-green text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Historique Scolaire & Mutations
          </button>
        </div>

        {/* SUBTAB 1 : EMPLOI DU TEMPS */}
        {parentSubTab === 'edt' && (
          <div className="pt-4 space-y-4 fade-enter">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-sigapei-black">Planning des cours de la semaine</h3>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                6ème A
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {days.map((d, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                  <span className="text-xs font-extrabold text-sigapei-black uppercase tracking-wider block border-b border-slate-200 pb-1">
                    {d.name}
                  </span>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <p className="font-bold text-slate-800">{d.c1}</p>
                      <p className="text-[10px] text-slate-400">Salle B2</p>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <p className="font-bold text-slate-800">{d.c2}</p>
                      <p className="text-[10px] text-slate-400">Salle B2</p>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <p className="font-bold text-slate-800">{d.c3}</p>
                      <p className="text-[10px] text-slate-400">{d.c3 === '—' ? 'Libre' : 'Salle B2'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 2 : SITUATION FINANCIÈRE (LECTURE SEULE PURE) */}
        {parentSubTab === 'finances' && (
          <div className="pt-4 space-y-6 fade-enter">
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-950">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-sigapei-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Données consolidées en <strong>lecture seule pure</strong> issues du microservice Finances.</span>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-200">LECTURE SEULE</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 font-bold uppercase">Total Annuel Dû</span>
                <p className="text-2xl font-black text-sigapei-black mt-1 font-heading">180 000 FCFA</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-sigapei-green font-bold uppercase">Total Réglé</span>
                <p className="text-2xl font-black text-sigapei-green mt-1 font-heading">120 000 FCFA</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-amber-900 font-bold uppercase">Solde Restant</span>
                <p className="text-2xl font-black text-amber-900 mt-1 font-heading">60 000 FCFA</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">Tranche de Frais</th>
                    <th className="p-3.5">Montant</th>
                    <th className="p-3.5">Date Limite</th>
                    <th className="p-3.5">Statut Règlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr>
                    <td className="p-3.5 font-bold">1ère Tranche (Rentrée)</td>
                    <td className="p-3.5 font-mono">60 000 FCFA</td>
                    <td className="p-3.5 text-slate-500">15 Septembre 2026</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EAF5EF] text-sigapei-green border border-[#BDE3CE]">
                        RÉGLÉ (Reçu #891)
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold">2ème Tranche</td>
                    <td className="p-3.5 font-mono">60 000 FCFA</td>
                    <td className="p-3.5 text-slate-500">15 Novembre 2026</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EAF5EF] text-sigapei-green border border-[#BDE3CE]">
                        RÉGLÉ (Reçu #1042)
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold text-amber-900">3ème Tranche (Solde)</td>
                    <td className="p-3.5 font-mono font-bold text-amber-900">60 000 FCFA</td>
                    <td className="p-3.5 text-slate-500">15 Février 2027</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900">
                        EN ATTENTE
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 3 : HISTORIQUE & MUTATIONS */}
        {parentSubTab === 'historique' && (
          <div className="pt-4 space-y-4 fade-enter">
            <h3 className="text-sm font-bold text-sigapei-black">Parcours Scolaire de l'Élève (Sans Doublon)</h3>
            <div className="border-l-2 border-sigapei-green/30 pl-4 ml-2 space-y-4 text-xs">
              <div className="relative">
                <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-sigapei-green border-2 border-white"></span>
                <p className="font-bold text-slate-800">Septembre 2026 — Inscription en 6ème A</p>
                <p className="text-slate-500 text-[11px]">Admission validée avec succès sur dossier S3 et test écrit (14.5/20).</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-300 border-2 border-white"></span>
                <p className="font-bold text-slate-800">Juin 2026 — Obtention du CEP</p>
                <p className="text-slate-500 text-[11px]">Complexe Primaire d'Origine (Mention Très Bien).</p>
              </div>
            </div>
          </div>
        )}

      </div>

    </section>
  );
}
