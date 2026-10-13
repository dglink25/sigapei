const KEY = 'sigapei.demande'

export function loadDraft() {
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}
export function saveDraft(data) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...data, savedAt: Date.now() })) } catch { /* ignore */ }
}
export function clearDraft() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
