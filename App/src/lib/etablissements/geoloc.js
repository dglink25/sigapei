/**
 * Capture de position EN ARRIERE-PLAN (cahier 4.5.1) : strictement best-effort.
 * Refus, indisponibilite ou delai depasse -> null, sans aucun message ni blocage.
 */
export function captureGeolocation(timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return resolve(null)
    const guard = setTimeout(() => resolve(null), timeoutMs + 1000)
    try {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          clearTimeout(guard)
          resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, precision: p.coords.accuracy })
        },
        () => { clearTimeout(guard); resolve(null) },
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 },
      )
    } catch {
      clearTimeout(guard)
      resolve(null)
    }
  })
}
