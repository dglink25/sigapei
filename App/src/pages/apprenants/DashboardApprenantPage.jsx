import { useState, useEffect } from 'react'
import {
  BookOpen, GraduationCap, Calendar, Clock,
  RefreshCw, Award, FileText, CheckCircle2, AlertCircle,
  Building2, UserCheck, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../context/identite/AuthContext'
import usePageTitle from '../../hooks/commun/usePageTitle'
import ApprenantLayout from '../../components/apprenants/ApprenantLayout'
import './DashboardApprenantPage.css'

export default function DashboardApprenantPage() {
  usePageTitle('Tableau de bord - Apprenant')
  const { user } = useAuth()
  const [onglet, setOnglet] = useState('dashboard')
  const [rafraichit, setRafraichit] = useState(false)

  const nom = user?.nomComplet ?? user?.nom_complet ?? user?.nom ?? 'Apprenant'
  const matricule = user?.matricule ?? user?.identifiant ?? 'APP-2026-0842'
  const email = user?.email ?? 'apprenant@sigapei.bj'

  const actualiser = () => {
    setRafraichit(true)
    setTimeout(() => {
      setRafraichit(false)
    }, 450)
  }

  return (
    <ApprenantLayout ongletActif={onglet} onChangerOnglet={setOnglet}>
      {/* ── BANDEAU ACCUEIL INSTITUTIONNEL ── */}
      <section className="dap-welcome">
        <div className="dap-welcome-info">
          <h2>Bienvenue, {nom}</h2>
          <div className="dap-welcome-meta">
            <span>Matricule : <strong>{matricule}</strong></span>
            <span>•</span>
            <span className="dap-badge-status">Inscrit & Actif</span>
            <span>•</span>
            <span>Année 2026-2027</span>
          </div>
        </div>
        <div className="dap-welcome-actions">
          <button
            type="button"
            className="ap-btn ap-btn--ghost ap-btn--sm"
            onClick={actualiser}
            disabled={rafraichit}
          >
            <RefreshCw size={14} className={rafraichit ? 'ap-spin' : ''} /> Actualiser
          </button>
        </div>
      </section>

      {/* ── STATISTIQUES CLÉS ── */}
      <div className="dap-stats-grid">
        <div className="dap-stat-card">
          <div className="dap-stat-icon">
            <Award size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="dap-stat-val">15.4 / 20</p>
            <p className="dap-stat-lbl">Moyenne générale estimée</p>
          </div>
        </div>

        <div className="dap-stat-card dap-stat-card--gold">
          <div className="dap-stat-icon">
            <BookOpen size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="dap-stat-val">8 matières</p>
            <p className="dap-stat-lbl">Cours inscrits au programme</p>
          </div>
        </div>

        <div className="dap-stat-card dap-stat-card--blue">
          <div className="dap-stat-icon">
            <Clock size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="dap-stat-val">98.5 %</p>
            <p className="dap-stat-lbl">Taux d'assiduité globale</p>
          </div>
        </div>

        <div className="dap-stat-card">
          <div className="dap-stat-icon">
            <FileText size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="dap-stat-val">2 évaluations</p>
            <p className="dap-stat-lbl">À venir dans la semaine</p>
          </div>
        </div>
      </div>

      {/* ── CONTENU SELON ONGLET ── */}
      {onglet === 'dashboard' && (
        <div className="dap-main-grid">
          {/* Colonne Gauche : Cours du jour & Emploi du temps */}
          <div>
            <div className="dap-card">
              <div className="dap-card-head">
                <h3>
                  <Calendar size={18} color="#006B3C" />
                  Emploi du temps & Cours du jour
                </h3>
                <span className="ap-badge ap-badge--neutral">Aujourd'hui</span>
              </div>
              <div className="dap-card-body">
                <div className="dap-timeline">
                  <div className="dap-timeline-item">
                    <span className="dap-timeline-time">08h00 - 10h00</span>
                    <div className="dap-timeline-content">
                      <p className="dap-timeline-title">Mathématiques Appliquées</p>
                      <p className="dap-timeline-sub">Salle B-102 • Prof. A. Dossou</p>
                    </div>
                    <span className="ap-badge ap-badge--success">Terminé</span>
                  </div>

                  <div className="dap-timeline-item">
                    <span className="dap-timeline-time">10h15 - 12h15</span>
                    <div className="dap-timeline-content">
                      <p className="dap-timeline-title">Physique-Chimie & Travaux Pratiques</p>
                      <p className="dap-timeline-sub">Laboratoire 2 • Dr. K. Hounwanou</p>
                    </div>
                    <span className="ap-badge ap-badge--info">En cours</span>
                  </div>

                  <div className="dap-timeline-item">
                    <span className="dap-timeline-time">15h00 - 17h00</span>
                    <div className="dap-timeline-content">
                      <p className="dap-timeline-title">Français & Expression Écrite</p>
                      <p className="dap-timeline-sub">Salle A-04 • Mme. C. Mensah</p>
                    </div>
                    <span className="ap-badge ap-badge--neutral">À venir</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="dap-card">
              <div className="dap-card-head">
                <h3>
                  <GraduationCap size={18} color="#006B3C" />
                  Dernières notes enregistrées
                </h3>
              </div>
              <div className="dap-card-body" style={{ padding: 0 }}>
                <table className="ap-table">
                  <thead>
                    <tr>
                      <th>Matière</th>
                      <th>Épreuve</th>
                      <th>Note</th>
                      <th>Coefficient</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Mathématiques</strong></td>
                      <td>Devoir surveillé 1</td>
                      <td><strong style={{ color: '#006B3C' }}>16 / 20</strong></td>
                      <td>Coeff. 4</td>
                      <td><span className="ap-badge ap-badge--success">Validé</span></td>
                    </tr>
                    <tr>
                      <td><strong>Physique-Chimie</strong></td>
                      <td>Interrogation écrite</td>
                      <td><strong style={{ color: '#006B3C' }}>14.5 / 20</strong></td>
                      <td>Coeff. 3</td>
                      <td><span className="ap-badge ap-badge--success">Validé</span></td>
                    </tr>
                    <tr>
                      <td><strong>Anglais</strong></td>
                      <td>Contrôle de compréhension</td>
                      <td><strong style={{ color: '#006B3C' }}>17 / 20</strong></td>
                      <td>Coeff. 2</td>
                      <td><span className="ap-badge ap-badge--success">Validé</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Colonne Droite : Annonces & Informations */}
          <div>
            <div className="dap-card">
              <div className="dap-card-head">
                <h3>
                  <AlertCircle size={18} color="#E9AA20" />
                  Annonces de la Direction
                </h3>
              </div>
              <div className="dap-card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ padding: 12, borderRadius: 8, background: 'var(--sg-surface-2)', border: '1px solid var(--sg-border)' }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.88rem' }}>Calendrier des compositions</p>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sg-text-muted)' }}>
                      Les compositions du premier semestre débuteront le 15 décembre selon le planning officiel affiché.
                    </p>
                  </div>
                  <div style={{ padding: 12, borderRadius: 8, background: 'var(--sg-surface-2)', border: '1px solid var(--sg-border)' }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.88rem' }}>Règlement intérieur</p>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sg-text-muted)' }}>
                      Le port de la tenue réglementaire institutionnelle est obligatoire pour tous les apprenants.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="dap-card">
              <div className="dap-card-head">
                <h3>
                  <Clock size={18} color="#006B3C" />
                  Assiduité récente
                </h3>
              </div>
              <div className="dap-card-body">
                <p style={{ margin: '0 0 10px', fontSize: '0.85rem' }}>
                  Aucune absence non justifiée enregistrée au cours des 30 derniers jours.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#006B3C', fontWeight: 600, fontSize: '0.82rem' }}>
                  <CheckCircle2 size={16} />
                  <span>Dossier disciplinaire exemplaire</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {onglet === 'cours' && (
        <div className="dap-card">
          <div className="dap-card-head">
            <h3>Programme pédagogique & Matières suivies</h3>
          </div>
          <div className="dap-card-body" style={{ padding: 0 }}>
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Matière</th>
                  <th>Enseignant référent</th>
                  <th>Volume horaire hebdomadaire</th>
                  <th>Coefficient</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><strong>Mathématiques</strong></td><td>Prof. A. Dossou</td><td>4h / semaine</td><td>4</td></tr>
                <tr><td><strong>Physique-Chimie</strong></td><td>Dr. K. Hounwanou</td><td>3h / semaine</td><td>3</td></tr>
                <tr><td><strong>Sciences de la Vie et de la Terre</strong></td><td>M. S. Agossou</td><td>2h / semaine</td><td>2</td></tr>
                <tr><td><strong>Français & Littérature</strong></td><td>Mme. C. Mensah</td><td>4h / semaine</td><td>4</td></tr>
                <tr><td><strong>Anglais</strong></td><td>M. P. Kouassi</td><td>2h / semaine</td><td>2</td></tr>
                <tr><td><strong>Histoire-Géographie</strong></td><td>M. G. Zannou</td><td>2h / semaine</td><td>2</td></tr>
                <tr><td><strong>Philosophie</strong></td><td>Dr. R. Houndegla</td><td>2h / semaine</td><td>2</td></tr>
                <tr><td><strong>Éducation Physique & Sportive</strong></td><td>M. F. Bio</td><td>2h / semaine</td><td>1</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {onglet === 'notes' && (
        <div className="dap-card">
          <div className="dap-card-head">
            <h3>Relevé de notes semestriel</h3>
          </div>
          <div className="dap-card-body" style={{ padding: 0 }}>
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Matière</th>
                  <th>Interrogations</th>
                  <th>Devoirs surveillés</th>
                  <th>Moyenne matière</th>
                  <th>Appréciation de l'enseignant</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><strong>Mathématiques</strong></td><td>15, 17</td><td>16.5</td><td>16.2 / 20</td><td>Très bon travail, régulier.</td></tr>
                <tr><td><strong>Physique-Chimie</strong></td><td>13, 14</td><td>15</td><td>14.3 / 20</td><td>Bon investissement dans les travaux pratiques.</td></tr>
                <tr><td><strong>Français</strong></td><td>14, 16</td><td>15</td><td>15.0 / 20</td><td>Bonne rigueur d'expression.</td></tr>
                <tr><td><strong>Anglais</strong></td><td>16, 18</td><td>17</td><td>17.0 / 20</td><td>Excellente participation orale.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {onglet === 'emploi' && (
        <div className="dap-card">
          <div className="dap-card-head">
            <h3>Grille hebdomadaire de l'emploi du temps</h3>
          </div>
          <div className="dap-card-body">
            <p style={{ color: 'var(--sg-text-muted)', fontSize: '0.88rem', margin: '0 0 16px' }}>
              Horaires officiels de cours pour l'année académique 2026-2027.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].map((jour) => (
                <div key={jour} style={{ padding: 12, borderRadius: 8, background: 'var(--sg-surface-2)', border: '1px solid var(--sg-border)' }}>
                  <strong style={{ display: 'block', marginBottom: 8, color: '#006B3C' }}>{jour}</strong>
                  <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>08h - 10h : Cours magistral</div>
                    <div>10h - 12h : Travaux dirigés</div>
                    <div>15h - 17h : Séminaire & TP</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {onglet === 'assiduite' && (
        <div className="dap-card">
          <div className="dap-card-head">
            <h3>Rapport d'assiduité et relevé des présences</h3>
          </div>
          <div className="dap-card-body">
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
              <div style={{ padding: 14, borderRadius: 8, background: 'var(--sg-surface-2)', border: '1px solid var(--sg-border)', minWidth: 180 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--sg-text-muted)' }}>Heures d'absence justifiées</span>
                <p style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 700 }}>2 heures</p>
              </div>
              <div style={{ padding: 14, borderRadius: 8, background: 'var(--sg-surface-2)', border: '1px solid var(--sg-border)', minWidth: 180 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--sg-text-muted)' }}>Heures d'absence non justifiées</span>
                <p style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 700, color: '#006B3C' }}>0 heure</p>
              </div>
              <div style={{ padding: 14, borderRadius: 8, background: 'var(--sg-surface-2)', border: '1px solid var(--sg-border)', minWidth: 180 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--sg-text-muted)' }}>Retards constatés</span>
                <p style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 700 }}>1 retard (5 min)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {onglet === 'profil' && (
        <div className="dap-card">
          <div className="dap-card-head">
            <h3>Fiche administrative de l'apprenant</h3>
          </div>
          <div className="dap-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div>
                <label className="ap-label">Nom complet</label>
                <input className="ap-input" readOnly value={nom} />
              </div>
              <div>
                <label className="ap-label">Matricule national</label>
                <input className="ap-input" readOnly value={matricule} />
              </div>
              <div>
                <label className="ap-label">Adresse courriel</label>
                <input className="ap-input" readOnly value={email} />
              </div>
              <div>
                <label className="ap-label">Statut d'inscription</label>
                <input className="ap-input" readOnly value="Régulier - Année 2026-2027" />
              </div>
            </div>
          </div>
        </div>
      )}
    </ApprenantLayout>
  )
}
