import React, { useState } from 'react';

export default function CreateClasseModal({ onClose, onConfirm }) {
  const [nom, setNom] = useState('');
  const [cycle, setCycle] = useState('secondaire');
  const [niveau, setNiveau] = useState('6ème');
  const [programme, setProgramme] = useState('beninois');
  const [filiere, setFiliere] = useState('Générale');
  const [capacite, setCapacite] = useState(45);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nom.trim()) return;
    onConfirm({
      nom: nom.trim(),
      cycle,
      niveau,
      programme,
      filiere,
      capacite: parseInt(capacite) || 45,
      inscrits: 0
    });
  };

  return (
    <div className="fixed inset-0 bg-sigapei-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-modal border border-slate-100 fade-enter">
        
        <div className="border-b border-slate-100 pb-3">
          <span className="text-[10px] font-black text-sigapei-gold uppercase tracking-wider">Configuration Pédagogique</span>
          <h3 className="text-xl font-black text-sigapei-black font-heading">Créer une Nouvelle Classe</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Nom officiel de la classe *</label>
            <input 
              type="text" 
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: 4ème B, Seconde S2, CM1..." 
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-sigapei-green"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Cycle d'enseignement *</label>
              <select 
                value={cycle}
                onChange={(e) => setCycle(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-sigapei-green"
              >
                <option value="primaire">Primaire</option>
                <option value="secondaire">Secondaire</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Niveau d'études *</label>
              <input 
                type="text" 
                required
                value={niveau}
                onChange={(e) => setNiveau(e.target.value)}
                placeholder="Ex: 6ème, 3ème, CM2..." 
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-sigapei-green"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Programme *</label>
              <select 
                value={programme}
                onChange={(e) => setProgramme(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-sigapei-green"
              >
                <option value="beninois">Béninois (Sans compte élève)</option>
                <option value="francais">Français (Compte élève au sec.)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Capacité maximale *</label>
              <input 
                type="number" 
                min="10" 
                max="80" 
                required
                value={capacite}
                onChange={(e) => setCapacite(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-sigapei-green"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Filière / Série</label>
            <input 
              type="text" 
              value={filiere}
              onChange={(e) => setFiliere(e.target.value)}
              placeholder="Ex: Générale, Scientifique, Bilingue..." 
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-sigapei-green"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 rounded-xl bg-sigapei-green text-white text-xs font-bold hover:bg-sigapei-green-dark shadow-sm"
            >
              Créer la classe
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
