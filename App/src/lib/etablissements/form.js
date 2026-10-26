import { isValidPhoneNumber } from 'libphonenumber-js'

export const EMPTY_FORM = {
  nom: '',
  types: [],
  annee_ouverture: '',
  email: '',
  telephone_1: '',
  telephone_2: '',
  pays: '',
  departement: '',
  commune: '',
  arrondissement: '',
  localisation_libre: { departement: '', commune: '', arrondissement: '' },
  geo_labels: { pays: '', departement: '', commune: '', arrondissement: '' },
  geo_counts: { departement: 0, commune: 0, arrondissement: 0 },
  adresse_complete: '',
  dirigeant_nom: '',
  dirigeant_titre: '',
  dirigeant_email: '',
  dirigeant_telephone: '',
  confirm_authenticite: false,
  confirm_conditions: false,
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const GEO_KEYS = ['pays', 'departement', 'commune', 'arrondissement', 'localisation_libre', 'geo_labels', 'geo_counts']

export const anneeCourante = () => new Date().getFullYear()
export const anneesDisponibles = () => {
  const y = anneeCourante()
  return Array.from({ length: y - 1899 }, (_, i) => y - i) // jamais d'annee future
}

/** Cle de formulaire -> cle de champ (utilisee pour effacer l'erreur correspondante). */
export const champOf = (formKey) => (GEO_KEYS.includes(formKey) ? 'localisation' : formKey)

const LEVELS = { departement: 'un département / une région', commune: 'une commune', arrondissement: 'un arrondissement' }

const RULES = {
  nom: (f) => (f.nom.trim() ? '' : "Le nom de l'établissement est obligatoire."),
  types: (f) => (f.types.length ? '' : 'Sélectionnez au moins un type.'),
  annee_ouverture: (f) => {
    const a = Number(f.annee_ouverture)
    if (!a) return "Sélectionnez l'année d'ouverture."
    return a > anneeCourante() ? "L'année ne peut pas être dans le futur." : ''
  },
  email: (f) => (EMAIL_RE.test(f.email.trim()) ? '' : 'Adresse e-mail invalide.'),
  telephone_1: (f) => {
    if (!f.telephone_1 && !f.telephone_2) return 'Renseignez au moins un numéro de téléphone.'
    return f.telephone_1 && !isValidPhoneNumber(f.telephone_1) ? 'Numéro invalide.' : ''
  },
  telephone_2: (f) => (f.telephone_2 && !isValidPhoneNumber(f.telephone_2) ? 'Numéro invalide.' : ''),
  localisation: (f) => {
    if (!f.pays) return 'Sélectionnez un pays.'
    for (const lvl of Object.keys(LEVELS)) {
      if ((f.geo_counts?.[lvl] ?? 0) > 0 && !f[lvl]) return `Sélectionnez ${LEVELS[lvl]}.`
    }
    return ''
  },
  adresse_complete: (f) => (f.adresse_complete.trim().length >= 5 ? '' : "L'adresse complète est obligatoire (rue, numéro ou repère)."),
  dirigeant_nom: (f) => (f.dirigeant_nom.trim() ? '' : 'Le nom du dirigeant est obligatoire.'),
  dirigeant_titre: (f) => (f.dirigeant_titre.trim() ? '' : 'Le titre ou la fonction est obligatoire.'),
  dirigeant_email: (f) => (EMAIL_RE.test(f.dirigeant_email.trim()) ? '' : 'Adresse e-mail invalide.'),
  dirigeant_telephone: (f) => (f.dirigeant_telephone && isValidPhoneNumber(f.dirigeant_telephone) ? '' : 'Numéro de téléphone invalide.'),
  doc_autorisation: (_f, d) => (d.autorisation?.status === 'done' ? '' : 'Ce document est obligatoire.'),
  doc_piece_identite: (_f, d) => (d.piece_identite?.status === 'done' ? '' : 'Ce document est obligatoire.'),
  doc_logo: (_f, d) => {
    if (d.logo?.status === 'uploading') return 'Téléversement en cours…'
    return d.logo?.status === 'done' ? '' : "Le logo de l'établissement est obligatoire."
  },
  confirm_authenticite: (f) => (f.confirm_authenticite ? '' : "Vous devez confirmer l'authenticité des informations."),
  confirm_conditions: (f) => (f.confirm_conditions ? '' : "Vous devez accepter les conditions d'utilisation."),
}

export function validateChamps(keys, form, docs = {}) {
  const errors = {}
  keys.forEach((k) => {
    const msg = RULES[k]?.(form, docs)
    if (msg) errors[k] = msg
  })
  return errors
}

/* ---------------- Payloads : { donnees: { etablissement, localisation, dirigeant, geolocalisation } } ---------------- */
const put = (o, k, v) => {
  if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return
  o[k] = v
}

/** Donnees d'une section, au format attendu par l'API (les valeurs vides sont omises). */
export function sectionData(section, f) {
  const o = {}
  if (section === 'etablissement') {
    put(o, 'nom', f.nom.trim())
    put(o, 'types', f.types)
    put(o, 'annee_ouverture', f.annee_ouverture ? Number(f.annee_ouverture) : null)
    put(o, 'email', f.email.trim())
    put(o, 'telephone_1', f.telephone_1)
    put(o, 'telephone_2', f.telephone_2)
  }
  if (section === 'localisation') {
    put(o, 'pays_uuid', f.pays)
    put(o, 'departement_uuid', f.departement)
    put(o, 'commune_uuid', f.commune)
    put(o, 'arrondissement_uuid', f.arrondissement)
    put(o, 'adresse_complete', f.adresse_complete.trim())
    // Niveaux non references pour le pays choisi : saisie libre conservee telle quelle
    const libre = Object.fromEntries(Object.entries(f.localisation_libre ?? {}).filter(([, v]) => String(v).trim()))
    if (Object.keys(libre).length) o.libre = libre
  }
  if (section === 'dirigeant') {
    put(o, 'nom_complet', f.dirigeant_nom.trim())
    put(o, 'titre', f.dirigeant_titre.trim())
    put(o, 'email', f.dirigeant_email.trim())
    put(o, 'telephone', f.dirigeant_telephone)
  }
  return o
}

/** POST /demandes : n'envoie que la/les section(s) de l'etape (l'API fusionne avec le brouillon existant). */
export function draftPayload(f, { uuid, sections = [], geo } = {}) {
  const donnees = {}
  sections.forEach((s) => { donnees[s] = sectionData(s, f) })
  if (geo) donnees.geolocalisation = { latitude: geo.latitude, longitude: geo.longitude, precision: geo.precision }
  return { ...(uuid ? { uuid, demandeUuid: uuid } : {}), donnees }
}

/** POST /corrections/{token} : uniquement les sections marquees « a corriger ». */
export function correctionPayload(f, flags) {
  const donnees = {}
  Object.keys(flags).filter((s) => s !== 'documents').forEach((s) => { donnees[s] = sectionData(s, f) })
  return { donnees }
}

/* ---------------- Lecture d'une demande renvoyee par l'API ---------------- */
const pf = (...v) => v.find((x) => x !== undefined && x !== null)
const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : null)
const DOC_ALIAS = { piece: 'piece_identite', identite: 'piece_identite' }

