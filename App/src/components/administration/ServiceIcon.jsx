import { iconePourCode } from '../../config/services/config'
import './admin-ui.css'

/** Pastille d'icône d'un service, déduite de son code (icônes lucide uniquement). */
export default function ServiceIcon({ code, size = 20, large = false }) {
  const Icon = iconePourCode(code)
  return (
    <span className={`ap-tile${large ? ' ap-tile--lg' : ''}`} aria-hidden="true">
      {/* eslint-disable-next-line react-hooks/static-components */}
      <Icon size={large ? 26 : size} />
    </span>
  )
}
