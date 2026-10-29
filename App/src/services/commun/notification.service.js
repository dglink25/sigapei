/**
 * Service de gestion des notifications de la plateforme SIGAPEI.
 *
 * Types gérés :
 * - Super Admin : Nouvelles demandes d'établissement, Demandes de rôle, Demandes d'extension
 *   de services, Alertes de sécurité (tentative d'intrusion, piratage, brute-force), Corrections
 *   de demandes soumises, Extensions de cycle.
 * - Établissements : Demandes validées (rôles, services, cycles), Nouvelles candidatures reçues,
 *   Notes de service, Mises en demeure de correction de dossier.
 * - Autres rôles : Notifications contextuelles de suivi.
 */

const STORAGE_KEY = 'sigapei.notifications.v1'

const NOTIFS_INITIALES_SUPER_ADMIN = [
  {
    id: 'notif-sa-sec-1',
    titre: 'Alerte de sécurité critique',
    message: "Tentative d'intrusion par force brute bloquée : 5 échecs consécutifs d'authentification sur le compte d'administration depuis l'IP 197.234.219.12 (Cotonou). Adresse IP consignée et temporairement suspendue.",
    type: 'SECURITE',
    categorie: 'securite',
    priorite: 'urgente',
    date: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // il y a 12 min
    lu: false,
    lien: '/admin/dashboard',
    roleRequis: ['super_admin'],
  },
  {
    id: 'notif-sa-sec-2',
    titre: 'Contrôle de sécurité des accès',
    message: "Tentative d'accès non autorisé détectée sur l'API de gestion des habilitations sans token valide. Requête rejetée avec code HTTP 403.",
    type: 'SECURITE',
    categorie: 'securite',
    priorite: 'haute',
    date: new Date(Date.now() - 1000 * 60 * 55).toISOString(), // il y a 55 min
    lu: false,
    lien: '/admin/dashboard',
    roleRequis: ['super_admin'],
  },
  {
    id: 'notif-sa-dem-1',
    titre: "Nouvelle demande d'établissement",
    message: "L'établissement « Complexe Scolaire Les Étoiles » (Cotonou) a finalisé et soumis son dossier complet d'agrément pour instruction.",
    type: 'DEMANDE_ETABLISSEMENT',
    categorie: 'demandes',
    priorite: 'normale',
    date: new Date(Date.now() - 1000 * 60 * 95).toISOString(), // il y a ~1h30
    lu: false,
    lien: '/admin/demandes',
    roleRequis: ['super_admin'],
  },
  {
    id: 'notif-sa-dem-2',
    titre: 'Correction de dossier soumise',
    message: "L'établissement « Collège Protestant Sainte-Marie » a complété et re-soumis ses pièces justificatives après demande de correction.",
    type: 'CORRECTION_SOUMISSION',
    categorie: 'demandes',
    priorite: 'normale',
    date: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // il y a 3h
    lu: false,
    lien: '/admin/demandes',
    roleRequis: ['super_admin'],
  },
  {
    id: 'notif-sa-dem-3',
    titre: "Demande d'extension de service",
    message: "L'établissement « Lycée Scientifique d'Excellence » sollicite l'activation du module « Cantine & Restauration Scolaire ».",
    type: 'DEMANDE_SERVICE',
    categorie: 'demandes',
    priorite: 'normale',
    date: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // il y a 4h
    lu: false,
    lien: '/admin/demandes-service',
    roleRequis: ['super_admin'],
  },
  {
    id: 'notif-sa-dem-4',
    titre: 'Demande de création / assignation de rôle',
    message: "L'établissement « École Primaire La Renaissance » sollicite l'autorisation du rôle spécifique « Coordonnateur de Cycle ».",
    type: 'DEMANDE_ROLE',
    categorie: 'demandes',
    priorite: 'normale',
    date: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // il y a 6h
    lu: false,
    lien: '/admin/demandes-role',
    roleRequis: ['super_admin'],
  },
  {
    id: 'notif-sa-dem-5',
    titre: "Demande d'extension de cycle",
    message: "L'établissement « Institut Polyvalent du Littoral » demande l'autorisation d'ouverture du cycle « Secondaire Général ».",
    type: 'DEMANDE_CYCLE',
    categorie: 'demandes',
    priorite: 'normale',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // il y a 1 jour
    lu: true,
    lien: '/admin/demandes-cycle',
    roleRequis: ['super_admin'],
  },
]

