/**
 * RealtimeService - Bus d'événements temps réel multi-onglets & synchronisation dynamique.
 * Permet à l'ensemble de l'application (Super Admin, Établissements, etc.) de communiquer
 * et de mettre à jour les états, compteurs et notifications instantanément.
 */

const CHANNEL_NAME = 'sigapei_realtime_bus'

class RealtimeService {
  constructor() {
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null
    this.subscribers = new Map()
    this.streamActive = true

    if (this.channel) {
      this.channel.onmessage = (event) => {
        const { type, payload } = event.data || {}
        if (type) {
          this.distribuerEnLocal(type, payload)
        }
      }
    }
  }

  /**
   * Publie un événement en temps réel à l'ensemble des fenêtres et onglets ouverts.
   */
  publier(type, payload = {}) {
    // 1. Informer les écouteurs locaux
    this.distribuerEnLocal(type, payload)

    // 2. Diffuser aux autres fenêtres/onglets via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage({ type, payload, timestamp: Date.now() })
      } catch (err) {
        console.warn('[RealtimeService] Erreur publication BroadcastChannel:', err)
      }
    }
  }

  /**
   * S'abonne à un type d'événement (ex: 'NOUVELLE_NOTIFICATION' ou '*').
   */
  abonner(type, callback) {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set())
    }
    this.subscribers.get(type).add(callback)

    return () => {
      this.subscribers.get(type)?.delete(callback)
    }
  }

  distribuerEnLocal(type, payload) {
    // Écouteurs spécifiques
    const specifiques = this.subscribers.get(type)
    if (specifiques) {
      specifiques.forEach((cb) => {
        try { cb(payload) } catch (err) { console.error('[RealtimeService] Erreur listener:', err) }
      })
    }

    // Écouteurs globaux ('*')
    const globaux = this.subscribers.get('*')
    if (globaux) {
      globaux.forEach((cb) => {
        try { cb({ type, payload }) } catch (err) { console.error('[RealtimeService] Erreur wildcard:', err) }
      })
    }
  }

  /**
   * Émet une notification en temps réel vers tous les clients connectés.
   */
  emettreNotification(notification) {
    this.publier('NOUVELLE_NOTIFICATION', notification)
  }

  /**
   * Émet une alerte de sécurité en temps réel (ex: intrusion, 429, etc.).
   */
  emettreAlerteSecurite(alerte) {
    this.publier('SECURITE_ALERTE', alerte)
    this.publier('NOUVELLE_NOTIFICATION', {
      titre: alerte.titre || 'Alerte de sécurité SIGAPEI',
      message: alerte.message || 'Incident de sécurité consigné.',
      type: 'SECURITE',
      categorie: 'securite',
      priorite: 'urgente',
      roleRequis: ['super_admin'],
      lien: '/admin/dashboard',
    })
  }
}

export const realtimeService = new RealtimeService()
