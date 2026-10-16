import { useEffect, useState } from 'react'

import { useMajParametres, useParametres } from '../../api/admin.js'
import { messageErreur } from '../../api/client.js'
import { ErreurApi } from '../../components/ErreurApi.jsx'
import { Icone } from '../../components/Icone.jsx'
import { Interrupteur } from '../../components/Interrupteur.jsx'
import { SqueletteTexte } from '../../components/Squelette.jsx'

export function ParametresPage() {
  const parametres = useParametres()
  const maj = useMajParametres()

  const [tentativesMultiples, setTentativesMultiples] = useState(false)
  const [restitutionDefaut, setRestitutionDefaut] = useState('immediate')
  const [visibiliteParents, setVisibiliteParents] = useState(false)

  useEffect(() => {
    if (parametres.data) {
      setTentativesMultiples(
        Boolean(parametres.data.tentatives_multiples_defaut),
      )
      setRestitutionDefaut(parametres.data.restitution_defaut)
      setVisibiliteParents(Boolean(parametres.data.visibilite_parents))
    }
  }, [parametres.data])

  function soumettre(evenement) {
    evenement.preventDefault()
    maj.mutate({
      tentatives_multiples_defaut: tentativesMultiples,
      restitution_defaut: restitutionDefaut,
      visibilite_parents: visibiliteParents,
    })
  }

  if (parametres.isPending) {
    return (
      <>
        <h1>Paramètres du module</h1>
        <SqueletteTexte lignes={6} />
      </>
    )
  }
  if (parametres.isError) {
    return (
      <ErreurApi
        erreur={parametres.error}
        reessayer={() => parametres.refetch()}
      />
    )
  }

  return (
    <>
      <div className="titre-page">
        <div>
          <h1>Paramètres du module</h1>
          <span className="badge badge-texte">Singleton du tenant</span>
        </div>
      </div>
      <p className="texte-efface">
        Paramétrage du tenant (créé automatiquement au premier accès). Ces
        valeurs servent de défauts à la création des quiz.
      </p>

      <form className="carte formulaire" onSubmit={soumettre}>
        <div className="champ">
          <Interrupteur
            nom="parametres-tentatives"
            libelle="Tentatives multiples activées par défaut"
            coche={tentativesMultiples}
            onChange={setTentativesMultiples}
          />
        </div>

        <div className="champ">
          <label htmlFor="parametres-restitution">
            Restitution des résultats par défaut
          </label>
          <select
            id="parametres-restitution"
            value={restitutionDefaut}
            onChange={(e) => setRestitutionDefaut(e.target.value)}
          >
            <option value="immediate">Immédiate</option>
            <option value="apres_date_limite">Après date limite</option>
            <option value="differee">Différée (validation enseignant)</option>
          </select>
        </div>

        <div className="champ">
          <Interrupteur
            nom="parametres-parents"
            libelle="Visibilité des résultats par les parents"
            coche={visibiliteParents}
            onChange={setVisibiliteParents}
          />
        </div>

        <button
          type="submit"
          className="bouton bouton-primaire"
          disabled={maj.isPending}
        >
          {maj.isPending ? (
            <>
              <span className="roue" aria-hidden="true" /> Enregistrement…
            </>
          ) : (
            <>
              <Icone nom="save" />
              Enregistrer les paramètres
            </>
          )}
        </button>

        {maj.isError && (
          <p className="erreur-champ" role="alert">
            {messageErreur(maj.error)}
          </p>
        )}
      </form>
    </>
  )
}
