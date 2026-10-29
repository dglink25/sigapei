/**
 * ChampTelephone - Champ téléphone avec sélecteur de pays.
 * Même pattern qu'AuthPage.jsx : react-phone-number-input + libphonenumber-js.
 */
import { useState, useMemo } from 'react'
import PhoneInput from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import { getExampleNumber } from 'libphonenumber-js'
import examples from 'libphonenumber-js/examples.mobile.json'
import 'react-phone-number-input/style.css'

export default function ChampTelephone({
  id = 'telephone',
  label = 'Téléphone',
  value,
  onChange,
  defaultCountry = 'BJ',
  required = false,
  erreur,
}) {
  const [country, setCountry] = useState(defaultCountry)

  const exemple = useMemo(() => {
    try { return getExampleNumber(country ?? defaultCountry, examples)?.formatNational() ?? '' }
    catch { return '' }
  }, [country, defaultCountry])

  return (
    <div className={`ap-field${erreur ? ' has-error' : ''}`}>
      {label && (
        <label className="ap-label" htmlFor={id}>
          {label}{required && <em> *</em>}
        </label>
      )}
      <div className="field field-phone" style={{ marginBottom: 0 }}>
        <PhoneInput
          id={id}
          defaultCountry={defaultCountry}
          flags={flags}
          placeholder={exemple}
          value={value}
          onChange={onChange}
          onCountryChange={(c) => c && setCountry(c)}
          limitMaxLength
        />
      </div>
      {exemple && !erreur && (
        <p className="ap-hint">Exemple : {exemple}</p>
      )}
      {erreur && <p className="ap-error">{erreur}</p>}
    </div>
  )
}
