import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { UserCheck, Clock, CheckCircle, XCircle, Search, ArrowLeft, RefreshCw } from 'lucide-react'
import { inscriptionService } from '../../services/inscription/inscription.service'
import usePageTitle from '../../hooks/commun/usePageTitle'
import './inscription.css'

export default function InscriptionPage() {
  usePageTitle('Gestion des Inscriptions')
  const [candidatures, setCandidatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('tous')
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const chargerCandidatures = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await inscriptionService.listerCandidatures()
      setCandidatures(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Erreur lors du chargement des candidatures.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    chargerCandidatures()
  }, [])

  const handleValider = async (uuid) => {
    if (!window.confirm('Confirmer la validation de cette candidature ?')) return
    setActionLoading(uuid)
    try {
      await inscriptionService.validerCandidature(uuid)
      await chargerCandidatures()
    } catch (err) {
      alert(err?.message || 'Erreur lors de la validation.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejeter = async (uuid) => {
    const motif = window.prompt('Veuillez saisir le motif du rejet :')
    if (!motif) return
    setActionLoading(uuid)
    try {
      await inscriptionService.rejeterCandidature(uuid, motif)
      await chargerCandidatures()
    } catch (err) {
      alert(err?.message || 'Erreur lors du rejet.')
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = candidatures.filter((c) => {
    const matchFilter = filter === 'tous' || c.statut === filter
    const matchSearch =
      searchTerm === '' ||
      `${c.nom ?? ''} ${c.prenom ?? ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.uuid ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <Link to="/portail" className="module-back">
            <ArrowLeft size={16} /> Retour au portail
          </Link>
          <h1 className="module-title">
            <UserCheck size={28} /> Inscription & Admissions
          </h1>
          <p className="module-subtitle">Gestion des dossiers de candidature et validation des admissions</p>
        </div>
        <button onClick={chargerCandidatures} className="module-btn-refresh" title="Actualiser">
          <RefreshCw size={18} className={loading ? 'spin' : ''} /> Actualiser
        </button>
      </div>

      {error && <div className="module-alert module-alert--error">{error}</div>}

      <div className="module-toolbar">
        <div className="module-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom ou UUID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="module-filters">
          {['tous', 'soumise', 'validee', 'rejetee'].map((st) => (
            <button
              key={st}
              className={`module-filter-btn ${filter === st ? 'active' : ''}`}
              onClick={() => setFilter(st)}
            >
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="module-card">
        {loading ? (
          <div className="module-loading">Chargement des candidatures...</div>
        ) : filtered.length === 0 ? (
          <div className="module-empty">Aucune candidature trouvée.</div>
        ) : (
          <div className="module-table-wrap">
            <table className="module-table">
              <thead>
                <tr>
                  <th>Candidat</th>
                  <th>Classe visée</th>
                  <th>Contact parent</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.uuid ?? c.id}>
                    <td>
                      <div className="font-semibold">{c.nom} {c.prenom}</div>
                      <div className="text-xs text-muted">{c.sexe === 'M' ? 'Masculin' : 'Féminin'} • Né(e) le {c.date_naissance}</div>
                    </td>
                    <td>{c.classe_visee?.nom ?? c.classe_nom ?? c.classe_visee_id ?? 'Non assignée'}</td>
                    <td>
                      <div>{c.parent_nom ?? c.nom_parent ?? '-'}</div>
                      <div className="text-xs text-muted">{c.parent_telephone ?? c.telephone_parent ?? '-'}</div>
                    </td>
                    <td>
                      <span className={`status-pill status-pill--${c.statut}`}>
                        {c.statut}
                      </span>
                    </td>
                    <td>
                      {c.statut === 'soumise' || c.statut === 'en_attente' ? (
                        <div className="module-actions">
                          <button
                            onClick={() => handleValider(c.uuid)}
                            disabled={actionLoading === c.uuid}
                            className="btn-action btn-action--success"
                            title="Valider l'admission"
                          >
                            <CheckCircle size={16} /> Valider
                          </button>
                          <button
                            onClick={() => handleRejeter(c.uuid)}
                            disabled={actionLoading === c.uuid}
                            className="btn-action btn-action--danger"
                            title="Rejeter"
                          >
                            <XCircle size={16} /> Rejeter
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">Traitée</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
