import { useRef, useState } from 'react'

import { Icone } from './Icone.jsx'
import { Markdown } from './Markdown.jsx'

/**
 * Éditeur de contenu Markdown : barre d'outils (gras, italique, titres,
 * listes, formules LaTeX, code, liens, images) et onglets Édition / Aperçu.
 * Les contenus sont rendus par <Markdown /> (YouTube, images et liens gérés).
 */
export function EditeurMarkdown({
  valeur,
  onChange,
  lignes = 8,
  libelle,
  aide = true,
}) {
  const refZone = useRef(null)
  const [apercu, setApercu] = useState(false)

  function entourer(avant, apres = avant, base = 'texte') {
    const zone = refZone.current
    const debut = zone?.selectionStart ?? valeur.length
    const fin = zone?.selectionEnd ?? debut
    const extrait = valeur.slice(debut, fin) || base
    onChange(valeur.slice(0, debut) + avant + extrait + apres + valeur.slice(fin))
    requestAnimationFrame(() => {
      zone?.focus()
      zone?.setSelectionRange(
        debut + avant.length,
        debut + avant.length + extrait.length,
      )
    })
  }

  function prefixerLignes(prefixe) {
    const zone = refZone.current
    const debut = zone?.selectionStart ?? valeur.length
    const debutLigne = valeur.lastIndexOf('\n', Math.max(debut - 1, 0)) + 1
    onChange(
      valeur.slice(0, debutLigne) + prefixe + valeur.slice(debutLigne),
    )
    requestAnimationFrame(() => zone?.focus())
  }

  return (
    <div className="champ editeur-markdown">
      <div className="editeur-bandeau">
        {libelle && <label className="editeur-libelle">{libelle}</label>}
        <div className="editeur-outils" role="toolbar" aria-label="Mise en forme">
          <button type="button" title="Gras" onClick={() => entourer('**')}>
            <Icone nom="format_bold" />
          </button>
          <button type="button" title="Italique" onClick={() => entourer('*')}>
            <Icone nom="format_italic" />
          </button>
          <button
            type="button"
            title="Titre de section"
            onClick={() => prefixerLignes('## ')}
          >
            H2
          </button>
          <button
            type="button"
            title="Sous-titre"
            onClick={() => prefixerLignes('### ')}
          >
            H3
          </button>
          <button
            type="button"
            title="Liste à puces"
            onClick={() => prefixerLignes('- ')}
          >
            <Icone nom="format_list_bulleted" />
          </button>
          <button
            type="button"
            title="Formule LaTeX"
            onClick={() => entourer('$$', '$$', 'E = mc^2')}
          >
            <Icone nom="functions" />
          </button>
          <button type="button" title="Code" onClick={() => entourer('`')}>
            <Icone nom="code" />
          </button>
          <button
            type="button"
            title="Lien"
            onClick={() => entourer('[', '](https://…)', 'libellé')}
          >
            <Icone nom="link" />
          </button>
          <button
            type="button"
            title="Image"
            onClick={() => entourer('![', '](https://…)', 'légende')}
          >
            <Icone nom="image" />
          </button>
        </div>
        <div className="segmente" role="tablist" aria-label="Mode d'édition">
          <button
            type="button"
            role="tab"
            aria-selected={!apercu}
            className={
              apercu ? 'segmente-bouton' : 'segmente-bouton segmente-actif'
            }
            onClick={() => setApercu(false)}
          >
            Édition
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={apercu}
            className={
              apercu ? 'segmente-bouton segmente-actif' : 'segmente-bouton'
            }
            onClick={() => setApercu(true)}
          >
            Aperçu
          </button>
        </div>
      </div>

      {apercu ? (
        <div className="editeur-apercu carte-interieure">
          {valeur ? (
            <Markdown contenu={valeur} />
          ) : (
            <p className="texte-efface">Aucun contenu à prévisualiser.</p>
          )}
        </div>
      ) : (
        <textarea
          ref={refZone}
          rows={lignes}
          value={valeur}
          onChange={(evenement) => onChange(evenement.target.value)}
          placeholder="Contenu au format Markdown : **gras**, *italique*, listes, liens, images, formules $$LaTeX$$ et liens YouTube intégrés…"
        />
      )}

      {aide && (
        <p className="aide">
          Markdown simple pris en charge. Un lien YouTube devient
          automatiquement un lecteur intégré.
        </p>
      )}
    </div>
  )
}
