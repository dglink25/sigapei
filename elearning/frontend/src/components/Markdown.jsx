import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { extraireIdYoutube } from '../utils/video.js'

function VideoYoutube({ id }) {
  return (
    <div className="video-cadre">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title="Vidéo YouTube"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  )
}

// Rendu contrôlé : le HTML brut n'est jamais interprété, les images sont
// chargées en différé et les liens YouTube deviennent un lecteur intégré.
const COMPOSANTS = {
  img: ({ node, ...props }) => (
    <img {...props} loading="lazy" className="markdown-image" alt={props.alt ?? ''} />
  ),
  a: ({ node, href, children, ...props }) => {
    const idYoutube = extraireIdYoutube(href)
    if (idYoutube) return <VideoYoutube id={idYoutube} />
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" {...props}>
        {children}
      </a>
    )
  },
}

export function Markdown({ contenu, compacte = false }) {
  return (
    <div className={compacte ? 'markdown markdown-compacte' : 'markdown'}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPOSANTS}>
        {contenu ?? ''}
      </ReactMarkdown>
    </div>
  )
}
