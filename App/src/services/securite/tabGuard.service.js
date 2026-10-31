/**
 * TabGuardService - Politique de session à onglet unique.
 * Détecte les ouvertures simultanées dans plusieurs onglets, signale l'incident,
 * tente de fermer l'ancien onglet ou le suspend pour éviter les conflits d'état.
 */

const CHANNEL_NAME = 'sigapei_tab_sync'
const STORAGE_KEY = 'sigapei_active_tab'

class TabGuardService {
  constructor() {
    this.tabId = 'tab_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now()
    this.claimedAt = Date.now()
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null
    this.isSuspended = false
    this.listeners = new Set()

    this.init()
  }

  init() {
    // 1. Écouter les messages inter-onglets
    if (this.channel) {
      this.channel.onmessage = (event) => {
        const { type, tabId, claimedAt } = event.data || {}
        if (!tabId || tabId === this.tabId) return

        if (type === 'TAB_CLAIM') {
          // L'autre onglet revendique la session :
          // Si sa revendication est strictement plus récente (ou bris d'égalité par ID), nous cédons
          const estPlusRecent = (claimedAt > this.claimedAt) || (claimedAt === this.claimedAt && tabId > this.tabId)
          if (estPlusRecent) {
            this.handleSuperseded()
          }
        } else if (type === 'TAB_PING' && !this.isSuspended) {
          this.channel.postMessage({
            type: 'TAB_PONG',
            tabId: this.tabId,
            claimedAt: this.claimedAt,
          })
        }
      }
    }

    // 2. Revendiquer immédiatement cet onglet nouvellement ouvert
    this.claimActive()

    // 3. Nettoyer lors de la fermeture
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed.tabId === this.tabId) {
              localStorage.removeItem(STORAGE_KEY)
            }
          }
        } catch { /* ignore */ }
      })
    }
  }

  /**
   * Revendique cet onglet comme l'onglet actif officiel (le plus récent).
   */
  claimActive() {
    this.isSuspended = false
    this.claimedAt = Date.now()

    const payload = {
      tabId: this.tabId,
      claimedAt: this.claimedAt,
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch { /* ignore */ }

    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'TAB_CLAIM',
          tabId: this.tabId,
          claimedAt: this.claimedAt,
        })
      } catch { /* ignore */ }
    }

    this.notifyListeners()
  }

  /**
   * Appelé lorsque cet onglet a été supplanté par un nouvel onglet plus récent.
   */
  handleSuperseded() {
    if (this.isSuspended) return
    this.isSuspended = true
    this.notifyListeners()

    // Tenter de fermer l'ancien onglet si autorisé par le navigateur
    if (typeof window !== 'undefined' && typeof window.close === 'function') {
      try {
        window.close()
      } catch { /* ignore */ }
    }
  }

  /**
   * L'utilisateur choisit de réactiver cet onglet et de supplanter l'autre.
   */
  reprendreControle() {
    this.claimActive()
  }

  subscribe(callback) {
    this.listeners.add(callback)
    callback({ isSuspended: this.isSuspended, tabId: this.tabId })
    return () => this.listeners.delete(callback)
  }

  notifyListeners() {
    this.listeners.forEach((cb) => {
      try {
        cb({ isSuspended: this.isSuspended, tabId: this.tabId })
      } catch { /* ignore */ }
    })
  }
}

export const tabGuard = new TabGuardService()
