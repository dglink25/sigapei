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

/** « 12.50 » -> « 12,5 » ; valeur absente -> « - ». */
export const formatNombre = (v) => {
  if (v === null || v === undefined || v === '') return '-'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

export const formatDate = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const nomComplet = (a) => [a?.nom, a?.prenom].filter(Boolean).join(' ') || a?.matricule || '-'


/** Montant saisi (« 150 000 ») -> 150000 ; NaN si la saisie n'est pas un nombre. */
export const entier = (v) => Number(String(v ?? '').replace(/[\s\u202f\u00a0]/g, ''))

/** Montant entier en unités de la devise : 150000 -> « 150 000 FCFA ». */
export const formatMontant = (v, devise = 'XOF') => {
  if (v === null || v === undefined || v === '') return '-'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  const unite = { XOF: 'FCFA', XAF: 'FCFA', GNF: 'GNF' }[devise] ?? devise
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }).replace(/\u202f|\u00a0/g, ' ')} ${unite}`
}

export const formatDateHeure = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/**
 * Téléchargement par lien signé et court délivré par le service (chemin relatif « /v1/... ») :
 * le fichier est récupéré par le navigateur, sans jeton, et ne transite pas par la mémoire de la page.
 */
export function ouvrirLienSigne(base, chemin) {
  if (typeof chemin !== 'string' || !chemin.startsWith('/v1/')) throw new Error('Lien de téléchargement invalide.')
  const a = document.createElement('a')
  a.href = `${base}${chemin}`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
