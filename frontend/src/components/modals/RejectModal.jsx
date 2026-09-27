import React, { useState } from 'react';

export default function RejectModal({ candidate, onClose, onConfirm }) {
  const [motif, setMotif] = useState('');

  if (!candidate) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!motif.trim()) return;
    onConfirm(candidate.id, motif);
  };

  return (
    <div className="fixed inset-0 bg-sigapei-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-modal border border-slate-100 fade-enter">
        <h3 className="text-lg font-black text-red-700 font-heading">Rejet Motivé Obligatoire</h3>
        <p className="text-xs text-slate-500">
          Selon le cahier des charges, tout refus d'admission doit comporter un motif clair notifié au parent par e-mail/SMS.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Motif formel du rejet *</label>
            <textarea 
              rows="3" 
              required
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex: Capacité d'accueil atteinte / Dossier académique insuffisant / Pièces non conformes..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-red-500"
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-sm"
            >
              Confirmer le Rejet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
