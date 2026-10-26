import PhoneField from '../commun/PhoneField'
import { DOC_TYPES, TITRES, TYPES } from '../../config/etablissements/config'
import { anneesDisponibles, localisationTexte, typesTexte } from '../../lib/etablissements/form'
import DocumentUploader from './DocumentUploader'
import GeoSelects from './GeoSelects'
import { Field } from './ui'

const YEARS = anneesDisponibles()

/**
 * Props communes aux etapes :
 *  form / set(patch) / errors / docs / onDoc(type, valeur) / demandeUuid
 *  locked(champ) : true => champ non modifiable (mode correction : seuls les champs marques sont editables)
 *  flags : { champ: motif } des champs « a corriger »
 */
const fl = (flags, errors, k) => ({ error: errors[k], flagged: k in flags, motif: flags[k] })

export function StepEtablissement({ form, set, errors, locked, flags = {} }) {
  const toggle = (id) => set({ types: form.types.includes(id) ? form.types.filter((t) => t !== id) : [...form.types, id] })
  return (
    <div className="dm-grid">
      <Field id="nom" label="Nom de l'établissement" required className="dm-span" {...fl(flags, errors, 'nom')}>
        <input id="nom" className="dm-input" value={form.nom} onChange={(e) => set({ nom: e.target.value })} disabled={locked('nom')} autoComplete="organization" />
      </Field>

      <Field label="Type d'établissement" required hint="Un établissement peut cumuler plusieurs types." className="dm-span" {...fl(flags, errors, 'types')}>
        <div className="dm-chips" role="group" aria-label="Type d'établissement">
          {TYPES.map((t) => (
            <label key={t.id} className={`dm-chip ${form.types.includes(t.id) ? 'is-on' : ''} ${locked('types') ? 'is-disabled' : ''}`}>
              <input type="checkbox" checked={form.types.includes(t.id)} onChange={() => toggle(t.id)} disabled={locked('types')} />
              {t.label}
            </label>
          ))}
        </div>
      </Field>

      <Field id="annee" label="Année d'ouverture" required {...fl(flags, errors, 'annee_ouverture')}>
        <select id="annee" className="dm-input" value={form.annee_ouverture} onChange={(e) => set({ annee_ouverture: e.target.value })} disabled={locked('annee_ouverture')}>
          <option value="">Sélectionnez…</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </Field>

      <Field id="email" label="E-mail de contact" required {...fl(flags, errors, 'email')}>
        <input id="email" className="dm-input" type="email" inputMode="email" value={form.email} onChange={(e) => set({ email: e.target.value })} disabled={locked('email')} />
      </Field>

      <Field id="tel1" label="Téléphone de contact 1" required {...fl(flags, errors, 'telephone_1')}>
        <PhoneField id="tel1" value={form.telephone_1} onChange={(v) => set({ telephone_1: v })} disabled={locked('telephone_1')} invalid={!!errors.telephone_1} />
      </Field>

      <Field id="tel2" label="Téléphone de contact 2" hint="Facultatif si le téléphone 1 est renseigné." {...fl(flags, errors, 'telephone_2')}>
        <PhoneField id="tel2" value={form.telephone_2} onChange={(v) => set({ telephone_2: v })} disabled={locked('telephone_2')} invalid={!!errors.telephone_2} />
      </Field>
    </div>
  )
}

export function StepLocalisation({ form, set, errors, locked, flags = {} }) {
  return (
    <div className="dm-grid">
      <Field className="dm-span" {...fl(flags, errors, 'localisation')}>
        <GeoSelects value={form} libre={form.localisation_libre} onChange={set} disabled={locked('localisation')} />
      </Field>
      <Field id="adresse" label="Adresse complète" required hint="Rue, numéro ou repère." className="dm-span" {...fl(flags, errors, 'adresse_complete')}>
        <textarea id="adresse" className="dm-input" rows={3} value={form.adresse_complete} onChange={(e) => set({ adresse_complete: e.target.value })} disabled={locked('adresse_complete')} />
      </Field>
    </div>
  )
}

