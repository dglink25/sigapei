import { useState } from 'react'
import {
  Users, GraduationCap, DollarSign, MessageSquare,
  RefreshCw, CheckCircle2, Clock, Calendar, AlertTriangle, FileText,
} from 'lucide-react'
import { useAuth } from '../../context/identite/AuthContext'
import usePageTitle from '../../hooks/commun/usePageTitle'
import ParentLayout from '../../components/parents/ParentLayout'
import './DashboardParentPage.css'

export default function DashboardParentPage() {
  usePageTitle('Tableau de bord - Parents')
  const { user } = useAuth()
  const [onglet, setOnglet] = useState('dashboard')
  const [enfantActif, setEnfantActif] = useState('enfant-1')
  const [rafraichit, setRafraichit] = useState(false)

  const nom = user?.nomComplet ?? user?.nom_complet ?? user?.nom ?? 'Parent d\'élève'

  const enfants = [
    { id: 'enfant-1', nom: 'Jean-Marc Houndokinnou', classe: 'Terminale Scientifique', matricule: 'APP-2026-0842', moyenne: '15.4 / 20', scolarite: 'À jour' },
    { id: 'enfant-2', nom: 'Marie-Estelle Houndokinnou', classe: 'Classe de 3ème', matricule: 'APP-2026-1190', moyenne: '16.1 / 20', scolarite: 'À jour' },
  ]

  const enfantCourant = enfants.find((e) => e.id === enfantActif) || enfants[0]

  const actualiser = () => {
    setRafraichit(true)
    setTimeout(() => {
      setRafraichit(false)
    }, 450)
  }

  return (
    <ParentLayout ongletActif={onglet} onChangerOnglet={setOnglet}>
      {/* ── BANDEAU ACCUEIL INSTITUTIONNEL ── */}
      <section className="dpp-welcome">
        <div className="dpp-welcome-info">
          <h2>Espace Parents & Tuteurs : {nom}</h2>
          <div className="dpp-welcome-meta">
            <span>Enfants scolarisés dans l'établissement : <strong>{enfants.length}</strong></span>
            <span>•</span>
            <span>Année académique 2026-2027</span>
          </div>
        </div>
        <div className="dpp-welcome-actions">
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

      {/* ── SÉLECTEUR D'ENFANT ── */}
      <div className="dpp-selector-card">
        <div className="dpp-selector-left">
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--sg-text-muted)' }}>
            Dossier de l'élève suivi :
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {enfants.map((e) => (
              <button
                key={e.id}
                type="button"
                className={`dpp-child-pill${enfantActif === e.id ? ' is-active' : ''}`}
                onClick={() => setEnfantActif(e.id)}
              >
                {e.nom} ({e.classe})
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--sg-text-muted)' }}>
          Matricule : <strong>{enfantCourant.matricule}</strong>
        </div>
      </div>

      {/* ── KPI STATISTIQUES ── */}
      <div className="dpp-stats-grid">
        <div className="dpp-stat-card">
          <div className="dpp-stat-icon">
            <GraduationCap size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="dpp-stat-val">{enfantCourant.moyenne}</p>
            <p className="dpp-stat-lbl">Moyenne générale en cours</p>
          </div>
        </div>

        <div className="dpp-stat-card dap-stat-card--blue">
          <div className="dpp-stat-icon">
            <Clock size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="dpp-stat-val">100 %</p>
            <p className="dpp-stat-lbl">Taux d'assiduité semestrielle</p>
          </div>
        </div>

        <div className="dpp-stat-card dap-stat-card--gold">
          <div className="dpp-stat-icon">
            <DollarSign size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="dpp-stat-val">{enfantCourant.scolarite}</p>
            <p className="dpp-stat-lbl">Situation financière scolarité</p>
          </div>
        </div>

        <div className="dpp-stat-card">
          <div className="dpp-stat-icon">
            <MessageSquare size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="dpp-stat-val">0 incident</p>
            <p className="dpp-stat-lbl">Carnet de liaison & Discipline</p>
          </div>
        </div>
      </div>

      {/* ── CONTENU DES ONGLETS ── */}
      {onglet === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <div className="ap-card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} color="#006B3C" />
              Derniers résultats de {enfantCourant.nom}
            </h3>
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Discipline</th>
                  <th>Évaluation</th>
                  <th>Note</th>
                  <th>Appréciation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Mathématiques</strong></td>
                  <td>Contrôle continu 1</td>
                  <td><strong style={{ color: '#006B3C' }}>16 / 20</strong></td>
                  <td>Très bien assimilé</td>
                </tr>
                <tr>
                  <td><strong>Physique-Chimie</strong></td>
                  <td>Devoir surveillé 1</td>
                  <td><strong style={{ color: '#006B3C' }}>15 / 20</strong></td>
                  <td>Bon raisonnement</td>
                </tr>
                <tr>
                  <td><strong>Français</strong></td>
                  <td>Dissertation</td>
                  <td><strong style={{ color: '#006B3C' }}>14 / 20</strong></td>
                  <td>Bonne analyse</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="ap-card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={18} color="#006B3C" />
              État de la scolarité & Échéances
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, borderRadius: 8, background: 'var(--sg-surface-2)', border: '1px solid var(--sg-border)' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.88rem' }}>Tranche 1 (Inscription & Rentrée)</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--sg-text-muted)' }}>Échéance : 15 Septembre 2026</span>
                </div>
                <span className="ap-badge ap-badge--success">Réglé (Quittance #829)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, borderRadius: 8, background: 'var(--sg-surface-2)', border: '1px solid var(--sg-border)' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.88rem' }}>Tranche 2 (Deuxième trimestre)</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--sg-text-muted)' }}>Échéance : 10 Janvier 2027</span>
                </div>
                <span className="ap-badge ap-badge--neutral">À venir</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {onglet === 'enfants' && (
        <div className="ap-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>Liste des enfants scolarisés</h3>
          <table className="ap-table">
            <thead>
              <tr>
                <th>Nom complet</th>
                <th>Classe</th>
                <th>Matricule</th>
                <th>Assiduité</th>
                <th>Moyenne</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {enfants.map((e) => (
                <tr key={e.id}>
                  <td><strong>{e.nom}</strong></td>
                  <td>{e.classe}</td>
                  <td><span className="ap-code">{e.matricule}</span></td>
                  <td><span className="ap-badge ap-badge--success">Assidu (100%)</span></td>
                  <td><strong>{e.moyenne}</strong></td>
                  <td>
                    <button
                      type="button"
                      className="ap-btn ap-btn--ghost ap-btn--xs"
                      onClick={() => setEnfantActif(e.id)}
                    >
                      Consulter le dossier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {onglet === 'bulletins' && (
        <div className="ap-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>Bulletins scolaires officiels</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--sg-text-muted)' }}>
            Les bulletins périodiques certifiés par la direction de l'établissement seront disponibles au téléchargement dès la clôture des conseils de classe.
          </p>
        </div>
      )}

      {onglet === 'finances' && (
        <div className="ap-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>Frais de scolarité & Quittances</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--sg-text-muted)' }}>
            Toutes les quittances officielles de versement pour l'année académique 2026-2027 sont archivées avec signature électronique.
          </p>
        </div>
      )}

      {onglet === 'messages' && (
        <div className="ap-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>Liaison avec la Direction et le corps enseignant</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--sg-text-muted)' }}>
            Pour solliciter un entretien avec le professeur principal ou l'administration, utilisez le cahier de correspondance officiel.
          </p>
        </div>
      )}
    </ParentLayout>
  )
}
