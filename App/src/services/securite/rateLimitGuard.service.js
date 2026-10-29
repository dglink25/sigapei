/**
 * RateLimitGuard - Protection de sécurité contre les surcharges et attaques par force brute (Erreur 429).
 * Bloque temporairement les requêtes côté client et synchronise le délai sur tous les onglets.
 */

const STORAGE_KEY = 'sigapei_rate_limit_lock'
const CHANNEL_NAME = 'sigapei_security_sync'

class RateLimitGuardService {
  constructor() {
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null
    this.listeners = new Set()
    this.timer = null
    this.consecutive429 = 0

    if (this.channel) {
      this.channel.onmessage = (event) => {
        if (event.data?.type === 'RATE_LIMIT_LOCKED') {
          this.notifyListeners()
        } else if (event.data?.type === 'RATE_LIMIT_UNLOCKED') {
          this.notifyListeners()
        }
      }
    }

    // Vérifier l'état persistant au démarrage
    if (this.isLocked()) {
      this.startCountdown()
    }
  }

  /**
   * Vérifie si le client est actuellement sous restriction 429.
   */
  isLocked() {
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY)
      if (!dataStr) return false
      const data = JSON.parse(dataStr)
      if (Date.now() < data.lockedUntil) {
        return true
      }
      // Expiré : nettoyer
      this.unlock(false)
      return false
    } catch {
      return false
    }
  }

  /**
   * Retourne les secondes restantes avant déblocage.
   */
  getRemainingSeconds() {
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY)
      if (!dataStr) return 0
      const data = JSON.parse(dataStr)
      const diff = Math.max(0, Math.ceil((data.lockedUntil - Date.now()) / 1000))
      return diff
    } catch {
      return 0
    }
  }

  /**
   * Récupère la durée totale du blocage pour la barre de progression.
   */
  getTotalDuration() {
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY)
      if (!dataStr) return 60
      const data = JSON.parse(dataStr)
      return data.totalSeconds || 60
    } catch {
      return 60
    }
  }

  /**
   * Verrouille l'accès pour une durée donnée (en secondes).
   */
  lock(seconds = 60, reason = 'Trop de tentatives détectées') {
    this.consecutive429 += 1
    // Facteur d'escalade : 1ère fois 60s, 2ème fois 120s, 3ème fois 300s
    let duration = seconds
    if (duration <= 60 && this.consecutive429 > 1) {
      duration = Math.min(300, 60 * this.consecutive429)
    }

    const lockedUntil = Date.now() + duration * 1000
    const payload = {
      lockedUntil,
      totalSeconds: duration,
      reason,
      lockedAt: Date.now(),
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch { /* ignore */ }

    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'RATE_LIMIT_LOCKED', payload })
      } catch { /* ignore */ }
    }

    this.startCountdown()
    this.notifyListeners()
  }

  /**
   * Déverrouille l'accès immédiatement.
   */
  unlock(broadcast = true) {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch { /* ignore */ }

    if (broadcast && this.channel) {
      try {
        this.channel.postMessage({ type: 'RATE_LIMIT_UNLOCKED' })
      } catch { /* ignore */ }
    }

    this.notifyListeners()
  }

  /**
   * Compte à rebours interne pour débloquer automatiquement dès expiration.
   */
  startCountdown() {
    if (this.timer) clearInterval(this.timer)
    this.timer = setInterval(() => {
      const remaining = this.getRemainingSeconds()
      if (remaining <= 0) {
        this.unlock()
      } else {
        this.notifyListeners()
      }
    }, 1000)
  }

  subscribe(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  notifyListeners() {
    const locked = this.isLocked()
    const remaining = this.getRemainingSeconds()
    const total = this.getTotalDuration()
    this.listeners.forEach((cb) => {
      try {
        cb({ locked, remaining, total })
      } catch { /* ignore */ }
    })
  }
}

export const rateLimitGuard = new RateLimitGuardService()
