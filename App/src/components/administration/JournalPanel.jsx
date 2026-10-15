import { useCallback, useEffect, useState } from 'react'
import { Clock, Plus, Power, RotateCcw, Trash2, Users } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { servicesAcces } from '../../services/identite/servicesAcces.service'
import Pagination from './Pagination'
import { SkeletonList } from './Skeleton'
import './admin-ui.css'

const ICONES = {
  'etablissement_service.assigne': [Plus, 'success'],
  'etablissement_service.retire': [Trash2, 'danger'],
  'etablissement_service.bloque': [Power, 'danger'],
  'etablissement_service.reactive': [RotateCcw, 'success'],
  'acces.modifie': [Users, 'info'],
}

const t = (...parts) => parts.filter(Boolean).join(' ')
const dateHeure = (iso) => (iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '-')

/** Traduit un événement du journal en phrase lisible. */
function decrire(e) {
  const etab = e.etablissement?.nom ?? 'un établissement'
  const d = e.details ?? {}
  const svc = e.serviceNom ? `« ${e.serviceNom} »` : ''
  switch (e.action) {
    case 'etablissement_service.assigne': {
      const n = d.services?.length ?? 1
      return { titre: n > 1 ? `${n} services assignés à ${etab}` : t('Service', svc, 'assigné à', etab), detail: null }
    }
    case 'etablissement_service.retire':
      return {
        titre: t('Service', svc, 'retiré de', etab),
        detail: d.droitsSupprimes ? `${d.droitsSupprimes} droit(s) utilisateur supprimé(s)` : null,
      }
    case 'etablissement_service.bloque':
      return { titre: t('Service', svc, 'bloqué pour', etab), detail: d.motif ? `Motif : ${d.motif}` : null }
    case 'etablissement_service.reactive':
      return { titre: t('Service', svc, 'réactivé pour', etab), detail: null }
    case 'acces.modifie': {
      const a = d.accordes?.length ?? 0
      const r = d.revoques?.length ?? 0
      return {
        titre: t('Droits modifiés sur le service', svc, `(${etab})`),
        detail: [a > 0 && `${a} accordé(s)`, r > 0 && `${r} révoqué(s)`].filter(Boolean).join(' · ') || null,
      }
    }
    default:
      return { titre: e.action, detail: null }
  }
}

/** Historique des assignations et des changements de droits (lecture seule, paginé). */
export default function JournalPanel({ etablissementUuid, serviceUuid }) {
  const notify = useNotify()
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)

  const charger = useCallback(async () => {
    try {
      setData(await servicesAcces.journal({ page, limite: 15, etablissementUuid, serviceUuid }))
    } catch (err) {
      notify.fromError(err)
      setData((p) => p ?? { evenements: [], pagination: null })
    }
  }, [page, etablissementUuid, serviceUuid, notify])

  useEffect(() => {
    charger()
  }, [charger])

  if (data === null) return <SkeletonList rows={4} />
  if (data.evenements.length === 0) {
    return (
      <div className="ap-empty">
        <Clock size={34} aria-hidden="true" />
        <p>Aucun événement enregistré pour le moment.</p>
      </div>
    )
  }

  return (
    <>
      <ul className="sv-events">
        {data.evenements.map((e, i) => {
          const [Icone, ton] = ICONES[e.action] ?? [Clock, 'info']
          const { titre, detail } = decrire(e)
          return (
            <li key={`${e.createdAt}-${i}`} className="sv-event" style={{ '--i': i }}>
              <span className={`sv-event-ico sv-event-ico--${ton}`} aria-hidden="true"><Icone size={16} /></span>
              <div>
                <strong>{titre}</strong>
                {detail && <small>{detail}</small>}
                <small>{e.acteur?.nomComplet ?? 'Système'} · {dateHeure(e.createdAt)}</small>
              </div>
            </li>
          )
        })}
      </ul>
      <Pagination pagination={data.pagination} onPage={setPage} unite="événement" />
    </>
  )
}
