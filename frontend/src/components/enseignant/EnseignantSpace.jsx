import React, { useState } from 'react';
import { initialApprenants, initialClasses } from '../../data/initialData';

const MON_EDT = {
  'Lundi':    [{ heure: '08h-09h', matiere: 'Mathématiques', classe: '3ème A', salle: 'Salle 12' }, { heure: '10h-11h', matiere: 'Mathématiques', classe: '2nde B', salle: 'Salle 07' }],
  'Mardi':    [{ heure: '09h-10h', matiere: 'Mathématiques', classe: '3ème A', salle: 'Salle 12' }],
  'Mercredi': [{ heure: '08h-10h', matiere: 'Mathématiques', classe: '1ère C', salle: 'Salle 03' }],
  'Jeudi':    [{ heure: '11h-12h', matiere: 'Mathématiques', classe: '2nde B', salle: 'Salle 07' }],
  'Vendredi': [{ heure: '08h-09h', matiere: 'Mathématiques', classe: 'Terminale D', salle: 'Salle 01' }],
};

const MES_CLASSES = ['3ème A', '2nde B', '1ère C', 'Terminale D'];
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const COLORS = ['bg-blue-100 text-blue-800 border-blue-200', 'bg-indigo-100 text-indigo-800 border-indigo-200', 'bg-teal-100 text-teal-800 border-teal-200', 'bg-amber-100 text-amber-800 border-amber-200', 'bg-purple-100 text-purple-800 border-purple-200'];