export function normaliserFlags(raw) {
  if (!raw) return {}
  if (Array.isArray(raw)) {
    return Object.fromEntries(raw.map((i) => (typeof i === 'string' ? [i, ''] : [i.section ?? i.champ ?? i.cle, i.motif ?? i.raison ?? ''])).filter(([k]) => k))
  }
  return typeof raw === 'object' ? raw : {}
}

export function normaliserDemande(raw = {}) {
  const dfm = obj(raw.donneesFormulaire) ?? obj(raw.donnees_formulaire) ?? obj(raw.donnees) ?? {}
  const et = obj(dfm.etablissement) ?? {}
  const loc = obj(dfm.localisation) ?? {}
  const dir = obj(dfm.dirigeant) ?? {}
  const g = obj(dfm.geolocalisation)
  const uuid = pf(raw.uuid, raw.demandeUuid, null)

  const docs = {}
  ;(Array.isArray(raw.documents) ? raw.documents : []).forEach((doc) => {
    const type = DOC_ALIAS[doc.type] ?? doc.type
    const chemin = pf(doc.chemin, doc.cheminStockage, doc.chemin_stockage, '')
    docs[type] = {
      status: 'done',
      nom: pf(doc.nom, doc.nomFichier, chemin ? chemin.split('/').pop() : null, 'document'),
      taille: pf(doc.taille, null),
      uuid: pf(doc.uuid, null),
      url: pf(doc.url, doc.urlApercu, doc.lien, null),
      mime: pf(doc.mime, doc.typeMime, doc.type_mime, null),
    }
  })

  return {
    uuid,
    statut: raw.statut ?? 'brouillon',
    reference: uuid ? uuid.slice(0, 8).toUpperCase() : '',
    dateSoumission: pf(raw.dateSoumission, raw.date_soumission, raw.updatedAt, raw.updated_at, raw.createdAt, raw.created_at, null),
    flags: normaliserFlags(pf(raw.champsACorriger, raw.champs_a_corriger, null)),
    geo: g && g.latitude != null && g.longitude != null ? { latitude: Number(g.latitude), longitude: Number(g.longitude), precision: g.precision ?? null } : null,
    docs,
    form: {
      ...EMPTY_FORM,
      nom: pf(et.nom, ''),
      types: Array.isArray(et.types) ? et.types : [],
      annee_ouverture: pf(et.annee_ouverture, ''),
      email: pf(et.email, ''),
      telephone_1: pf(et.telephone_1, ''),
      telephone_2: pf(et.telephone_2, ''),
      pays: pf(loc.pays_uuid, ''),
      departement: pf(loc.departement_uuid, ''),
      commune: pf(loc.commune_uuid, ''),
      arrondissement: pf(loc.arrondissement_uuid, ''),
      localisation_libre: { ...EMPTY_FORM.localisation_libre, ...(obj(loc.libre) ?? {}) },
      adresse_complete: pf(loc.adresse_complete, ''),
      dirigeant_nom: pf(dir.nom_complet, dir.nom, ''),
      dirigeant_titre: pf(dir.titre, ''),
      dirigeant_email: pf(dir.email, ''),
      dirigeant_telephone: pf(dir.telephone, ''),
    },
  }
}

export function localisationTexte(form) {
  const l = form.geo_labels ?? {}
  const libre = form.localisation_libre ?? {}
  return [l.arrondissement || libre.arrondissement, l.commune || libre.commune, l.departement || libre.departement, l.pays]
    .filter(Boolean)
    .join(', ')
}

export const typesTexte = (types, all) => types.map((t) => all.find((x) => x.id === t)?.label ?? t).join(', ')