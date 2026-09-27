import React, { useState } from 'react';

const ENFANTS = [
  {
    id: 1,
    matricule: 'MAT-2026-6A-0012',
    nom: 'KOFFI Jean-Luc',
    date_naissance: '14/05/2012',
    classe: '6ème A (Cycle Secondaire)',
    programme: 'Programme Béninois',
    statut: 'INSCRIT ACTIF',
    initiales: 'KJ',
    totalFrais: 180000,
    regleFrais: 120000,
    soldeFrais: 60000,
    bulletin: [
      { matiere: 'Mathématiques', coef: 3, devoir: 15.5, examen: 14.0, moyenne: 14.5, appreciation: 'Très bon esprit logique, travail sérieux' },
      { matiere: 'Français', coef: 3, devoir: 13.0, examen: 14.5, moyenne: 14.0, appreciation: 'Bonne expression écrite, participation active' },
      { matiere: 'Histoire-Géographie', coef: 2, devoir: 16.0, examen: 15.0, moyenne: 15.3, appreciation: 'Excellente maîtrise des repères chronologiques' },
      { matiere: 'SVT', coef: 2, devoir: 14.0, examen: 13.5, moyenne: 13.7, appreciation: 'Bon travail pratique' },
      { matiere: 'Anglais', coef: 2, devoir: 12.0, examen: 13.0, moyenne: 12.7, appreciation: 'Progrès constants à l’oral' },
      { matiere: 'EPS', coef: 1, devoir: 17.0, examen: 16.0, moyenne: 16.3, appreciation: 'Très engagé et dynamique' }
    ]
  },
  {
    id: 2,
    matricule: 'MAT-2026-CM1-0044',
    nom: 'KOFFI Diane',
    date_naissance: '20/11/2015',
    classe: 'CM1 Bilingue (Cycle Primaire)',
    programme: 'Programme Béninois',
    statut: 'INSCRITE ACTIVE',
    initiales: 'KD',
    totalFrais: 150000,
    regleFrais: 150000,
    soldeFrais: 0,
    bulletin: [
      { matiere: 'Calcul & Numération', coef: 2, devoir: 17.0, examen: 18.0, moyenne: 17.7, appreciation: 'Excellente élève, très rapide' },
      { matiere: 'Lecture & Vocabulaire', coef: 2, devoir: 16.5, examen: 16.0, moyenne: 16.2, appreciation: 'Très bonne fluidité de lecture' },
      { matiere: 'Éveil Scientifique', coef: 1, devoir: 15.0, examen: 15.5, moyenne: 15.3, appreciation: 'Curieuse et méthodique' }
    ]
  }
];

