import { create } from 'zustand'

const DUREE_VIE_MS = 5000
let compteur = 0

export const useToastsStore = create((set) => ({
  toasts: [],
  ajouterToast: (type, message) => {
    compteur += 1
    const id = compteur
    set((etat) => ({
      toasts: [...etat.toasts, { id, type, message }],
    }))
    setTimeout(() => {
      set((etat) => ({ toasts: etat.toasts.filter((toast) => toast.id !== id) }))
    }, DUREE_VIE_MS)
  },
  retirerToast: (id) =>
    set((etat) => ({ toasts: etat.toasts.filter((toast) => toast.id !== id) })),
}))

export function notifierSucces(message) {
  useToastsStore.getState().ajouterToast('succes', message)
}

export function notifierErreur(message) {
  useToastsStore.getState().ajouterToast('erreur', message)
}

export function notifierInfo(message) {
  useToastsStore.getState().ajouterToast('info', message)
}
