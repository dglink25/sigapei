/**
 * PushNotificationService - Gestion des notifications push natives du navigateur et alertes sonores.
 */

class PushNotificationService {
  constructor() {
    this.swRegistration = null
    this.audioContext = null
    this.initialiser()
  }

  async initialiser() {
    if (typeof window === 'undefined') return

    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch (err) {
        console.warn('[PushNotification] Enregistrement Service Worker ignoré:', err)
      }
    }
  }

  estSupporte() {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  obtenirPermission() {
    if (!this.estSupporte()) return 'denied'
    return Notification.permission
  }

  async demanderPermission() {
    if (!this.estSupporte()) return 'denied'
    try {
      const permission = await Notification.requestPermission()
      return permission
    } catch {
      return Notification.permission
    }
  }

  /**
   * Joue un signal sonore institutionnel très discret et élégant via la Web Audio API.
   */
  jouerSonNotification() {
    try {
      if (typeof window === 'undefined') return
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return

      if (!this.audioContext || this.audioContext.state === 'suspended') {
        this.audioContext = new AudioCtx()
      }

      const ctx = this.audioContext
      const now = ctx.currentTime

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      // Accord doux et feutré (La 440Hz -> Do# 554Hz)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, now) // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12) // E5

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.36)
    } catch { /* ignore audio failure */ }
  }

  /**
   * Envoie une notification push native sur le bureau / mobile.
   */
  async afficherNotificationPush(titre, { body = '', lien = '/', tag = 'sigapei', icon = '/sigapei.png' } = {}) {
    if (!this.estSupporte()) return false
    if (Notification.permission !== 'granted') return false

    // Jouer le signal audio discret
    this.jouerSonNotification()

    const options = {
      body,
      icon,
      badge: icon,
      tag: `${tag}-${Date.now()}`,
      data: { lien },
    }

    try {
      if (this.swRegistration && this.swRegistration.showNotification) {
        await this.swRegistration.showNotification(titre, options)
        return true
      }
    } catch { /* fallback direct */ }

    try {
      const notif = new Notification(titre, options)
      notif.onclick = () => {
        window.focus()
        if (lien && typeof window !== 'undefined') {
          window.location.href = lien
        }
        notif.close()
      }
      return true
    } catch {
      return false
    }
  }
}

export const pushNotificationService = new PushNotificationService()
