import React, { useState } from 'react';

export default function CreateCandidatureModal({ classes, onClose, onConfirm }) {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    sexe: 'M',
    date_naissance: '',
    lieu_naissance: '',
    classe_id: classes[0]?.id || '',
    parent_nom: '',
    parent_tel: '',
    parent_email: '',
    parent_adresse: '',
    note_test: '14.0',
    avis_test: 'favorable'
  });

  const selectedClass = classes.find(c => c.id === Number(formData.classe_id));
  const isFull = selectedClass
    ? (selectedClass.inscrits_actuels ?? selectedClass.inscrits ?? 0) >= selectedClass.capacite
    : false;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nom || !formData.prenom || !formData.date_naissance) {
      alert('Veuillez remplir les informations obligatoires de l'élève.');
      return;
    }

    // Mapping champs front → back
    // Le backend attend : classe_visee_id, parent_telephone, parent_lien
    const newCandidate = {
      nom: formData.nom.toUpperCase(),
      prenom: formData.prenom,
      sexe: formData.sexe,
      date_naissance: formData.date_naissance,
      classe_visee_id: Number(formData.classe_id),
      parent_nom: formData.parent_nom,
      parent_telephone: formData.parent_tel,
      parent_email: formData.parent_email,
      parent_lien: 'parent',
    };

    onConfirm(newCandidate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sigapei-black/60 backdrop-blur-sm fade-enter">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Modal Header */}
        <div className="bg-sigapei-green px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-sigapei-gold text-sigapei-black font-black flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <h3 className="font-heading font-black text-lg text-white">Saisie Guichet — Nouvelle Candidature</h3>
              <p className="text-[11px] text-sigapei-cream/80">Enregistrement direct au secrétariat avec pièces justificatives S3</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">

          {/* Section 1 : Informations de l'élève */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-sigapei-green border-b border-slate-100 pb-1 flex items-center gap-2">
              <span>1. Identité de l'apprenant</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nom *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: TOSSOU"
                  value={formData.nom}
                  onChange={e => setFormData({...formData, nom: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-sigapei-green outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Prénom(s) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Yannick"
                  value={formData.prenom}
                  onChange={e => setFormData({...formData, prenom: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-sigapei-green outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Sexe</label>
                <select
                  value={formData.sexe}
                  onChange={e => setFormData({...formData, sexe: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-sigapei-green outline-none bg-white"
                >
                  <option value="M">Masculin (M)</option>
                  <option value="F">Féminin (F)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Date de naissance *</label>
                <input
                  type="date"
                  required
                  value={formData.date_naissance}
                  onChange={e => setFormData({...formData, date_naissance: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-sigapei-green outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Lieu de naissance</label>
                <input
                  type="text"
                  placeholder="Cotonou"
                  value={formData.lieu_naissance}
                  onChange={e => setFormData({...formData, lieu_naissance: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-sigapei-green outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2 : Classe visée et contrôle capacité */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-sigapei-green border-b border-slate-100 pb-1 flex items-center justify-between">
              <span>2. Classe souhaitée & Capacité d'accueil</span>
              {selectedClass && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isFull ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {(selectedClass.inscrits_actuels ?? selectedClass.inscrits ?? 0)} / {selectedClass.capacite} places ({selectedClass.capacite - (selectedClass.inscrits_actuels ?? selectedClass.inscrits ?? 0)} disp.)
                </span>
              )}
            </h4>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Sélectionner la classe *</label>
              <select
                value={formData.classe_id}
                onChange={e => setFormData({...formData, classe_id: e.target.value})}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-sigapei-green outline-none bg-white"
              >
                {classes.map(cl => (
                  <option key={cl.id} value={cl.id}>
                    {cl.nom} — ({(cl.inscrits_actuels ?? cl.inscrits ?? 0)}/{cl.capacite} inscrits) {(cl.inscrits_actuels ?? cl.inscrits ?? 0) >= cl.capacite ? '⚠️ COMPLÈTE' : '✅ Places disp.'}
                  </option>
                ))}
              </select>
            </div>

            {isFull && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <span className="font-bold">⚠️ Règle métier bloquante :</span> Cette classe est à effectif maximal. Vous pouvez quand même enregistrer le dossier en liste d'attente, mais il ne pourra pas être validé tant qu'aucune place ne sera libérée.
              </div>
            )}
          </div>

          {/* Section 3 : Informations Parent / Référent */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-sigapei-green border-b border-slate-100 pb-1">
              3. Parent / Tuteur responsable
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nom complet du parent *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: TOSSOU Sylvain"
                  value={formData.parent_nom}
                  onChange={e => setFormData({...formData, parent_nom: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-sigapei-green outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Téléphone international *</label>
                <input
                  type="tel"
                  required
                  placeholder="+229 97 00 00 00"
                  value={formData.parent_tel}
                  onChange={e => setFormData({...formData, parent_tel: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-sigapei-green outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Email du parent</label>
                <input
                  type="email"
                  placeholder="parent@gmail.com"
                  value={formData.parent_email}
                  onChange={e => setFormData({...formData, parent_email: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-sigapei-green outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Adresse de résidence</label>
                <input
                  type="text"
                  placeholder="Quartier, Ville"
                  value={formData.parent_adresse}
                  onChange={e => setFormData({...formData, parent_adresse: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-sigapei-green outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4 : Évaluation d'admission */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-sigapei-green border-b border-slate-100 pb-1">
              4. Résultats du test ou examen du dossier
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Note obtenue (/20)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  value={formData.note_test}
                  onChange={e => setFormData({...formData, note_test: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-sigapei-green outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Avis pédagogique</label>
                <select
                  value={formData.avis_test}
                  onChange={e => setFormData({...formData, avis_test: e.target.value})}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-sigapei-green outline-none bg-white"
                >
                  <option value="favorable">Favorable (Admissible)</option>
                  <option value="defavorable">Défavorable (Niveau insuffisant)</option>
                  <option value="reserve">Sous réserve de test complémentaire</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-sigapei-green text-white text-xs font-black hover:bg-sigapei-green/90 shadow-md transition flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              <span>Enregistrer le dossier</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
