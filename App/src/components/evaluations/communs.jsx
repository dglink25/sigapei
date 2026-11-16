/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useRef, useState } from 'react'
import Loader from '../commun/Loader'

/** Champ de formulaire : libellé, astérisque si obligatoire, aide et erreur reliées au champ (accessibilité). */
export function Champ({ id, label, requis = false, erreur, aide, children }) {
  return (
    <div className={`ap-field${erreur ? ' has-error' : ''}`}>
      <label className="ap-label" htmlFor={id}>
        {label}
        {requis && <em aria-hidden="true">*</em>}
      </label>
      {children}
      {aide && !erreur && <p className="ap-hint" id={`${id}-aide`}>{aide}</p>}
      {erreur && <p className="ap-error" id={`${id}-erreur`} role="alert">{erreur}</p>}
    </div>
  )
}

/** Propriétés ARIA d'un champ selon son état. */
export const aria = (id, erreur, aide) => ({
  id,
  'aria-invalid': erreur ? true : undefined,
  'aria-describedby': erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined,
})

export function Chargement({ label = 'Chargement…' }) {
  return (
    <div className="ap-card" style={{ padding: '2.5rem', display: 'flex', justifyContent: 'center' }}>
      <Loader mode="inline" label={label} />
    </div>
  )
}

export function EtatVide({ icone: Icone, titre, texte, children }) {
  return (
    <div className="ap-card ev-etat" role="status">
      {Icone && <Icone size={36} aria-hidden="true" />}
      {titre && <h3>{titre}</h3>}
      {texte && <p>{texte}</p>}
      {children}
    </div>
  )
}

export function Badge({ ton = 'neutral', children }) {
  return <span className={`ap-badge ap-badge--${ton}`}>{children}</span>
}

/** Erreurs de validation renvoyées par le service ({ error: { details: { champ: [msg] } } }) -> { champ: msg }. */
export function erreursChamps(err) {
  const details = err?.details?.error?.details
  if (!details || typeof details !== 'object') return {}
  return Object.fromEntries(Object.entries(details).map(([k, v]) => [k, Array.isArray(v) ? String(v[0]) : String(v)]))
}

/**
 * Chargement d'une donnée distante : ignore les réponses obsolètes (changement rapide de filtre),
 * expose recharger() ; `actif` à false n'appelle rien (filtres incomplets). `deps` : valeurs simples.
 */
export function useDonnees(charger, deps, { actif = true, initial = null, onErreur } = {}) {
  const [etat, setEtat] = useState({ donnees: initial, chargement: actif, erreur: null })
  const [demande, setDemande] = useState(0)
  const chargerRef = useRef(charger)
  const erreurRef = useRef(onErreur)
  const initialRef = useRef(initial)
  const cle = JSON.stringify(deps)

  useEffect(() => {
    chargerRef.current = charger
    erreurRef.current = onErreur
  })

  useEffect(() => {
    if (!actif) {
       
      setEtat({ donnees: initialRef.current, chargement: false, erreur: null })
      return undefined
    }
    let obsolete = false
    setEtat((e) => ({ ...e, chargement: true, erreur: null }))
    chargerRef.current()
      .then((d) => { if (!obsolete) setEtat({ donnees: d, chargement: false, erreur: null }) })
      .catch((err) => {
        if (obsolete) return
        setEtat({ donnees: initialRef.current, chargement: false, erreur: err })
        erreurRef.current?.(err)
      })
    return () => { obsolete = true }
  }, [actif, cle, demande])

  const recharger = useCallback(() => setDemande((n) => n + 1), [])
  return { ...etat, recharger }
}

/** Tri stable par nom puis prénom (ordre alphabétique français). */
export const trierParNom = (liste) =>
  [...liste].sort((a, b) =>
    `${a.nom ?? ''} ${a.prenom ?? ''}`.localeCompare(`${b.nom ?? ''} ${b.prenom ?? ''}`, 'fr', { sensitivity: 'base' }))
