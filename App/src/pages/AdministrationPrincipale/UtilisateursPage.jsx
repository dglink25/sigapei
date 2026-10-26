import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Search, Users, Filter } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import Loader from '../../components/commun/Loader'
import { utilisateursService } from '../../services/identite/utilisateurs.service'
import './admin.css'

const STATUT_BADGE = { actif:'ap-badge--success', bloque:'ap-badge--warning', archive:'ap-badge--neutral' }
const STATUT_LABEL = { actif:'Actif', bloqué:'Bloqué', archive:'Archivé' }

const ANNEES = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i))

export default function UtilisateursPage() {
  const notify = useNotify()

  const [utilisateurs, setUtilisateurs] = useState(null)
  const [roles,        setRoles]        = useState([])
  const [pagination,   setPagination]   = useState(null)
  const [charge,       setCharge]       = useState(false)

  // Filtres
  const [q,                setQ]                = useState('')
  const [nomEtablissement, setNomEtablissement] = useState('')
  const [roleCode,         setRoleCode]         = useState('')
  const [annee,            setAnnee]            = useState('')
  const [page,             setPage]             = useState(1)
  const LIMITE = 25

  const charger = useCallback(async (resetPage = false) => {
    const p = resetPage ? 1 : page
    if (resetPage) setPage(1)
    setCharge(true)
    try {
      const params = {
        q:                q || undefined,
        nomEtablissement: nomEtablissement || undefined,
        roleCode:         roleCode || undefined,
        annee:            annee || undefined,
        page:             p,
        limite:           LIMITE,
      }
      const [rU, rR] = await Promise.all([
        utilisateursService.lister(params),
        utilisateursService.listerRoles(),
      ])
      setUtilisateurs(rU?.data?.utilisateurs ?? rU?.utilisateurs ?? [])
      setPagination(rU?.data?.pagination ?? rU?.pagination ?? null)
      setRoles(rR?.data?.roles ?? rR?.roles ?? [])
    } catch (err) {
      notify.fromError(err)
      setUtilisateurs([])
    } finally {
      setCharge(false)
    }
  }, [q, nomEtablissement, roleCode, annee, page, notify])

  useEffect(() => { charger() }, [page]) // eslint-disable-line
  // Rechargement sur changement de filtre (reset page)
  useEffect(() => { charger(true) }, [q, nomEtablissement, roleCode, annee]) // eslint-disable-line

  const fmt = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }) : '-'

  return (
    <div className="ap">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Utilisateurs</h2>          
        </div>
        <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => charger(true)} disabled={charge}>
          <RefreshCw size={14} className={charge ? 'ap-spin' : ''} /> Actualiser
        </button>
      </div>

      {/* Filtres */}
      <div className="ap-card" style={{ marginBottom: 16, padding:'14px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12, fontSize:'0.78rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ap-muted)' }}>
          <Filter size={13} /> Filtres
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:10 }}>
          {/* Recherche libre */}
          <div className="ap-search">
            <Search size={15} />
            <input className="ap-input" placeholder="Nom, e-mail, téléphone, matricule…"
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {/* Établissement */}
          <div className="ap-search">
            <Search size={15} />
            <input className="ap-input" placeholder="Nom d'établissement…"
              value={nomEtablissement} onChange={(e) => setNomEtablissement(e.target.value)} />
          </div>
          {/* Rôle */}
          <select className="ap-input" value={roleCode} onChange={(e) => setRoleCode(e.target.value)}>
            <option value="">Tous les rôles</option>
            {roles.map((r) => <option key={r.uuid} value={r.code}>{r.libelle} ({r.code})</option>)}
          </select>
          {/* Année */}
          <select className="ap-input" value={annee} onChange={(e) => setAnnee(e.target.value)}>
            <option value="">Toutes les années</option>
            {ANNEES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {(q || nomEtablissement || roleCode || annee) && (
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" style={{ marginTop:10 }}
            onClick={() => { setQ(''); setNomEtablissement(''); setRoleCode(''); setAnnee('') }}>
            Effacer les filtres
          </button>
        )}
      </div>

      {/* Compteur */}
      {pagination && (
        <p style={{ marginBottom:10, fontSize:'0.82rem', color:'var(--ap-muted)' }}>
          {pagination.total} utilisateur{pagination.total > 1 ? 's' : ''} -
          page {pagination.page} / {pagination.pages}
        </p>
      )}

      {utilisateurs === null || charge ? (
        <Loader mode="inline" label="Chargement des utilisateurs…" />
      ) : utilisateurs.length === 0 ? (
        <div className="ap-card ap-empty">
          <Users size={36} aria-hidden="true" />
          <p>Aucun utilisateur pour ces critères.</p>
        </div>
      ) : (
        <>
          <div className="ap-card ap-card--flush">
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Établissement</th>
                    <th>Rôle</th>
                    <th>Contacts</th>
                    <th>Matricule</th>
                    <th>Statut</th>
                    <th>Créé le</th>
                  </tr>
                </thead>
                <tbody>
                  {utilisateurs.map((u) => (
                    <tr key={u.uuid} style={{ cursor:'default' }}>
                      <td>
                        <strong>{u.nomComplet}</strong>
                        <small style={{ display:'block', fontFamily:'monospace', fontSize:'0.72rem', color:'var(--ap-muted)' }}>
                          {u.uuid.slice(0,8)}…
                        </small>
                      </td>
                      <td>
                        {u.etablissementNom
                          ? <>
                              <strong style={{ fontSize:'0.88rem' }}>{u.etablissementNom}</strong>
                              {u.etablissementSlug && <small>{u.etablissementSlug}</small>}
                            </>
                          : <span style={{ color:'var(--ap-muted)', fontStyle:'italic', fontSize:'0.82rem' }}>
                              {u.roleCode === 'super_admin' ? 'Plateforme' : '-'}
                            </span>
                        }
                      </td>
                      <td>
                        <span className="ap-badge ap-badge--info">{u.roleCode}</span>
                      </td>
                      <td>
                        {u.email && <div style={{ fontSize:'0.82rem' }}>{u.email}</div>}
                        {u.telephone && <div style={{ fontSize:'0.82rem', color:'var(--ap-muted)' }}>{u.telephone}</div>}
                      </td>
                      <td>
                        {u.matricule
                          ? <span className="ap-code">{u.matricule}</span>
                          : <span style={{ color:'var(--ap-muted)' }}>-</span>}
                      </td>
                      <td>
                        <span className={`ap-badge ${STATUT_BADGE[u.statut] ?? 'ap-badge--neutral'}`}>
                          {STATUT_LABEL[u.statut] ?? u.statut}
                        </span>
                      </td>
                      <td style={{ whiteSpace:'nowrap', fontSize:'0.82rem' }}>
                        {fmt(u.dateCreation)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="ap-pager">
              <span>{pagination.total} résultat{pagination.total > 1 ? 's' : ''}</span>
              <div className="ap-pager-nav">
                <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm"
                  disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Précédent
                </button>
                <span style={{ fontSize:'0.85rem', color:'var(--ap-muted)' }}>
                  {page} / {pagination.pages}
                </span>
                <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm"
                  disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
