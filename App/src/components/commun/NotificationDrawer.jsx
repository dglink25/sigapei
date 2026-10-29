import { useId, useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Check,
  CheckCheck,
  Trash2,
  Trash,
  ShieldAlert,
  Building2,
  KeyRound,
  Layers,
  GraduationCap,
  UserCheck,
  Bell,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { useNotification } from '../../context/commun/NotificationContext'
import './NotificationDrawer.css'

function formaterDateRelative(isoString) {
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
    if (diff < 60) return "À l'instant"
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`
    if (diff < 172800) return 'Hier'
    return new Date(isoString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function getIconeType(type) {
  switch (type) {
    case 'SECURITE':
      return <ShieldAlert size={18} className="notif-ico-securite" aria-hidden="true" />
    case 'DEMANDE_ETABLISSEMENT':
    case 'CORRECTION_SOUMISSION':
      return <Building2 size={18} className="notif-ico-etab" aria-hidden="true" />
    case 'DEMANDE_ROLE':
    case 'DEMANDE_ROLE_VALIDEE':
      return <KeyRound size={18} className="notif-ico-role" aria-hidden="true" />
    case 'DEMANDE_SERVICE':
    case 'DEMANDE_SERVICE_VALIDEE':
      return <Layers size={18} className="notif-ico-service" aria-hidden="true" />
    case 'DEMANDE_CYCLE':
    case 'DEMANDE_CYCLE_VALIDEE':
      return <GraduationCap size={18} className="notif-ico-cycle" aria-hidden="true" />
    case 'CANDIDATURE':
      return <UserCheck size={18} className="notif-ico-candidature" aria-hidden="true" />
    default:
      return <Bell size={18} className="notif-ico-default" aria-hidden="true" />
  }
}

function getLibelleBadge(type) {
  switch (type) {
    case 'SECURITE':
      return { label: 'Sécurité', classe: 'notif-tag--securite' }
    case 'DEMANDE_ETABLISSEMENT':
      return { label: 'Établissement', classe: 'notif-tag--etab' }
    case 'CORRECTION_SOUMISSION':
      return { label: 'Dossier corrigé', classe: 'notif-tag--correction' }
    case 'DEMANDE_ROLE':
    case 'DEMANDE_ROLE_VALIDEE':
      return { label: 'Rôle', classe: 'notif-tag--role' }
    case 'DEMANDE_SERVICE':
    case 'DEMANDE_SERVICE_VALIDEE':
      return { label: 'Service', classe: 'notif-tag--service' }
    case 'DEMANDE_CYCLE':
    case 'DEMANDE_CYCLE_VALIDEE':
      return { label: 'Cycle', classe: 'notif-tag--cycle' }
    case 'CANDIDATURE':
      return { label: 'Candidature', classe: 'notif-tag--candidature' }
    default:
      return { label: 'Système', classe: 'notif-tag--default' }
  }
}

export default function NotificationDrawer() {
  const {
    notifications,
    nbNonLues,
    ouvert,
    selection,
    permissionPush,
    demanderPermissionPush,
    fermer,
    marquerCommeLu,
    marquerSelectionCommeLue,
    marquerToutCommeLu,
    supprimerNotification,
    supprimerSelection,
    supprimerTout,
    toggleSelection,
    selectionnerTout,
    viderSelection,
    cliquerNotification,
  } = useNotification()

  const [filtre, setFiltre] = useState('toutes') // 'toutes', 'non_lues', 'securite', 'demandes'
  const drawerRef = useRef(null)
  const titreId = useId()

  // Fermer avec Échap
  useEffect(() => {
    if (!ouvert) return undefined
    const handleKey = (e) => {
      if (e.key === 'Escape') fermer()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [ouvert, fermer])

  // Filtrer la liste
  const notificationsFiltrees = useMemo(() => {
    return notifications.filter((n) => {
      if (filtre === 'non_lues') return !n.lu
      if (filtre === 'securite') return n.categorie === 'securite' || n.type === 'SECURITE'
      if (filtre === 'demandes') return n.categorie === 'demandes' || n.type?.startsWith('DEMANDE_') || n.type === 'CORRECTION_SOUMISSION'
      return true
    })
  }, [notifications, filtre])

  // Compteurs
  const compteurs = useMemo(() => {
    return {
      toutes: notifications.length,
      non_lues: notifications.filter((n) => !n.lu).length,
      securite: notifications.filter((n) => n.categorie === 'securite' || n.type === 'SECURITE').length,
      demandes: notifications.filter(
        (n) => n.categorie === 'demandes' || n.type?.startsWith('DEMANDE_') || n.type === 'CORRECTION_SOUMISSION'
      ).length,
    }
  }, [notifications])

  // Gestion sélection multiple
  const tousSelectionnes =
    notificationsFiltrees.length > 0 &&
    notificationsFiltrees.every((n) => selection.includes(n.id))

  const handleToggleTous = () => {
    if (tousSelectionnes) {
      viderSelection()
    } else {
      selectionnerTout(notificationsFiltrees.map((n) => n.id))
    }
  }

  if (!ouvert) return null

  return createPortal(
    <div
      className="notif-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) fermer()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titreId}
    >
      <aside className="notif-drawer" ref={drawerRef}>
        {/* ── EN-TÊTE ── */}
        <header className="notif-header">
          <div className="notif-header-title-wrap">
            <h2 id={titreId} className="notif-header-title">
              Notifications
            </h2>
            {nbNonLues > 0 ? (
              <span className="notif-badge-pill" title={`${nbNonLues} notification(s) non lue(s)`}>
                {nbNonLues} non lue{nbNonLues > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="notif-badge-pill notif-badge-pill--green">À jour</span>
            )}
          </div>
          <button
            type="button"
            className="notif-btn-icon notif-close"
            onClick={fermer}
            title="Fermer le panneau"
            aria-label="Fermer les notifications"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {/* ── BANDEAU NOTIFICATIONS PUSH WEB ── */}
        {permissionPush !== 'granted' && (
          <div className="notif-push-banner">
            <div className="notif-push-banner-txt">
              <strong>Notifications Push Web</strong>
              <span>Recevez les alertes temps réel même lorsque l&apos;application est en arrière-plan.</span>
            </div>
            <button
              type="button"
              className="notif-push-banner-btn"
              onClick={demanderPermissionPush}
            >
              Activer
            </button>
          </div>
        )}

        {/* ── ONGLETS DE FILTRAGE ── */}
        <div className="notif-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={filtre === 'toutes'}
            className={`notif-tab ${filtre === 'toutes' ? 'is-active' : ''}`}
            onClick={() => setFiltre('toutes')}
          >
            Toutes <span className="notif-tab-count">{compteurs.toutes}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filtre === 'non_lues'}
            className={`notif-tab ${filtre === 'non_lues' ? 'is-active' : ''}`}
            onClick={() => setFiltre('non_lues')}
          >
            Non lues <span className="notif-tab-count">{compteurs.non_lues}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filtre === 'securite'}
            className={`notif-tab ${filtre === 'securite' ? 'is-active' : ''}`}
            onClick={() => setFiltre('securite')}
          >
            Sécurité <span className="notif-tab-count">{compteurs.securite}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filtre === 'demandes'}
            className={`notif-tab ${filtre === 'demandes' ? 'is-active' : ''}`}
            onClick={() => setFiltre('demandes')}
          >
            Demandes <span className="notif-tab-count">{compteurs.demandes}</span>
          </button>
        </div>

        {/* ── BARRE D'ACTIONS (MULTI-SÉLECTION & ACTIONS GLOBALES) ── */}
        <div className="notif-toolbar">
          <div className="notif-toolbar-left">
            {notificationsFiltrees.length > 0 && (
              <label className="notif-check-label" title="Tout sélectionner / désélectionner">
                <input
                  type="checkbox"
                  className="notif-check"
                  checked={tousSelectionnes}
                  onChange={handleToggleTous}
                />
                <span className="notif-toolbar-txt">
                  {selection.length > 0
                    ? `${selection.length} sélectionnée(s)`
                    : 'Sélectionner tout'}
                </span>
              </label>
            )}
          </div>

          <div className="notif-toolbar-actions">
            {selection.length > 0 ? (
              <>
                <button
                  type="button"
                  className="notif-btn-action notif-btn-action--mark"
                  onClick={marquerSelectionCommeLue}
                  title="Marquer la sélection comme lue"
                >
                  <Check size={14} aria-hidden="true" />
                  <span>Marquer lu</span>
                </button>
                <button
                  type="button"
                  className="notif-btn-action notif-btn-action--delete"
                  onClick={supprimerSelection}
                  title="Supprimer la sélection"
                >
                  <Trash2 size={14} aria-hidden="true" />
                  <span>Supprimer</span>
                </button>
              </>
            ) : (
              <>
                {nbNonLues > 0 && (
                  <button
                    type="button"
                    className="notif-btn-action"
                    onClick={marquerToutCommeLu}
                    title="Tout marquer comme lu"
                  >
                    <CheckCheck size={14} aria-hidden="true" />
                    <span>Tout marquer lu</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    className="notif-btn-action notif-btn-action--muted"
                    onClick={supprimerTout}
                    title="Supprimer toutes les notifications"
                  >
                    <Trash size={14} aria-hidden="true" />
                    <span>Tout effacer</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── LISTE DES NOTIFICATIONS ── */}
        <div className="notif-list-container">
          {notificationsFiltrees.length === 0 ? (
            <div className="notif-empty">
              <div className="notif-empty-icon">
                <Filter size={32} aria-hidden="true" />
              </div>
              <h3 className="notif-empty-title">Aucune notification</h3>
              <p className="notif-empty-sub">
                {filtre === 'non_lues'
                  ? 'Toutes vos notifications sont lues.'
                  : filtre === 'securite'
                  ? 'Aucune alerte de sécurité consignée.'
                  : filtre === 'demandes'
                  ? 'Aucune demande en attente.'
                  : 'Votre centre de notifications est actuellement vide.'}
              </p>
            </div>
          ) : (
            <ul className="notif-list">
              {notificationsFiltrees.map((n) => {
                const estSelectionne = selection.includes(n.id)
                const { label: badgeLabel, classe: badgeClasse } = getLibelleBadge(n.type)

                return (
                  <li
                    key={n.id}
                    className={`notif-item ${!n.lu ? 'is-unread' : ''} ${
                      estSelectionne ? 'is-selected' : ''
                    } ${n.type === 'SECURITE' ? 'is-security' : ''}`}
                  >
                    <div className="notif-item-select">
                      <input
                        type="checkbox"
                        className="notif-check"
                        checked={estSelectionne}
                        onChange={() => toggleSelection(n.id)}
                        aria-label={`Sélectionner : ${n.titre}`}
                      />
                    </div>

                    <div
                      className="notif-item-body"
                      onClick={() => cliquerNotification(n)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          cliquerNotification(n)
                        }
                      }}
                    >
                      <div className="notif-item-head">
                        <span className="notif-item-icon">{getIconeType(n.type)}</span>
                        <span className={`notif-tag ${badgeClasse}`}>{badgeLabel}</span>
                        <time className="notif-item-date">{formaterDateRelative(n.date)}</time>
                        {!n.lu && <span className="notif-unread-dot" title="Non lu" />}
                      </div>

                      <h4 className="notif-item-title">{n.titre}</h4>
                      <p className="notif-item-message">{n.message}</p>

                      <div className="notif-item-foot">
                        <span className="notif-item-link-hint">
                          Consulter la ressource <ChevronRight size={13} aria-hidden="true" />
                        </span>
                      </div>
                    </div>

                    <div className="notif-item-side-actions">
                      <button
                        type="button"
                        className="notif-item-action-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          marquerCommeLu(n.id)
                        }}
                        title={n.lu ? 'Déjà lu' : 'Marquer comme lu'}
                        disabled={n.lu}
                        aria-label="Marquer comme lu"
                      >
                        <Check size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="notif-item-action-btn notif-item-action-btn--delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          supprimerNotification(n.id)
                        }}
                        title="Supprimer la notification"
                        aria-label="Supprimer cette notification"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>,
    document.body
  )
}
