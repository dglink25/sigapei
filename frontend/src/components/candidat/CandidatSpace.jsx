import React, { useState } from 'react';

export default function CandidatSpace({ 
  classes, 
  candidatures, 
  apprenants, 
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
  const [searchUuid, setSearchUuid] = useState('CAND-2026-8941');
  const [searchResult, setSearchResult] = useState(null);

  // Re-registration state
  const [reincMatricule, setReincMatricule] = useState('MAT-2026-6A-0012');
  const [reincClasseId, setReincClasseId] = useState(classes[1]?.id || 2);

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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const cl = classes.find(c => c.id === selectedClasseId);
    if (!cl) {
      showToast('Veuillez choisir une classe.', 'warning');
      return;
    }
    if (cl.inscrits >= cl.capacite) {
      showToast('Cette classe est complète. Veuillez en choisir une autre.', 'error');
      return;
    }

    const newUuid = `CAND-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newCand = {
      id: Date.now(),
      uuid: newUuid,
      nom: nom.trim().toUpperCase(),
      prenom: prenom.trim(),
      sexe,
      date_naissance: dateNaissance,
      lieu_naissance: lieuNaissance,
      classe_id: selectedClasseId,
      statut: 'en_attente',
      parent_nom: parentNom.trim(),
      parent_tel: parentTel.trim(),
      parent_email: parentEmail.trim(),
      parent_adresse: parentAdresse.trim(),
      date_soumission: new Date().toISOString().split('T')[0],
      pieces: [
        { type: 'Extrait de naissance', file: `s3://inscriptions/dossiers/${newUuid}/acte.pdf`, status: 'conforme' },
        { type: 'Bulletins antérieurs', file: `s3://inscriptions/dossiers/${newUuid}/notes.pdf`, status: 'en_cours' }
      ],
      test: { matiere: 'Test d\'évaluation', note: 14.0, avis: 'favorable' }
    };

    onSubmitCandidature(newCand);
    showToast(`Candidature soumise avec succès ! Numéro de dossier : ${newUuid}`, 'success');
    setSearchUuid(newUuid);
    setSubTab('suivi');
    setSearchResult(newCand);

    // Reset form
    setNom('');
    setPrenom('');
    setSelectedClasseId(null);
    setCurrentStep(1);
  };

  const handleSearchDossier = () => {
    const q = searchUuid.trim().toUpperCase();
    const found = candidatures.find(c => c.uuid.toUpperCase() === q);
    setSearchResult(found || 'not_found');
  };

  const handleReincAction = () => {
    const app = apprenants.find(a => a.matricule.toUpperCase() === reincMatricule.trim().toUpperCase());
    if (!app) {
      showToast('Aucun dossier trouvé pour ce matricule.', 'error');
      return;
    }
    const targetCl = classes.find(c => c.id === parseInt(reincClasseId));
    if (targetCl.inscrits >= targetCl.capacite) {
      showToast(`La classe ${targetCl.nom} est complète.`, 'error');
      return;
    }

    onReinscription(app.id, parseInt(reincClasseId));
    showToast(`Réinscription validée sans doublon pour ${app.nom} en ${targetCl.nom} !`, 'success');
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

      {/* SUB-VIEW 1 : FORMULAIRE CANDIDATURE */}
      {subTab === 'form' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-slate-100 space-y-8 fade-enter">
          
          {/* Stepper */}
          <div className="relative flex justify-between max-w-2xl mx-auto px-4">
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-sigapei-green z-0 transition-all duration-300"
              style={{ width: `${currentStep * 25}%` }}
            ></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 w-full -z-10"></div>
            
            {[1, 2, 3, 4].map(step => (
              <div key={step} className="flex flex-col items-center relative z-10">
                <div 
                  className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center border-4 border-white shadow-sm transition-all ${
                    step < currentStep 
                      ? 'bg-sigapei-green text-white' 
                      : step === currentStep 
                      ? 'bg-sigapei-gold text-sigapei-black font-black' 
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step < currentStep ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : step}
                </div>
                <span className="text-[11px] font-bold text-slate-600 mt-1">
                  {step === 1 && 'Identité'}
                  {step === 2 && 'Classe'}
                  {step === 3 && 'Parent'}
                  {step === 4 && 'Pièces & S3'}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={handleFormSubmit}>
            {/* STEP 1 */}
            {currentStep === 1 && (
              <div className="space-y-4 max-w-xl mx-auto text-xs fade-enter">
                <h3 className="text-base font-black text-sigapei-black font-heading border-b border-slate-100 pb-2">
                  Étape 1 : Identité de l'Apprenant
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nom de famille *</label>
                    <input 
                      type="text" 
                      required 
                      value={nom} 
                      onChange={(e) => setNom(e.target.value)} 
                      placeholder="Ex: BIO" 
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-sigapei-green" 
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Prénom(s) *</label>
                    <input 
                      type="text" 
                      required 
                      value={prenom} 
                      onChange={(e) => setPrenom(e.target.value)} 
                      placeholder="Ex: Paul Sèna" 
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-sigapei-green" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Date de naissance *</label>
                    <input 
                      type="date" 
                      required 
                      value={dateNaissance} 
                      onChange={(e) => setDateNaissance(e.target.value)} 
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-sigapei-green" 
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Genre *</label>
                    <select 
                      value={sexe} 
                      onChange={(e) => setSexe(e.target.value)} 
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-sigapei-green"
                    >
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lieu de naissance *</label>
                  <input 
                    type="text" 
                    required 
                    value={lieuNaissance} 
                    onChange={(e) => setLieuNaissance(e.target.value)} 
                    placeholder="Ex: Cotonou, Bénin" 
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-sigapei-green" 
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <button 
                    type="button" 
                    onClick={() => handleNextStep(2)} 
                    className="px-6 py-2.5 rounded-xl bg-sigapei-green text-white font-bold text-xs hover:bg-sigapei-green-dark transition flex items-center gap-2"
                  >
                    <span>Continuer vers la classe</span>
                    <svg className="w-4 h-4 text-sigapei-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {currentStep === 2 && (
              <div className="space-y-4 max-w-xl mx-auto text-xs fade-enter">
                <h3 className="text-base font-black text-sigapei-black font-heading border-b border-slate-100 pb-2">
                  Étape 2 : Choix de la Classe & Vérification Capacité
                </h3>
                <p className="text-slate-500">
                  Sélectionnez la classe souhaitée. Les classes complètes sont bloquées automatiquement.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {classes.map(c => {
                    const dispo = Math.max(0, c.capacite - c.inscrits);
                    const isFull = dispo <= 0;
                    const isSelected = c.id === selectedClasseId;

                    return (
                      <div 
                        key={c.id}
                        onClick={() => {
                          if (!isFull) setSelectedClasseId(c.id);
                        }}
                        className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                          isFull 
                            ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed' 
                            : isSelected 
                            ? 'border-sigapei-green bg-sigapei-cream/40 ring-2 ring-sigapei-green/20 shadow-card' 
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-sm font-black text-sigapei-black font-heading">{c.nom}</span>
                            <p className="text-xs text-slate-500 capitalize">{c.cycle} • Niveau {c.niveau}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            c.programme === 'beninois' 
                              ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                              : 'bg-blue-100 text-blue-900 border border-blue-200'
                          }`}>
                            Prog. {c.programme.toUpperCase()}
                          </span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500">Places d'admission :</span>
                          <span className={`font-extrabold ${isFull ? 'text-red-600' : 'text-sigapei-green'}`}>
                            {isFull ? 'COMPLÈTE (Bloquant)' : `${dispo} place${dispo > 1 ? 's' : ''} disponible${dispo > 1 ? 's' : ''}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between pt-4">
                  <button 
                    type="button" 
                    onClick={() => handleNextStep(1)} 
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Retour
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleNextStep(3)} 
                    className="px-6 py-2.5 rounded-xl bg-sigapei-green text-white font-bold text-xs hover:bg-sigapei-green-dark transition flex items-center gap-2"
                  >
                    <span>Continuer vers le responsable</span>
                    <svg className="w-4 h-4 text-sigapei-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {currentStep === 3 && (
              <div className="space-y-4 max-w-xl mx-auto text-xs fade-enter">
                <h3 className="text-base font-black text-sigapei-black font-heading border-b border-slate-100 pb-2">
                  Étape 3 : Informations du Parent / Tuteur Légal
                </h3>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nom complet du parent ou tuteur *</label>
                  <input 
                    type="text" 
                    required 
                    value={parentNom} 
                    onChange={(e) => setParentNom(e.target.value)} 
                    placeholder="Ex: BIO Vincent" 
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-sigapei-green" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Téléphone (WhatsApp / SMS) *</label>
                    <input 
                      type="tel" 
                      required 
                      value={parentTel} 
                      onChange={(e) => setParentTel(e.target.value)} 
                      placeholder="+229 97 00 00 00" 
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-sigapei-green" 
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Adresse électronique</label>
                    <input 
                      type="email" 
                      value={parentEmail} 
                      onChange={(e) => setParentEmail(e.target.value)} 
                      placeholder="parent@gmail.com" 
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-sigapei-green" 
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Adresse de résidence</label>
                  <input 
                    type="text" 
                    value={parentAdresse} 
                    onChange={(e) => setParentAdresse(e.target.value)} 
                    placeholder="Quartier, Ville" 
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-sigapei-green" 
                  />
                </div>
                <div className="flex justify-between pt-4">
                  <button 
                    type="button" 
                    onClick={() => handleNextStep(2)} 
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Retour
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleNextStep(4)} 
                    className="px-6 py-2.5 rounded-xl bg-sigapei-green text-white font-bold text-xs hover:bg-sigapei-green-dark transition flex items-center gap-2"
                  >
                    <span>Continuer vers les pièces</span>
                    <svg className="w-4 h-4 text-sigapei-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {currentStep === 4 && (
              <div className="space-y-4 max-w-xl mx-auto text-xs fade-enter">
                <h3 className="text-base font-black text-sigapei-black font-heading border-b border-slate-100 pb-2">
                  Étape 4 : Pièces Justificatives (S3) & Sécurité
                </h3>
                
                <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center space-y-2">
                  <svg className="w-8 h-8 text-sigapei-green mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="font-bold text-slate-700">Téléversement des pièces d'inscription</p>
                  <p className="text-[11px] text-slate-400">Extrait de naissance, Bulletins scolaires, Certificat médical (PDF, max 5 Mo)</p>
                  <span className="inline-block px-3 py-1 bg-white rounded-lg border border-slate-200 font-mono text-[10px] text-slate-600">
                    Stockage certifié S3 MinIO / AWS
                  </span>
                </div>

                {/* reCAPTCHA v3 mock score */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-sigapei-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-xs font-bold text-slate-700">Contrôle reCAPTCHA v3</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                    Score Token: 0.98
                  </span>
                </div>

                <div className="flex justify-between pt-4">
                  <button 
                    type="button" 
                    onClick={() => handleNextStep(3)} 
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Retour
                  </button>
                  <button 
                    type="submit" 
                    className="px-8 py-3 rounded-xl bg-sigapei-gold text-sigapei-black font-black text-xs hover:bg-sigapei-gold-hover shadow-md transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Soumettre ma candidature</span>
                  </button>
                </div>
              </div>
            )}
          </form>

        </div>
      )}

      {/* SUB-VIEW 2 : SUIVI DOSSIER PAR UUID */}
      {subTab === 'suivi' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-slate-100 space-y-6 fade-enter">
          <div>
            <h3 className="text-xl font-black text-sigapei-black font-heading">Suivi en Direct de votre Candidature</h3>
            <p className="text-xs text-slate-500 mt-1">Saisissez l'identifiant unique (UUID) reçu lors de votre dépôt en ligne.</p>
          </div>

          <div className="flex gap-2 max-w-lg">
            <input 
              type="text" 
              value={searchUuid} 
              onChange={(e) => setSearchUuid(e.target.value)} 
              placeholder="Ex: CAND-2026-8941" 
              className="flex-1 p-3 rounded-xl border border-slate-200 font-mono text-xs font-bold focus:outline-none focus:border-sigapei-green" 
            />
            <button 
              onClick={handleSearchDossier} 
              className="px-6 py-2.5 rounded-xl bg-sigapei-green text-white font-bold text-xs hover:bg-sigapei-green-dark transition flex items-center gap-2"
            >
              Rechercher
            </button>
          </div>

          {searchResult && searchResult !== 'not_found' && (
            <div className={`p-6 rounded-2xl border ${
              searchResult.statut === 'validee' ? 'bg-[#EAF5EF] border-[#BDE3CE]' :
              searchResult.statut === 'rejetee' ? 'bg-red-50/50 border-red-200' : 'bg-amber-50/50 border-sigapei-gold/40'
            } space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-base font-black text-sigapei-black font-heading">{searchResult.nom} {searchResult.prenom}</span>
                  <p className="text-xs text-slate-500 font-mono">Dossier n° {searchResult.uuid}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  searchResult.statut === 'validee' ? 'bg-sigapei-green text-white shadow-sm' :
                  searchResult.statut === 'rejetee' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-amber-100 text-amber-900 border border-amber-200'
                }`}>
                  {searchResult.statut}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-200">
                <div><span className="text-slate-400">Date soumission :</span> <strong>{searchResult.date_soumission}</strong></div>
                <div><span className="text-slate-400">Parent :</span> <strong>{searchResult.parent_nom}</strong></div>
                <div><span className="text-slate-400">Pièces déposées :</span> <strong>{searchResult.pieces.length} document(s) S3</strong></div>
              </div>

              {searchResult.statut === 'rejetee' && searchResult.motif_rejet && (
                <div className="bg-white p-3.5 rounded-xl border border-red-200 text-xs text-red-800">
                  <strong>Motif du refus notifié :</strong> {searchResult.motif_rejet}
                </div>
              )}
            </div>
          )}

          {searchResult === 'not_found' && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 italic">
              Aucun dossier ne correspond à cet identifiant.
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 3 : RÉINSCRIPTION SANS DOUBLON */}
      {subTab === 'reinc' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card border border-slate-100 space-y-6 fade-enter">
          <div>
            <h3 className="text-xl font-black text-sigapei-black font-heading">Réinscription d'un Élève (Année 2026-2027)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Conformément à la règle de non-duplication, la réinscription conserve le matricule unique et rattache l'élève à sa nouvelle classe.
            </p>
          </div>

          <div className="space-y-4 max-w-lg text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Matricule unique de l'élève *</label>
              <input 
                type="text" 
                value={reincMatricule}
                onChange={(e) => setReincMatricule(e.target.value)}
                placeholder="Ex: MAT-2026-6A-0012" 
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-sigapei-green" 
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Classe de passage / Réinscription *</label>
              <select 
                value={reincClasseId}
                onChange={(e) => setReincClasseId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-sigapei-green"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({c.cycle} • {c.programme.toUpperCase()}) — {c.capacite - c.inscrits} places libres
                  </option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleReincAction} 
              className="px-6 py-2.5 rounded-xl bg-sigapei-green text-white font-bold text-xs hover:bg-sigapei-green-dark transition flex items-center gap-2"
            >
              Valider la Réinscription
            </button>
          </div>
        </div>
      )}

    </section>
  );
}