const NOTIFS_INITIALES_ETABLISSEMENT = [
  {
    id: 'notif-etab-serv-1',
    titre: 'Extension de service accordée',
    message: "Votre demande d'extension pour le service « E-Learning & Cours en Ligne » a été validée par la Direction Centrale. Le module est opérationnel.",
    type: 'DEMANDE_SERVICE_VALIDEE',
    categorie: 'demandes',
    priorite: 'normale',
    date: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    lu: false,
    lien: '/admin/configuration?section=services',
    roleRequis: null,
  },
  {
    id: 'notif-etab-role-1',
    titre: 'Demande de rôle approuvée',
    message: "Le rôle « Responsable de Division Pédagogique » a été approuvé et rattaché à votre établissement.",
    type: 'DEMANDE_ROLE_VALIDEE',
    categorie: 'demandes',
    priorite: 'normale',
    date: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    lu: false,
    lien: '/admin/configuration?section=roles',
    roleRequis: null,
  },
  {
    id: 'notif-etab-cand-1',
    titre: 'Nouvelle candidature reçue',
    message: "Un dossier de candidature N° CAND-2026-0042 a été déposé en ligne pour la session d'admission en cours.",
    type: 'CANDIDATURE',
    categorie: 'demandes',
    priorite: 'normale',
    date: new Date(Date.now() - 1000 * 60 * 190).toISOString(),
    lu: false,
    lien: '/inscription?section=candidatures',
    roleRequis: null,
  },
  {
    id: 'notif-etab-cyc-1',
    titre: 'Autorisation de cycle validée',
    message: "L'autorisation d'ouverture du cycle « Maternelle » a été signée par l'autorité de tutelle. Les niveaux sont désormais configurables.",
    type: 'DEMANDE_CYCLE_VALIDEE',
    categorie: 'demandes',
    priorite: 'normale',
    date: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    lu: true,
    lien: '/admin/configuration?section=cycles',
    roleRequis: null,
  },
]

function chargerToutes() {
  try {
    const brut = localStorage.getItem(STORAGE_KEY)
    if (!brut) return null
    const parsed = JSON.parse(brut)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function sauvegarder(notifs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs))
  } catch (err) {
    console.warn('[notification.service] Sauvegarde localStorage impossible :', err)
  }
}

export const notificationService = {
  /**
   * Retourne les notifications pertinentes selon le rôle de l'utilisateur.
   */
  obtenirNotifications(roleUtilisateur = '') {
    let stockees = chargerToutes()
    if (!stockees) {
      // Premier chargement : injecter les notifications de démarrage
      stockees = [...NOTIFS_INITIALES_SUPER_ADMIN, ...NOTIFS_INITIALES_ETABLISSEMENT]
      sauvegarder(stockees)
    }

    const estSuperAdmin = roleUtilisateur === 'super_admin'

    return stockees.filter((n) => {
      if (estSuperAdmin) {
        // Le super admin voit les alertes système, sécurité et les demandes des établissements
        return n.roleRequis?.includes('super_admin') || n.categorie === 'securite' || n.type?.startsWith('DEMANDE_')
      }
      // Les établissements et autres rôles voient leurs confirmations et suivis
      return !n.roleRequis?.includes('super_admin')
    })
  },

  /**
   * Marquer une notification comme lue.
   */
  marquerCommeLu(id) {
    const toutes = chargerToutes() || []
    const maj = toutes.map((n) => (n.id === id ? { ...n, lu: true } : n))
    sauvegarder(maj)
    return maj
  },

  /**
   * Marquer une sélection de notifications comme lues.
   */
  marquerSelectionCommeLue(ids) {
    const idSet = new Set(ids)
    const toutes = chargerToutes() || []
    const maj = toutes.map((n) => (idSet.has(n.id) ? { ...n, lu: true } : n))
    sauvegarder(maj)
    return maj
  },

  /**
   * Marquer toutes les notifications visibles comme lues.
   */
  marquerToutCommeLu(roleUtilisateur = '') {
    const toutes = chargerToutes() || []
    const estSuperAdmin = roleUtilisateur === 'super_admin'
    const maj = toutes.map((n) => {
      const matchRole = estSuperAdmin
        ? n.roleRequis?.includes('super_admin') || n.categorie === 'securite'
        : !n.roleRequis?.includes('super_admin')
      return matchRole ? { ...n, lu: true } : n
    })
    sauvegarder(maj)
    return maj
  },

  /**
   * Supprimer une notification spécifique.
   */
  supprimerNotification(id) {
    const toutes = chargerToutes() || []
    const maj = toutes.filter((n) => n.id !== id)
    sauvegarder(maj)
    return maj
  },

  /**
   * Supprimer une liste d'identifiants de notifications.
   */
  supprimerSelection(ids) {
    const idSet = new Set(ids)
    const toutes = chargerToutes() || []
    const maj = toutes.filter((n) => !idSet.has(n.id))
    sauvegarder(maj)
    return maj
  },

  /**
   * Supprimer toutes les notifications pour le rôle actif.
   */
  supprimerTout(roleUtilisateur = '') {
    const toutes = chargerToutes() || []
    const estSuperAdmin = roleUtilisateur === 'super_admin'
    const maj = toutes.filter((n) => {
      const matchRole = estSuperAdmin
        ? n.roleRequis?.includes('super_admin') || n.categorie === 'securite'
        : !n.roleRequis?.includes('super_admin')
      return !matchRole
    })
    sauvegarder(maj)
    return maj
  },

  /**
   * Ajouter une nouvelle notification dynamique (ex: lors d'une action en temps réel).
   */
  ajouterNotification(nouvelle) {
    const toutes = chargerToutes() || []
    const notif = {
      id: nouvelle.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      titre: nouvelle.titre || 'Notification',
      message: nouvelle.message || '',
      type: nouvelle.type || 'SYSTEME',
      categorie: nouvelle.categorie || 'systeme',
      priorite: nouvelle.priorite || 'normale',
      date: nouvelle.date || new Date().toISOString(),
      lu: false,
      lien: nouvelle.lien || '/',
      roleRequis: nouvelle.roleRequis || null,
    }
    const maj = [notif, ...toutes]
    sauvegarder(maj)
    return maj
  },
}
