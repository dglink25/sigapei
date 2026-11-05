import { useEffect, useState } from 'react'

import { api, messageErreur } from '../api/client.js'
import { Icone } from './Icone.jsx'
import { notifierInfo, notifierSucces } from '../stores/toasts.js'
import { ROLES, useProfilStore } from '../stores/profil.js'

/** Ce que le rôle sélectionné change concrètement dans l'application. */
const EFFET_ROLE = {
  enseignant:
    'Saisit les présences/absences de ses cours et corrige une présence le jour même.',
  censeur:
    'Corrige les présences hors fenêtre, signale les incidents, applique les sanctions et suit les alertes au seuil.',
  administrateur:
    'Dispose de tous les droits du censeur pour piloter la vie scolaire de l’établissement.',
  parent: "Vue parent : consulte le dossier de vie scolaire de l'apprenant suivi.",
  apprenant: 'Vue apprenant : consulte son propre dossier de vie scolaire.',
}

/** Champ texte (UUID ou identifiant) avec bouton « Copier ». */
function Champ({ id, libelle, champ, placeholder, aide, valeurs, modifier, type }) {
  return (
    <div className="champ">
      <label htmlFor={id}>{libelle}</label>
      <input
        id={id}
        type={type ?? 'text'}
        value={valeurs[champ]}
        onChange={(evenement) => modifier(champ, evenement.target.value)}
        placeholder={placeholder}
      />
      {aide ? <p className="aide">{aide}</p> : null}
    </div>
  )
}

/** Ligne « étiquette + valeur mono + bouton Copier » (données techniques). */
function LigneCopier({ libelle, valeur }) {
  return (
    <div className="copie-ligne">
      <span className="texte-efface" style={{ minWidth: '6rem' }}>
        {libelle}
      </span>
      <code className="police-mono">{valeur || '-'}</code>
      <button
        type="button"
        className="bouton bouton-secondaire bouton-compact"
        onClick={() => {
          if (!valeur) {
            notifierInfo('Aucune valeur à copier pour le moment.')
            return
          }
          navigator.clipboard
            .writeText(valeur)
            .then(() => notifierSucces(`${libelle} copié dans le presse-papiers.`))
            .catch(() => notifierInfo('Copie refusée par le navigateur.'))
        }}
      >
        <Icone nom="content_copy" />
        Copier
      </button>
    </div>
  )
}

/**
 * Stand-in du SSO : tant que la gateway ne fournit pas de JWT, ce panneau
 * définit le tenant (X-Tenant-Id numérique), le rôle, l'utilisateur et les
 * UUID externes qui préremplissent filtres et formulaires. Persisté en
 * localStorage, il prend effet immédiatement sur les requêtes suivantes.
 */
