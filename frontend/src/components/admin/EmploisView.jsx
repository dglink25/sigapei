import React, { useState } from 'react';
import { initialClasses } from '../../data/initialData';

const SALLES_DISPONIBLES = [
  { id: 'S01', nom: 'Salle 01 (RDC)', capacite: 50, equipement: 'Projecteur + Tableau blanc' },
  { id: 'S02', nom: 'Salle 02 (RDC)', capacite: 45, equipement: 'Tableau blanc' },
  { id: 'S03', nom: 'Salle 03 (1er)',  capacite: 40, equipement: 'Projecteur' },
  { id: 'S12', nom: 'Salle 12 (1er)', capacite: 45, equipement: 'Climatisée' },
  { id: 'LAB-SVT', nom: 'Labo SVT / Biologie', capacite: 35, equipement: 'Microscopes + Paillasses' },
  { id: 'LAB-INFO', nom: 'Salle Informatique', capacite: 30, equipement: '30 PC + Fibre' },
];

const INITIAL_EDT = {
  1: [ // 6ème A
    { id: 1, jour: 'Lundi',    h: '08h-10h', matiere: 'Mathématiques', prof: 'Prof. Mensah',   salle: 'Salle 01 (RDC)' },
    { id: 2, jour: 'Lundi',    h: '10h-12h', matiere: 'Français',      prof: 'Mme Bio',        salle: 'Salle 01 (RDC)' },
    { id: 3, jour: 'Mardi',    h: '08h-10h', matiere: 'Histoire-Géo',  prof: 'Mme Lawson',     salle: 'Salle 01 (RDC)' },
    { id: 4, jour: 'Mardi',    h: '10h-12h', matiere: 'Anglais',       prof: 'M. Smith',       salle: 'Salle 01 (RDC)' },
    { id: 5, jour: 'Mercredi', h: '08h-10h', matiere: 'EPS',           prof: 'M. Gomez',       salle: 'Terrain de sport' },
    { id: 6, jour: 'Jeudi',    h: '08h-10h', matiere: 'SVT',           prof: 'Mme Agossa',     salle: 'Labo SVT / Biologie' },
    { id: 7, jour: 'Vendredi', h: '08h-10h', matiere: 'Physique-Chimie', prof: 'M. Dossou',   salle: 'Salle 01 (RDC)' },
    { id: 8, jour: 'Vendredi', h: '10h-12h', matiere: 'Informatique',  prof: 'Prof. Hounsou',  salle: 'Salle Informatique' },
  ]
};

