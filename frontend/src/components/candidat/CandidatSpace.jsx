import React, { useState } from 'react';

/**
 * Normalise une candidature du backend pour l'affichage dans l'espace candidat.
 */
function normalizeCandidate(c) {
  return {
    uuid: c.uuid,
    nom: c.nom,
    prenom: c.prenom,
    sexe: c.sexe,
    date_naissance: c.date_naissance,
    classe_visee_id: c.classe_visee_id,
    classe_nom: c.classe_visee?.nom || '',
    statut: c.statut,
    parent_nom: c.parent_nom,
    parent_telephone: c.parent_telephone,
    parent_email: c.parent_email,
    date_soumission: c.date_soumission,
  };
}

export default function CandidatSpace({
  classes = [],
  candidatures = [],
  apprenants = [],
  onSubmitCandidature,
  onReinscription,
  showToast
}) {
  const [subTab, setSubTab] = useState('form'); // 'form' | 'suivi' | 'reinc'
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [dateNaissance, setDateNaissance] = useState('2014-06-15');
  const [sexe, setSexe] = useState('M');
  const [lieuNaissance, setLieuNaissance] = useState('Cotonou');
  const [selectedClasseId, setSelectedClasseId] = useState(null);
  const [parentNom, setParentNom] = useState('');
  const [parentTel, setParentTel] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentAdresse, setParentAdresse] = useState('');

  // Search state
  const [searchUuid, setSearchUuid] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  // Re-registration state
  const [reincMatricule, setReincMatricule] = useState('');
  const [reincClasseId, setReincClasseId] = useState(classes[1]?.id || '');

  const normalizedCandidatures = candidatures.map(normalizeCandidate);
  const normalizedApprenants = apprenants.map(a => ({
    uuid: a.uuid,
    matricule: a.matricule,
    nom: a.nom,
    prenom: a.prenom,
    classe_id: a.classe?.id || a.classe_id,
  }));

  const handleNextStep = (nextStep) => {
    if (nextStep === 2) {
      if (!nom.trim() || !prenom.trim()) {
        showToast('Veuillez renseigner le nom et le prénom de l\'élève.', 'warning');
        return;
      }
    }
    if (nextStep === 3) {
      if (!selectedClasseId) {
        showToast('Veuillez sélectionner une classe disponible.', 'warning');
        return;
      }
    }
    if (nextStep === 4) {
      if (!parentNom.trim() || !parentTel.trim()) {
        showToast('Veuillez renseigner le nom et téléphone du responsable.', 'warning');
        return;
      }
    }
    setCurrentStep(nextStep);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const cl = classes.find(c => c.id === Number(selectedClasseId));
    if (!cl) {
      showToast('Veuillez choisir une classe.', 'warning');
      return;
    }
    const inscrits = cl.inscrits_actuels ?? cl.inscrits ?? 0;
    if (inscrits >= cl.capacite) {
      showToast('Cette classe est complète. Veuillez en choisir une autre.', 'error');
      return;
    }

    // Mapping champs front → back
    const newCand = {
      nom: nom.trim().toUpperCase(),
      prenom: prenom.trim(),
      sexe,
      date_naissance: dateNaissance,
      classe_visee_id: Number(selectedClasseId),
      parent_nom: parentNom.trim(),
      parent_telephone: parentTel.trim(),
      parent_email: parentEmail.trim(),
      parent_lien: 'parent',
    };

    const ok = await onSubmitCandidature(newCand);
    if (!ok) return;

    showToast(`Candidature soumise avec succès !`, 'success');
    setSubTab('suivi');

    // Reset form
    setNom('');
    setPrenom('');
    setSelectedClasseId(null);
    setCurrentStep(1);
  };

  const handleSearchDossier = () => {
    const q = searchUuid.trim().toUpperCase();
    const found = normalizedCandidatures.find(c => c.uuid?.toUpperCase() === q);
    setSearchResult(found || 'not_found');
  };

  const handleReincAction = async () => {
    const app = normalizedApprenants.find(a => a.matricule?.toUpperCase() === reincMatricule.trim().toUpperCase());
    if (!app) {
      showToast('Aucun dossier trouvé pour ce matricule.', 'error');
      return;
    }
    const targetCl = classes.find(c => c.id === Number(reincClasseId));
    if (!targetCl) {
      showToast('Veuillez choisir une classe.', 'warning');
      return;
    }
    const inscrits = targetCl.inscrits_actuels ?? targetCl.inscrits ?? 0;
    if (inscrits >= targetCl.capacite) {
      showToast(`La classe ${targetCl.nom} est complète.`, 'error');
      return;
    }

    const ok = await onReinscription(app.uuid, targetCl.uuid || targetCl.id);
    if (!ok) return;
    showToast(`Réinscription validée sans doublon pour ${app.nom} !`, 'success');
  };

  return (
    <section className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 max-w-5xl mx-auto w-full fade-enter">

      {/* Space header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-sigapei-gold-light border border-sigapei-gold-border text-sigapei-black text-xs font-bold uppercase tracking-wider mb-2 inline-block">
            Portail Public Admissions
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-sigapei-black font-heading tracking-tight">
            Espace Admissions & Inscriptions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Déposez une nouvelle candidature, suivez votre dossier en direct ou réinscrivez un élève déjà scolarisé.
          </p>
        </div>

        {/* Navigation tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setSubTab('form')}
            className={`px-4 py-2 rounded-lg transition ${
              subTab === 'form'
                ? 'bg-sigapei-green text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Nouvelle Inscription
          </button>
          <button
            onClick={() => setSubTab('suivi')}
            className={`px-4 py-2 rounded-lg transition ${
              subTab === 'suivi'
                ? 'bg-sigapei-green text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Suivi Dossier
          </button>
          <button
            onClick={() => setSubTab('reinc')}
            className={`px-4 py-2 rounded-lg transition ${
              subTab === 'reinc'
                ? 'bg-sigapei-green text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Réinscription
          </button>
        </div>
      </div>

      {/* ── SUBTAB: FORMULAIRE NOUVELLE INSCRIPTION ── */}
      {subTab === 'form' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-slate-100 space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map(step => (
              <div key={step} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                  currentStep >= step
                    ? 'bg-sigapei-green text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {step}
                </div>
                {step < 4 && <div className={`w-8 h-0.5 ${currentStep > step ? 'bg-sigapei-green' : 'bg-slate-200'}`} />}
              </div>
            ))}
            <span className="ml-3 text-xs font-bold text-slate-500">
              {currentStep === 1 && 'Identité de l\'élève'}
              {currentStep === 2 && 'Classe souhaitée'}
              {currentStep === 3 && 'Parent / Responsable'}
              {currentStep === 4 && 'Validation'}
            </span>
          </div>

          {/* Step 1: Identité */}
          {currentStep === 1 && (
            <div className="space-y-4 fade-enter">
              <h3 className="text-sm font-black text-sigapei-black">Étape 1 — Identité de l'élève</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nom *</label>
                  <input
                    type="text"
                    value={nom}
                    onChange={e => setNom(e.target.value)}
                    placeholder="Ex: ADANHOUN"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-sigapei-green outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prénom(s) *</label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={e => setPrenom(e.target.value)}
                    placeholder="Ex: Sèna Christian"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-sigapei-green outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Sexe</label>
                  <select
                    value={sexe}
                    onChange={e => setSexe(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-sigapei-green outline-none bg-white"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date de naissance</label>
                  <input
                    type="date"
                    value={dateNaissance}
                    onChange={e => setDateNaissance(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-sigapei-green outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lieu de naissance</label>
                  <input
                    type="text"
                    value={lieuNaissance}
                    onChange={e => setLieuNaissance(e.target.value)}
                    placeholder="Cotonou"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-sigapei-green outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => handleNextStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-sigapei-green text-white text-xs font-black hover:bg-sigapei-green-dark transition"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Classe */}
          {currentStep === 2 && (
            <div className="space-y-4 fade-enter">
              <h3 className="text-sm font-black text-sigapei-black">Étape 2 — Classe souhaitée</h3>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Sélectionner une classe *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {classes.map(cl => {
                    const inscrits = cl.inscrits_actuels ?? cl.inscrits ?? 0;
                    const full = inscrits >= cl.capacite;
                    return (
                      <button
                        key={cl.id}
                        type="button"
                        onClick={() => !full && setSelectedClasseId(cl.id)}
                        disabled={full}
                        className={`p-4 rounded-xl border-2 text-left transition ${
                          selectedClasseId === cl.id
                            ? 'border-sigapei-green bg-sigapei-green/5'
                            : full
                              ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                              : 'border-slate-200 hover:border-sigapei-green/50'
                        }`}
                      >
                        <div className="font-bold text-sm text-slate-800">{cl.nom}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {cl.cycle} • {cl.niveau} • Prog. {cl.programme}
                        </div>
                        <div className={`text-xs font-bold mt-2 ${full ? 'text-red-600' : 'text-sigapei-green'}`}>
                          {full ? '⚠️ COMPLÈTE' : `${cl.capacite - inscrits} places disponibles`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  ← Précédent
                </button>
                <button
                  onClick={() => handleNextStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-sigapei-green text-white text-xs font-black hover:bg-sigapei-green-dark transition"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Parent */}
          {currentStep === 3 && (
            <div className="space-y-4 fade-enter">
              <h3 className="text-sm font-black text-sigapei-black">Étape 3 — Parent / Responsable</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nom complet du parent *</label>
                  <input
                    type="text"
                    value={parentNom}
                    onChange={e => setParentNom(e.target.value)}
                    placeholder="Ex: ADANHOUN Jean-Baptiste"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-sigapei-green outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    value={parentTel}
                    onChange={e => setParentTel(e.target.value)}
                    placeholder="+229 97 00 11 22"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-sigapei-green outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={parentEmail}
                    onChange={e => setParentEmail(e.target.value)}
                    placeholder="parent@gmail.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-sigapei-green outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Adresse</label>
                  <input
                    type="text"
                    value={parentAdresse}
                    onChange={e => setParentAdresse(e.target.value)}
                    placeholder="Quartier, Ville"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-sigapei-green outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  ← Précédent
                </button>
                <button
                  onClick={() => handleNextStep(4)}
                  className="px-6 py-2.5 rounded-xl bg-sigapei-green text-white text-xs font-black hover:bg-sigapei-green-dark transition"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Validation */}
          {currentStep === 4 && (
            <div className="space-y-4 fade-enter">
              <h3 className="text-sm font-black text-sigapei-black">Étape 4 — Validation et soumission</h3>
              <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-sm">
                <div><strong>Élève :</strong> {nom} {prenom}</div>
                <div><strong>Classe :</strong> {classes.find(c => c.id === selectedClasseId)?.nom || '—'}</div>
                <div><strong>Parent :</strong> {parentNom} ({parentTel})</div>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  ← Précédent
                </button>
                <button
                  onClick={handleFormSubmit}
                  className="px-6 py-2.5 rounded-xl bg-sigapei-green text-white text-xs font-black hover:bg-sigapei-green-dark transition"
                >
                  Soumettre la candidature
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SUBTAB: SUIVI DOSSIER ── */}
      {subTab === 'suivi' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-slate-100 space-y-6 fade-enter">
          <h3 className="text-sm font-black text-sigapei-black">Suivi de votre dossier</h3>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Numéro de dossier (UUID)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchUuid}
                onChange={e => setSearchUuid(e.target.value)}
                placeholder="Ex: CAND-2026-8941 ou l'UUID complet"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-sigapei-green outline-none"
              />
              <button
                onClick={handleSearchDossier}
                className="px-6 py-2.5 rounded-xl bg-sigapei-green text-white text-xs font-black hover:bg-sigapei-green-dark transition"
              >
                Rechercher
              </button>
            </div>
          </div>

          {searchResult === 'not_found' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              Aucun dossier trouvé pour ce numéro. Vérifiez le numéro saisi.
            </div>
          )}

          {searchResult && searchResult !== 'not_found' && (
            <div className="bg-slate-50 rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Nom :</span>
                  <strong className="ml-2">{searchResult.nom} {searchResult.prenom}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Classe visée :</span>
                  <strong className="ml-2">{searchResult.classe_nom || '—'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Date de dépôt :</span>
                  <strong className="ml-2">{searchResult.date_soumission || '—'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Statut :</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                    searchResult.statut === 'validee' ? 'bg-emerald-100 text-emerald-800' :
                    searchResult.statut === 'rejetee' ? 'bg-red-100 text-red-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {searchResult.statut || '—'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SUBTAB: RÉINSCRIPTION ── */}
      {subTab === 'reinc' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-slate-100 space-y-6 fade-enter">
          <h3 className="text-sm font-black text-sigapei-black">Réinscription d'un élève déjà scolarisé</h3>
          <p className="text-xs text-slate-500">
            La réinscription reconduit l'élève sur la nouvelle année scolaire sans créer de doublon de dossier.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Matricule de l'élève</label>
              <input
                type="text"
                value={reincMatricule}
                onChange={e => setReincMatricule(e.target.value)}
                placeholder="Ex: MAT-2026-6A-0012"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-sigapei-green outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nouvelle classe</label>
              <select
                value={reincClasseId}
                onChange={e => setReincClasseId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-sigapei-green outline-none bg-white"
              >
                {classes.map(cl => (
                  <option key={cl.id} value={cl.id}>
                    {cl.nom} ({cl.programme})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <button
              onClick={handleReincAction}
              className="px-6 py-2.5 rounded-xl bg-sigapei-green text-white text-xs font-black hover:bg-sigapei-green-dark transition"
            >
              Valider la réinscription
            </button>
          </div>
        </div>
      )}

    </section>
  );
}
