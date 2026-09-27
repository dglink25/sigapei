import React, { useState } from 'react';
import { initialClasses, initialMatieres, initialNotesClasse } from '../../data/initialData';

export default function MatieresNotesView({ classes = initialClasses, academicYear = '2026-2027' }) {
  const [activeTab, setActiveTab] = useState('matieres'); // 'matieres' | 'saisie' | 'synthese'
  const [selectedClasseId, setSelectedClasseId] = useState(1);
  const [selectedPeriode, setSelectedPeriode] = useState('Trimestre 1');
  const [selectedMatiereId, setSelectedMatiereId] = useState(1);
  
  // Matières avec coefficients modifiables localement
  const [matieres, setMatieres] = useState(initialMatieres);
  // Notes de classe modifiables
  const [notesData, setNotesData] = useState(initialNotesClasse);
  // Bulletin aperçu modal
  const [activeBulletinStudent, setActiveBulletinStudent] = useState(null);
  // Modal ajout matière
  const [isAddMatiereModalOpen, setIsAddMatiereModalOpen] = useState(false);
  const [newMatiere, setNewMatiere] = useState({
    code: '',
    nom: '',
    groupe: 'Scientifique',
    prof: '',
    coef: 2
  });

  const [toastMessage, setToastMessage] = useState('');

  const currentClasse = classes.find(c => c.id === Number(selectedClasseId)) || classes[0];

  // Matières de la classe actuelle avec leur coefficient
  const classeMatieres = matieres.map(m => ({
    ...m,
    coef: m.coefs[currentClasse.id] !== undefined ? m.coefs[currentClasse.id] : 2
  }));

  const totalCoefficients = classeMatieres.reduce((s, m) => s + m.coef, 0);

  // Mise à jour du coefficient d'une matière pour la classe
  const handleUpdateCoef = (matiereId, newCoef) => {
    const val = Math.max(1, parseInt(newCoef) || 1);
    setMatieres(prev => prev.map(m => {
      if (m.id === matiereId) {
        return {
          ...m,
          coefs: { ...m.coefs, [currentClasse.id]: val }
        };
      }
      return m;
    }));
  };

  // Ajout d'une matière
  const handleAddMatiere = (e) => {
    e.preventDefault();
    if (!newMatiere.nom) return;
    const newId = Date.now();
    const created = {
      id: newId,
      code: newMatiere.code.toUpperCase() || newMatiere.nom.slice(0, 4).toUpperCase(),
      nom: newMatiere.nom,
      groupe: newMatiere.groupe,
      prof: newMatiere.prof || 'À assigner',
      coefs: { [currentClasse.id]: parseInt(newMatiere.coef) || 2 }
    };
    setMatieres(prev => [...prev, created]);
    setIsAddMatiereModalOpen(false);
    setToastMessage(`Matière "${created.nom}" ajoutée avec succès au programme !`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Notes de la classe pour la période sélectionnée
  const currentClasseNotes = (notesData[currentClasse.id] && notesData[currentClasse.id][selectedPeriode]) || [];

  // Mise à jour note devoir / examen
  const handleNoteChange = (apprenantId, matiereId, type, val) => {
    const num = Math.min(20, Math.max(0, parseFloat(val) || 0));
    setNotesData(prev => {
      const classeNotes = prev[currentClasse.id] || {};
      const periodeNotes = classeNotes[selectedPeriode] || [];
      const updated = periodeNotes.map(row => {
        if (row.apprenant_id === apprenantId) {
          const matNotes = row.notes[matiereId] || { devoir: 0, examen: 0 };
          return {
            ...row,
            notes: {
              ...row.notes,
              [matiereId]: { ...matNotes, [type]: num }
            }
          };
        }
        return row;
      });
      return {
        ...prev,
        [currentClasse.id]: {
          ...classeNotes,
          [selectedPeriode]: updated
        }
      };
    });
  };

  // Calcul des moyennes pour la synthèse
  const studentsSynthesis = currentClasseNotes.map(student => {
    let sumWeighted = 0;
    let sumCoef = 0;

    classeMatieres.forEach(m => {
      const n = student.notes[m.id];
      if (n) {
        const matMoy = (n.devoir + n.examen * 2) / 3;
        sumWeighted += matMoy * m.coef;
        sumCoef += m.coef;
      }
    });

    const moyenneGenerale = sumCoef > 0 ? (sumWeighted / sumCoef).toFixed(2) : '0.00';
    return {
      ...student,
      moyenneGenerale: parseFloat(moyenneGenerale)
    };
  }).sort((a, b) => b.moyenneGenerale - a.moyenneGenerale);

  // Moyenne générale de la classe
  const classeMoyenneGenerale = studentsSynthesis.length > 0 
    ? (studentsSynthesis.reduce((s, e) => s + e.moyenneGenerale, 0) / studentsSynthesis.length).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6 fade-enter">
      
      {/* Header avec sélecteurs de contexte */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-sigapei-black font-heading">
              Matières, Coefficients & Évaluations
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sigapei-green/10 text-sigapei-green border border-sigapei-green/20">
              Censeur & Pédagogie
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configuration du barème officiel, attribution des coefficients par filière, saisie des devoirs/examens et calcul des bulletins ({academicYear}).
          </p>
        </div>

        {/* Sélecteurs de Classe et Période */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex items-center">
            <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Classe :</span>
            <select
              value={selectedClasseId}
              onChange={e => setSelectedClasseId(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg text-xs font-black text-slate-800 outline-none bg-white cursor-pointer"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.nom} ({c.filiere})</option>
              ))}
            </select>
          </div>

          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex items-center">
            <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Période :</span>
            <select
              value={selectedPeriode}
              onChange={e => setSelectedPeriode(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-black text-slate-800 outline-none bg-white cursor-pointer"
            >
              <option value="Trimestre 1">Trimestre 1</option>
              <option value="Trimestre 2">Trimestre 2</option>
              <option value="Trimestre 3">Trimestre 3</option>
            </select>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-fade-in flex items-center gap-2">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Onglets Pédagogiques */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('matieres')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'matieres'
              ? 'bg-sigapei-green text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span>Matières & Coefficients ({classeMatieres.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('saisie')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'saisie'
              ? 'bg-sigapei-green text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Saisie des Notes & Devoirs</span>
        </button>

        <button
          onClick={() => setActiveTab('synthese')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'synthese'
              ? 'bg-sigapei-green text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Conseil de Classe & Bulletins</span>
        </button>
      </div>

      {/* ── TAB 1 : MATIÈRES ET COEFFICIENTS ── */}
      {activeTab === 'matieres' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-extrabold text-sigapei-black uppercase tracking-wider">
                Grille des Coefficients — {currentClasse.nom}
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Cycle {currentClasse.cycle} • Programme {currentClasse.programme} • Total coefficients : <strong className="text-sigapei-green font-mono">{totalCoefficients}</strong>
              </p>
            </div>

            <button
              onClick={() => setIsAddMatiereModalOpen(true)}
              className="px-4 py-2 bg-sigapei-gold text-sigapei-black font-black text-xs rounded-xl hover:bg-sigapei-gold-hover transition shadow-sm flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>Ajouter une matière au programme</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Code</th>
                  <th className="py-3.5 px-5">Intitulé de la Matière</th>
                  <th className="py-3.5 px-5">Groupe Disciplinaire</th>
                  <th className="py-3.5 px-5">Professeur Titulaire</th>
                  <th className="py-3.5 px-5 text-center">Coefficient ({currentClasse.nom})</th>
                  <th className="py-3.5 px-5 text-right">Poids relatif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {classeMatieres.map(m => {
                  const weightPct = totalCoefficients > 0 ? Math.round((m.coef / totalCoefficients) * 100) : 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-700">{m.code}</td>
                      <td className="py-3.5 px-5 font-black text-slate-900">{m.nom}</td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          m.groupe === 'Scientifique' ? 'bg-blue-100 text-blue-800' :
                          m.groupe === 'Lettres & Langues' ? 'bg-emerald-100 text-emerald-800' :
                          m.groupe === 'Sciences Humaines' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {m.groupe}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-600 font-semibold">{m.prof}</td>
                      <td className="py-3.5 px-5 text-center">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={m.coef}
                          onChange={e => handleUpdateCoef(m.id, e.target.value)}
                          className="w-16 py-1 px-2 text-center font-mono font-black text-sm rounded-xl border border-slate-200 bg-white text-sigapei-green focus:border-sigapei-green outline-none"
                        />
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-500">
                        {weightPct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2 : SAISIE & CONTRÔLE DES NOTES ── */}
      {activeTab === 'saisie' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700 uppercase">Matière à évaluer :</label>
              <select
                value={selectedMatiereId}
                onChange={e => setSelectedMatiereId(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-slate-800 bg-white"
              >
                {classeMatieres.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nom} (Coef {m.coef} • {m.prof})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Période active : {selectedPeriode}
              </span>
              <button
                onClick={() => {
                  setToastMessage('Notes de la classe enregistrées et calculées avec succès !');
                  setTimeout(() => setToastMessage(''), 3000);
                }}
                className="px-4 py-2 bg-sigapei-green text-white text-xs font-black rounded-xl hover:bg-sigapei-green/90 transition shadow-sm"
              >
                Enregistrer les notes
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-5">Matricule</th>
                  <th className="py-3 px-5">Nom & Prénom de l’Élève</th>
                  <th className="py-3 px-5 text-center">Devoir Surveillé (/20)</th>
                  <th className="py-3 px-5 text-center">Examen Trimestriel (/20)</th>
                  <th className="py-3 px-5 text-center">Moyenne Matière (/20)</th>
                  <th className="py-3 px-5 text-center">Appréciation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentClasseNotes.map(row => {
                  const mNote = row.notes[selectedMatiereId] || { devoir: 12.0, examen: 12.0 };
                  const moy = ((mNote.devoir + mNote.examen * 2) / 3).toFixed(2);
                  return (
                    <tr key={row.apprenant_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-5 font-mono font-bold text-slate-600">{row.matricule}</td>
                      <td className="py-3 px-5 font-black text-slate-900">{row.nom}</td>
                      <td className="py-3 px-5 text-center">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="20"
                          value={mNote.devoir}
                          onChange={e => handleNoteChange(row.apprenant_id, selectedMatiereId, 'devoir', e.target.value)}
                          className="w-16 py-1 px-2 text-center font-mono font-bold text-xs rounded-xl border border-slate-200 bg-white focus:border-sigapei-green outline-none"
                        />
                      </td>
                      <td className="py-3 px-5 text-center">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="20"
                          value={mNote.examen}
                          onChange={e => handleNoteChange(row.apprenant_id, selectedMatiereId, 'examen', e.target.value)}
                          className="w-16 py-1 px-2 text-center font-mono font-bold text-xs rounded-xl border border-slate-200 bg-white focus:border-sigapei-green outline-none"
                        />
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className={`font-mono font-black text-sm px-2.5 py-1 rounded-xl ${
                          parseFloat(moy) >= 14 ? 'bg-emerald-100 text-emerald-800' :
                          parseFloat(moy) >= 10 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-700'
                        }`}>
                          {moy}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-center text-slate-500 italic text-[11px]">
                        {parseFloat(moy) >= 16 ? 'Excellent travail' :
                         parseFloat(moy) >= 14 ? 'Très bon travail' :
                         parseFloat(moy) >= 10 ? 'Travail satisfaisant' : 'Doit redoubler d’efforts'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3 : CONSEIL DE CLASSE & BULLETINS ── */}
      {activeTab === 'synthese' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Moyenne Générale de la Classe</span>
              <p className="text-2xl font-black text-sigapei-green font-heading">{classeMoyenneGenerale} / 20</p>
              <p className="text-[11px] text-slate-400">Pour {studentsSynthesis.length} apprenants évalués</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Plus Forte Moyenne</span>
              <p className="text-2xl font-black text-emerald-700 font-heading">
                {studentsSynthesis[0]?.moyenneGenerale || 0} / 20
              </p>
              <p className="text-[11px] text-slate-400">{studentsSynthesis[0]?.nom || '—'}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Taux de Réussite (≥ 10/20)</span>
              <p className="text-2xl font-black text-slate-800 font-heading">
                {studentsSynthesis.length > 0
                  ? Math.round((studentsSynthesis.filter(s => s.moyenneGenerale >= 10).length / studentsSynthesis.length) * 100)
                  : 100}%
              </p>
              <p className="text-[11px] text-slate-400">Seuil de passage garanti</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-900 uppercase">
                  Classement & Tableau d’Honneur — {currentClasse.nom} ({selectedPeriode})
                </span>
                <p className="text-[11px] text-slate-500">Validation Censeur & Génération des Bulletins Officiels</p>
              </div>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-5 text-center">Rang</th>
                  <th className="py-3 px-5">Matricule</th>
                  <th className="py-3 px-5">Nom & Prénom</th>
                  <th className="py-3 px-5 text-center">Moyenne Générale</th>
                  <th className="py-3 px-5 text-center">Mention du Conseil</th>
                  <th className="py-3 px-5 text-right">Bulletin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {studentsSynthesis.map((s, idx) => {
                  const rang = idx + 1;
                  const mention = s.moyenneGenerale >= 16 ? 'Tableau d’Honneur avec Félicitations' :
                                  s.moyenneGenerale >= 14 ? 'Tableau d’Honneur' :
                                  s.moyenneGenerale >= 12 ? 'Encouragements' :
                                  s.moyenneGenerale >= 10 ? 'Passable' : 'Avertissement Travail';
                  return (
                    <tr key={s.apprenant_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-5 text-center font-black">
                        <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs ${
                          rang === 1 ? 'bg-sigapei-gold text-sigapei-black font-black shadow-sm' :
                          rang === 2 ? 'bg-slate-200 text-slate-700 font-bold' :
                          rang === 3 ? 'bg-amber-100 text-amber-800 font-bold' : 'text-slate-500 font-mono'
                        }`}>
                          {rang}e
                        </span>
                      </td>
                      <td className="py-3 px-5 font-mono font-bold text-slate-600">{s.matricule}</td>
                      <td className="py-3 px-5 font-black text-slate-900">{s.nom}</td>
                      <td className="py-3 px-5 text-center font-mono font-black text-sm text-sigapei-green">
                        {s.moyenneGenerale.toFixed(2)} / 20
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          s.moyenneGenerale >= 14 ? 'bg-emerald-100 text-emerald-800' :
                          s.moyenneGenerale >= 10 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-700'
                        }`}>
                          {mention}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button
                          onClick={() => setActiveBulletinStudent({ ...s, classe: currentClasse, periode: selectedPeriode })}
                          className="px-3 py-1.5 rounded-xl bg-sigapei-green/10 text-sigapei-green hover:bg-sigapei-green hover:text-white font-bold text-xs transition"
                        >
                          Aperçu Bulletin
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL : AJOUT MATIERE ── */}
      {isAddMatiereModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sigapei-black/60 backdrop-blur-sm fade-enter">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
            <div className="bg-sigapei-green px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-heading font-black text-base text-white">Ajouter une Matière au Programme</h3>
              <button onClick={() => setIsAddMatiereModalOpen(false)} className="text-white hover:text-white/80">✕</button>
            </div>
            <form onSubmit={handleAddMatiere} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nom de la matière *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Économie Générale"
                  value={newMatiere.nom}
                  onChange={e => setNewMatiere({ ...newMatiere, nom: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-sigapei-green"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Code</label>
                  <input
                    type="text"
                    placeholder="Ex: ECO"
                    value={newMatiere.code}
                    onChange={e => setNewMatiere({ ...newMatiere, code: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-sigapei-green"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Coefficient</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newMatiere.coef}
                    onChange={e => setNewMatiere({ ...newMatiere, coef: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-sigapei-green"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Groupe</label>
                <select
                  value={newMatiere.groupe}
                  onChange={e => setNewMatiere({ ...newMatiere, groupe: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-sigapei-green bg-white"
                >
                  <option value="Scientifique">Scientifique</option>
                  <option value="Lettres & Langues">Lettres & Langues</option>
                  <option value="Sciences Humaines">Sciences Humaines</option>
                  <option value="Technologique">Technologique</option>
                  <option value="Sport & Arts">Sport & Arts</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Professeur assigné</label>
                <input
                  type="text"
                  placeholder="Ex: M. Soglo"
                  value={newMatiere.prof}
                  onChange={e => setNewMatiere({ ...newMatiere, prof: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-sigapei-green"
                />
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMatiereModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sigapei-green text-white text-xs font-black hover:bg-sigapei-green/90 shadow-sm"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL : APERÇU BULLETIN OFFICIEL ── */}
      {activeBulletinStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sigapei-black/60 backdrop-blur-sm fade-enter">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-sigapei-sidebar p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-sigapei-gold text-sigapei-black font-black flex items-center justify-center text-sm">
                  SIG
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-white">
                    Bulletin Scolaire Trimestriel Officiel
                  </h3>
                  <p className="text-[11px] text-sigapei-cream/80">Année Académique {academicYear} • {activeBulletinStudent.periode}</p>
                </div>
              </div>
              <button onClick={() => setActiveBulletinStudent(null)} className="text-white hover:text-white/80">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Élève</span>
                  <h4 className="text-base font-black text-slate-900">{activeBulletinStudent.nom}</h4>
                  <p className="text-slate-500 font-mono text-[11px]">{activeBulletinStudent.matricule} • {activeBulletinStudent.classe.nom}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Moyenne Trimestre</span>
                  <p className="text-2xl font-black text-sigapei-green font-heading">
                    {activeBulletinStudent.moyenneGenerale.toFixed(2)} / 20
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Matière</th>
                      <th className="py-2.5 px-3 text-center">Coef</th>
                      <th className="py-2.5 px-3 text-center">Devoir</th>
                      <th className="py-2.5 px-3 text-center">Examen</th>
                      <th className="py-2.5 px-3 text-center">Moyenne</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {classeMatieres.map(m => {
                      const n = activeBulletinStudent.notes[m.id] || { devoir: 12.0, examen: 12.0 };
                      const moy = ((n.devoir + n.examen * 2) / 3).toFixed(2);
                      return (
                        <tr key={m.id}>
                          <td className="py-2 px-3 font-bold text-slate-800">{m.nom}</td>
                          <td className="py-2 px-3 text-center font-bold text-slate-500">{m.coef}</td>
                          <td className="py-2 px-3 text-center font-mono">{n.devoir}</td>
                          <td className="py-2 px-3 text-center font-mono">{n.examen}</td>
                          <td className="py-2 px-3 text-center font-mono font-black text-sigapei-green">{moy}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-sigapei-cream/70 rounded-xl border border-sigapei-gold/40 text-[11px] text-slate-800 flex justify-between items-center">
                <span>Visa du Censeur des Études : <strong>CERTIFIÉ CONFORME</strong></span>
                <span className="font-mono text-slate-500">Cachet électronique SIGAPEI</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition flex items-center space-x-1.5"
                >
                  <span>🖨️</span>
                  <span>Imprimer le bulletin</span>
                </button>
                <button
                  onClick={() => setActiveBulletinStudent(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
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
