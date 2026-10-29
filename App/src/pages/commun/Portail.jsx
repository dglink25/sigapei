import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  Bell, Building2, ChevronRight,
  LogOut, RefreshCw, Settings, TriangleAlert, CalendarDays,
} from 'lucide-react'
import { useAuth }    from '../../context/identite/AuthContext'
import { useNotify }  from '../../context/commun/NotifyContext'
import { ENV }        from '../../config/commun/env'
import { roleCodeOf, determinerEspaceRole, cheminEspaceRole } from '../../config/identite/routes'
import { serviceDisponible } from '../../config/services/registre'
import { MODE_SOUS_DOMAINE, lienEtablissement } from '../../lib/etablissements/subdomain'
import { allerVersEtablissement } from '../../lib/identite/transfert'
import { portailService } from '../../services/identite/portail.service'
import useSlugEtablissement from '../../hooks/etablissements/useSlugEtablissement'
import usePageTitle from '../../hooks/commun/usePageTitle'
import Bloc3D     from '../../components/etablissements/Bloc3D'
import ThemeToggle from '../../components/commun/ThemeToggle'
import Loader     from '../../components/commun/Loader'
import './Portail.css'

/* ── Libellés rôles ── */
const LIBELLES_ROLES = {
  administrateur: 'Administrateur', enseignant: 'Enseignant',
  personnel: 'Personnel', apprenant: 'Apprenant',
  parent: 'Parent', etudiant: 'Étudiant', eleve: 'Élève',
}
const libelleRole = (code = '') =>
  LIBELLES_ROLES[code] ?? (code ? code.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '')

const PILLS  = { ACCES_NON_ACCORDE: 'Accès non accordé', SERVICE_BLOQUE: 'Service suspendu', ETABLISSEMENT_INACTIF: 'Indisponible' }
const MOTIFS = { ACCES_NON_ACCORDE: "Accès non accordé. Contactez l'administrateur.", SERVICE_BLOQUE: 'Service suspendu.', ETABLISSEMENT_INACTIF: 'Établissement suspendu.' }

function Etat({ icone: Icone, titre, message, children }) {
  return (
    <div className="portail-etat" role="status">
      <Icone size={40} aria-hidden="true" />
      <h2>{titre}</h2>
      <p>{message}</p>
      {children}
    </div>
  )
}

