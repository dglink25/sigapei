// Mini bus d'evenements : permet au client HTTP (hors React) de prevenir le contexte d'authentification.
const listeners = new Map()

export const authEvents = {
  on(evt, fn) {
    if (!listeners.has(evt)) listeners.set(evt, new Set())
    listeners.get(evt).add(fn)
    return () => listeners.get(evt)?.delete(fn)
  },
  emit(evt, payload) {
    listeners.get(evt)?.forEach((fn) => fn(payload))
  },
}
