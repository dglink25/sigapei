import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function DashboardView({ 
  classes, 
  candidatures, 
  apprenants, 
  onOpenCreateClasse, 
  onSwitchNav 
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const pendingCount = candidatures.filter(c => c.statut === 'en_attente').length;
  const fullClassesCount = classes.filter(c => c.inscrits >= c.capacite).length;

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept (Actuel)'],
        datasets: [
          {
            label: 'Inscriptions Confirmées (Vert)',
            data: [180, 420, 780, 1150, 1390, 1482],
            borderColor: '#006B3C',
            backgroundColor: 'rgba(0, 107, 60, 0.08)',
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#006B3C',
            pointRadius: 4,
          },
          {
            label: 'Capacité Plafond Autorisé (Or)',
            data: [1600, 1600, 1600, 1600, 1600, 1600],
            borderColor: '#E9AA20',
            borderDash: [6, 6],
            borderWidth: 2,
            fill: false,
            pointRadius: 0,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            min: 0,
            max: 1800,
            grid: { color: '#F1F5F9' },
            ticks: { font: { family: 'Inter', size: 11 }, color: '#64748B' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11 }, color: '#64748B' }
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  return (
    <div className="space-y-6 fade-enter">
      
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-sigapei-black font-heading tracking-tight">Tableau de Bord Général</h1>
          <p className="text-xs text-slate-500 mt-1">Supervision de l'ensemble des effectifs, admissions en cours et capacité des classes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onOpenCreateClasse} 
            className="px-4 py-2.5 rounded-xl bg-white border border-sigapei-green text-sigapei-green font-bold text-xs hover:bg-sigapei-green hover:text-white shadow-sm transition flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-sigapei-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Ajouter une Classe</span>
          </button>
          <button 
            onClick={() => onSwitchNav('candidatures')} 
            className="px-4 py-2.5 rounded-xl bg-sigapei-gold text-sigapei-black font-black text-xs hover:bg-sigapei-gold-hover shadow-sm transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <span>Instruire Candidatures ({pendingCount})</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl shadow-card border border-slate-100 flex flex-col justify-between hover:shadow-card-hover transition">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Apprenants</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-sigapei-black font-heading">1 482</span>
            <span className="text-xs font-bold text-sigapei-green bg-[#EAF5EF] border border-[#BDE3CE] px-2 py-0.5 rounded-md flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg> +5.4%
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Dossiers uniques actifs</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-card border border-slate-100 flex flex-col justify-between hover:shadow-card-hover transition">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Candidatures en attente</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-sigapei-gold font-heading">{pendingCount}</span>
            <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">À instruire</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Pièces et tests à valider</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-card border border-slate-100 flex flex-col justify-between hover:shadow-card-hover transition">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Taux de Remplissage</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-sigapei-green font-heading">92.4 %</span>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
              {fullClassesCount} Complète{fullClassesCount > 1 ? 's' : ''}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Contrôle bloquant actif</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-card border border-slate-100 flex flex-col justify-between hover:shadow-card-hover transition">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Situation Frais Scolaires</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl font-black text-sigapei-black font-heading">
              184,5 M <span className="text-xs text-sigapei-green font-sans font-bold">FCFA</span>
            </span>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">Lecture Seule</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Jointure directe sur Finances</span>
        </div>

      </div>

      {/* Official Graph */}
      <div className="bg-white p-6 rounded-2xl shadow-card border border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-sigapei-black font-heading">Évolution des Admissions & Seuil de Capacité</h3>
            <p className="text-xs text-slate-500">Vert = Inscriptions effectives confirmées • Or = Seuil de capacité maximale autorisée (Page 8 de la charte).</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sigapei-green"></span> Donnée principale (Inscrits)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sigapei-gold"></span> Point d'attention (Plafond 1600)</span>
          </div>
        </div>
        <div className="h-64">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>

      {/* Cahier des charges major rules cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-sigapei-cream/70 border border-sigapei-gold/50 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-sigapei-gold text-sigapei-black flex items-center justify-center shrink-0 font-bold shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h4 className="text-xs font-black text-sigapei-black uppercase tracking-wider">Règle Majeure : Programme Béninois vs Français</h4>
            <p className="text-xs text-slate-800 mt-1 leading-relaxed">
              Dans le <strong>Programme Béninois</strong>, les élèves n'ont <strong>aucun compte de connexion</strong> (application formelle de l'interdiction du smartphone en classe). Les parents pilotent 100 % du suivi. Pour le <strong>Programme Français</strong> au secondaire, un compte élève autonome est créé automatiquement.
            </p>
          </div>
        </div>

        <div className="bg-sigapei-gold-light border border-sigapei-gold-border rounded-2xl p-5 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-sigapei-gold text-sigapei-black flex items-center justify-center shrink-0 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h4 className="text-xs font-black text-sigapei-black uppercase tracking-wider">Capacité Bloquante & Non-Duplication</h4>
            <p className="text-xs text-slate-800 mt-1 leading-relaxed">
              Toute admission est <strong>bloquée dès que la classe est complète</strong>. En cas de mutation ou réinscription, la ligne apprenant existante est mise à jour : <strong>aucun doublon de dossier</strong> n'est généré.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
