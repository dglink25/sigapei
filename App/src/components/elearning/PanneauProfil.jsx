import { useEffect, useState } from 'react'

import { useParametres, useMajParametres, useStatistiques } from '../../services/elearning/admin.js'
import { api, messageErreur } from '../../services/elearning/client.js'
import { Icone } from './Icone.jsx'
import { Interrupteur } from './Interrupteur.jsx'
import { useNotify } from '../../context/commun/NotifyContext'
import { ROLES, peutPublier, useProfilStore } from '../../context/elearning/profil.js'
import { formaterNombre } from '../../lib/elearning/format.js'

/** Champ texte UUID avec bouton « Générer » (démonstration sans SSO). */
function ChampUuid({ id, libelle, champ, placeholder, aide, valeurs, modifier }) {
  return (
    <div className="champ">
      <label htmlFor={id}>{libelle}</label>
      <div className="selection-media-ligne">
        <input
          id={id}
          type="text"
          value={valeurs[champ]}
          onChange={(evenement) => modifier(champ, evenement.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="bouton bouton-secondaire bouton-compact"
          onClick={() => modifier(champ, crypto.randomUUID())}
          title="Génère un UUID aléatoire pour la démonstration"
        >
          Générer
        </button>
      </div>
      {aide ? <p className="aide">{aide}</p> : null}
    </div>
  )
}

/** Ligne « étiquette + valeur mono + bouton Copier » (données techniques). */
function LigneCopier({ libelle, valeur }) {
  const notify = useNotify()
  return (
    <div className="copie-ligne">
      <span className="texte-efface" style={{ minWidth: '5.5rem' }}>
        {libelle}
      </span>
      <code className="police-mono">{valeur || '-'}</code>
      <button
        type="button"
        className="bouton bouton-secondaire bouton-compact"
        onClick={() => {
          if (!valeur) {
            notify.info('Aucune valeur à copier pour le moment.')
            return
          }
          navigator.clipboard
            .writeText(valeur)
            .then(() => notify.success(`${libelle} copié dans le presse-papiers.`))
            .catch(() => notify.info('Copie refusée par le navigateur.'))
        }}
      >
        <Icone nom="content_copy" />
        Copier
      </button>
    </div>
  )
}

/** Ce que le rôle sélectionné change concrètement dans l'application. */
const EFFET_ROLE = {
  enseignant:
    'Espaces Cours, Devoirs et Quiz en mode création : publier, noter, reporter les notes.',
  apprenant:
    "Accès apprenant : consulter les cours, déposer les devoirs et passer les quiz.",
  parent: 'Vue parent : consulter l’activité de l’apprenant sélectionné.',
  administrateur:
    'Vue administration : statistiques consolidées et paramètres du module.',
}

/** Préférences de notification (singleton ParametresModule du tenant).
 * Le PUT est réservé à l'administrateur (bilan RBAC) : les autres rôles
 * voient les interrupteurs en lecture seule. */
function CartePreferences() {
  const parametres = useParametres()
  const majParametres = useMajParametres()
  const role = useProfilStore((etat) => etat.role)
  const modifiable = role === 'administrateur'

  function bascule(cle, coche) {
    majParametres.mutate({ ...parametres.data, [cle]: coche })
  }

  if (parametres.isError) {
    return (
      <p className="texte-efface">
        Hors périmètre pour l'instant : les préférences de notification
        nécessitent les champs alertes_sms, recap_email et notifications_push
        sur le singleton ParametresModule côté backend.
      </p>
    )
  }
  if (parametres.isPending) {
    return <p className="texte-efface">Chargement des préférences…</p>
  }

  const preferences = [
    { cle: 'alertes_sms', nom: 'pref-sms', libelle: 'Alertes SMS aux apprenants' },
    {
      cle: 'recap_email',
      nom: 'pref-email',
      libelle: 'Récapitulatif hebdomadaire par e-mail',
    },
    { cle: 'notifications_push', nom: 'pref-push', libelle: 'Notifications push' },
  ]

  return (
    <div style={{ display: 'grid', gap: '0.6rem' }}>
      {preferences.map((preference) => (
        <Interrupteur
          key={preference.cle}
          nom={preference.nom}
          libelle={preference.libelle}
          coche={Boolean(parametres.data?.[preference.cle])}
          onChange={(coche) => bascule(preference.cle, coche)}
          desactive={!modifiable}
        />
      ))}
      {modifiable ? (
        majParametres.isError && (
          <p className="erreur-champ" role="alert">
            {messageErreur(majParametres.error)}
          </p>
        )
      ) : (
        <p className="aide">
          Lecture seule : le paramétrage du tenant est réservé à
          l'administrateur.
        </p>
      )}
      <p className="aide">
        Enregistrées dans le singleton /v1/parametres/ du tenant (PUT).
      </p>
    </div>
  )
}

/**
 * Stand-in du SSO : tant que la gateway ne fournit pas de JWT, ce panneau
 * définit le tenant (X-Tenant-ID), le rôle et les UUID externes utilisés
 * pour préremplir formulaires et filtres. Tout est persisté en
 * localStorage et prend effet immédiatement sur les requêtes suivantes.
 */
export function PanneauProfil() {
  const notify = useNotify()
  const profil = useProfilStore()
  const [valeurs, setValeurs] = useState({
    tenantId: profil.tenantId,
    role: profil.role,
    matiereId: profil.matiereId,
    classeId: profil.classeId,
    enseignantId: profil.enseignantId,
    apprenantId: profil.apprenantId,
  })

  // Statistiques du tenant : réservées enseignant/administrateur (RBAC).
  const statistiques = useStatistiques({
    enabled: Boolean(profil.tenantId) && peutPublier(profil.role),
  })

  // Santé du backend : une requête légère mesure la latence au chargement.
  const [latence, setLatence] = useState(null)
  const [statutBackend, setStatutBackend] = useState('vérification…')

  useEffect(() => {
    let annule = false
    if (!profil.tenantId) {
      setStatutBackend('tenant requis')
      setLatence(null)
      return () => {}
    }
    async function mesurer() {
      const debut = performance.now()
      try {
        // GET /v1/parametres/ : ouvert à tous les rôles (la route
        // /statistiques/ est réservée enseignant/administrateur).
        await api.get('/parametres/')
        if (annule) return
        setLatence(Math.round(performance.now() - debut))
        setStatutBackend('en ligne')
      } catch {
        if (annule) return
        setStatutBackend('injoignable')
      }
    }
    mesurer()
    return () => {
      annule = true
    }
  }, [profil.tenantId])

  function modifier(champ, valeur) {
    setValeurs((etat) => ({ ...etat, [champ]: valeur }))
  }

  function enregistrer(evenement) {
    evenement.preventDefault()
    profil.majProfil(valeurs)
    notify.success('Profil de démonstration enregistré.')
  }

  const roleCourant = ROLES.find((r) => r.valeur === valeurs.role) ?? ROLES[0]
  const initiales = roleCourant.libelle.slice(0, 2).toUpperCase()
  const matricule = valeurs.apprenantId
    ? `${valeurs.apprenantId.slice(0, 8)}…`
    : 'non renseigné'

  return (
    <form className="carte formulaire" onSubmit={enregistrer}>
      {/* Carte identité */}
      <div className="element-tete">
        <span className="avatar avatar-lg">{initiales}</span>
        <div>
          <strong>{roleCourant.libelle} de démonstration</strong>
          <p className="texte-efface" style={{ margin: 0 }}>
            Matricule : <code className="police-mono">{matricule}</code>
          </p>
        </div>
        <span className="badge badge-publie" style={{ marginLeft: 'auto' }}>
          <Icone nom="verified" />
          Vérifié
        </span>
      </div>

      {/* Simulateur de rôle */}
      <section className="section">
        <div className="element-tete">
          <h2 style={{ margin: 0 }}>Simulateur de rôle</h2>
          <span className="texte-efface">Sans authentification réelle</span>
        </div>
        <div className="grands-choix">
          {ROLES.map((role) => (
            <button
              key={role.valeur}
              type="button"
              className={`grand-choix${valeurs.role === role.valeur ? ' grand-choix-actif' : ''}`}
              onClick={() => modifier('role', role.valeur)}
            >
              <span className="grand-choix-titre">{role.libelle}</span>
              <span className="grand-choix-sous">Voir cette vue</span>
            </button>
          ))}
        </div>
        <p className="aide">{EFFET_ROLE[valeurs.role]}</p>
      </section>

      {/* Tenant & identifiants */}
      <section className="section">
        <div className="element-tete">
          <h2 style={{ margin: 0 }}>Établissement (tenant)</h2>
          <span className="texte-efface">En-tête X-Tenant-ID</span>
        </div>

        <ChampUuid
          id="profil-tenant"
          libelle="Identifiant du tenant (X-Tenant-ID) *"
          champ="tenantId"
          placeholder="UUID de l'établissement, ex. 3f2c…"
          aide="Obligatoire : le backend refuse toute requête /v1/ sans en-tête X-Tenant-ID valide."
          valeurs={valeurs}
          modifier={modifier}
        />

        {profil.tenantId && peutPublier(profil.role) && (
          <div className="stats-3-colonnes">
            <div className="carte-interieure" style={{ marginTop: 0 }}>
              <span className="stat-valeur">
                {statistiques.isPending
                  ? '…'
                  : formaterNombre(statistiques.data?.cours?.publies)}
              </span>
              <span className="stat-libelle">Cours publiés</span>
            </div>
            <div className="carte-interieure" style={{ marginTop: 0 }}>
              <span className="stat-valeur">
                {statistiques.isPending
                  ? '…'
                  : formaterNombre(statistiques.data?.devoirs?.soumissions)}
              </span>
              <span className="stat-libelle">Soumissions</span>
            </div>
            <div className="carte-interieure" style={{ marginTop: 0 }}>
              <span className="stat-valeur">
                {statistiques.isPending
                  ? '…'
                  : formaterNombre(statistiques.data?.quiz?.tentatives)}
              </span>
              <span className="stat-libelle">Tentatives de quiz</span>
            </div>
          </div>
        )}
      </section>

      {/* Données techniques : UUID, copie, santé du backend */}
      <section className="section">
        <div className="element-tete">
          <h2 style={{ margin: 0 }}>Données techniques</h2>
          <span className="badge badge-synchro">
            <Icone nom="dns" />
            {statutBackend}
            {latence !== null ? ` - ${latence} ms` : ''}
          </span>
        </div>

        <div className="carte-interieure" style={{ display: 'grid', gap: '0.6rem', marginTop: 0 }}>
          <LigneCopier libelle="Tenant" valeur={valeurs.tenantId} />
          <LigneCopier
            libelle="Utilisateur"
            valeur={valeurs.enseignantId || valeurs.apprenantId}
          />
        </div>
        <p className="aide">
          Le tenant part dans l'en-tête X-Tenant-ID de chaque requête /v1/ ;
          l'identifiant utilisateur est une référence externe (rh.personnel ou
          scolarite.apprenants), jamais une clé locale.
        </p>
      </section>

      {/* Identifiants externes */}
      <section className="section">
        <div className="element-tete">
          <h2 style={{ margin: 0 }}>Identifiants externes</h2>
          <span className="texte-efface">Préremplissent formulaires et filtres</span>
        </div>

        <div className="grille-2-colonnes">
          <ChampUuid
            id="profil-matiere"
            libelle="UUID matière (evaluations.matieres)"
            champ="matiereId"
            placeholder="Préremplit les formulaires et filtres"
            valeurs={valeurs}
            modifier={modifier}
          />
          <ChampUuid
            id="profil-classe"
            libelle="UUID classe (scolarite.classes)"
            champ="classeId"
            placeholder="Préremplit les formulaires et filtres"
            valeurs={valeurs}
            modifier={modifier}
          />
          <ChampUuid
            id="profil-enseignant"
            libelle="UUID enseignant (rh.personnel)"
            champ="enseignantId"
            valeurs={valeurs}
            modifier={modifier}
          />
          <ChampUuid
            id="profil-apprenant"
            libelle="UUID apprenant (scolarite.apprenants)"
            champ="apprenantId"
            valeurs={valeurs}
            modifier={modifier}
          />
        </div>
      </section>

      {/* Préférences de notification */}
      <section className="section">
        <div className="element-tete">
          <h2 style={{ margin: 0 }}>Préférences de notification</h2>
          <span className="texte-efface">Singleton /v1/parametres/ du tenant</span>
        </div>
        <CartePreferences />
      </section>

      {/* Actions */}
      <div className="actions-ligne section">
        <button type="submit" className="bouton bouton-primaire">
          <Icone nom="save" />
          Enregistrer le profil
        </button>
        <button
          type="button"
          className="bouton bouton-secondaire"
          onClick={() =>
            notify.info(
              'Hors périmètre : le multi-établissements relève du SSO de la plateforme.',
            )
          }
        >
          Changer d'établissement
        </button>
        <button
          type="button"
          className="bouton bouton-secondaire"
          onClick={() =>
            notify.info('Hors périmètre : aucune session SSO n\u2019est branchée.')
          }
        >
          Se déconnecter
        </button>
      </div>
    </form>
  )
}
