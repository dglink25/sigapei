import React, { useState } from 'react';
import { academicYears } from '../../data/initialData';

export default function AnneeScolaireView({ 
  currentYear, 
  onSelectYear,
  classes 
}) {
  const [years, setYears] = useState(academicYears);
  const [isNewYearModalOpen, setIsNewYearModalOpen] = useState(false);
  const [newYearForm, setNewYearForm] = useState({
    id: '2028-2029',
    libelle: 'Année 2028-2029',
    debut: '2028-09-15',
    fin: '2029-06-30',
    reconduireClasses: true
  });
  const [transitionStatus, setTransitionStatus] = useState(null);

  const handleSetActive = (yearId) => {
    setYears(prev => prev.map(y => ({
      ...y,
      estCourante: y.id === yearId,
      statut: y.id === yearId ? 'active' : (y.id < yearId ? 'cloturee' : 'preparation')
    })));
    onSelectYear(yearId);
  };

  const handleCreateYear = (e) => {
    e.preventDefault();
    const created = {
      id: newYearForm.id,
      libelle: newYearForm.libelle,
      statut: 'preparation',
      debut: newYearForm.debut,
      fin: newYearForm.fin,
      periodeActuelle: 'Préinscriptions',
      estCourante: false
    };
    setYears(prev => [...prev, created]);
    setIsNewYearModalOpen(false);
  };

  const handleRunTransition = () => {
    setTransitionStatus('processing');
    setTimeout(() => {
      setTransitionStatus('done');
      setTimeout(() => setTransitionStatus(null), 4000);
    }, 1500);
  };

  return (
    <div className="space-y-6 fade-enter">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-sigapei-black font-heading">
              Gestion des Années Académiques & Rentrée
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sigapei-gold text-sigapei-black">
              Direction Générale
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Orchestration temporelle, bascule annuelle, reconduction des classes et historique sans duplication de dossier.
          </p>
        </div>

        <button
          onClick={() => setIsNewYearModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-sigapei-green text-white text-xs font-black hover:bg-sigapei-green/90 shadow-md transition flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>Ouvrir une nouvelle année académique</span>
        </button>
      </div>

      {/* Cartes des Années Scolaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {years.map(y => {
          const isSelected = y.id === currentYear;
          return (
            <div 
              key={y.id}
              className={`bg-white rounded-3xl p-6 border transition-all space-y-4 shadow-card relative overflow-hidden ${
                isSelected 
                  ? 'border-sigapei-green ring-2 ring-sigapei-green/20' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 bg-sigapei-green text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                  ANNÉE ACTIVE EN COURS
                </div>
              )}

              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm ${
                  y.statut === 'active' ? 'bg-sigapei-green text-sigapei-cream' :
                  y.statut === 'cloturee' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-800'
                }`}>
                  📅
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg text-slate-900">{y.libelle}</h3>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    y.statut === 'active' ? 'bg-emerald-100 text-emerald-800' :
                    y.statut === 'cloturee' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {y.statut === 'active' ? '● En cours' : y.statut === 'cloturee' ? 'Archivée' : 'En préparation'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400">Période :</span>
                  <span className="font-semibold">{y.debut} au {y.fin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Période active :</span>
                  <span className="font-bold text-sigapei-green">{y.periodeActuelle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Classes actives :</span>
                  <span className="font-mono font-bold text-slate-800">{classes.length} classes</span>
                </div>
              </div>

              <div className="pt-3">
                {!isSelected ? (
                  <button
                    onClick={() => handleSetActive(y.id)}
                    className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
                  >
                    Basculer sur cette année
                  </button>
                ) : (
                  <div className="w-full py-2 rounded-xl bg-sigapei-green/10 text-sigapei-green text-center text-xs font-black">
                    ✓ Session de travail active
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Panneau de Clôture & Transition de Rentrée */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 font-black flex items-center justify-center">
            🔄
          </div>
          <div>
            <h3 className="font-heading font-black text-base text-slate-900">
              Procédure de Fin d'Année & Transition vers la Rentrée Suivante
            </h3>
            <p className="text-xs text-slate-500">
              Passage automatique des élèves admis vers le niveau supérieur sans création de doublons (conforme au cahier des charges).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="font-bold text-slate-800 block">1. Gel des Notes & Bulletins</span>
            <p className="text-slate-500 text-[11px]">
              Verrouille les saisies des moyennes du 3ème trimestre et archive les bulletins certifiés.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="font-bold text-slate-800 block">2. Décisions du Conseil</span>
            <p className="text-slate-500 text-[11px]">
              Attribution des mentions (Admis en classe supérieure, Redoublement, Orientation de filière).
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="font-bold text-slate-800 block">3. Reconduction sans Doublon</span>
            <p className="text-slate-500 text-[11px]">
              La fiche élève unique est conservée et rattachée à sa nouvelle classe dans `scolarite.historique_classes`.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Dernière transition exécutée : 15 Septembre 2026 par Harold MIKPONHOUE
          </span>

          <button
            onClick={handleRunTransition}
            disabled={transitionStatus === 'processing'}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-black transition shadow-sm flex items-center space-x-2"
          >
            {transitionStatus === 'processing' ? (
              <span>Traitement en cours...</span>
            ) : transitionStatus === 'done' ? (
              <span>✓ Transition de rentrée validée !</span>
            ) : (
              <span>Simuler la transition de passage</span>
            )}
          </button>
        </div>
      </div>

      {/* Modal Nouvelle Année */}
      {isNewYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sigapei-black/60 backdrop-blur-sm fade-enter">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="bg-sigapei-green p-5 text-white flex items-center justify-between">
              <h3 className="font-heading font-black text-base text-white">Créer une Année Académique</h3>
              <button onClick={() => setIsNewYearModalOpen(false)} className="text-white hover:text-white/80">✕</button>
            </div>

            <form onSubmit={handleCreateYear} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Identifiant & Libellé</label>
                <input
                  type="text"
                  required
                  value={newYearForm.libelle}
                  onChange={e => setNewYearForm({ ...newYearForm, libelle: e.target.value, id: e.target.value.replace('Année ', '') })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-sigapei-green"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Date de Rentrée</label>
                  <input
                    type="date"
                    required
                    value={newYearForm.debut}
                    onChange={e => setNewYearForm({ ...newYearForm, debut: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-sigapei-green"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Date de Clôture</label>
                  <input
                    type="date"
                    required
                    value={newYearForm.fin}
                    onChange={e => setNewYearForm({ ...newYearForm, fin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-sigapei-green"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="reconduire"
                  checked={newYearForm.reconduireClasses}
                  onChange={e => setNewYearForm({ ...newYearForm, reconduireClasses: e.target.checked })}
                  className="rounded text-sigapei-green"
                />
                <label htmlFor="reconduire" className="text-[11px] text-slate-700 font-semibold cursor-pointer">
                  Dupliquer la structure pédagogique des classes actuelles
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewYearModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sigapei-green text-white font-black hover:bg-sigapei-green/90 shadow-sm"
                >
                  Ouvrir l'année
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
