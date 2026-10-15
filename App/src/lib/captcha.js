import { ENV } from '../config/env'
import { ApiError } from './http'

let loader = null

function load(key) {
  if (loader) return loader
  loader = new Promise((resolve, reject) => {
    if (window.grecaptcha?.enterprise) return resolve()

    const s = document.createElement('script')
    s.src = `https://www.google.com/recaptcha/enterprise.js?render=${key}`
    s.async = true
    s.defer = true
    s.onload = resolve
    s.onerror = () => {
      loader = null
      reject(new Error('captcha-load'))
    }
    document.head.appendChild(s)
  })
  return loader
}

/**
 * Renvoie un jeton reCAPTCHA Enterprise.
 * Retourne '' si aucune clé n'est configurée (mode développement).
 */
export async function getCaptchaToken(action) {
  const key = ENV.recaptchaKey
  if (!key) return ''

  try {
    await load(key)
    return await new Promise((resolve, reject) => {
      window.grecaptcha.enterprise.ready(async () => {
        try {
          const token = await window.grecaptcha.enterprise.execute(key, { action })
          resolve(token)
        } catch (err) {
          reject(err)
        }
      })
    })
  } catch {
    throw new ApiError({
      kind: 'captcha',
      title: 'Vérification de sécurité',
      message: "Le contrôle anti-robot n'a pas pu être chargé. Désactivez votre bloqueur de contenu puis réessayez.",
    })
  }
}