export default function Portail() {
  const { user, logout } = useAuth()
  const notify    = useNotify()
  const navigate  = useNavigate()
  const slug      = useSlugEtablissement()
  const [data, setData]   = useState(undefined)
  const [erreur, setErreur] = useState(false)
  usePageTitle('Portail')

  const charger = useCallback(async () => {
    setErreur(false)
    try { setData(await portailService.lire()) }
    catch (err) { notify.fromError(err); setErreur(true) }
  }, [notify])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger()
  }, [charger])

  /* ── Infos utilisateur ── */
  const nom      = user?.nomComplet ?? user?.nom_complet ?? 'Utilisateur'
  const initiales = nom.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const role     = libelleRole(roleCodeOf(user))

  const etab        = data?.etablissement
  const nonConforme = etab && etab.slug !== slug

  if (nonConforme && !MODE_SOUS_DOMAINE)
    return <Navigate to={lienEtablissement(etab.slug, '/portail')} replace />

  /* ── Redirection si l'accès au portail est bloqué ── */
  if (data?.motif === 'PORTAIL_INACCESSIBLE' || (!data?.estAdmin && data?.peutVoirPortail === false)) {
    const roleCode = roleCodeOf(user)
    const espace = determinerEspaceRole(roleCode)
    const cible = espace ? cheminEspaceRole(espace) : '/dashboard'
    return <Navigate to={lienEtablissement(slug, cible)} replace />
  }

  /* ── Corps central ── */
  let corps
  if (erreur) {
    corps = (
      <Etat icone={TriangleAlert} titre="Portail indisponible" message="Impossible de charger vos services pour le moment.">
        <button type="button" className="portail-card-btn" onClick={charger}>
          <RefreshCw size={14} aria-hidden="true" /> Réessayer
        </button>
      </Etat>
    )
  } else if (data === undefined) {
    corps = <Loader mode="inline" label="Chargement de vos services…" />
  } else if (!etab) {
    corps = (
      <Etat icone={Building2} titre="Aucun établissement" message="Votre compte n'est rattaché à aucun établissement actif.">
        <button type="button" className="portail-card-btn" onClick={() => logout('manual')}>Déconnexion</button>
      </Etat>
    )
  } else if (nonConforme) {
    corps = (
      <Etat icone={Building2} titre="Autre établissement" message="Votre compte appartient à un autre établissement que celui de cette adresse.">
        <button type="button" className="portail-card-btn"
          onClick={() => allerVersEtablissement(etab.slug, '/portail', navigate).catch(notify.fromError)}>
          Aller à mon établissement <ChevronRight size={14} aria-hidden="true" />
        </button>
      </Etat>
    )
  } else {
    const services = data.services ?? []
    const suspendu = etab.statut !== 'actif'
    
    // Formatage de la date au format JJ/MM/AAAA
    const dateAujourdhui = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })

    corps = (
      <>
        {suspendu && (
          <div className="portail-banner" role="status">
            <TriangleAlert size={18} aria-hidden="true" />
            <div><strong>Établissement suspendu</strong> Tous les services sont momentanément indisponibles.</div>
          </div>
        )}
        <section aria-labelledby="portail-titre">
          <div className="portail-section-head">
            <h2 id="portail-titre" className="portail-section-title">Portail</h2>
            
            {/* Remplacement du compteur par la date du jour */}
            <span className="portail-badge-date">
              <CalendarDays size={14} aria-hidden="true" />
              {dateAujourdhui}
            </span>

          </div>
          {services.length === 0 && !data.estAdmin ? (
            <Etat icone={Building2} titre="Aucun service pour le moment" message="Aucun service n'est encore disponible pour votre établissement." />
          ) : (
            <div className="bloc3d-grid">
              {data.estAdmin && (
                <Bloc3D etat="config" index={0} icone={Settings} nom="Configuration" pill="Ouvrir" to={lienEtablissement(slug, '/configuration')} />
              )}
              {services.map((s, i) => {
                const index = i + 1
                if (!s.accessible)
                  return <Bloc3D key={s.uuid} etat="verrouille" index={index} numero={index} nom={s.nom} pill={PILLS[s.motif] ?? 'Indisponible'} motif={MOTIFS[s.motif] ?? 'Accès indisponible.'} />
                return serviceDisponible(s.code)
                  ? <Bloc3D key={s.uuid} etat="actif"   index={index} numero={index} nom={s.nom} pill="Se connecter"    to={lienEtablissement(slug, `/${s.code}`)} />
                  : <Bloc3D key={s.uuid} etat="bientot" index={index} numero={index} nom={s.nom} pill="Bientôt disponible" motif="Bientôt disponible" />
              })}
            </div>
          )}
        </section>
      </>
    )
  }

  return (
    <div className="portail-shell">

      <header className="portail-header">
        <div className="portail-bar">
          <div className="portail-bar-inner">

            {/* Gauche : logo + nom établissement */}
            <Link to={lienEtablissement(slug, '/portail')} className="portail-bar-brand">
              <span className="portail-bar-logo">
                {etab?.logoUrl
                  ? <img src={etab.logoUrl} alt={etab?.nom ?? ''} style={{ width:'100%', height:'100%', objectFit:'contain', borderRadius:6 }} />
                  : <img src="/sigapei.png" alt={ENV.appName} />}
              </span>
              <span className="portail-bar-texte">                
                <span className="portail-bar-nom">{etab?.nom ?? ENV.appName}</span>
              </span>
            </Link>

            {/* Centre : avatar + nom utilisateur */}
            <div className="portail-user">
              <span className="portail-avatar" aria-hidden="true">{initiales}</span>
              <span className="portail-user-texte">
                <span className="portail-user-nom">{nom}</span>
                {role && <span className="portail-user-role">{role}</span>}
              </span>
            </div>

            {/* Droite : actions */}
            <div className="portail-bar-actions">
              <button className="portail-icon-btn" aria-label="Notifications" title="Notifications">
                <Bell size={19} aria-hidden="true" />
              </button>
              <ThemeToggle className="portail-icon-btn" />
              <button
                type="button"
                className="portail-icon-btn portail-icon-btn--logout"
                onClick={() => logout('manual')}
                aria-label="Déconnexion"
                title="Déconnexion"
              >
                <LogOut size={19} aria-hidden="true" />
              </button>
            </div>

          </div>
        </div>

        {/* Bande or EN BAS du header */}
        <div className="portail-header-band" aria-hidden="true" />
      </header>

      {/* ════════════════ CONTENU ════════════════ */}
      <main className="portail-main">
        {corps}
      </main>

      {/* ════════════════ FOOTER FIXE ════════════════ */}
      <footer className="portail-footer">
        <span>© {new Date().getFullYear()} {etab?.nom ?? ENV.appName}</span>
      </footer>

    </div>
  )
}