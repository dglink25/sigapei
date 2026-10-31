/**
 * Service - Demandes d'accès aux services.
 *
 * Côté établissement :
 *   - Consulter ses demandes de service
 *   - Lister les services du catalogue disponibles pour demande
 *   - Soumettre une nouvelle demande
 *   - Annuler une demande en attente
 *
 * Côté Super Admin :
 *   - Lister toutes les demandes (filtrées par statut)
 *   - Statistiques / compteurs pour le tableau de bord
 *   - Accepter une demande (assigne le service à l'établissement)
 *   - Refuser une demande (avec motif)
 */
import { authApi as api } from '../../lib/commun/http'
import { servicesAcces } from './servicesAcces.service'
import { portailService } from './portail.service'

const STORAGE_KEY = 'sigapei.demandes_service.local'

function lireLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function ecrireLocal(liste) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(liste))
  } catch {
    /* ignore */
  }
}

// ── Côté Établissement ────────────────────────────────────────────────

export const demandesServiceEtabService = {
  /** Liste les demandes de service de l'établissement courant. */
  async listerMesDemandes(etabUuid = null) {
    try {
      const r = await api.get('/services/mes-demandes')
      const liste = Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : []
      if (liste.length > 0) return liste
    } catch {
      /* fallback ci-dessous */
    }

    // Fallback localStorage si l'API backend n'est pas encore connectée
    const local = lireLocal()
    if (!etabUuid) return local
    return local.filter((d) => d.etablissement?.uuid === etabUuid || !d.etablissement?.uuid)
  },

  /**
   * Retourne les services actifs du catalogue non encore assignés à l'établissement
   * et n'ayant pas déjà une demande en attente.
   */
  async listerServicesDisponibles(etabUuid = null) {
    try {
      const r = await api.get('/services/disponibles-demande')
      const liste = Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : null
      if (liste) return liste
    } catch {
      /* fallback ci-dessous */
    }

    // Résolution dynamique côté frontend
    try {
      const [rCat, rPortail] = await Promise.all([
        servicesAcces.lister({ status: 'active', limite: 100 }),
        portailService.lire().catch(() => null),
      ])

      const tousServices = rCat?.services ?? []
      const servicesAssignes = (rPortail?.services ?? []).map((s) => s.code || s.uuid)

      // Demandes locales en attente
      const local = lireLocal().filter((d) => d.statut === 'en_attente')
      const codesDemandes = local.map((d) => d.service?.code || d.service?.uuid)

      return tousServices.filter(
        (s) =>
          s.status === 'active' &&
          !servicesAssignes.includes(s.code) &&
          !servicesAssignes.includes(s.uuid) &&
          !codesDemandes.includes(s.code) &&
          !codesDemandes.includes(s.uuid),
      )
    } catch {
      return []
    }
  },

  /** Soumet une nouvelle demande de service. */
  async soumettre({ serviceUuid, motif, service = null, etablissement = null }) {
    try {
      const r = await api.post('/services/demandes', { serviceUuid, motif })
      if (r) return r
    } catch (err) {
      // Si 404/réseau, enregistrer en local pour une fluidité sans interruption
      if (err?.status && err.status !== 404 && err.status !== 502) {
        throw err
      }
    }

    const nouvelleDemande = {
      uuid: 'dem-srv-' + Date.now(),
      motif: motif.trim(),
      statut: 'en_attente',
      noteInstruction: '',
      dateInstruction: null,
      createdAt: new Date().toISOString(),
      service: service ?? { uuid: serviceUuid, nom: 'Service demandé', code: 'service' },
      etablissement: etablissement ?? { nom: 'Mon Établissement' },
    }

    const local = lireLocal()
    ecrireLocal([nouvelleDemande, ...local])
    return nouvelleDemande
  },

  /** Annule une demande en attente. */
  async annuler(uuid) {
    try {
      await api.delete(`/services/demandes/${uuid}`)
    } catch {
      /* ignore */
    }
    const local = lireLocal()
    ecrireLocal(local.filter((d) => d.uuid !== uuid))
    return { success: true }
  },
}

// ── Côté Super Admin ──────────────────────────────────────────────────

export const demandesServiceAdminService = {
  /** Liste toutes les demandes (filtrables par statut). */
  async listerToutesDemandes(statut = 'en_attente') {
    try {
      const r = await api.get(`/services/demandes?statut=${statut}`)
      const liste = Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : []
      if (liste.length > 0) return liste
    } catch {
      /* fallback ci-dessous */
    }

    const local = lireLocal()
    if (!statut || statut === 'tous') return local
    return local.filter((d) => d.statut === statut)
  },

  /** Statistiques et compteurs pour les badges et tableaux de bord. */
  async compteurs() {
    try {
      const r = await api.get('/services/demandes/stats')
      if (r && typeof r.enAttente === 'number') return r
    } catch {
      /* fallback */
    }
    const local = lireLocal()
    return {
      enAttente: local.filter((d) => d.statut === 'en_attente').length,
      acceptees: local.filter((d) => d.statut === 'acceptee').length,
      refusees: local.filter((d) => d.statut === 'refusee').length,
      total: local.length,
    }
  },

  /** Accepte une demande : assigne automatiquement le service à l'établissement. */
  async accepter(demandeUuid, opts = {}) {
    const { note = '', etablissementUuid = null, serviceUuid = null } = opts
    try {
      const r = await api.post(`/services/demandes/${demandeUuid}/accepter`, { note })
      if (r) return r
    } catch (err) {
      if (err?.status && err.status !== 404) throw err
    }

    // Assigner le service à l'établissement via l'API officielle d'assignation
    if (etablissementUuid && serviceUuid) {
      try {
        await servicesAcces.assigner(etablissementUuid, [serviceUuid])
      } catch {
        /* ignore si déjà assigné */
      }
    }

    // Mettre à jour en local
    const local = lireLocal().map((d) =>
      d.uuid === demandeUuid
        ? {
            ...d,
            statut: 'acceptee',
            noteInstruction: note,
            dateInstruction: new Date().toISOString(),
          }
        : d,
    )
    ecrireLocal(local)
    return { success: true }
  },

  /** Refuse une demande avec motif obligatoire. */
  async refuser(demandeUuid, note) {
    try {
      const r = await api.post(`/services/demandes/${demandeUuid}/refuser`, { note })
      if (r) return r
    } catch (err) {
      if (err?.status && err.status !== 404) throw err
    }

    const local = lireLocal().map((d) =>
      d.uuid === demandeUuid
        ? {
            ...d,
            statut: 'refusee',
            noteInstruction: note,
            dateInstruction: new Date().toISOString(),
          }
        : d,
    )
    ecrireLocal(local)
    return { success: true }
  },
}
