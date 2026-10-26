import { ENV } from '../../../config/env'
import { ApiError } from '../../../lib/http'

let loader = null
function load(key) {
  if (loader) return loader
  loader = new Promise((resolve, reject) => {
    if (window.grecaptcha) return resolve()
    const s = document.createElement('script')
    s.src = `https://www.google.com/recaptcha/api.js?render=${key}`
    s.async = true
    s.onload = resolve
    s.onerror = () => { loader = null; reject(new Error('captcha')) }
    document.head.appendChild(s)
  })
  return loader
}

/** Renvoie un jeton reCAPTCHA v3 (chaine vide si aucune cle n'est configuree : mode developpement). */
export async function getCaptchaToken(action) {
  const key = ENV.recaptchaKey
  if (!key) return ''
  try {
    await load(key)
    return await new Promise((resolve, reject) =>
      window.grecaptcha.ready(() => window.grecaptcha.execute(key, { action }).then(resolve, reject)),
    )
  } catch {
    throw new ApiError({
      kind: 'captcha',
      title: 'Vérification de sécurité',
      message: "Le contrôle anti-robot n'a pas pu être chargé. Désactivez votre bloqueur de contenu puis réessayez.",
    })
  }
}