export default function ParentSpace({ currentUser }) {
  const [selectedEnfantId, setSelectedEnfantId] = useState(1);
  const [parentSubTab, setParentSubTab] = useState('edt'); // 'edt' | 'bulletin' | 'finances' | 'historique'

  const activeEnfant = ENFANTS.find(e => e.id === selectedEnfantId) || ENFANTS[0];

  const days = [
    { name: 'Lundi', c1: 'Mathématiques (08h - 10h)', c2: 'Français (10h - 12h)', c3: 'SVT (15h - 17h)' },
    { name: 'Mardi', c1: 'Histoire-Géo (08h - 10h)', c2: 'Anglais (10h - 12h)', c3: 'Informatique (15h - 17h)' },
    { name: 'Mercredi', c1: '—', c2: 'EPS (Stade) (10h - 12h)', c3: '—' },
    { name: 'Jeudi', c1: 'Mathématiques (08h - 10h)', c2: 'Français (10h - 12h)', c3: 'Histoire-Géo (15h - 17h)' },
    { name: 'Vendredi', c1: 'Physique-Chimie (08h - 10h)', c2: 'SVT (10h - 12h)', c3: 'Arts Plastiques (15h - 17h)' }
  ];

  // Calcul moyenne générale
  const totalPoints = activeEnfant.bulletin.reduce((s, b) => s + (b.moyenne * b.coef), 0);
  const totalCoef   = activeEnfant.bulletin.reduce((s, b) => s + b.coef, 0);
  const moyenneGenerale = (totalPoints / totalCoef).toFixed(2);

  return (
    <section className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 max-w-5xl mx-auto w-full fade-enter">
      
      {/* Sélecteur d'enfant si famille avec fratrie */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-slate-500 uppercase">Enfant scolarisé :</span>
          <div className="flex items-center gap-1.5">
            {ENFANTS.map(e => (
              <button
                key={e.id}
                onClick={() => setSelectedEnfantId(e.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  selectedEnfantId === e.id
                    ? 'bg-sigapei-green text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{e.nom}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedEnfantId === e.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {e.classe.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
          Compte Parent : {currentUser?.nom || 'Marc KOFFI'}
        </span>
      </div>

      {/* Student Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-slate-100 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-sigapei-green text-sigapei-cream font-black text-2xl flex items-center justify-center border-2 border-sigapei-gold shadow-md">
              {activeEnfant.initiales}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-sigapei-black font-heading">{activeEnfant.nom}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sigapei-gold text-sigapei-black border border-sigapei-gold-hover">
                  {activeEnfant.statut}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Matricule : <strong className="text-slate-800 font-mono">{activeEnfant.matricule}</strong> • Né(e) le {activeEnfant.date_naissance}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Classe actuelle : <strong className="text-sigapei-green">{activeEnfant.classe}</strong>
              </p>
            </div>
          </div>

          {/* Benin Program Rule Banner */}
          <div className="bg-sigapei-cream/70 border border-sigapei-gold/50 rounded-2xl p-3.5 max-w-xs text-right">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Statut Programme Pédagogique</span>
            <p className="text-xs font-black text-sigapei-green mt-0.5">{activeEnfant.programme}</p>
            <p className="text-[11px] text-slate-700 mt-1 leading-snug">
              Accès 100 % sous le compte du parent référent (téléphone portable strictement interdit aux élèves en milieu scolaire béninois).
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-b border-slate-100">
          {[
            { id: 'edt', label: 'Emploi du Temps Hebdomadaire', icon: '🗓️' },
            { id: 'bulletin', label: 'Relevé de Notes & Moyennes', icon: '📊' },
            { id: 'finances', label: 'Situation Frais Scolaires', icon: '💳' },
            { id: 'historique', label: 'Historique Scolaire & Mutations', icon: '📜' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setParentSubTab(tab.id)} 
              className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                parentSubTab === tab.id 
                  ? 'bg-sigapei-green text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* SUBTAB 1 : EMPLOI DU TEMPS */}
        {parentSubTab === 'edt' && (
          <div className="pt-4 space-y-4 fade-enter">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-sigapei-black">Planning des cours de la semaine</h3>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                {activeEnfant.classe.split(' ')[0]}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {days.map((d, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                  <span className="text-xs font-extrabold text-sigapei-black uppercase tracking-wider block border-b border-slate-200 pb-1">
                    {d.name}
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div className="p-2 bg-white border border-slate-200 rounded-xl shadow-xs">
                      <span className="text-[10px] text-slate-400 block font-mono">08h-10h</span>
                      <strong className="text-slate-800 text-[11px] block">{d.c1}</strong>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-xl shadow-xs">
                      <span className="text-[10px] text-slate-400 block font-mono">10h-12h</span>
                      <strong className="text-slate-800 text-[11px] block">{d.c2}</strong>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-xl shadow-xs">
                      <span className="text-[10px] text-slate-400 block font-mono">15h-17h</span>
                      <strong className="text-slate-800 text-[11px] block">{d.c3}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 2 : RELEVÉ DE NOTES & BULLETIN */}
        {parentSubTab === 'bulletin' && (
          <div className="pt-4 space-y-4 fade-enter">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <h3 className="text-sm font-black text-slate-900">Relevé périodique des notes — Trimestre 1</h3>
                <p className="text-xs text-slate-500">Moyennes calculées avec coefficients officiels</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Moyenne Générale</span>
                <span className="text-2xl font-black text-sigapei-green font-heading">{moyenneGenerale} / 20</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Discipline</th>
                    <th className="py-3 px-4 text-center">Coef</th>
                    <th className="py-3 px-4 text-center">Devoir</th>
                    <th className="py-3 px-4 text-center">Examen</th>
                    <th className="py-3 px-4 text-center">Moyenne</th>
                    <th className="py-3 px-4">Appréciation Pédagogique</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {activeEnfant.bulletin.map((b, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-extrabold text-slate-800">{b.matiere}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-500">{b.coef}</td>
                      <td className="py-3 px-4 text-center font-mono">{b.devoir}</td>
                      <td className="py-3 px-4 text-center font-mono">{b.examen}</td>
                      <td className="py-3 px-4 text-center font-mono font-black text-sigapei-green">{b.moyenne}</td>
                      <td className="py-3 px-4 text-slate-600 italic text-[11px]">{b.appreciation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 3 : FRAIS DE SCOLARITÉ */}
        {parentSubTab === 'finances' && (
          <div className="pt-4 space-y-4 fade-enter">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold uppercase">Montant Annuel Scolarité</span>
                <p className="text-2xl font-black text-sigapei-black mt-1 font-heading">{activeEnfant.totalFrais.toLocaleString()} FCFA</p>
              </div>
              <div className="bg-[#EAF5EF] p-4 rounded-xl border border-[#BDE3CE]">
                <span className="text-xs text-sigapei-green font-bold uppercase">Total Réglé</span>
                <p className="text-2xl font-black text-sigapei-green mt-1 font-heading">{activeEnfant.regleFrais.toLocaleString()} FCFA</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-amber-900 font-bold uppercase">Solde Restant</span>
                <p className="text-2xl font-black text-amber-900 mt-1 font-heading">{activeEnfant.soldeFrais.toLocaleString()} FCFA</p>
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
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        activeEnfant.soldeFrais === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {activeEnfant.soldeFrais === 0 ? 'RÉGLÉ' : 'EN ATTENTE'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 4 : HISTORIQUE & MUTATIONS */}
        {parentSubTab === 'historique' && (
          <div className="pt-4 space-y-4 fade-enter">
            <h3 className="text-sm font-bold text-sigapei-black">Parcours Scolaire de l'Élève (Sans Doublon)</h3>
            <div className="border-l-2 border-sigapei-green/30 pl-4 ml-2 space-y-4 text-xs">
              <div className="relative">
                <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-sigapei-green border-2 border-white"></span>
                <p className="font-bold text-slate-800">Rentrée 2026-2027 — Inscription en {activeEnfant.classe}</p>
                <p className="text-slate-500 text-[11px]">Dossier d'admission validé avec conformité des pièces S3.</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-300 border-2 border-white"></span>
                <p className="font-bold text-slate-800">Année 2025-2026 — Cycle Précédent</p>
                <p className="text-slate-500 text-[11px]">Admis en classe supérieure avec félicitations du conseil des maîtres.</p>
              </div>
            </div>
          </div>
        )}

      </div>

    </section>
  );
}
