import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Building2, ChevronRight, RefreshCw, Settings, TriangleAlert } from 'lucide-react'
import { useAuth } from '../../context/identite/AuthContext'
import { useNotify } from '../../context/commun/NotifyContext'
import { ENV } from '../../config/commun/env'
import { roleCodeOf } from '../../config/identite/routes'
import { serviceDisponible } from '../../config/services/registre'
import { MODE_SOUS_DOMAINE, lienEtablissement } from '../../lib/etablissements/subdomain'
import { allerVersEtablissement } from '../../lib/identite/transfert'
import { portailService } from '../../services/identite/portail.service'
import useSlugEtablissement from '../../hooks/etablissements/useSlugEtablissement'
import usePageTitle from '../../hooks/commun/usePageTitle'
import EtablissementHeader from '../../components/etablissements/EtablissementHeader'
import Bloc3D from '../../components/etablissements/Bloc3D'
import Loader from '../../components/commun/Loader'
import './Portail.css'

const PILLS = {
  ACCES_NON_ACCORDE: 'Accès non accordé',
  SERVICE_BLOQUE: 'Service suspendu',
  ETABLISSEMENT_INACTIF: 'Indisponible',
}

const MOTIFS = {
  ACCES_NON_ACCORDE: "Accès non accordé. Contactez l'administrateur de votre établissement.",
  SERVICE_BLOQUE: 'Service suspendu pour votre établissement.',
  ETABLISSEMENT_INACTIF: 'Établissement suspendu : accès indisponible.',
}

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
  const notify = useNotify()
  const navigate = useNavigate()
  const slug = useSlugEtablissement()
  const [data, setData] = useState(undefined) // undefined = chargement
  const [erreur, setErreur] = useState(false)
  usePageTitle('Portail')

  const charger = useCallback(async () => {
    setErreur(false)
    try {
      setData(await portailService.lire())
    } catch (err) {
      notify.fromError(err)
      setErreur(true)
    }
  }, [notify])

  useEffect(() => {
    charger()
  }, [charger])

  const nom = user?.nomComplet ?? user?.nom_complet ?? 'Utilisateur'
  const prenom = nom.split(' ')[0]
  const roleCode = roleCodeOf(user)
  const etab = data?.etablissement
  const nonConforme = etab && etab.slug !== slug

  /* Local : on corrige l'adresse vers l'établissement de l'utilisateur */
  if (nonConforme && !MODE_SOUS_DOMAINE) return <Navigate to={lienEtablissement(etab.slug, '/portail')} replace />

  let corps
  if (erreur) {
    corps = (
      <Etat icone={TriangleAlert} titre="Portail indisponible" message="Impossible de charger vos services pour le moment.">
        <button type="button" className="portail-card-btn" onClick={charger}><RefreshCw size={14} aria-hidden="true" /> Réessayer</button>
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
        <button type="button" className="portail-card-btn" onClick={() => allerVersEtablissement(etab.slug, '/portail', navigate).catch(notify.fromError)}>
          Aller à mon établissement <ChevronRight size={14} aria-hidden="true" />
        </button>
      </Etat>
    )
  } else {
    const services = data.services ?? []
    const suspendu = etab.statut !== 'actif'
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
            <h2 id="portail-titre" className="portail-section-title">Mes services</h2>
            <span className="portail-section-count">{services.length} service{services.length > 1 ? 's' : ''}</span>
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
                if (!s.accessible) {
                  return (
                    <Bloc3D key={s.uuid} etat="verrouille" index={index} numero={index} nom={s.nom}
                      pill={PILLS[s.motif] ?? 'Indisponible'} motif={MOTIFS[s.motif] ?? 'Accès indisponible.'} />
                  )
                }
                return serviceDisponible(s.code)
                  ? <Bloc3D key={s.uuid} etat="actif" index={index} numero={index} nom={s.nom} pill="Se connecter" to={lienEtablissement(slug, `/${s.code}`)} />
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
      <EtablissementHeader slug={slug} etablissementNom={etab?.nom} sousTitre={etab ? `Bienvenue, ${prenom}${roleCode ? ` · ${roleCode.replace(/_/g, ' ')}` : ''}` : undefined} />
      <main className="portail-main">{corps}</main>
      <footer className="portail-footer">
        <span>© {new Date().getFullYear()} {ENV.appName}</span>
      </footer>
    </div>
  )
}
