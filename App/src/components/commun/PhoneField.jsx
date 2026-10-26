import { useMemo, useState } from 'react'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { getExampleNumber, getCountryCallingCode } from 'libphonenumber-js'
import examples from 'libphonenumber-js/examples.mobile.json'

/** Telephone international : drapeau + indicatif, format et placeholder automatiques, valeur en E.164. */
export default function PhoneField({ id, value, onChange, disabled, invalid, defaultCountry = 'BJ' }) {
  const [country, setCountry] = useState(defaultCountry)
  const example = useMemo(() => {
    try { return getExampleNumber(country, examples)?.formatNational() ?? '' } catch { return '' }
  }, [country])
  const dial = useMemo(() => {
    try { return getCountryCallingCode(country) } catch { return '' }
  }, [country])

  return (
    <>
      <div className={`dm-input dm-phone ${invalid ? 'is-invalid' : ''} ${disabled ? 'is-disabled' : ''}`}>
        <PhoneInput
          id={id}
          defaultCountry={defaultCountry}
          placeholder={example}
          value={value || undefined}
          onChange={(v) => onChange(v || '')}
          onCountryChange={(c) => c && setCountry(c)}
          disabled={disabled}
          limitMaxLength
        />
      </div>
      <p className="dm-hint">Indicatif +{dial}{example && <> · exemple : {example}</>}</p>
    </>
  )
}
