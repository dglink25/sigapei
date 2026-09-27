import React from 'react';

export default function ExamineModal({ 
  candidate, 
  classes, 
  onClose, 
  onValidate, 
  onOpenReject 
}) {
  if (!candidate) return null;

  const cl = classes.find(x => x.id === candidate.classe_id) || classes[0];
  const isFull = cl.inscrits >= cl.capacite;

  return (
    <div className="fixed inset-0 bg-sigapei-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-modal border border-slate-100 max-h-[90vh] overflow-y-auto fade-enter">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-black text-sigapei-gold uppercase tracking-wider">Instruction Dossier S3</span>
            <h3 className="text-xl font-black text-sigapei-black font-heading">
              {candidate.nom} {candidate.prenom} — Candidature
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Identity Grid */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl text-xs">
            <div><span className="text-slate-400">Date naissance :</span> <strong>{candidate.date_naissance}</strong></div>
            <div><span className="text-slate-400">Genre :</span> <strong>{candidate.sexe === 'M' ? 'Masculin' : 'Féminin'}</strong></div>
            <div><span className="text-slate-400">Classe postulée :</span> <strong className="text-sigapei-green">{cl.nom} ({cl.programme.toUpperCase()})</strong></div>
            <div>
              <span className="text-slate-400">Capacité temps réel :</span>{' '}
              <strong className={isFull ? 'text-red-600' : 'text-sigapei-green'}>
                {isFull ? 'COMPLÈTE (0 place libre)' : `${cl.capacite - cl.inscrits} places libres`}
              </strong>
            </div>
            <div><span className="text-slate-400">Parent / Tuteur :</span> <strong>{candidate.parent_nom} ({candidate.parent_tel})</strong></div>
            <div><span className="text-slate-400">Date de dépôt :</span> <strong>{candidate.date_soumission}</strong></div>
          </div>

          {/* S3 Documents */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-sigapei-black uppercase tracking-wider">Pièces Justificatives (Stockage Objet S3 MinIO)</span>
            <div className="space-y-1.5">
              {candidate.pieces.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white text-xs">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-sigapei-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-bold text-slate-800">{p.type}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{p.file}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF5EF] text-sigapei-green border border-[#BDE3CE] uppercase">
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Admission Test */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-sigapei-black uppercase tracking-wider">Évaluation Test d'Admission</span>
            <div className="p-3 bg-amber-50/70 border border-sigapei-gold/40 rounded-xl flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-800">{candidate.test ? candidate.test.matiere : 'Test standard'}</p>
                <p className="text-[11px] text-slate-500">Seuil de passage requis : 12.0 / 20</p>
              </div>
              <div className="text-right">
                <span className={`text-base font-black font-mono ${candidate.test && candidate.test.note >= 12 ? 'text-sigapei-green' : 'text-red-600'}`}>
                  {candidate.test ? candidate.test.note : '—'} / 20
                </span>
                <p className={`text-[10px] font-extrabold uppercase ${candidate.test && candidate.test.note >= 12 ? 'text-sigapei-green' : 'text-red-600'}`}>
                  {candidate.test ? candidate.test.avis : 'Non noté'}
                </p>
              </div>
            </div>
          </div>

          {/* Capacity blocking alert */}
          {isFull && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-2 text-xs text-red-800">
              <svg className="w-4 h-4 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span><strong>Blocage Capacité :</strong> Cette classe a atteint sa limite maximale ({cl.capacite} places). L'admission directe est verrouillée.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button 
            onClick={() => onOpenReject(candidate.id)} 
            className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition"
          >
            Rejeter la candidature
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Fermer
            </button>
            <button 
              disabled={isFull}
              onClick={() => onValidate(candidate.id)} 
              className={`px-6 py-2 rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shadow-sm ${
                isFull 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-sigapei-green text-white hover:bg-sigapei-green-dark'
              }`}
            >
              <svg className="w-4 h-4 text-sigapei-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Valider l'Admission</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
