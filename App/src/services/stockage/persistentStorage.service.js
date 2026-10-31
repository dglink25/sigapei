/**
 * PersistentStorageService - Moteur de stockage résilient et persistant côté navigateur.
 * Implémente le pattern Stale-While-Revalidate pour la mise en mémoire cache des
 * layouts, métadonnées d'établissement, cycles, services et habilitations.
 */

const STORAGE_PREFIX = 'sigapei_cache_v1_'
const DEFAULT_TTL_MS = 1000 * 60 * 30 // 30 minutes par défaut

class PersistentStorageService {
  constructor() {
    this.memoryCache = new Map()
    this.subscribers = new Map()
  }

  /**
   * Sauvegarde une valeur en cache persistant avec durée de vie (TTL).
   */
  set(key, value, ttlMs = DEFAULT_TTL_MS) {
    const fullKey = STORAGE_PREFIX + key
    const record = {
      key,
      value,
      timestamp: Date.now(),
      ttl: ttlMs,
      expiresAt: Date.now() + ttlMs,
    }

    // 1. Cache mémoire rapide
    this.memoryCache.set(key, record)

    // 2. Persistance localStorage
    try {
      localStorage.setItem(fullKey, JSON.stringify(record))
    } catch (err) {
      console.warn('[PersistentStorage] Erreur écriture localStorage:', err)
    }

    // 3. Notifier les observateurs
    this.notify(key, value)
    return value
  }

  /**
   * Récupère une valeur du cache.
   * Retourne { value, isStale, exists }
   */
  get(key) {
    const fullKey = STORAGE_PREFIX + key

    // 1. Essayer le cache mémoire
    if (this.memoryCache.has(key)) {
      const record = this.memoryCache.get(key)
      const isStale = Date.now() > record.expiresAt
      return { value: record.value, isStale, exists: true }
    }

    // 2. Essayer le localStorage
    try {
      const raw = localStorage.getItem(fullKey)
      if (raw) {
        const record = JSON.parse(raw)
        this.memoryCache.set(key, record)
        const isStale = Date.now() > record.expiresAt
        return { value: record.value, isStale, exists: true }
      }
    } catch (err) {
      console.warn('[PersistentStorage] Erreur lecture cache:', err)
    }

    return { value: null, isStale: true, exists: false }
  }

  /**
   * Implémentation Stale-While-Revalidate :
   * 1. Retourne immédiatement la valeur en cache si elle existe (même périmée pour affichage instantané).
   * 2. Si absente ou périmée, exécute `fetcher()` en tâche de fond pour rafraîchir et enregistrer.
   */
  async getOrRevalidate(key, fetcher, ttlMs = DEFAULT_TTL_MS) {
    const cached = this.get(key)

    if (cached.exists && !cached.isStale) {
      return cached.value
    }

    // Si on a des données en cache (même périmées), on lance le rafraîchissement sans bloquer
    if (cached.exists && cached.isStale) {
      // Revalidation asynchrone non-bloquante
      fetcher()
        .then((fresh) => {
          if (fresh !== undefined && fresh !== null) {
            this.set(key, fresh, ttlMs)
          }
        })
        .catch(() => { /* silencieux en tâche de fond */ })
      return cached.value
    }

    // Aucune donnée en cache : exécuter le fetcher obligatoirement
    try {
      const fresh = await fetcher()
      if (fresh !== undefined && fresh !== null) {
        this.set(key, fresh, ttlMs)
      }
      return fresh
    } catch (err) {
      // En cas d'erreur réseau, si on a un cache périmé, le retourner en dernier recours
      if (cached.exists) return cached.value
      throw err
    }
  }

  /**
   * Supprime une clé spécifique du cache.
   */
  remove(key) {
    const fullKey = STORAGE_PREFIX + key
    this.memoryCache.delete(key)
    try {
      localStorage.removeItem(fullKey)
    } catch { /* ignore */ }
    this.notify(key, null)
  }

  /**
   * Nettoie tous les éléments de cache SIGAPEI expirés.
   */
  purgeExpired() {
    try {
      const now = Date.now()
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(STORAGE_PREFIX)) {
          const raw = localStorage.getItem(k)
          if (raw) {
            try {
              const record = JSON.parse(raw)
              if (record.expiresAt && now > record.expiresAt) {
                localStorage.removeItem(k)
              }
            } catch {
              localStorage.removeItem(k)
            }
          }
        }
      }
    } catch { /* ignore */ }
  }

  /**
   * S'abonner aux mises à jour d'une clé de cache.
   */
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set())
    }
    this.subscribers.get(key).add(callback)
    return () => {
      this.subscribers.get(key)?.delete(callback)
    }
  }

  notify(key, value) {
    const set = this.subscribers.get(key)
    if (set) {
      set.forEach((cb) => {
        try {
          cb(value)
        } catch { /* ignore */ }
      })
    }
  }
}

export const persistentStorage = new PersistentStorageService()
