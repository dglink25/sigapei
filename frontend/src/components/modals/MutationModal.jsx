import React, { useState } from 'react';

export default function MutationModal({ 
  apprenant, 
  classes, 
  onClose, 
  onConfirm 
}) {
  const [targetClasseId, setTargetClasseId] = useState(classes[0]?.id || 1);
  const [motif, setMotif] = useState('');

  if (!apprenant) return null;

  const currentClasse = classes.find(c => c.id === apprenant.classe_id) || classes[0];
  const targetClasse = classes.find(c => c.id === parseInt(targetClasseId)) || classes[0];
  const isTargetFull = targetClasse.inscrits >= targetClasse.capacite;
  const isCurriculumChanged = currentClasse.programme !== targetClasse.programme;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isTargetFull) return;
    onConfirm(apprenant.id, parseInt(targetClasseId), motif);
  };

  return (
    <div className="fixed inset-0 bg-sigapei-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-modal border border-slate-100 fade-enter">
        
        <div className="border-b border-slate-100 pb-3">
          <span className="text-[10px] font-black text-sigapei-gold uppercase tracking-wider">Mutation Interne Sans Doublon</span>
          <h3 className="text-xl font-black text-sigapei-black font-heading">
            {apprenant.nom} {apprenant.prenom}
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Matricule : {apprenant.matricule}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-slate-400">Classe actuelle :</span>{' '}
            <strong className="text-slate-800">{currentClasse.nom} ({currentClasse.programme.toUpperCase()})</strong>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Nouvelle classe de destination *</label>
            <select 
              value={targetClasseId}
              onChange={(e) => setTargetClasseId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:border-sigapei-green"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nom} — {c.programme.toUpperCase()} ({c.inscrits}/{c.capacite} inscrits)
                </option>
              ))}
            </select>
          </div>

          {/* Curriculum change notification */}
          {isCurriculumChanged && (
            <div className="bg-amber-50 border border-sigapei-gold/50 rounded-xl p-3 text-amber-950 flex items-start gap-2">
              <svg className="w-4 h-4 text-sigapei-gold shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                <strong>Attention changement de programme :</strong> Le passage entre le programme Béninois et Français modifie automatiquement les droits de compte de l'élève (compte personnel requis au secondaire français).
              </span>
            </div>
          )}

          {isTargetFull && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-800 font-bold">
              Classe de destination complète ({targetClasse.capacite} places). Mutation impossible vers cette classe.
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">Motif du transfert ou de réorientation *</label>
            <input 
              type="text" 
              required
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex: Réorientation vers série scientifique, demande du censeur..." 
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
              disabled={isTargetFull}
              className={`px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition ${
                isTargetFull 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-sigapei-green text-white hover:bg-sigapei-green-dark'
              }`}
            >
              Valider la Mutation
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
