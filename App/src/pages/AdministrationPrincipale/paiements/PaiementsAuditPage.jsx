/**
 * Page : Journal d'audit paiements (super admin)
 * Route : /admin/paiements/audit
 *
 * Journal d'audit chaîné SHA-256 - toutes les opérations de paiement.
 * Le super admin peut filtrer par établissement, action, résultat, période.
 * Chaque ligne montre le hash SHA-256 pour prouver l'intégrité de la chaîne.
 */
import { useCallback, useEffect, useState, useMemo } from 'react'
import { RefreshCw, Search, Shield, ShieldCheck, ShieldAlert } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import Pagination from '../../../components/administration/Pagination'
import { SkeletonList } from '../../../components/administration/Skeleton'
import { paiementAdminService } from '../../../services/paiements/paiement.service'
import '../admin.css'
import './paiements.css'

const RESULTAT_TONE = {
  succes: 'success',
  echec: 'danger',
  refus: 'warning',
}

function ResultatBadge({ resultat }) {
  const tone = RESULTAT_TONE[resultat] ?? 'neutral'
  return <span className={`ap-badge ap-badge--${tone}`}>{resultat}</span>
}

export default function PaiementsAuditPage() {
  const notify = useNotify()
  const [items, setItems] = useState(null)
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)

  /* Filtres */
  const [q, setQ] = useState('')
  const [resultat, setResultat] = useState('')
  const [du, setDu] = useState('')
  const [au, setAu] = useState('')
  const [etablissementUuid, setEtablissementUuid] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await paiementAdminService.audit({
        page,
        limite: 25,
        action: q || undefined,
        resultat: resultat || undefined,
        du: du || undefined,
        au: au || undefined,
        etablissementUuid: etablissementUuid || undefined,
      })
      setItems(r?.evenements ?? [])
      setPagination(r?.pagination ?? null)
    } catch (err) {
      notify.fromError(err)
      setItems(p => p ?? [])
    } finally {
      setLoading(false)
    }
  }, [page, q, resultat, du, au, etablissementUuid, notify])

  useEffect(() => { load() }, [load])

  const dateFr = (iso) => iso
    ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' })
    : '-'

  return (
    <div className="ap">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Journal d'audit - Paiements</h2>
          <p className="ap-page-sub">Toutes les opérations de paiement, chaînées par empreinte SHA-256</p>
        </div>
        <button type="button" className="ap-btn ap-btn--ghost" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'ap-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* Rappel sécurité */}
      <div className="pay-alert pay-alert--info">
        <ShieldCheck size={16} />
        <span>
          Le journal est en <strong>ajout seul</strong> - aucune ligne ne peut être modifiée ni supprimée.
          Chaque événement est chaîné par son empreinte SHA-256 au précédent.
        </span>
      </div>

      {/* Filtres */}
      <div className="pay-audit-filters">
        <div className="etab-search">
          <Search size={15} />
          <input type="search" placeholder="Filtrer par action…" value={q} onChange={e => { setQ(e.target.value); setPage(1) }} aria-label="Filtrer action" />
        </div>
        <select value={resultat} onChange={e => { setResultat(e.target.value); setPage(1) }} className="ap-input pay-audit-select">
          <option value="">Tous résultats</option>
          <option value="succes">Succès</option>
          <option value="echec">Échec</option>
          <option value="refus">Refus</option>
        </select>
        <input type="date" value={du} onChange={e => { setDu(e.target.value); setPage(1) }} className="ap-input pay-audit-date" aria-label="Depuis" />
        <input type="date" value={au} onChange={e => { setAu(e.target.value); setPage(1) }} className="ap-input pay-audit-date" aria-label="Jusqu'au" />
        <input type="text" value={etablissementUuid} onChange={e => { setEtablissementUuid(e.target.value.trim()); setPage(1) }}
          className="ap-input" placeholder="UUID établissement" aria-label="UUID établissement"
          style={{ width: 220, fontSize: '0.82rem', fontFamily: 'monospace' }} />
      </div>

      {/* Tableau */}
      <div className="ap-card ap-card--flush">
        {items === null ? <SkeletonList rows={8} /> : items.length === 0 ? (
          <div className="ap-empty">
            <Shield size={36} />
            <p>Aucun événement ne correspond à vos filtres.</p>
          </div>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table pay-audit-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Objet</th>
                  <th>Acteur</th>
                  <th>Résultat</th>
                  <th>Établissement</th>
                  <th>Hash (8 premiers)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((evt, i) => (
                  <tr key={evt.uuid ?? i}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--ap-muted)', fontSize: '0.78rem' }}>
                      {evt.rang ?? '-'}
                    </td>
                    <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{dateFr(evt.created_at)}</td>
                    <td>
                      <span className="ap-code" style={{ fontSize: '0.78rem' }}>{evt.action}</span>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {evt.objet_type && <><strong>{evt.objet_type}</strong><br /></>}
                      {evt.objet_uuid && <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--ap-muted)' }}>{evt.objet_uuid.slice(0, 8)}…</span>}
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {evt.acteur_role && <><span className="ap-badge ap-badge--neutral" style={{ fontSize: '0.72rem' }}>{evt.acteur_role}</span><br /></>}
                      {evt.acteur_uuid && <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--ap-muted)' }}>{evt.acteur_uuid.slice(0, 8)}…</span>}
                    </td>
                    <td><ResultatBadge resultat={evt.resultat} /></td>
                    <td style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--ap-muted)' }}>
                      {evt.etablissement_uuid ? evt.etablissement_uuid.slice(0, 8) + '…' : <em>Plateforme</em>}
                    </td>
                    <td>
                      {evt.hash ? (
                        <span className="pay-hash" title={evt.hash}>
                          <ShieldCheck size={12} style={{ color: 'var(--ap-green)', marginRight: 4 }} />
                          {evt.hash.slice(0, 8)}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination && pagination.pages > 1 && (
        <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onChange={setPage} />
      )}
    </div>
  )
}
