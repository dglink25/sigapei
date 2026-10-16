import { useEffect, useState } from 'react'

/** Valeur "retardee" : evite un appel API a chaque frappe dans un champ de recherche. */
export function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}
