/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useRef, useState } from 'react'
import { CircleCheck, Info } from 'lucide-react'
import './admin-ui.css'

/** Retour inline éphémère : pour les actions fréquentes, sans alourdir la file de modales. */
export function useFlash(duree = 3500) {
  const [flash, setFlash] = useState(null)
  const timer = useRef(null)
  const show = useCallback(
    (message, tone = 'success') => {
      clearTimeout(timer.current)
      setFlash({ message, tone, id: Date.now() })
      timer.current = setTimeout(() => setFlash(null), duree)
    },
    [duree],
  )
  useEffect(() => () => clearTimeout(timer.current), [])
  return [flash, show]
}

export function Flash({ flash }) {
  const Icone = flash?.tone === 'info' ? Info : CircleCheck
  return (
    <div role="status" aria-live="polite">
      {flash && (
        <p key={flash.id} className={`ap-flash ap-flash--${flash.tone}`}>
          <Icone size={16} aria-hidden="true" />
          {flash.message}
        </p>
      )}
    </div>
  )
}
