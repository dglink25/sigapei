import { useState } from 'react'
import {
  Briefcase, FileCheck, DollarSign, Clock,
  RefreshCw, CheckCircle2, AlertCircle, FileText, Calendar,
} from 'lucide-react'
import { useAuth } from '../../context/identite/AuthContext'
import usePageTitle from '../../hooks/commun/usePageTitle'
import PrestataireLayout from '../../components/prestataires/PrestataireLayout'
import './DashboardPrestatairePage.css'

export default function DashboardPrestatairePage() {
  usePageTitle('Tableau de bord - Prestataire')
  const { user } = useAuth()
  const [onglet, setOnglet] = useState('dashboard')
  const [rafraichit, setRafraichit] = useState(false)

  const nom = user?.nomComplet ?? user?.nom_complet ?? user?.nom ?? 'Fournisseur / Prestataire'
  const entreprise = user?.organisation ?? user?.entreprise ?? 'Entreprise Partenaire'

  const actualiser = () => {
    setRafraichit(true)
    setTimeout(() => {
      setRafraichit(false)
    }, 450)
  }

  return (
    <PrestataireLayout ongletActif={onglet} onChangerOnglet={setOnglet}>
      {/* ── BANDEAU ACCUEIL INSTITUTIONNEL ── */}
      <section className="dpr-welcome">
        <div className="dpr-welcome-info">
          <h2>Espace Prestataire : {nom}</h2>
          <div className="dpr-welcome-meta">
            <span>Raison sociale : <strong>{entreprise}</strong></span>
            <span>•</span>
            <span style={{ background: 'rgba(233,170,32,0.25)', border: '1px solid #E9AA20', padding: '2px 8px', borderRadius: 999 }}>
              Fournisseur Agréé
            </span>
            <span>•</span>
            <span>Exercice 2026-2027</span>
          </div>
        </div>
        <div className="dpr-welcome-actions">
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

      {/* ── KPI STATISTIQUES ── */}
      <div className="dpr-stats-grid">
        <div className="dpr-stat-card">
          <div className="dpr-stat-icon">
            <Briefcase size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="dpr-stat-val">3 contrats</p>
            <p className="dpr-stat-lbl">Missions et contrats actifs</p>
          </div>
        </div>

        <div className="dpr-stat-card dap-stat-card--gold">
          <div className="dpr-stat-icon">
            <FileCheck size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="dpr-stat-val">5 bons</p>
            <p className="dpr-stat-lbl">Bons de commande engagés</p>
          </div>
        </div>

        <div className="dpr-stat-card dap-stat-card--blue">
          <div className="dpr-stat-icon">
            <DollarSign size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="dpr-stat-val">2 factures</p>
            <p className="dpr-stat-lbl">En cours de liquidation</p>
          </div>
        </div>

        <div className="dpr-stat-card">
          <div className="dpr-stat-icon">
            <CheckCircle2 size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="dpr-stat-val">100 %</p>
            <p className="dpr-stat-lbl">Conformité administrative</p>
          </div>
        </div>
      </div>

      {/* ── CONTENU DES ONGLETS ── */}
      {onglet === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <div className="ap-card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="#006B3C" />
              Prochaines interventions programmées
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 8, background: 'var(--sg-surface-2)', border: '1px solid var(--sg-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.88rem' }}>Maintenance du parc informatique</strong>
                  <span className="ap-badge ap-badge--info">05 Novembre 2026</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--sg-text-muted)' }}>
                  Salles multimédias et serveurs de l'établissement • Bâtiment Administratif
                </p>
              </div>

              <div style={{ padding: 12, borderRadius: 8, background: 'var(--sg-surface-2)', border: '1px solid var(--sg-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.88rem' }}>Livraison de consommables et fournitures</strong>
                  <span className="ap-badge ap-badge--neutral">12 Novembre 2026</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--sg-text-muted)' }}>
                  Bordereau de livraison #BL-2026-441 • Direction du matériel
                </p>
              </div>
            </div>
          </div>

          <div className="ap-card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={18} color="#006B3C" />
              Facturation et règlements récents
            </h3>
            <table className="ap-table">
              <thead>
                <tr>
                  <th>N° Facture</th>
                  <th>Prestation</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="ap-code">FAC-2026-089</span></td>
                  <td>Entretien réseau T3</td>
                  <td><strong>450 000 FCFA</strong></td>
                  <td><span className="ap-badge ap-badge--success">Payé</span></td>
                </tr>
                <tr>
                  <td><span className="ap-code">FAC-2026-104</span></td>
                  <td>Support applicatif</td>
                  <td><strong>300 000 FCFA</strong></td>
                  <td><span className="ap-badge ap-badge--info">En traitement</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {onglet === 'missions' && (
        <div className="ap-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>Cahier des charges & Missions assignées</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--sg-text-muted)' }}>
            Consultez le périmètre technique et les clauses d'exécution des missions en cours pour l'établissement.
          </p>
        </div>
      )}

      {onglet === 'commandes' && (
        <div className="ap-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>Bons de commande signés</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--sg-text-muted)' }}>
            Retrouvez tous les bons de commande officiels émis et validés par l'ordonnateur de l'établissement.
          </p>
        </div>
      )}

      {onglet === 'factures' && (
        <div className="ap-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>État de liquidation des factures</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--sg-text-muted)' }}>
            Suivi en temps réel de la validation financière et des avis de virement bancaire.
          </p>
        </div>
      )}

      {onglet === 'documents' && (
        <div className="ap-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>Documents administratifs et convention</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--sg-text-muted)' }}>
            Contrats-cadres, accords de confidentialité et attestations de régularité fiscale.
          </p>
        </div>
      )}
    </PrestataireLayout>
  )
}
