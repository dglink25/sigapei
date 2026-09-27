import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DashboardView from './components/admin/DashboardView';
import CandidaturesView from './components/admin/CandidaturesView';
import ClassesView from './components/admin/ClassesView';
import ApprenantsView from './components/admin/ApprenantsView';
import EmploisView from './components/admin/EmploisView';
import FinancesView from './components/admin/FinancesView';
import CandidatSpace from './components/candidat/CandidatSpace';
import ParentSpace from './components/parent/ParentSpace';
import ExamineModal from './components/modals/ExamineModal';
import RejectModal from './components/modals/RejectModal';
import MutationModal from './components/modals/MutationModal';
import CreateClasseModal from './components/modals/CreateClasseModal';
import Toast from './components/common/Toast';
import { initialClasses, initialCandidatures, initialApprenants } from './data/initialData';

export default function App() {
  const [currentSpace, setCurrentSpace] = useState('admin'); // 'admin' | 'candidat' | 'parent'
  const [currentAdminNav, setCurrentAdminNav] = useState('dashboard');

  const [classes, setClasses] = useState(initialClasses);
  const [candidatures, setCandidatures] = useState(initialCandidatures);
  const [apprenants, setApprenants] = useState(initialApprenants);

  // Modals state
  const [examineCandidateId, setExamineCandidateId] = useState(null);
  const [rejectCandidateId, setRejectCandidateId] = useState(null);
  const [mutationApprenantId, setMutationApprenantId] = useState(null);
  const [isCreateClasseOpen, setIsCreateClasseOpen] = useState(false);

  // Toast state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Actions
  const handleValidateCandidature = (candId) => {
    const cand = candidatures.find(c => c.id === candId);
    if (!cand) return;

    const targetClass = classes.find(c => c.id === cand.classe_id);
    if (targetClass && targetClass.inscrits >= targetClass.capacite) {
      showToast(`Admission bloquée : la classe ${targetClass.nom} a atteint sa capacité maximale (${targetClass.capacite} places).`, 'error');
      return;
    }

    // 1. Update candidate status
    setCandidatures(prev => prev.map(c => c.id === candId ? { ...c, statut: 'validee' } : c));

    // 2. Increment class enrollment
    setClasses(prev => prev.map(c => c.id === cand.classe_id ? { ...c, inscrits: c.inscrits + 1 } : c));

    // 3. Create or update unique student record (no duplicates)
    const newMatricule = `MAT-2026-${targetClass ? targetClass.nom.replace(/\s+/g, '') : 'SEC'}-${Math.floor(100 + Math.random() * 900)}`;
    const newStudent = {
      id: Date.now(),
      matricule: newMatricule,
      nom: cand.nom,
      prenom: cand.prenom,
      date_naissance: cand.date_naissance,
      classe_id: cand.classe_id,
      parent_nom: cand.parent_nom,
      parent_tel: cand.parent_tel,
      mutations: []
    };
    setApprenants(prev => [newStudent, ...prev]);

    setExamineCandidateId(null);
    showToast(`Candidature ${cand.nom} validée ! Matricule unique : ${newMatricule}`, 'success');
  };

  const handleConfirmReject = (candId, motif) => {
    setCandidatures(prev => prev.map(c => c.id === candId ? { ...c, statut: 'rejetee', motif_rejet: motif } : c));
    setRejectCandidateId(null);
    setExamineCandidateId(null);
    showToast(`Candidature rejetée. Motif officiel enregistré et notifié.`, 'warning');
  };

  const handleConfirmMutation = (appId, targetClasseId, motif) => {
    const targetClass = classes.find(c => c.id === targetClasseId);
    if (targetClass && targetClass.inscrits >= targetClass.capacite) {
      showToast(`Transfert bloqué : la classe ${targetClass.nom} est complète.`, 'error');
      return;
    }

    setApprenants(prev => prev.map(a => {
      if (a.id === appId) {
        const oldClass = classes.find(c => c.id === a.classe_id);
        const mutationRecord = {
          date: new Date().toISOString().split('T')[0],
          de: oldClass ? oldClass.nom : 'Origine',
          vers: targetClass ? targetClass.nom : 'Destination',
          motif: motif || 'Mutation administrative'
        };
        return {
          ...a,
          classe_id: targetClasseId,
          mutations: [mutationRecord, ...(a.mutations || [])]
        };
      }
      return a;
    }));

    // Update enrollments
    const app = apprenants.find(a => a.id === appId);
    if (app) {
      setClasses(prev => prev.map(c => {
        if (c.id === app.classe_id) return { ...c, inscrits: Math.max(0, c.inscrits - 1) };
        if (c.id === targetClasseId) return { ...c, inscrits: c.inscrits + 1 };
        return c;
      }));
    }

    setMutationApprenantId(null);
    showToast(`Mutation enregistrée sans duplication de dossier vers ${targetClass?.nom} !`, 'success');
  };

  const handleCreateClasse = (newClasseData) => {
    const newCl = {
      ...newClasseData,
      id: Date.now()
    };
    setClasses(prev => [...prev, newCl]);
    setIsCreateClasseOpen(false);
    showToast(`Nouvelle classe « ${newCl.nom} » créée avec succès !`, 'success');
  };

  const handlePublicSubmitCandidature = (cand) => {
    setCandidatures(prev => [cand, ...prev]);
  };

  const handlePublicReinscription = (appId, targetClasseId) => {
    handleConfirmMutation(appId, targetClasseId, 'Réinscription rentrée 2026-2027');
  };

  const pendingCount = candidatures.filter(c => c.statut === 'en_attente').length;
  const activeExamineCandidate = candidatures.find(c => c.id === examineCandidateId);
  const activeRejectCandidate = candidatures.find(c => c.id === rejectCandidateId);
  const activeMutationApprenant = apprenants.find(a => a.id === mutationApprenantId);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-sigapei-canvas font-sans text-slate-900">
      
      {/* Top Header with Brand Logo & Space Selector */}
      <Header 
        currentSpace={currentSpace} 
        setCurrentSpace={setCurrentSpace} 
        pendingCount={pendingCount} 
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ESPACE 1 : ADMINISTRATION & SCOLARITÉ */}
        {currentSpace === 'admin' && (
          <section className="flex-1 flex overflow-hidden fade-enter">
            {/* Sidebar */}
            <Sidebar 
              currentNav={currentAdminNav} 
              setCurrentNav={setCurrentAdminNav} 
              pendingCount={pendingCount} 
            />

            {/* Admin Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
              {currentAdminNav === 'dashboard' && (
                <DashboardView 
                  classes={classes} 
                  candidatures={candidatures} 
                  apprenants={apprenants} 
                  onOpenCreateClasse={() => setIsCreateClasseOpen(true)} 
                  onSwitchNav={setCurrentAdminNav} 
                />
              )}

              {currentAdminNav === 'candidatures' && (
                <CandidaturesView 
                  candidatures={candidatures} 
                  classes={classes} 
                  onExamine={(id) => setExamineCandidateId(id)} 
                />
              )}

              {currentAdminNav === 'classes' && (
                <ClassesView 
                  classes={classes} 
                  onOpenCreateClasse={() => setIsCreateClasseOpen(true)} 
                />
              )}

              {currentAdminNav === 'apprenants' && (
                <ApprenantsView 
                  apprenants={apprenants} 
                  classes={classes} 
                  onTransfer={(id) => setMutationApprenantId(id)} 
                />
              )}

              {currentAdminNav === 'emplois' && (
                <EmploisView />
              )}

              {currentAdminNav === 'finances' && (
                <FinancesView />
              )}
            </div>
          </section>
        )}

        {/* ESPACE 2 : ADMISSIONS & CANDIDATURES (PUBLIC / PARENT) */}
        {currentSpace === 'candidat' && (
          <CandidatSpace 
            classes={classes} 
            candidatures={candidatures} 
            apprenants={apprenants} 
            onSubmitCandidature={handlePublicSubmitCandidature} 
            onReinscription={handlePublicReinscription} 
            showToast={showToast} 
          />
        )}

        {/* ESPACE 3 : PARENT & ÉLÈVE */}
        {currentSpace === 'parent' && (
          <ParentSpace />
        )}

      </div>

      {/* MODALS */}
      {examineCandidateId && (
        <ExamineModal 
          candidate={activeExamineCandidate} 
          classes={classes} 
          onClose={() => setExamineCandidateId(null)} 
          onValidate={handleValidateCandidature} 
          onOpenReject={(id) => setRejectCandidateId(id)} 
        />
      )}

      {rejectCandidateId && (
        <RejectModal 
          candidate={activeRejectCandidate} 
          onClose={() => setRejectCandidateId(null)} 
          onConfirm={handleConfirmReject} 
        />
      )}

      {mutationApprenantId && (
        <MutationModal 
          apprenant={activeMutationApprenant} 
          classes={classes} 
          onClose={() => setMutationApprenantId(null)} 
          onConfirm={handleConfirmMutation} 
        />
      )}

      {isCreateClasseOpen && (
        <CreateClasseModal 
          onClose={() => setIsCreateClasseOpen(false)} 
          onConfirm={handleCreateClasse} 
        />
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      <Toast toast={toast} onClose={() => setToast(null)} />

    </div>
  );
}