export default function EmploisView() {
  const [selectedClasseId, setSelectedClasseId] = useState(1);
  const [coursList, setCoursList] = useState(INITIAL_EDT);
  const [activeTab, setActiveTab] = useState('planning'); // 'planning' | 'salles'

  // Modal d'ajout de cours
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCours, setNewCours] = useState({
    jour: 'Lundi',
    h: '08h-10h',
    matiere: 'Mathématiques',
    prof: 'Prof. Mensah',
    salle: 'Salle 01 (RDC)'
  });

  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const heures = ['08h-10h', '10h-12h', '15h-17h'];

  const currentClasse = initialClasses.find(c => c.id === Number(selectedClasseId)) || initialClasses[0];
  const classeCours = coursList[selectedClasseId] || [];

  const handleAddCours = (e) => {
    e.preventDefault();
    const newEntry = {
      id: Date.now(),
      ...newCours
    };

    setCoursList(prev => ({
      ...prev,
      [selectedClasseId]: [...(prev[selectedClasseId] || []), newEntry]
    }));

    setIsAddModalOpen(false);
  };

  const handleDeleteCours = (id) => {
    setCoursList(prev => ({
      ...prev,
      [selectedClasseId]: (prev[selectedClasseId] || []).filter(c => c.id !== id)
    }));
  };

  return (
    <div className="space-y-6 fade-enter">
      
      {/* Header avec sélecteur de classe et boutons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-sigapei-black font-heading">Gestion Pédagogique des Emplois du Temps</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
              Espace Censeur
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Programmation des cours, affectation des salles et contrôle des disponibilités des enseignants.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select 
            value={selectedClasseId}
            onChange={e => setSelectedClasseId(Number(e.target.value))}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 focus:border-sigapei-green outline-none shadow-sm"
          >
            {initialClasses.map(c => (
              <option key={c.id} value={c.id}>
                Classe : {c.nom} ({c.cycle} • {c.programme})
              </option>
            ))}
          </select>

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-sigapei-gold text-sigapei-black font-black text-xs shadow-md hover:bg-sigapei-gold-hover transition flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Ajouter un cours</span>
          </button>
        </div>
      </div>

      {/* Onglets : Planning de classe vs Vue des Salles */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('planning')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'planning' 
              ? 'bg-sigapei-green text-white shadow-sm' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Emploi du temps par classe ({currentClasse.nom})</span>
        </button>

        <button
          onClick={() => setActiveTab('salles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'salles' 
              ? 'bg-sigapei-green text-white shadow-sm' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span>Occupation des Salles ({SALLES_DISPONIBLES.length} salles)</span>
        </button>
      </div>

      {/* ── TAB 1 : PLANNING HEBDOMADAIRE DE LA CLASSE ── */}
      {activeTab === 'planning' && (
        <div className="bg-white p-6 rounded-3xl shadow-card border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-extrabold text-sigapei-black uppercase tracking-wider">
                Planning Hebdomadaire — {currentClasse.nom}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cycle {currentClasse.cycle} • Programme {currentClasse.programme} • Capacité : {currentClasse.inscrits}/{currentClasse.capacite} élèves
              </p>
            </div>
            <span className="text-xs font-bold text-sigapei-green bg-sigapei-green/10 px-3 py-1 rounded-xl">
              {classeCours.length * 2} Heures programmées
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
            {jours.map(jour => {
              const coursDuJour = classeCours.filter(c => c.jour === jour);
              return (
                <div key={jour} className="bg-slate-50 border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col">
                  <div className="bg-sigapei-sidebar px-4 py-2.5 text-center">
                    <span className="text-xs font-black text-sigapei-cream uppercase tracking-wider">{jour}</span>
                  </div>

                  <div className="p-2.5 space-y-2.5 flex-1 min-h-[160px]">
                    {coursDuJour.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs italic py-8">
                        Aucun cours
                      </div>
                    ) : (
                      coursDuJour.map(c => (
                        <div key={c.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs relative group hover:border-sigapei-green transition">
                          <div className="flex items-center justify-between text-[11px] font-mono text-sigapei-green font-bold">
                            <span>{c.h}</span>
                            <button
                              onClick={() => handleDeleteCours(c.id)}
                              title="Supprimer ce créneau"
                              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="font-extrabold text-xs text-slate-800 mt-1">{c.matiere}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{c.prof}</div>
                          <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            🏛️ {c.salle}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2 : OCCUPATION DES SALLES ── */}
      {activeTab === 'salles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SALLES_DISPONIBLES.map(salle => (
              <div key={salle.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-sigapei-green/10 text-sigapei-green font-black flex items-center justify-center text-sm">
                    {salle.id}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Disponible
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800">{salle.nom}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Capacité : {salle.capacite} places assises</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Équipement : {salle.equipement}</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Affectée actuellement à :</span>
                  <span className="font-bold text-sigapei-green">6ème A / 2nde B</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Ajout de Créneau */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sigapei-black/60 backdrop-blur-sm fade-enter">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden">
            <div className="bg-sigapei-green px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-heading font-black text-base text-white">
                Ajouter un cours — {currentClasse.nom}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-white hover:text-white/80">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCours} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Jour</label>
                  <select 
                    value={newCours.jour}
                    onChange={e => setNewCours({...newCours, jour: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-sigapei-green outline-none bg-white"
                  >
                    {jours.map(j => <option key={j}>{j}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Horaire</label>
                  <select 
                    value={newCours.h}
                    onChange={e => setNewCours({...newCours, h: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-sigapei-green outline-none bg-white font-mono"
                  >
                    {heures.map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Matière *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Mathématiques, Français, SVT..."
                  value={newCours.matiere}
                  onChange={e => setNewCours({...newCours, matiere: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-sigapei-green outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Enseignant responsable *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Prof. Mensah, Mme Bio..."
                  value={newCours.prof}
                  onChange={e => setNewCours({...newCours, prof: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-sigapei-green outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Salle attribuée *</label>
                <select 
                  value={newCours.salle}
                  onChange={e => setNewCours({...newCours, salle: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-sigapei-green outline-none bg-white"
                >
                  {SALLES_DISPONIBLES.map(s => (
                    <option key={s.id} value={s.nom}>{s.nom} ({s.capacite} places)</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sigapei-green text-white text-xs font-black hover:bg-sigapei-green/90 shadow-md transition"
                >
                  Enregistrer le cours
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