export function PanneauProfil() {
  const profil = useProfilStore()
  const [valeurs, setValeurs] = useState({
    tenantId: profil.tenantId,
    role: profil.role,
    userId: profil.userId,
    apprenantId: profil.apprenantId,
    classeId: profil.classeId,
    coursId: profil.coursId,
    captchaToken: profil.captchaToken,
  })

  // Santé du backend : une requête légère mesure la latence. L'état porte le
  // tenant mesuré, ce qui évite tout setState synchrone dans l'effet.
  const [mesure, setMesure] = useState(null)

  useEffect(() => {
    if (!profil.tenantId) return undefined
    let annule = false
    const tenant = profil.tenantId
    async function mesurer() {
      const debut = performance.now()
      try {
        await api.get('/presences', { params: { limit: 1 } })
        if (annule) return
        setMesure({
          tenantId: tenant,
          latence: Math.round(performance.now() - debut),
          ok: true,
          detail: null,
        })
      } catch (erreur) {
        if (annule) return
        setMesure({
          tenantId: tenant,
          latence: null,
          ok: false,
          detail: messageErreur(erreur),
        })
      }
    }
    mesurer()
    return () => {
      annule = true
    }
  }, [profil.tenantId])

  const mesureCourante =
    mesure && mesure.tenantId === profil.tenantId ? mesure : null
  const statutBackend = !profil.tenantId
    ? 'tenant requis'
    : mesureCourante
      ? mesureCourante.ok
        ? 'en ligne'
        : 'injoignable'
      : 'vérification…'
  const latence = mesureCourante?.latence ?? null
  const detailBackend = mesureCourante?.detail ?? null

  function modifier(champ, valeur) {
    setValeurs((etat) => ({ ...etat, [champ]: valeur }))
  }

  function enregistrer(evenement) {
    evenement.preventDefault()
    profil.majProfil(valeurs)
    notifierSucces('Profil de démonstration enregistré.')
  }

  const roleCourant = ROLES.find((r) => r.valeur === valeurs.role) ?? ROLES[0]
  const initiales = roleCourant.libelle.slice(0, 2).toUpperCase()

  return (
    <form className="carte formulaire" onSubmit={enregistrer}>
      {/* Carte identité */}
      <div className="element-tete">
        <span className="avatar avatar-lg">{initiales}</span>
        <div>
          <strong>{roleCourant.libelle} de démonstration</strong>
          <p className="texte-efface" style={{ margin: 0 }}>
            Tenant :{' '}
            <code className="police-mono">
              {valeurs.tenantId ? `n°${valeurs.tenantId}` : 'non renseigné'}
            </code>
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

      {/* Tenant & utilisateur */}
      <section className="section">
        <div className="element-tete">
          <h2 style={{ margin: 0 }}>Établissement (tenant)</h2>
          <span className="texte-efface">En-têtes de la passerelle</span>
        </div>

        <Champ
          id="profil-tenant"
          libelle="Identifiant du tenant (X-Tenant-Id) *"
          champ="tenantId"
          placeholder="Identifiant numérique, ex. 1"
          aide="Obligatoire et numérique : le backend refuse (401) toute requête /v1/ sans X-Tenant-Id valide."
          valeurs={valeurs}
          modifier={modifier}
        />

        <Champ
          id="profil-user"
          libelle="Utilisateur connecté — UUID (X-User-Id / claim sub)"
          champ="userId"
          placeholder="UUID de l'utilisateur"
          aide="Référence externe (identite) : sert d'auteur aux corrections, incidents et sanctions."
          valeurs={valeurs}
          modifier={modifier}
        />

        <div className="element-tete" style={{ marginTop: '0.75rem' }}>
          <span className="badge badge-synchro">
            <Icone nom="dns" />
            {statutBackend}
            {latence !== null ? ` - ${latence} ms` : ''}
          </span>
        </div>
        {detailBackend && (
          <p className="erreur-champ" role="alert">
            {detailBackend}
          </p>
        )}
      </section>

      {/* Jeton CAPTCHA */}
      <section className="section">
        <div className="element-tete">
          <h2 style={{ margin: 0 }}>Jeton CAPTCHA (règle n°4)</h2>
          <span className="texte-efface">En-tête X-Captcha-Token</span>
        </div>
        <Champ
          id="profil-captcha"
          libelle="Jeton CAPTCHA"
          champ="captchaToken"
          placeholder="captchaToken produit par le widget reCAPTCHA/hCaptcha"
          aide="Exigé sur POST /presences, PUT /presences/{uuid}, POST /incidents et POST /incidents/{uuid}/sanction. Sans clé secrète configurée côté backend, ces routes répondent 503."
          valeurs={valeurs}
          modifier={modifier}
        />
      </section>

      {/* Identifiants externes */}
      <section className="section">
        <div className="element-tete">
          <h2 style={{ margin: 0 }}>Identifiants externes</h2>
          <span className="texte-efface">Préremplissent filtres et formulaires</span>
        </div>

        <div className="grille-2-colonnes">
          <Champ
            id="profil-apprenant"
            libelle="UUID apprenant (scolarite.apprenants)"
            champ="apprenantId"
            placeholder="Dossier de vie scolaire"
            valeurs={valeurs}
            modifier={modifier}
          />
          <Champ
            id="profil-classe"
            libelle="UUID classe (scolarite.classes)"
            champ="classeId"
            placeholder="Filtres présences/incidents"
            valeurs={valeurs}
            modifier={modifier}
          />
          <Champ
            id="profil-cours"
            libelle="UUID cours (scolarite.emplois_du_temps)"
            champ="coursId"
            placeholder="Saisie de présences"
            valeurs={valeurs}
            modifier={modifier}
          />
        </div>
      </section>

      {/* Données techniques */}
      <section className="section">
        <div className="element-tete">
          <h2 style={{ margin: 0 }}>Données techniques</h2>
        </div>
        <div
          className="carte-interieure"
          style={{ display: 'grid', gap: '0.6rem', marginTop: 0 }}
        >
          <LigneCopier libelle="Tenant" valeur={valeurs.tenantId} />
          <LigneCopier libelle="Utilisateur" valeur={valeurs.userId} />
        </div>
        <p className="aide">
          Le tenant part dans l&#39;en-tête X-Tenant-Id de chaque requête /v1/ ;
          l&#39;identifiant utilisateur est une référence externe (identite),
          jamais une clé locale.
        </p>
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
            notifierInfo(
              'Hors périmètre : le multi-établissements relève du SSO de la plateforme.',
            )
          }
        >
          Changer d&#39;établissement
        </button>
        <button
          type="button"
          className="bouton bouton-secondaire"
          onClick={() =>
            notifierInfo('Hors périmètre : aucune session SSO n\u2019est branchée.')
          }
        >
          Se déconnecter
        </button>
      </div>
    </form>
  )
}
