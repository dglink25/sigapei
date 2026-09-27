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
import EnseignantSpace from './components/enseignant/EnseignantSpace';
import ComptableSpace from './components/comptable/ComptableSpace';
import ExamineModal from './components/modals/ExamineModal';
import RejectModal from './components/modals/RejectModal';
import MutationModal from './components/modals/MutationModal';
import CreateClasseModal from './components/modals/CreateClasseModal';
import CreateCandidatureModal from './components/modals/CreateCandidatureModal';
import Toast from './components/common/Toast';
import LoginPage from './pages/LoginPage';
import RegisterEtablissementPage from './pages/RegisterEtablissementPage';
import { initialClasses, initialCandidatures, initialApprenants } from './data/initialData';

// Rôles qui utilisent le layout Admin (sidebar + header)
const ADMIN_LAYOUT_ROLES = ['admin', 'secretaire', 'censeur'];

export default function App() {
  // ── Auth ──────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(null); // null = non connecté
  const [showRegister, setShowRegister] = useState(false);

  // ── Navigation ────────────────────────────────────────────────
  const [currentAdminNav, setCurrentAdminNav] = useState('dashboard');

  // ── Data ──────────────────────────────────────────────────────
  const [classes, setClasses] = useState(initialClasses);
  const [candidatures, setCandidatures] = useState(initialCandidatures);
  const [apprenants, setApprenants] = useState(initialApprenants);

  // ── Modals ────────────────────────────────────────────────────
  const [examineCandidateId, setExamineCandidateId] = useState(null);
  const [rejectCandidateId, setRejectCandidateId] = useState(null);
  const [mutationApprenantId, setMutationApprenantId] = useState(null);
  const [isCreateClasseOpen, setIsCreateClasseOpen] = useState(false);
  const [isCreateCandidatureOpen, setIsCreateCandidatureOpen] = useState(false);

  // ── Toast ─────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Login / Logout ────────────────────────────────────────────
  const handleLogin = (user) => {
    setCurrentUser(user);
    setShowRegister(false);
    // Set default nav for admin-layout roles
    if (ADMIN_LAYOUT_ROLES.includes(user.role)) {
      const defaults = { admin: 'dashboard', secretaire: 'candidatures', censeur: 'emplois' };
      setCurrentAdminNav(defaults[user.role] || 'dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentAdminNav('dashboard');
  };

  // ── Actions ───────────────────────────────────────────────────
  const handleValidateCandidature = (candId) => {
    const cand = candidatures.find(c => c.id === candId);
    if (!cand) return;
    const targetClass = classes.find(c => c.id === cand.classe_id);
    if (targetClass && targetClass.inscrits >= targetClass.capacite) {
      showToast(`Admission bloquée : la classe ${targetClass.nom} a atteint sa capacité maximale (${targetClass.capacite} places).`, 'error');
      return;
    }
    setCandidatures(prev => prev.map(c => c.id === candId ? { ...c, statut: 'validee' } : c));
    setClasses(prev => prev.map(c => c.id === cand.classe_id ? { ...c, inscrits: c.inscrits + 1 } : c));
    const newMatricule = `MAT-2026-${targetClass ? targetClass.nom.replace(/\s+/g, '') : 'SEC'}-${Math.floor(100 + Math.random() * 900)}`;
    const newStudent = {
      id: Date.now(), matricule: newMatricule, nom: cand.nom, prenom: cand.prenom,
      date_naissance: cand.date_naissance, classe_id: cand.classe_id,
      parent_nom: cand.parent_nom, parent_tel: cand.parent_tel, mutations: []
    };
    setApprenants(prev => [newStudent, ...prev]);
    setExamineCandidateId(null);
    showToast(`Candidature ${cand.nom} validée ! Matricule : ${newMatricule}`, 'success');
  };

  const handleConfirmReject = (candId, motif) => {
    setCandidatures(prev => prev.map(c => c.id === candId ? { ...c, statut: 'rejetee', motif_rejet: motif } : c));
    setRejectCandidateId(null);
    setExamineCandidateId(null);
    showToast(`Candidature rejetée. Motif enregistré et notifié.`, 'warning');
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
        return { ...a, classe_id: targetClasseId, mutations: [mutationRecord, ...(a.mutations || [])] };
      }
      return a;
    }));
    const app = apprenants.find(a => a.id === appId);
    if (app) {
      setClasses(prev => prev.map(c => {
        if (c.id === app.classe_id) return { ...c, inscrits: Math.max(0, c.inscrits - 1) };
        if (c.id === targetClasseId) return { ...c, inscrits: c.inscrits + 1 };
        return c;
      }));
    }
    setMutationApprenantId(null);
    showToast(`Mutation enregistrée vers ${targetClass?.nom} !`, 'success');
  };

  const handleCreateClasse = (newClasseData) => {
    const newCl = { ...newClasseData, id: Date.now() };
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

  // ── Routing ───────────────────────────────────────────────────

  // 1. Non connecté → Login ou Register
  if (!currentUser) {
    if (showRegister) {
      return <RegisterEtablissementPage onBack={() => setShowRegister(false)} onSuccess={() => setShowRegister(false)} />;
    }
    return <LoginPage onLogin={handleLogin} onGoRegister={() => setShowRegister(true)} />;
  }

  const role = currentUser.role;

  // 2. Rôles avec layout propre (pas de sidebar admin)
  if (role === 'enseignant') {
    return (
      <div className="h-full flex flex-col overflow-hidden font-sans">
        <AppHeader currentUser={currentUser} onLogout={handleLogout} />
        <div className="flex-1 flex overflow-hidden">
          <EnseignantSpace currentUser={currentUser} />
        </div>
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    );
  }

  if (role === 'comptable') {
    return (
      <div className="h-full flex flex-col overflow-hidden font-sans">
        <AppHeader currentUser={currentUser} onLogout={handleLogout} />
        <div className="flex-1 flex overflow-hidden">
          <ComptableSpace currentUser={currentUser} />
        </div>
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    );
  }

  if (role === 'candidat') {
    return (
      <div className="h-full flex flex-col overflow-hidden font-sans bg-sigapei-canvas">
        <AppHeader currentUser={currentUser} onLogout={handleLogout} showLabel="Espace Candidatures" />
        <div className="flex-1 flex overflow-hidden">
          <CandidatSpace
            classes={classes} candidatures={candidatures} apprenants={apprenants}
            onSubmitCandidature={handlePublicSubmitCandidature}
            onReinscription={handlePublicReinscription}
            showToast={showToast}
          />
        </div>
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    );
  }

  if (role === 'parent') {
    return (
      <div className="h-full flex flex-col overflow-hidden font-sans bg-sigapei-canvas">
        <AppHeader currentUser={currentUser} onLogout={handleLogout} showLabel="Espace Parent & Élève" />
        <div className="flex-1 flex overflow-hidden">
          <ParentSpace currentUser={currentUser} />
        </div>
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    );
  }

  // 3. Rôles avec layout Admin (sidebar + header) : admin, secretaire, censeur
  return (
    <div className="h-full flex flex-col overflow-hidden bg-sigapei-canvas font-sans text-slate-900">
      <Header
        currentSpace="admin"
        setCurrentSpace={() => {}}
        pendingCount={pendingCount}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex overflow-hidden">
        <section className="flex-1 flex overflow-hidden fade-enter">
          <Sidebar
            currentNav={currentAdminNav}
            setCurrentNav={setCurrentAdminNav}
            pendingCount={pendingCount}
            role={role}
          />

          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
            {currentAdminNav === 'dashboard' && role === 'admin' && (
              <DashboardView
                classes={classes} candidatures={candidatures} apprenants={apprenants}
                onOpenCreateClasse={() => setIsCreateClasseOpen(true)}
                onSwitchNav={setCurrentAdminNav}
              />
            )}
            {currentAdminNav === 'candidatures' && (
              <CandidaturesView
                candidatures={candidatures} classes={classes}
                onExamine={(id) => setExamineCandidateId(id)}
                onOpenCreateCandidature={() => setIsCreateCandidatureOpen(true)}
              />
            )}
            {currentAdminNav === 'classes' && role === 'admin' && (
              <ClassesView
                classes={classes}
                onOpenCreateClasse={() => setIsCreateClasseOpen(true)}
              />
            )}
            {currentAdminNav === 'apprenants' && (
              <ApprenantsView
                apprenants={apprenants} classes={classes}
                onTransfer={role !== 'censeur' ? (id) => setMutationApprenantId(id) : null}
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
      </div>

      {/* Modals */}
      {examineCandidateId && (
        <ExamineModal
          candidate={activeExamineCandidate} classes={classes}
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
          apprenant={activeMutationApprenant} classes={classes}
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
      {isCreateCandidatureOpen && (
        <CreateCandidatureModal
          classes={classes}
          onClose={() => setIsCreateCandidatureOpen(false)}
          onConfirm={(newCand) => {
            handlePublicSubmitCandidature(newCand);
            setIsCreateCandidatureOpen(false);
            showToast(`Candidature guichet ${newCand.nom} enregistrée avec succès !`, 'success');
          }}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ── Mini header réutilisable pour les espaces sans Header complet ──
function AppHeader({ currentUser, onLogout, showLabel }) {
  return (
    <header className="shrink-0 h-14 bg-sigapei-sidebar flex items-center justify-between px-6 shadow-md z-40">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-sigapei-gold flex items-center justify-center">
          <svg className="w-5 h-5 text-sigapei-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
              d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
        </div>
        <div>
          <span className="text-white font-black text-sm">SIGAPEI</span>
          {showLabel && <span className="hidden sm:inline text-sigapei-cream/60 text-xs ml-2">· {showLabel}</span>}
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="text-right hidden sm:block">
          <div className="text-xs font-bold text-sigapei-cream">{currentUser?.nom}</div>
          <div className="text-[10px] text-sigapei-cream/50">{currentUser?.etablissement || 'Accès public'}</div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sigapei-cream text-xs font-bold transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