export function StepDirigeant({ form, set, errors, locked, flags = {} }) {
  return (
    <div className="dm-grid">
      <Field id="dnom" label="Nom complet" required {...fl(flags, errors, 'dirigeant_nom')}>
        <input id="dnom" className="dm-input" value={form.dirigeant_nom} onChange={(e) => set({ dirigeant_nom: e.target.value })} disabled={locked('dirigeant_nom')} autoComplete="name" />
      </Field>
      <Field id="dtitre" label="Titre / fonction" required {...fl(flags, errors, 'dirigeant_titre')}>
        <input id="dtitre" className="dm-input" list="dm-titres" value={form.dirigeant_titre} onChange={(e) => set({ dirigeant_titre: e.target.value })} disabled={locked('dirigeant_titre')} />
        <datalist id="dm-titres">{TITRES.map((t) => <option key={t} value={t} />)}</datalist>
      </Field>
      <Field id="demail" label="E-mail personnel" required hint="Distinct de l'e-mail général de l'établissement." {...fl(flags, errors, 'dirigeant_email')}>
        <input id="demail" className="dm-input" type="email" inputMode="email" value={form.dirigeant_email} onChange={(e) => set({ dirigeant_email: e.target.value })} disabled={locked('dirigeant_email')} />
      </Field>
      <Field id="dtel" label="Téléphone (WhatsApp)" required {...fl(flags, errors, 'dirigeant_telephone')}>
        <PhoneField id="dtel" value={form.dirigeant_telephone} onChange={(v) => set({ dirigeant_telephone: v })} disabled={locked('dirigeant_telephone')} invalid={!!errors.dirigeant_telephone} />
      </Field>
    </div>
  )
}

export function StepDocuments({ errors, locked, flags = {}, docs, onDoc, demandeUuid }) {
  return (
    <div className="dm-docs">
      {['autorisation', 'piece_identite', 'logo'].map((type) => {
        const champ = DOC_TYPES[type].champ
        return (
          <DocumentUploader
            key={type}
            type={type}
            demandeUuid={demandeUuid}
            value={docs[type]}
            onChange={(v) => onDoc(type, v)}
            disabled={locked(champ)}
            error={errors[champ]}
            flagged={champ in flags}
            motif={flags[champ]}
          />
        )
      })}
    </div>
  )
}

export function Recap({ form, docs }) {
  const rows = [
    ['Établissement', form.nom],
    ['Type', typesTexte(form.types, TYPES)],
    ["Année d'ouverture", form.annee_ouverture],
    ['E-mail', form.email],
    ['Téléphone(s)', [form.telephone_1, form.telephone_2].filter(Boolean).join(' · ')],
    ['Localisation', localisationTexte(form)],
    ['Adresse', form.adresse_complete],
    ['Dirigeant', [form.dirigeant_nom, form.dirigeant_titre].filter(Boolean).join(' - ')],
    ['Contact dirigeant', [form.dirigeant_email, form.dirigeant_telephone].filter(Boolean).join(' · ')],
    ['Documents', Object.values(docs).filter((d) => d?.status === 'done').map((d) => d.nom).join(', ')],
  ]
  return (
    <dl className="dm-recap">
      {rows.map(([k, v]) => (
        <div key={k}><dt>{k}</dt><dd>{v || '-'}</dd></div>
      ))}
    </dl>
  )
}

export function StepConfirmation({ form, set, errors, docs }) {
  return (
    <div>
      <Recap form={form} docs={docs} />
      <Field error={errors.confirm_authenticite}>
        <label className="dm-check">
          <input type="checkbox" checked={form.confirm_authenticite} onChange={(e) => set({ confirm_authenticite: e.target.checked })} />
          <span>Je confirme l'authenticité des informations fournies dans cette demande.</span>
        </label>
      </Field>
      <Field error={errors.confirm_conditions}>
        <label className="dm-check">
          <input type="checkbox" checked={form.confirm_conditions} onChange={(e) => set({ confirm_conditions: e.target.checked })} />
          <span>J'accepte les <a href="/conditions" target="_blank" rel="noreferrer">conditions d'utilisation</a> et la <a href="/confidentialite" target="_blank" rel="noreferrer">politique de confidentialité</a>.</span>
        </label>
      </Field>
    </div>
  )
}
