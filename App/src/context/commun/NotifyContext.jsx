import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import NoticeModal from '../../components/commun/NoticeModal'
import { toNotice } from '../../lib/commun/errors'

const NotifyContext = createContext(null)
export const NOTICE_DURATION = 3000 // 3 secondes

export function NotifyProvider({ children }) {
  const [queue, setQueue] = useState([])
  const [current, setCurrent] = useState(null)
  const seq = useRef(0)
  const last = useRef({ key: '', at: 0 })

  const push = useCallback((type, title, message = '') => {
    const key = `${type}|${title}|${message}`
    const now = Date.now()
    if (last.current.key === key && now - last.current.at < 1000) return // anti-doublon
    last.current = { key, at: now }
    setQueue((q) => [...q, { id: ++seq.current, type, title, message }])
  }, [])

  // File d'attente : un seul modal a la fois, chacun visible 3 s
  useEffect(() => {
    if (!current && queue.length) {
      setCurrent(queue[0])
      setQueue((q) => q.slice(1))
    }
  }, [current, queue])

  const close = useCallback(() => setCurrent(null), [])

  const api = useMemo(
    () => ({
      success: (t, m) => push('success', t, m),
      error: (t, m) => push('error', t, m),
      warning: (t, m) => push('warning', t, m),
      info: (t, m) => push('info', t, m),
      /** Affiche proprement n'importe quelle erreur (API, WebAuthn, Firebase...). */
      fromError: (err) => {
        const n = toNotice(err)
        if (n) push('error', n.title, n.message)
      },
    }),
    [push],
  )

  return (
    <NotifyContext.Provider value={api}>
      {children}
      {current && <NoticeModal key={current.id} {...current} duration={NOTICE_DURATION} onClose={close} />}
    </NotifyContext.Provider>
  )
}

export function useNotify() {
  const ctx = useContext(NotifyContext)
  if (!ctx) throw new Error('useNotify doit etre utilise dans <NotifyProvider>')
  return ctx
}
