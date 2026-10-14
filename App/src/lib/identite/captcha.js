import { ENV } from '../../config/commun/env'
import { ApiError } from '../commun/http'

let loader = null

function load(key) {
  if (loader) return loader
  loader = new Promise((resolve, reject) => {
    // Déjà chargé
    if (window.grecaptcha?.enterprise) return resolve()

    const s = document.createElement('script')
    // reCAPTCHA Enterprise — script différent du v3 classique
    s.src = `https://www.google.com/recaptcha/enterprise.js?render=${key}`
    s.async = true
    s.defer = true
    s.onload = () => {
      // Enterprise expose grecaptcha.enterprise, attendre qu'il soit prêt
      resolve()
    }
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
 * Retourne '' si aucune clé n'est configurée (mode développement sans captcha).
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