export default function EnseignantSpace({ currentUser, activeNav = 'ens_edt' }) {
  const [selectedClasse, setSelectedClasse] = useState(null);
  const [searchApprenant, setSearchApprenant] = useState('');
  const [activeStudentModal, setActiveStudentModal] = useState(null);

  // État de l'appel de classe
  const [attendanceClasse, setAttendanceClasse] = useState(1);
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [attendanceSaved, setAttendanceSaved] = useState(false);

  // Saisie des notes enseignant
  const [noteClasse, setNoteClasse] = useState(1);
  const [noteMatiere, setNoteMatiere] = useState('Mathématiques');
  const [notesList, setNotesList] = useState({
    501: { devoir: 15.5, examen: 14.0 },
    502: { devoir: 13.0, examen: 14.5 },
    503: { devoir: 12.0, examen: 11.5 }
  });
  const [notesSaved, setNotesSaved] = useState(false);

  const apprenantsFiltres = initialApprenants.filter(a => {
    const classeMatch = selectedClasse ? a.classe_id === selectedClasse : true;
    const searchMatch = !searchApprenant || `${a.nom} ${a.prenom} ${a.matricule}`.toLowerCase().includes(searchApprenant.toLowerCase());
    return classeMatch && searchMatch;
  });

  const studentsForAttendance = initialApprenants.filter(a => a.classe_id === attendanceClasse);

  const handleSetAttendance = (studentId, status) => {
    setAttendanceStatus(prev => ({
      ...prev,
      [studentId]: status
    }));
    setAttendanceSaved(false);
  };

  const handleSaveAttendance = () => {
    setAttendanceSaved(true);
    setTimeout(() => setAttendanceSaved(false), 3000);
  };

  const handleSaveNotes = () => {
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 3000);
  };

  const effectiveTab = activeNav.replace('ens_', '');

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-sigapei-canvas">

      {/* Header informatif de l'espace Enseignant */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-6 sm:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-sigapei-green mb-0.5">Espace Enseignant Certifié</div>
          <h1 className="text-base sm:text-lg font-black text-slate-900">{currentUser?.nom}</h1>
          <p className="text-xs text-slate-400">{currentUser?.etablissement} • Titulaire Discipline Mathématiques</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 font-black uppercase tracking-wider">
            Mathématiques
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">

        {/* ── 1. Emploi du Temps Personnel ── */}
        {(effectiveTab === 'edt' || activeNav === 'ens_edt') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">Mon planning hebdomadaire de cours</h2>
                <p className="text-xs text-slate-400">Semestre 1 • 14 heures de cours attribuées par le Censeur</p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                Année 2026-2027
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {JOURS.map((jour, ji) => (
                <div key={jour} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-sigapei-sidebar px-4 py-2.5">
                    <span className="text-xs font-black text-sigapei-cream uppercase tracking-wider">{jour}</span>
                  </div>
                  <div className="p-3 space-y-2 min-h-[140px]">
                    {(MON_EDT[jour] || []).length === 0 ? (
                      <div className="text-center text-xs text-slate-300 pt-6 italic">Aucun cours</div>
                    ) : (
                      (MON_EDT[jour] || []).map((c, i) => (
                        <div key={i} className={`p-3 rounded-xl border text-xs ${COLORS[(ji + i) % COLORS.length]}`}>
                          <div className="font-mono font-black">{c.heure}</div>
                          <div className="font-extrabold mt-1 text-sm">{c.matiere}</div>
                          <div className="text-[11px] mt-1 opacity-80 flex items-center justify-between">
                            <span className="font-bold">{c.classe}</span>
                            <span>{c.salle}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 2. Mes Classes ── */}
        {(effectiveTab === 'classes' || activeNav === 'ens_classes') && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-800">Mes classes affectées</h2>
              <p className="text-xs text-slate-400">Jauges d'effectif et progression des inscriptions</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {MES_CLASSES.map((nom, i) => {
                const cl = initialClasses.find(c => c.nom === nom);
                const nb = cl ? cl.inscrits : 38;
                const cap = cl ? cl.capacite : 45;
                const pct = Math.round((nb / cap) * 100);
                return (
                  <div key={nom} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-sigapei-green/10 text-sigapei-green font-black flex items-center justify-center">
                        📚
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {cl?.cycle || 'Secondaire'}
                      </span>
                    </div>
                    <div>
                      <div className="font-black text-slate-800 text-base">{nom}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Effectif : {nb} élèves</div>
                    </div>
                    <div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-sigapei-green rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                        <span>Remplissage</span>
                        <span className="font-bold font-mono">{pct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 3. Dossiers Apprenants (Lecture Seule) ── */}
        {(effectiveTab === 'dossiers' || effectiveTab === 'apprenants' || activeNav === 'ens_dossiers') && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-800">Dossiers des apprenants</h2>
                <p className="text-xs text-slate-400">Consultation pédagogique en lecture seule (cliquez sur un élève pour sa fiche)</p>
              </div>
              <div className="flex items-center space-x-2">
                <select value={selectedClasse || ''} onChange={e => setSelectedClasse(e.target.value ? Number(e.target.value) : null)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-sigapei-green bg-white">
                  <option value="">Toutes mes classes</option>
                  {initialClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
                <input value={searchApprenant} onChange={e => setSearchApprenant(e.target.value)}
                  placeholder="Rechercher élève…"
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-sigapei-green bg-white w-44" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Matricule</th>
                    <th className="py-3 px-4">Nom & Prénom</th>
                    <th className="py-3 px-4">Classe</th>
                    <th className="py-3 px-4">Date de naissance</th>
                    <th className="py-3 px-4">Contact Parent</th>
                    <th className="py-3 px-4 text-right">Fiche</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {apprenantsFiltres.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-8 text-slate-400">Aucun apprenant trouvé.</td></tr>
                  ) : (
                    apprenantsFiltres.map(a => {
                      const cl = initialClasses.find(c => c.id === a.classe_id);
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">{a.matricule}</td>
                          <td className="py-3 px-4 font-extrabold text-slate-800">{a.nom} {a.prenom}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-lg bg-sigapei-green/10 text-sigapei-green text-[11px] font-bold">
                              {cl?.nom || '6ème A'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{a.date_naissance}</td>
                          <td className="py-3 px-4 text-slate-600 font-medium">{a.parent_nom} ({a.parent_tel})</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setActiveStudentModal(a)}
                              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-sigapei-green hover:text-white text-slate-700 text-[11px] font-bold transition"
                            >
                              Voir fiche
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 4. Feuille d'Appel & Présences ── */}
        {(effectiveTab === 'appel' || activeNav === 'ens_appel') && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-700 uppercase">Classe :</label>
                <select 
                  value={attendanceClasse}
                  onChange={e => setAttendanceClasse(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                >
                  {initialClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">Date du jour : {new Date().toLocaleDateString('fr-FR')}</span>
              </div>

              <div className="flex items-center gap-2">
                {attendanceSaved && (
                  <span className="text-xs font-bold text-emerald-600 animate-bounce">
                    ✓ Appel enregistré !
                  </span>
                )}
                <button
                  onClick={handleSaveAttendance}
                  className="px-4 py-2 bg-sigapei-green text-white text-xs font-black rounded-xl hover:bg-sigapei-green/90 transition shadow-sm"
                >
                  Valider l'appel
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Matricule</th>
                    <th className="py-3 px-4">Nom & Prénom</th>
                    <th className="py-3 px-4 text-center">Statut de Présence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentsForAttendance.map(a => {
                    const currentStat = attendanceStatus[a.id] || 'present';
                    return (
                      <tr key={a.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-600">{a.matricule}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{a.nom} {a.prenom}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs font-bold">
                            <button
                              onClick={() => handleSetAttendance(a.id, 'present')}
                              className={`px-3 py-1 rounded-lg transition ${currentStat === 'present' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                              Présent
                            </button>
                            <button
                              onClick={() => handleSetAttendance(a.id, 'retard')}
                              className={`px-3 py-1 rounded-lg transition ${currentStat === 'retard' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                              En retard
                            </button>
                            <button
                              onClick={() => handleSetAttendance(a.id, 'absent')}
                              className={`px-3 py-1 rounded-lg transition ${currentStat === 'absent' ? 'bg-red-500 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 5. Saisie des Notes Enseignant ── */}
        {(effectiveTab === 'notes' || activeNav === 'ens_notes') && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-bold text-slate-700 uppercase">Classe :</label>
                <select 
                  value={noteClasse}
                  onChange={e => setNoteClasse(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                >
                  {initialClasses.slice(0, 3).map(c => (
                    <option key={c.id} value={c.id}>{c.nom} ({c.filiere})</option>
                  ))}
                </select>

                <label className="text-xs font-bold text-slate-700 uppercase ml-2">Discipline :</label>
                <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold rounded-lg text-xs">
                  {noteMatiere} (Coef 3)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {notesSaved && (
                  <span className="text-xs font-bold text-emerald-600 animate-bounce">
                    ✓ Notes transmises au Censeur !
                  </span>
                )}
                <button
                  onClick={handleSaveNotes}
                  className="px-4 py-2 bg-sigapei-green text-white text-xs font-black rounded-xl hover:bg-sigapei-green/90 transition shadow-sm"
                >
                  Transmettre les notes
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Matricule</th>
                    <th className="py-3 px-4">Élève</th>
                    <th className="py-3 px-4 text-center">Devoir Surveillé (/20)</th>
                    <th className="py-3 px-4 text-center">Examen Trimestriel (/20)</th>
                    <th className="py-3 px-4 text-center">Moyenne (/20)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {initialApprenants.slice(0, 3).map(a => {
                    const curNotes = notesList[a.id] || { devoir: 12.0, examen: 12.0 };
                    const moy = ((curNotes.devoir + curNotes.examen * 2) / 3).toFixed(2);
                    return (
                      <tr key={a.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-600">{a.matricule}</td>
                        <td className="py-3 px-4 font-black text-slate-800">{a.nom} {a.prenom}</td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="20"
                            value={curNotes.devoir}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setNotesList({
                                ...notesList,
                                [a.id]: { ...curNotes, devoir: val }
                              });
                            }}
                            className="w-16 py-1 px-2 text-center font-mono font-bold text-xs rounded-xl border border-slate-200 bg-white"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="20"
                            value={curNotes.examen}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setNotesList({
                                ...notesList,
                                [a.id]: { ...curNotes, examen: val }
                              });
                            }}
                            className="w-16 py-1 px-2 text-center font-mono font-bold text-xs rounded-xl border border-slate-200 bg-white"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-xl font-mono font-black text-xs ${
                            parseFloat(moy) >= 14 ? 'bg-emerald-100 text-emerald-800' :
                            parseFloat(moy) >= 10 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-700'
                          }`}>
                            {moy}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Modal Fiche Dossier Apprenant */}
      {activeStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sigapei-black/60 backdrop-blur-sm fade-enter">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="bg-sigapei-sidebar px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-sigapei-gold text-sigapei-black font-black flex items-center justify-center">
                  👤
                </div>
                <div>
                  <h3 className="font-heading font-black text-sm text-white">
                    {activeStudentModal.nom} {activeStudentModal.prenom}
                  </h3>
                  <p className="text-[11px] text-sigapei-gold font-mono">{activeStudentModal.matricule}</p>
                </div>
              </div>
              <button onClick={() => setActiveStudentModal(null)} className="text-white hover:text-white/80">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Date de naissance</span>
                  <p className="font-extrabold text-slate-800 mt-0.5">{activeStudentModal.date_naissance}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Classe actuelle</span>
                  <p className="font-extrabold text-sigapei-green mt-0.5">
                    {initialClasses.find(c => c.id === activeStudentModal.classe_id)?.nom || '6ème A'}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Parent / Référent</span>
                <p className="font-extrabold text-slate-800 mt-0.5">{activeStudentModal.parent_nom}</p>
                <p className="text-slate-500 mt-0.5">📞 {activeStudentModal.parent_tel}</p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                🔒 <strong>Accès Pédagogique :</strong> L'enseignant a accès au dossier pour le suivi scolaire et la saisie des notes. Aucune modification administrative permise.
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setActiveStudentModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition"
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
