import { useEffect, useId, useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import Drawer from './Drawer'
import Switch from './Switch'
import { REGEX_CODE_SERVICE, codeDepuisNom } from '../../config/services/config'
import './admin-ui.css'

const VIDE = { nom: '', code: '', description: '', actif: true }

function valider(form, mode) {
  const e = {}
  const nom = form.nom.trim()
  if (nom.length < 2) e.nom = 'Le nom doit contenir au moins 2 caractères.'
  else if (nom.length > 255) e.nom = 'Le nom ne peut pas dépasser 255 caractères.'
  if (mode === 'create' && !REGEX_CODE_SERVICE.test(form.code)) {
    e.code = '2 à 64 caractères : minuscules, chiffres, tiret ou underscore.'
  }
  if (form.description.length > 1000) e.description = 'La description ne peut pas dépasser 1000 caractères.'
  return e
}

/**
 * Création / modification d'un service.
 * drawer : null | { mode: 'create' } | { mode: 'edit', item }
 * onSubmit(mode, item, form) est appelé uniquement si le formulaire est valide.
 */
export default function ServiceDrawer({ drawer, busy, onSubmit, onClose }) {
  const uid = useId()
  const dernier = useRef(drawer)
  if (drawer) dernier.current = drawer
  const d = drawer ?? dernier.current
  const edit = d?.mode === 'edit'

  const [form, setForm] = useState(VIDE)
  const [codeTouche, setCodeTouche] = useState(false)
  const [erreurs, setErreurs] = useState({})

  useEffect(() => {
    if (!drawer) return
    setErreurs({})
    setCodeTouche(false)
    setForm(
      drawer.mode === 'edit'
        ? { nom: drawer.item.nom, code: drawer.item.code, description: drawer.item.description ?? '', actif: drawer.item.status === 'active' }
        : VIDE,
    )
  }, [drawer])

  const maj = (champ, valeur) => setForm((f) => ({ ...f, [champ]: valeur }))

  function changerNom(v) {
    setForm((f) => ({ ...f, nom: v, code: !edit && !codeTouche ? codeDepuisNom(v) : f.code }))
  }

  function soumettre(e) {
    e.preventDefault()
    const err = valider(form, d.mode)
    setErreurs(err)
    if (Object.keys(err).length === 0) onSubmit(d.mode, d.item, form)
  }

  return (
    <Drawer
      open={drawer !== null}
      title={edit ? 'Modifier le service' : 'Nouveau service'}
      subtitle={edit ? d.item?.nom : 'Ajoutez un service au catalogue de la plateforme.'}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ap-btn ap-btn--ghost" onClick={onClose} disabled={busy}>Annuler</button>
          <button type="submit" form={`${uid}-form`} className="ap-btn" disabled={busy}>
            {busy ? 'Enregistrement…' : edit ? 'Enregistrer' : 'Créer le service'}
          </button>
        </>
      }
    >
      <form id={`${uid}-form`} onSubmit={soumettre} noValidate>
        <div className={`ap-field${erreurs.nom ? ' has-error' : ''}`}>
          <label className="ap-label" htmlFor={`${uid}-nom`}>Nom du service<em aria-hidden="true">*</em></label>
          <input
            id={`${uid}-nom`}
            className="ap-input"
            data-autofocus
            value={form.nom}
            maxLength={255}
            placeholder="Ex. Vie scolaire"
            onChange={(e) => changerNom(e.target.value)}
          />
          {erreurs.nom && <p className="ap-error" role="alert">{erreurs.nom}</p>}
        </div>

        <div className={`ap-field${erreurs.code ? ' has-error' : ''}`}>
          <label className="ap-label" htmlFor={`${uid}-code`}>Code<em aria-hidden="true">*</em></label>
          <div className="ap-lockline">
            <input
              id={`${uid}-code`}
              className="ap-input ap-input--mono"
              value={form.code}
              readOnly={edit}
              maxLength={64}
              placeholder="vie-scolaire"
              onChange={(e) => {
                setCodeTouche(true)
                maj('code', e.target.value.toLowerCase().replace(/\s+/g, '-'))
              }}
            />
            {edit && <Lock size={16} aria-label="Code verrouillé" />}
          </div>
          {erreurs.code
            ? <p className="ap-error" role="alert">{erreurs.code}</p>
            : <p className="ap-hint">{edit
                ? "Le code est stable et ne peut plus être modifié : les autres services s'y réfèrent."
                : 'Identifiant technique unique et définitif, utilisé par les autres services de la plateforme.'}</p>}
        </div>

        <div className={`ap-field${erreurs.description ? ' has-error' : ''}`}>
          <label className="ap-label" htmlFor={`${uid}-desc`}>Description</label>
          <textarea
            id={`${uid}-desc`}
            className="ap-textarea"
            value={form.description}
            maxLength={1000}
            placeholder="À quoi sert ce service ?"
            onChange={(e) => maj('description', e.target.value)}
          />
          {erreurs.description && <p className="ap-error" role="alert">{erreurs.description}</p>}
        </div>

        {edit && (
          <div className="ap-switchline">
            <div>
              <strong>{form.actif ? 'Service actif' : 'Service désactivé'}</strong>
              <small>
                {form.actif
                  ? 'Disponible pour les établissements auxquels il est assigné.'
                  : "Désactivé : l'accès est coupé pour TOUS les établissements, immédiatement."}
              </small>
            </div>
            <Switch checked={form.actif} onChange={(v) => maj('actif', v)} label="Service actif" />
          </div>
        )}
      </form>
    </Drawer>
  )
}
