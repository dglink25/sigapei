import React, { useState } from 'react';

// Données initiales des paiements et tranches
const INITIAL_PAIEMENTS = [
  { 
    id: 1, 
    matricule: 'MAT-2026-6A-0012', 
    nom: 'KOFFI Jean-Luc',     
    classe: '6ème A',    
    parent_nom: 'Marc Koffi',
    parent_tel: '+229 97 12 34 56',
    parent_email: 'marc.koffi@gmail.com',
    montant: 180000, 
    paye: 180000, 
    reste: 0,      
    statut: 'solde',    
    date_dernier: '2026-09-05',
    mode_dernier: 'Espèces',
    tranches: [
      { num: 1, label: 'Tranche 1 (Rentrée)', attendu: 80000, paye: 80000, echeance: '2026-09-15', regle: true },
      { num: 2, label: 'Tranche 2 (Mi-parcours)', attendu: 60000, paye: 60000, echeance: '2027-01-15', regle: true },
      { num: 3, label: 'Tranche 3 (Fin d’année)', attendu: 40000, paye: 40000, echeance: '2027-04-15', regle: true },
    ]
  },
  { 
    id: 2, 
    matricule: 'MAT-2026-5B-0004', 
    nom: 'DUBOIS Alexandre',   
    classe: '5ème Bilingue', 
    parent_nom: 'Sophie Dubois',
    parent_tel: '+229 96 78 90 12',
    parent_email: 'sophie.dubois@yahoo.fr',
    montant: 200000, 
    paye: 100000, 
    reste: 100000, 
    statut: 'partiel',  
    date_dernier: '2026-09-12',
    mode_dernier: 'MTN Mobile Money',
    tranches: [
      { num: 1, label: 'Tranche 1 (Rentrée)', attendu: 100000, paye: 100000, echeance: '2026-09-15', regle: true },
      { num: 2, label: 'Tranche 2 (Mi-parcours)', attendu: 60000, paye: 0, echeance: '2027-01-15', regle: false },
      { num: 3, label: 'Tranche 3 (Fin d’année)', attendu: 40000, paye: 0, echeance: '2027-04-15', regle: false },
    ]
  },
  { 
    id: 3, 
    matricule: 'MAT-2026-2C-0033', 
    nom: 'MENSAH Arnaud',      
    classe: 'Seconde C',  
    parent_nom: 'Ferdinand Mensah',
    parent_tel: '+229 95 11 22 33',
    parent_email: 'ferdinand.mensah@gmail.com',
    montant: 175000, 
    paye: 0,      
    reste: 175000, 
    statut: 'retard',    
    date_dernier: '—',
    mode_dernier: '—',
    tranches: [
      { num: 1, label: 'Tranche 1 (Rentrée)', attendu: 75000, paye: 0, echeance: '2026-09-15', regle: false },
      { num: 2, label: 'Tranche 2 (Mi-parcours)', attendu: 60000, paye: 0, echeance: '2027-01-15', regle: false },
      { num: 3, label: 'Tranche 3 (Fin d’année)', attendu: 40000, paye: 0, echeance: '2027-04-15', regle: false },
    ]
  },
  { 
    id: 4, 
    matricule: 'MAT-2026-TD-0021', 
    nom: 'AGOSSA Fatoumata',   
    classe: 'Terminale D', 
    parent_nom: 'Moussa Agossa',
    parent_tel: '+229 97 00 11 22',
    parent_email: 'moussa.agossa@gmail.com',
    montant: 180000, 
    paye: 180000, 
    reste: 0,     
    statut: 'solde',   
    date_dernier: '2026-09-08',
    mode_dernier: 'Virement bancaire',
    tranches: [
      { num: 1, label: 'Tranche 1 (Rentrée)', attendu: 80000, paye: 80000, echeance: '2026-09-15', regle: true },
      { num: 2, label: 'Tranche 2 (Mi-parcours)', attendu: 60000, paye: 60000, echeance: '2027-01-15', regle: true },
      { num: 3, label: 'Tranche 3 (Fin d’année)', attendu: 40000, paye: 40000, echeance: '2027-04-15', regle: true },
    ]
  },
  { 
    id: 5, 
    matricule: 'MAT-2026-3A-0055', 
    nom: 'TCHIBOZO Christian', 
    classe: '3ème A',    
    parent_nom: 'Martine Tchibozo',
    parent_tel: '+229 66 12 34 56',
    parent_email: 'martine.tchi@gmail.com',
    montant: 160000, 
    paye: 80000,  
    reste: 80000,  
    statut: 'partiel',  
    date_dernier: '2026-09-18',
    mode_dernier: 'Moov Money',
    tranches: [
      { num: 1, label: 'Tranche 1 (Rentrée)', attendu: 80000, paye: 80000, echeance: '2026-09-15', regle: true },
      { num: 2, label: 'Tranche 2 (Mi-parcours)', attendu: 40000, paye: 0, echeance: '2027-01-15', regle: false },
      { num: 3, label: 'Tranche 3 (Fin d’année)', attendu: 40000, paye: 0, echeance: '2027-04-15', regle: false },
    ]
  }
];

