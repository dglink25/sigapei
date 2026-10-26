import { validateChamps } from './form'

/**
 * Edition du profil par l'administrateur de l'etablissement.
 * Modifiables : types, adresse, localisation (hierarchie complete), GPS. Le logo est envoye a part.
 */

const NIVEAUX = ['pays', 'departement', 'commune', 'arrondissement']
const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v))

/** Profil renvoye par GET /interne/mon-etablissement -> etat du formulaire (meme forme que la demande, pour GeoSelects). */
export function profilVersForm(p = {}) {
  const loc = p.localisation ?? {}
  const geo = p.geolocalisation ?? {}
  return {
    types: [...(p.types ?? [])],
    adresse_complete: p.adresseComplete ?? '',
    pays: loc.pays?.uuid ?? '',
    departement: loc.departement?.uuid ?? '',
    commune: loc.commune?.uuid ?? '',
    arrondissement: loc.arrondissement?.uuid ?? '',
    localisation_libre: { departement: '', commune: '', arrondissement: '' },
    geo_labels: {
      pays: loc.pays?.nom ?? '',
      departement: loc.departement?.nom ?? '',
      commune: loc.commune?.nom ?? '',
      arrondissement: loc.arrondissement?.nom ?? '',
    },
    geo_counts: { departement: 0, commune: 0, arrondissement: 0 },
    latitude: geo.latitude != null ? String(geo.latitude) : '',
    longitude: geo.longitude != null ? String(geo.longitude) : '',
  }
}

const typesChanges = (a, b) => [...a.types].sort().join('|') !== [...b.types].sort().join('|')
const adresseChangee = (a, b) => a.adresse_complete.trim() !== b.adresse_complete.trim()
const localisationChangee = (a, b) => NIVEAUX.some((n) => (a[n] || '') !== (b[n] || ''))
const gpsChange = (a, b) => {
  const [la, lo] = [num(b.latitude), num(b.longitude)]
  if (Number.isNaN(la) || Number.isNaN(lo)) return false // rien a envoyer (le serveur ne permet pas d'effacer le GPS)
  return la !== num(a.latitude) || lo !== num(a.longitude)
}

/** Types retires par rapport a l'etat initial (leurs cycles seront desactives). */
export const typesRetires = (initial, form) => initial.types.filter((t) => !form.types.includes(t))

/** Corps du PATCH : uniquement ce qui a change. */
export function diffPayload(initial, form) {
  const payload = {}
  if (typesChanges(initial, form)) payload.types = form.types
  if (adresseChangee(initial, form)) payload.adresse_complete = form.adresse_complete.trim()
  if (localisationChangee(initial, form)) {
    payload.localisation = {
      pays_uuid: form.pays,
      departement_uuid: form.departement || null,
      commune_uuid: form.commune || null,
      arrondissement_uuid: form.arrondissement || null,
    }
  }
  if (gpsChange(initial, form)) payload.geolocalisation = { latitude: num(form.latitude), longitude: num(form.longitude) }
  return payload
}

/** Controles cote formulaire (le serveur revalide tout). Cles d'erreur : types, adresse_complete, localisation, gps. */

export function validerProfil(initial, form) {
  const errors = {}

  if (!form.types.length) errors.types = 'Sélectionnez au moins un type.'

  if (adresseChangee(initial, form) && form.adresse_complete.trim().length < 5) {
    errors.adresse_complete = "L'adresse complète est obligatoire (rue, numéro ou repère)."
  }

  if (localisationChangee(initial, form)) {
    const e = validateChamps(['localisation'], form).localisation
    if (e) errors.localisation = e
  }

  const [la, lo] = [num(form.latitude), num(form.longitude)]
  const vide = form.latitude === '' && form.longitude === ''
  if (!vide) {
    if (Number.isNaN(la) || Number.isNaN(lo)) errors.gps = 'Renseignez la latitude et la longitude ensemble, en nombres.'
    else if (la < -90 || la > 90) errors.gps = 'La latitude doit être comprise entre -90 et 90.'
    else if (lo < -180 || lo > 180) errors.gps = 'La longitude doit être comprise entre -180 et 180.'
  }

  return errors
}

/** Erreurs 422 du serveur (details: { 'localisation.pays_uuid': [msg] ... }) -> { cle de formulaire: message } + liste a plat. */
export function erreursServeur(details) {
  const errors = {}
  const messages = []
  Object.entries(details ?? {}).forEach(([cle, msgs]) => {
    const liste = Array.isArray(msgs) ? msgs : [String(msgs)]
    const champ = cle === 'adresse_complete' ? 'adresse_complete'
      : cle.startsWith('localisation') ? 'localisation'
      : cle.startsWith('types') ? 'types'
      : cle.startsWith('geolocalisation') ? 'gps'
      : 'general'
    errors[champ] ??= liste[0]
    messages.push(...liste)
  })
  return { errors, messages }
}