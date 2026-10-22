import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DashboardView from './components/admin/DashboardView';
import CandidaturesView from './components/admin/CandidaturesView';
import ClassesView from './components/admin/ClassesView';
import ApprenantsView from './components/admin/ApprenantsView';
import EmploisView from './components/admin/EmploisView';
import FinancesView from './components/admin/FinancesView';
import MatieresNotesView from './components/admin/MatieresNotesView';
import AnneeScolaireView from './components/admin/AnneeScolaireView';
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
import { ADMIN_LAYOUT_ROLES, ROLE_LABELS } from './config/roles';
import {
  listerCandidatures,
  listerClasses,
  validerCandidature,
  rejeterCandidature,
  soumettreCandidature,
  reinscrireApprenant,
  transfererApprenant,
  listerEmploisDuTemps,
} from './services/api';
import { logout as authLogout, getUser } from './services/auth';

export default function App() {
  // ── Auth ──────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  // ── Navigation ────────────────────────────────────────────────
  const [currentAdminNav, setCurrentAdminNav] = useState('dashboard');

  // ── Data (chargées depuis les microservices) ──────────────────
  const [classes, setClasses] = useState([]);
  const [candidatures, setCandidatures] = useState([]);
  const [apprenants, setApprenants] = useState([]);
  const [emploisDuTemps, setEmploisDuTemps] = useState([]);

  // ── Loading / Error states ────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // ── Session Académique ───────────────────────────────────────
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ── Chargement initial des données ────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [classesRes, candidaturesRes, apprenantsRes, edtRes] = await Promise.allSettled([
        listerClasses(),
        listerCandidatures(),
        listerCandidatures(), // TODO: remplacer par listerApprenants quand l'endpoint sera prêt
        listerEmploisDuTemps(),
      ]);

      if (classesRes.status === 'fulfilled') {
        const data = classesRes.value?.donnees || classesRes.value || [];
        setClasses(Array.isArray(data) ? data : []);
      }
      if (candidaturesRes.status === 'fulfilled') {
        const data = candidaturesRes.value?.donnees || candidaturesRes.value || [];
        setCandidatures(Array.isArray(data) ? data : []);
      }
      if (apprenantsRes.status === 'fulfilled') {
        // Les apprenants ne sont pas encore listés via l'API inscription
        // On les récupère via les candidatures validées pour l'instant
        const data = apprenantsRes.value?.donnees || apprenantsRes.value || [];
        setApprenants(Array.isArray(data) ? data : []);
      }
      if (edtRes.status === 'fulfilled') {
        const data = edtRes.value?.donnees || edtRes.value || [];
        setEmploisDuTemps(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      setError(e.message || 'Erreur de chargement des données.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, fetchData]);

  // ── Login / Logout ────────────────────────────────────────────
  const handleLogin = (user) => {
    setCurrentUser(user);
    setShowRegister(false);
    const defaults = {
      admin: 'dashboard',
      secretaire: 'candidatures',
      censeur: 'matieres',
      enseignant: 'ens_edt',
      comptable: 'cpt_caisse',
      parent: 'par_dashboard',
      candidat: 'cand_form'
    };
    setCurrentAdminNav(defaults[user.role] || 'dashboard');
  };

  const handleLogout = () => {
    authLogout();
    setCurrentUser(null);
    setCurrentAdminNav('dashboard');
    setIsMobileMenuOpen(false);
  };

  // ── Actions candidatures ───────────────────────────────────────
  const handleValidateCandidature = async (candUuid) => {
    const { erreur, donnees } = await validerCandidature(candUuid);
    if (erreur) {
      showToast(erreur, 'error');
      return;
    }
    showToast(`Candidature validée ! Matricule : ${donnees?.apprenant?.uuid || ''}`, 'success');
    setExamineCandidateId(null);
    await fetchData();
  };

  const handleConfirmReject = async (candUuid, motif) => {
    const { erreur, donnees } = await rejeterCandidature(candUuid, motif);
    if (erreur) {
      showToast(erreur, 'error');
      return;
    }
    showToast(`Candidature rejetée. Motif enregistré et notifié.`, 'warning');
    setRejectCandidateId(null);
    setExamineCandidateId(null);
    await fetchData();
  };

  const handlePublicSubmitCandidature = async (cand) => {
    try {
      const res = await soumettreCandidature(cand);
      showToast(`Candidature soumise avec succès ! Numéro de dossier : ${res?.uuid || ''}`, 'success');
      await fetchData();
      return true;
    } catch (e) {
      showToast(e.message || 'Erreur de soumission.', 'error');
      return false;
    }
  };

  // ── Actions apprenants ─────────────────────────────────────────
  const handleConfirmMutation = async (appUuid, targetClasseUuid, motif) => {
    const { erreur, donnees } = await transfererApprenant(appUuid, targetClasseUuid, motif);
    if (erreur) {
      showToast(erreur, 'error');
      return;
    }
    showToast(`Mutation enregistrée vers ${donnees?.nouvelle_classe?.nom || ''} !`, 'success');
    setMutationApprenantId(null);
    await fetchData();
  };

  const handlePublicReinscription = async (appUuid, targetClasseUuid) => {
    try {
      const res = await reinscrireApprenant({
        apprenant_uuid: appUuid,
        nouvelle_classe_uuid: targetClasseUuid,
        annee_scolaire: academicYear,
      });
      showToast(`Réinscription validée sans doublon pour ${res?.apprenant_nom || ''} !`, 'success');
      await fetchData();
      return true;
    } catch (e) {
      showToast(e.message || 'Erreur de réinscription.', 'error');
      return false;
    }
  };

  const handleCreateClasse = async (newClasseData) => {
    try {
      const res = await fetch(`http://localhost:4004/v1/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Tenant-Id': localStorage.getItem('sigapei_tenant_id') || '1',
          'Authorization': `Bearer ${localStorage.getItem('sigapei_token') || ''}`,
        },
        body: JSON.stringify(newClasseData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.erreur || data.message || `Erreur HTTP ${res.status}`);
      showToast(`Nouvelle classe « ${newClasseData.nom} » créée avec succès !`, 'success');
      setIsCreateClasseOpen(false);
      await fetchData();
    } catch (e) {
      showToast(e.message || 'Erreur de création.', 'error');
    }
  };

  // ── Routing ───────────────────────────────────────────────────

  if (!currentUser) {
    if (showRegister) {
      return <RegisterEtablissementPage onBack={() => setShowRegister(false)} onSuccess={() => setShowRegister(false)} />;
    }
    return <LoginPage onLogin={handleLogin} onGoRegister={() => setShowRegister(true)} />;
  }

  const role = currentUser.role;
  const roleInfo = ROLE_LABELS[role] || ROLE_LABELS.admin;

  // ── Layout Professionnel Unifié pour TOUS les rôles connectés ──
  return (
    <div className="h-full flex flex-col overflow-hidden bg-sigapei-canvas font-sans text-slate-900">
      <Header
        currentSpace="admin"
        setCurrentSpace={() => {}}
        pendingCount={candidatures.filter(c => c.statut === 'en_attente').length}
        currentUser={currentUser}
        onLogout={handleLogout}
        academicYear={academicYear}
        onSelectAcademicYear={setAcademicYear}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex-1 flex overflow-hidden">
        <section className="flex-1 flex overflow-hidden fade-enter">

          <Sidebar
            currentNav={currentAdminNav}
            setCurrentNav={setCurrentAdminNav}
            pendingCount={candidatures.filter(c => c.statut === 'en_attente').length}
            role={role}
            isOpenMobile={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />

          {/* Zone de contenu principale scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">

            {/* État de chargement */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-sigapei-green border-t-transparent rounded-full" />
                <span className="ml-3 text-sm text-slate-500">Chargement des données…</span>
              </div>
            )}

            {/* Erreur de chargement */}
            {error && !loading && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center justify-between">
                <span>{error}</span>
                <button onClick={fetchData} className="text-xs font-bold text-red-600 hover:underline">
                  Réessayer
                </button>
              </div>
            )}

            {!loading && !error && (
              <>
                {/* Vues Espace Enseignant */}
                {role === 'enseignant' && (
                  <EnseignantSpace currentUser={currentUser} activeNav={currentAdminNav} />
                )}

                {/* Vues Espace Comptable & Caisse */}
                {role === 'comptable' && (
                  <ComptableSpace
                    currentUser={currentUser}
                    activeNav={currentAdminNav}
                    onSwitchNav={setCurrentAdminNav}
                  />
                )}

                {/* Vues Espace Parent & Famille */}
                {role === 'parent' && (
                  <ParentSpace currentUser={currentUser} activeNav={currentAdminNav} />
                )}

                {/* Vues Espace Candidat */}
                {role === 'candidat' && (
                  <CandidatSpace
                    classes={classes} candidatures={candidatures} apprenants={apprenants}
                    onSubmitCandidature={handlePublicSubmitCandidature}
                    onReinscription={handlePublicReinscription}
                    showToast={showToast}
                  />
                )}

                {/* Vues Espace Administration / Secrétariat / Censeur */}
                {ADMIN_LAYOUT_ROLES.includes(role) && (
                  <>
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
                        onExamine={(uuid) => setExamineCandidateId(uuid)}
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
                        onTransfer={role !== 'censeur' ? (uuid) => setMutationApprenantId(uuid) : null}
                      />
                    )}
                    {currentAdminNav === 'emplois' && (
                      <EmploisView classes={classes} emploisDuTemps={emploisDuTemps} />
                    )}
                    {currentAdminNav === 'finances' && (
                      <FinancesView />
                    )}
                    {currentAdminNav === 'matieres' && (
                      <MatieresNotesView classes={classes} academicYear={academicYear} />
                    )}
                    {currentAdminNav === 'annees' && role === 'admin' && (
                      <AnneeScolaireView currentYear={academicYear} onSelectYear={setAcademicYear} classes={classes} />
                    )}
                  </>
                )}
              </>
            )}

          </div>
        </section>
      </div>

      {/* Modals */}
      {examineCandidateId && (
        <ExamineModal
          candidate={candidatures.find(c => c.uuid === examineCandidateId)}
          classes={classes}
          onClose={() => setExamineCandidateId(null)}
          onValidate={handleValidateCandidature}
          onOpenReject={(uuid) => setRejectCandidateId(uuid)}
        />
      )}
      {rejectCandidateId && (
        <RejectModal
          candidate={candidatures.find(c => c.uuid === rejectCandidateId)}
          onClose={() => setRejectCandidateId(null)}
          onConfirm={handleConfirmReject}
        />
      )}
      {mutationApprenantId && (
        <MutationModal
          apprenant={apprenants.find(a => a.uuid === mutationApprenantId)}
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
      {isCreateCandidatureOpen && (
        <CreateCandidatureModal
          classes={classes}
          onClose={() => setIsCreateCandidatureOpen(false)}
          onConfirm={async (newCand) => {
            const ok = await handlePublicSubmitCandidature(newCand);
            if (ok) setIsCreateCandidatureOpen(false);
          }}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