export default function ComptableSpace({ 
  currentUser, 
  activeNav = 'cpt_caisse',
  onSwitchNav
}) {
  const [elevesPaiements, setElevesPaiements] = useState(INITIAL_PAIEMENTS);
  
  // Filtres
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [filtreClasse, setFiltreClasse] = useState('tous');
  const [recherche, setRecherche] = useState('');

  // Formulaire Guichet d'Encaissement
  const [encaissementForm, setEncaissementForm] = useState({
    eleveId: 3, // Par défaut Mensah Arnaud
    trancheNum: 1,
    montant: 75000,
    mode: 'Espèces',
    reference: 'CHQ-78901',
    motif: 'Règlement Tranche 1 (Rentrée 2026)'
  });

  // Modal de reçu d'encaissement généré
  const [activeRecu, setActiveRecu] = useState(null);
  // Modal de relance parent
  const [activeRelance, setActiveRelance] = useState(null);
  // Toast notification
  const [toast, setToast] = useState('');

  const showToastMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // Traitement d'un encaissement au guichet
  const handleValiderEncaissement = (e) => {
    e.preventDefault();
    const eleve = elevesPaiements.find(p => p.id === Number(encaissementForm.eleveId));
    if (!eleve) return;

    const montantVerse = Number(encaissementForm.montant);
    if (montantVerse <= 0) return;

    const now = new Date();
    const dateFormatted = now.toISOString().split('T')[0];
    const recuNumero = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    // Mise à jour de l'élève
    setElevesPaiements(prev => prev.map(p => {
      if (p.id === eleve.id) {
        const nouveauPaye = Math.min(p.montant, p.paye + montantVerse);
        const nouveauReste = Math.max(0, p.montant - nouveauPaye);
        const nouveauStatut = nouveauReste === 0 ? 'solde' : 'partiel';
        
        // Marquer la tranche concernée
        const tranchesUpdated = p.tranches.map(t => {
          if (t.num === Number(encaissementForm.trancheNum)) {
            return { ...t, paye: t.attendu, regle: true };
          }
          return t;
        });

        return {
          ...p,
          paye: nouveauPaye,
          reste: nouveauReste,
          statut: nouveauStatut,
          date_dernier: dateFormatted,
          mode_dernier: encaissementForm.mode,
          tranches: tranchesUpdated
        };
      }
      return p;
    }));

    // Création de l'objet Reçu pour impression
    const recuData = {
      numero: recuNumero,
      date: now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      eleveNom: eleve.nom,
      matricule: eleve.matricule,
      classe: eleve.classe,
      parentNom: eleve.parent_nom,
      montant: montantVerse,
      mode: encaissementForm.mode,
      reference: encaissementForm.reference || 'Paiement Comptant',
      motif: encaissementForm.motif,
      caissier: currentUser?.nom || 'Harold MIKPONHOUE',
      resteApres: Math.max(0, eleve.reste - montantVerse)
    };

    setActiveRecu(recuData);
    showToastMsg(`Encaissement de ${montantVerse.toLocaleString('fr-FR')} FCFA validé pour ${eleve.nom} !`);
  };

  // KPIs
  const totalAttendu = elevesPaiements.reduce((acc, p) => acc + p.montant, 0);
  const totalPaye    = elevesPaiements.reduce((acc, p) => acc + p.paye, 0);
  const totalReste   = elevesPaiements.reduce((acc, p) => acc + p.reste, 0);
  const tauxGlobal   = Math.round((totalPaye / totalAttendu) * 100);

  // Filtrage
  const filtres = elevesPaiements.filter(p => {
    const matchStatut = filtreStatut === 'tous' || p.statut === filtreStatut;
    const matchClasse = filtreClasse === 'tous' || p.classe === filtreClasse;
    const matchQuery  = !recherche || 
      `${p.nom} ${p.matricule} ${p.classe} ${p.parent_nom}`.toLowerCase().includes(recherche.toLowerCase());
    return matchStatut && matchClasse && matchQuery;
  });

  return (
    <div className="space-y-6 fade-enter">
      
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-emerald-700 text-white rounded-2xl shadow-xl flex items-center space-x-3 text-xs font-bold animate-bounce">
          <span>✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* ── SECTION 1 : GUICHET D'ENCAISSEMENT DIRECT (ACTIVE PAR DEFAUT) ── */}
      {activeNav === 'cpt_caisse' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Formulaire d'encaissement guichet */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-sigapei-green block">
                  Caisse Principale • Encaissement
                </span>
                <h2 className="text-xl font-black text-slate-900 font-heading">
                  Enregistrer un Paiement & Émettre un Reçu
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                Guichet Ouvert
              </span>
            </div>

            <form onSubmit={handleValiderEncaissement} className="space-y-4">
              
              {/* Choix de l'élève */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">
                  Élève / Apprenant concerné *
                </label>
                <select
                  value={encaissementForm.eleveId}
                  onChange={e => {
                    const id = Number(e.target.value);
                    const el = elevesPaiements.find(p => p.id === id);
                    setEncaissementForm({
                      ...encaissementForm,
                      eleveId: id,
                      montant: el ? (el.reste > 0 ? el.reste : 50000) : 50000
                    });
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-black bg-slate-50 focus:bg-white focus:border-sigapei-green outline-none"
                >
                  {elevesPaiements.map(el => (
                    <option key={el.id} value={el.id}>
                      {el.nom} — {el.classe} ({el.matricule}) • Reste dû : {el.reste.toLocaleString('fr-FR')} FCFA
                    </option>
                  ))}
                </select>
              </div>

              {/* Tranche & Montant */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">
                    Tranche / Libellé de frais
                  </label>
                  <select
                    value={encaissementForm.trancheNum}
                    onChange={e => setEncaissementForm({ ...encaissementForm, trancheNum: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:border-sigapei-green outline-none"
                  >
                    <option value={1}>Tranche 1 (Rentrée)</option>
                    <option value={2}>Tranche 2 (Mi-parcours)</option>
                    <option value={3}>Tranche 3 (Fin d'année)</option>
                    <option value={4}>Frais d'examen / Dossier</option>
                    <option value={5}>Cantine & Activités périscolaires</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">
                    Montant Versé (FCFA) *
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min="1000"
                    required
                    value={encaissementForm.montant}
                    onChange={e => setEncaissementForm({ ...encaissementForm, montant: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-mono font-black text-sm text-sigapei-green focus:border-sigapei-green outline-none"
                  />
                </div>
              </div>

              {/* Mode de règlement & Référence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">
                    Moyen de Paiement *
                  </label>
                  <select
                    value={encaissementForm.mode}
                    onChange={e => setEncaissementForm({ ...encaissementForm, mode: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:border-sigapei-green outline-none"
                  >
                    <option value="Espèces">💵 Espèces (Guichet caisse)</option>
                    <option value="MTN Mobile Money">📱 MTN Mobile Money</option>
                    <option value="Moov Money">📱 Moov Money</option>
                    <option value="Wave">🌊 Wave Digital</option>
                    <option value="Chèque bancaire">📄 Chèque bancaire</option>
                    <option value="Virement bancaire">🏦 Virement bancaire</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">
                    Référence de Quittance / Reçu
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: TX-90234 ou N° Chèque"
                    value={encaissementForm.reference}
                    onChange={e => setEncaissementForm({ ...encaissementForm, reference: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-mono text-xs outline-none focus:border-sigapei-green"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Émission automatique d'une quittance légale SIGAPEI.
                </span>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-sigapei-green text-white font-black text-xs hover:bg-sigapei-green/90 shadow-md transition flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Valider l'Encaissement & Émettre le Reçu</span>
                </button>
              </div>

            </form>
          </div>

          {/* Caisse du jour - Panneau latéral */}
          <div className="space-y-4">
            <div className="bg-sigapei-sidebar text-white p-6 rounded-3xl shadow-xl space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-sigapei-gold block">
                Session de Caisse du Jour
              </span>
              <p className="text-3xl font-black font-heading text-white">
                {(totalPaye * 0.15).toLocaleString('fr-FR')} <span className="text-xs font-normal text-sigapei-cream/70">FCFA</span>
              </p>
              <p className="text-xs text-sigapei-cream/80">
                Encaissements cumulés aujourd'hui (3 quittances émises).
              </p>

              <div className="space-y-2 pt-2 border-t border-sigapei-sidebar-deep text-xs">
                <div className="flex justify-between text-sigapei-cream/90">
                  <span>Espèces :</span>
                  <span className="font-mono font-bold">80 000 FCFA</span>
                </div>
                <div className="flex justify-between text-sigapei-cream/90">
                  <span>Mobile Money :</span>
                  <span className="font-mono font-bold">100 000 FCFA</span>
                </div>
                <div className="flex justify-between text-sigapei-cream/90">
                  <span>Chèques / Virements :</span>
                  <span className="font-mono font-bold">180 000 FCFA</span>
                </div>
              </div>

              <button
                onClick={() => showToastMsg('Arrêté de caisse journalier généré avec succès !')}
                className="w-full py-2.5 rounded-xl bg-sigapei-gold text-sigapei-black font-black text-xs hover:bg-sigapei-gold-hover transition shadow-sm"
              >
                Effectuer l'Arrêté de Caisse
              </button>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-heading font-black text-xs text-slate-800 uppercase tracking-wider">
                Derniers Reçus Délivrés
              </h3>
              <div className="space-y-2 text-xs">
                {elevesPaiements.slice(0, 3).map(p => (
                  <div key={p.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-900">{p.nom}</p>
                      <p className="text-[10px] text-slate-400">{p.mode_dernier} • {p.date_dernier}</p>
                    </div>
                    <span className="font-mono font-bold text-sigapei-green text-xs">
                      {p.paye.toLocaleString('fr-FR')} F
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── SECTION 2 : ECHEANCIERS ET RECOUVREMENT ── */}
      {activeNav === 'cpt_echeanciers' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Rechercher élève, parent, matricule..."
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs w-64 outline-none focus:border-sigapei-green"
              />

              <select
                value={filtreStatut}
                onChange={e => setFiltreStatut(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700"
              >
                <option value="tous">Tous statuts</option>
                <option value="solde">Soldé (100%)</option>
                <option value="partiel">Paiement partiel</option>
                <option value="retard">En retard / Impayé</option>
              </select>

              <select
                value={filtreClasse}
                onChange={e => setFiltreClasse(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700"
              >
                <option value="tous">Toutes les classes</option>
                <option value="6ème A">6ème A</option>
                <option value="5ème Bilingue">5ème Bilingue</option>
                <option value="Seconde C">Seconde C</option>
                <option value="Terminale D">Terminale D</option>
                <option value="3ème A">3ème A</option>
              </select>
            </div>

            <button
              onClick={() => showToastMsg('Export CSV des échéanciers téléchargé !')}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-black transition flex items-center space-x-1.5"
            >
              <span>📥</span>
              <span>Exporter l'échéancier (CSV)</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                <tr>
                  <th className="py-3.5 px-5">Élève & Matricule</th>
                  <th className="py-3.5 px-5">Classe</th>
                  <th className="py-3.5 px-5">Scolarité</th>
                  <th className="py-3.5 px-5 text-center">Déjà Payé</th>
                  <th className="py-3.5 px-5 text-center">Reste Dû</th>
                  <th className="py-3.5 px-5 text-center">Statut</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtres.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5">
                      <div className="font-black text-slate-900">{p.nom}</div>
                      <div className="text-[10px] font-mono text-slate-400">{p.matricule} • Parent : {p.parent_nom}</div>
                    </td>
                    <td className="py-3.5 px-5 font-bold text-slate-700">{p.classe}</td>
                    <td className="py-3.5 px-5 font-mono font-bold text-slate-800">
                      {p.montant.toLocaleString('fr-FR')} F
                    </td>
                    <td className="py-3.5 px-5 text-center font-mono font-black text-sigapei-green">
                      {p.paye.toLocaleString('fr-FR')} F
                    </td>
                    <td className="py-3.5 px-5 text-center font-mono font-black text-red-600">
                      {p.reste.toLocaleString('fr-FR')} F
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        p.statut === 'solde' ? 'bg-emerald-100 text-emerald-800' :
                        p.statut === 'partiel' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'
                      }`}>
                        {p.statut === 'solde' ? 'Soldé' : p.statut === 'partiel' ? 'Partiel' : 'En retard'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setEncaissementForm({
                            ...encaissementForm,
                            eleveId: p.id,
                            montant: p.reste > 0 ? p.reste : 50000
                          });
                          if (onSwitchNav) onSwitchNav('cpt_caisse');
                        }}
                        className="px-3 py-1.5 bg-sigapei-green text-white font-bold rounded-xl text-xs hover:bg-sigapei-green/90 transition shadow-sm"
                      >
                        Encaisser
                      </button>
                      <button
                        onClick={() => setActiveRelance(p)}
                        className="px-2.5 py-1.5 bg-amber-100 text-amber-800 font-bold rounded-xl text-xs hover:bg-amber-200 transition"
                      >
                        Relance
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SECTION 3 : RELANCES ET MORATOIRES ── */}
      {activeNav === 'cpt_relances' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h3 className="text-xs font-black text-amber-900">Campagne de Recouvrement des Impayés</h3>
                <p className="text-[11px] text-amber-700">
                  {elevesPaiements.filter(p => p.reste > 0).length} dossiers présentent des échéances échues à relancer.
                </p>
              </div>
            </div>
            <button
              onClick={() => showToastMsg('Campagne SMS/Email de relance envoyée à tous les parents en retard !')}
              className="px-4 py-2 bg-amber-600 text-white font-black text-xs rounded-xl hover:bg-amber-700 transition shadow-sm"
            >
              Envoyer Relance Globale (SMS)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {elevesPaiements.filter(p => p.reste > 0).map(p => (
              <div key={p.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-heading font-black text-sm text-slate-900">{p.nom}</h4>
                    <p className="text-xs text-slate-500">{p.classe} • {p.matricule}</p>
                  </div>
                  <span className="font-mono font-black text-red-600 text-sm">
                    {p.reste.toLocaleString('fr-FR')} FCFA dus
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Parent responsable :</span>
                    <span className="font-bold text-slate-800">{p.parent_nom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Téléphone :</span>
                    <span className="font-mono text-slate-700">{p.parent_tel}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setActiveRelance(p)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
                  >
                    Avis de Relance
                  </button>
                  <button
                    onClick={() => showToastMsg(`Moratoire accordé jusqu'au 15 Octobre 2026 pour ${p.nom}`)}
                    className="px-3.5 py-1.5 rounded-xl bg-sigapei-gold text-sigapei-black font-black text-xs hover:bg-sigapei-gold-hover"
                  >
                    Accorder Moratoire
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 4 : JOURNAL ET CLOTURE DE CAISSE ── */}
      {activeNav === 'cpt_cloture' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-sigapei-green block">Arrêt Quotidien</span>
              <h3 className="font-heading font-black text-lg text-slate-900">Journal des Opérations du Jour</h3>
              <p className="text-xs text-slate-400">Date comptable : 27 Septembre 2026 • Caissier : {currentUser?.nom}</p>
            </div>

            <button
              onClick={() => showToastMsg('Caisse officiellement clôturée et archivée !')}
              className="px-5 py-2.5 bg-sigapei-green text-white font-black text-xs rounded-xl hover:bg-sigapei-green/90 shadow-md transition"
            >
              🔒 Valider & Clôturer la Caisse
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-5">Quittance</th>
                  <th className="py-3 px-5">Heure</th>
                  <th className="py-3 px-5">Élève</th>
                  <th className="py-3 px-5">Mode</th>
                  <th className="py-3 px-5 text-right">Montant Encaissé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr className="hover:bg-slate-50 transition">
                  <td className="py-3 px-5 font-mono font-bold text-sigapei-green">REC-2026-9011</td>
                  <td className="py-3 px-5 text-slate-500">08:45</td>
                  <td className="py-3 px-5 font-black text-slate-900">KOFFI Jean-Luc</td>
                  <td className="py-3 px-5">💵 Espèces</td>
                  <td className="py-3 px-5 text-right font-mono font-black text-slate-900">60 000 FCFA</td>
                </tr>
                <tr className="hover:bg-slate-50 transition">
                  <td className="py-3 px-5 font-mono font-bold text-sigapei-green">REC-2026-9012</td>
                  <td className="py-3 px-5 text-slate-500">11:15</td>
                  <td className="py-3 px-5 font-black text-slate-900">DUBOIS Alexandre</td>
                  <td className="py-3 px-5">📱 MTN MoMo</td>
                  <td className="py-3 px-5 text-right font-mono font-black text-slate-900">100 000 FCFA</td>
                </tr>
                <tr className="hover:bg-slate-50 transition">
                  <td className="py-3 px-5 font-mono font-bold text-sigapei-green">REC-2026-9013</td>
                  <td className="py-3 px-5 text-slate-500">14:30</td>
                  <td className="py-3 px-5 font-black text-slate-900">AGOSSA Fatoumata</td>
                  <td className="py-3 px-5">🏦 Virement</td>
                  <td className="py-3 px-5 text-right font-mono font-black text-slate-900">180 000 FCFA</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SECTION 5 : KPIS & DASHBOARD FINANCIER ── */}
      {activeNav === 'cpt_dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Attendu</span>
              <p className="text-2xl font-black text-slate-900 font-heading">
                {totalAttendu.toLocaleString('fr-FR')} <span className="text-xs font-normal">F</span>
              </p>
              <p className="text-[11px] text-slate-500">Budget scolarité annuel</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Total Encaissé</span>
              <p className="text-2xl font-black text-sigapei-green font-heading">
                {totalPaye.toLocaleString('fr-FR')} <span className="text-xs font-normal">F</span>
              </p>
              <p className="text-[11px] text-emerald-600 font-bold">{tauxGlobal}% recouvré</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-red-500 uppercase">Reste à Recouvrer</span>
              <p className="text-2xl font-black text-red-600 font-heading">
                {totalReste.toLocaleString('fr-FR')} <span className="text-xs font-normal">F</span>
              </p>
              <p className="text-[11px] text-red-500">Sur les tranches échues</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-sigapei-gold uppercase">Dossiers Soldés</span>
              <p className="text-2xl font-black text-slate-800 font-heading">
                {elevesPaiements.filter(p => p.statut === 'solde').length} / {elevesPaiements.length}
              </p>
              <p className="text-[11px] text-slate-500">100% régularisés</p>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL : REÇU OFFICIEL D'ENCAISSEMENT ── */}
      {activeRecu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sigapei-black/60 backdrop-blur-sm fade-enter">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="bg-sigapei-green p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img src="/logo-sigapei.png" alt="SIGAPEI" className="w-10 h-10 object-contain" />
                <div>
                  <h3 className="font-heading font-black text-base text-white">Quittance Officielle de Paiement</h3>
                  <p className="text-[11px] text-sigapei-cream/80">{activeRecu.numero} • SIGAPEI</p>
                </div>
              </div>
              <button onClick={() => setActiveRecu(null)} className="text-white hover:text-white/80">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Date & Heure :</span>
                  <span className="font-bold text-slate-800">{activeRecu.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Élève :</span>
                  <span className="font-black text-slate-900">{activeRecu.eleveNom} ({activeRecu.matricule})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Classe :</span>
                  <span className="font-bold text-slate-800">{activeRecu.classe}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Parent / Payeur :</span>
                  <span className="font-bold text-slate-800">{activeRecu.parentNom}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Montant Encaissé</span>
                  <span className="text-xl font-black text-emerald-900 font-mono">
                    {activeRecu.montant.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-200 text-emerald-900 font-bold text-xs">
                  {activeRecu.mode}
                </span>
              </div>

              <div className="p-3 bg-sigapei-cream/70 rounded-xl border border-sigapei-gold/40 text-[11px] text-slate-800 flex justify-between items-center">
                <span>Visa du Caissier : <strong>{activeRecu.caissier}</strong></span>
                <span className="font-mono text-slate-500">Tampon électronique SIGAPEI</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition flex items-center space-x-1.5"
                >
                  <span>🖨️</span>
                  <span>Imprimer le reçu</span>
                </button>
                <button
                  onClick={() => setActiveRecu(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL : AVIS DE RELANCE ── */}
      {activeRelance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sigapei-black/60 backdrop-blur-sm fade-enter">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="bg-amber-600 p-5 text-white flex items-center justify-between">
              <h3 className="font-heading font-black text-base text-white">Avis Officiel de Relance</h3>
              <button onClick={() => setActiveRelance(null)} className="text-white hover:text-white/80">✕</button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Rappel de paiement émis à l'attention de <strong>{activeRelance.parent_nom}</strong> concernant la scolarité de <strong>{activeRelance.nom}</strong> ({activeRelance.classe}).
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl font-mono text-red-800 font-bold">
                Montant total des arriérés : {activeRelance.reste.toLocaleString('fr-FR')} FCFA
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    showToastMsg(`Avis de relance envoyé par SMS au ${activeRelance.parent_tel} !`);
                    setActiveRelance(null);
                  }}
                  className="px-4 py-2 bg-amber-600 text-white font-bold rounded-xl text-xs hover:bg-amber-700"
                >
                  Envoyer par SMS & Email
                </button>
                <button
                  onClick={() => setActiveRelance(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
