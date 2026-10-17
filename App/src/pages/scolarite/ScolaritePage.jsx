import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, ArrowLeft, RefreshCw, Users, BookOpen, ArrowRightLeft } from 'lucide-react'
import { scolariteService } from '../../services/scolarite/scolarite.service'
import usePageTitle from '../../hooks/commun/usePageTitle'
import './scolarite.css'

export default function ScolaritePage() {
  usePageTitle('Gestion de la Scolarité')
  const [classes, setClasses] = useState([])
  const [apprenants, setApprenants] = useState([])
  const [activeTab, setActiveTab] = useState('classes')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedApprenant, setSelectedApprenant] = useState(null)
  const [nouvelleClasseUuid, setNouvelleClasseUuid] = useState('')
  const [motifTransfert, setMotifTransfert] = useState('')
  const [transfertLoading, setTransfertLoading] = useState(false)

  const chargerDonnees = async () => {
    setLoading(true)
    setError('')
    try {
      const [cls, apps] = await Promise.all([
        scolariteService.listerClasses(),
        scolariteService.listerApprenants(),
      ])
      setClasses(Array.isArray(cls) ? cls : [])
      setApprenants(Array.isArray(apps) ? apps : [])
    } catch (err) {
      setError(err?.message || 'Erreur lors du chargement des données.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    chargerDonnees()
  }, [])

  const handleTransfert = async (e) => {
    e.preventDefault()
    if (!selectedApprenant || !nouvelleClasseUuid) return
    setTransfertLoading(true)
    try {
      await scolariteService.transfererApprenant(selectedApprenant.uuid, nouvelleClasseUuid, motifTransfert)
      alert('Mutation enregistrée avec succès sans doublon !')
      setSelectedApprenant(null)
      setNouvelleClasseUuid('')
      setMotifTransfert('')
      await chargerDonnees()
    } catch (err) {
      alert(err?.message || 'Erreur lors du transfert.')
    } finally {
      setTransfertLoading(false)
    }
  }

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <Link to="/portail" className="module-back">
            <ArrowLeft size={16} /> Retour au portail
          </Link>
          <h1 className="module-title">
            <GraduationCap size={28} /> Scolarité & Classes
          </h1>
          <p className="module-subtitle">Gestion des cycles, classes, dossiers élèves et mutations</p>
        </div>
        <button onClick={chargerDonnees} className="module-btn-refresh" title="Actualiser">
          <RefreshCw size={18} className={loading ? 'spin' : ''} /> Actualiser
        </button>
      </div>

      {error && <div className="module-alert module-alert--error">{error}</div>}

      <div className="module-nav-tabs">
        <button
          className={`tab-btn ${activeTab === 'classes' ? 'active' : ''}`}
          onClick={() => setActiveTab('classes')}
        >
          <BookOpen size={18} /> Classes ({classes.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'apprenants' ? 'active' : ''}`}
          onClick={() => setActiveTab('apprenants')}
        >
          <Users size={18} /> Apprenants ({apprenants.length})
        </button>
      </div>

      <div className="module-card">
        {loading ? (
          <div className="module-loading">Chargement des données...</div>
        ) : activeTab === 'classes' ? (
          <div className="module-table-wrap">
            <table className="module-table">
              <thead>
                <tr>
                  <th>Nom de la classe</th>
                  <th>Cycle & Niveau</th>
                  <th>Programme</th>
                  <th>Capacité</th>
                  <th>Inscrits</th>
                  <th>Places restantes</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => {
                  const inscrits = c.inscrits_actuels ?? c.inscrits ?? 0
                  const places = Math.max(0, c.capacite - inscrits)
                  return (
                    <tr key={c.uuid ?? c.id}>
                      <td className="font-semibold">{c.nom}</td>
                      <td>{c.cycle} • {c.niveau}</td>
                      <td>
                        <span className={`prog-badge prog-badge--${c.programme}`}>
                          {c.programme === 'beninois' ? 'Béninois' : 'Français'}
                        </span>
                      </td>
                      <td>{c.capacite}</td>
                      <td>{inscrits}</td>
                      <td>
                        <span className={places === 0 ? 'text-danger font-bold' : 'text-success font-bold'}>
                          {places === 0 ? 'Complet' : `${places} place(s)`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="module-table-wrap">
            <table className="module-table">
              <thead>
                <tr>
                  <th>Apprenant</th>
                  <th>Matricule</th>
                  <th>Classe actuelle</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {apprenants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="module-empty">Aucun apprenant enregistré.</td>
                  </tr>
                ) : (
                  apprenants.map((a) => (
                    <tr key={a.uuid ?? a.id}>
                      <td>
                        <div className="font-semibold">{a.nom} {a.prenom}</div>
                      </td>
                      <td><code>{a.matricule ?? '—'}</code></td>
                      <td>{a.classe?.nom ?? a.classe_nom ?? '—'}</td>
                      <td>
                        <span className="status-pill status-pill--validee">{a.statut ?? 'actif'}</span>
                      </td>
                      <td>
                        <button
                          onClick={() => setSelectedApprenant(a)}
                          className="btn-action btn-action--success"
                        >
                          <ArrowRightLeft size={14} /> Muter
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedApprenant && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Mutation / Transfert interne</h3>
            <p className="text-sm text-muted mb-4">
              Transférer <strong>{selectedApprenant.nom} {selectedApprenant.prenom}</strong> vers une autre classe sans duplication de dossier.
            </p>
            <form onSubmit={handleTransfert}>
              <div className="form-group mb-3">
                <label className="text-xs font-semibold block mb-1">Nouvelle classe de destination :</label>
                <select
                  value={nouvelleClasseUuid}
                  onChange={(e) => setNouvelleClasseUuid(e.target.value)}
                  required
                  className="form-control"
                >
                  <option value="">-- Choisir une classe --</option>
                  {classes
                    .filter((c) => c.uuid !== selectedApprenant.classe?.uuid)
                    .map((c) => (
                      <option key={c.uuid} value={c.uuid}>
                        {c.nom} ({c.capacite - (c.inscrits_actuels ?? c.inscrits ?? 0)} places libres)
                      </option>
                    ))}
                </select>
              </div>
              <div className="form-group mb-4">
                <label className="text-xs font-semibold block mb-1">Motif du transfert :</label>
                <input
                  type="text"
                  placeholder="Ex : Changement de série, demande des parents..."
                  value={motifTransfert}
                  onChange={(e) => setMotifTransfert(e.target.value)}
                  className="form-control"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setSelectedApprenant(null)}
                  className="btn-modal btn-modal--cancel"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={transfertLoading}
                  className="btn-modal btn-modal--submit"
                >
                  {transfertLoading ? 'En cours...' : 'Confirmer la mutation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
