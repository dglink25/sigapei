import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

import {
  estManifesteHls,
  extraireIdYoutube,
  urlHlsCloudinary,
} from '../utils/video.js'

/**
 * Lecteur unique du module :
 * - URL YouTube → iframe d'embed (youtube-nocookie) ;
 * - URL Cloudinary ou manifeste .m3u8 → hls.js (streaming adaptatif,
 *   qualité ajustée au débit — cahier des charges « connexion faible ») ;
 * - repli natif sur Safari, puis sur la source brute si HLS échoue.
 */
export function LecteurVideo({ url, titre = 'Lecture vidéo' }) {
  const refVideo = useRef(null)
  const idYoutube = extraireIdYoutube(url)

  useEffect(() => {
    const video = refVideo.current
    if (!video || !url || idYoutube) return undefined

    const sourceHls =
      urlHlsCloudinary(url) ?? (estManifesteHls(url) ? url : null)
    let hls

    if (sourceHls && Hls.isSupported()) {
      hls = new Hls({ capLevelToPlayerSize: true })
      hls.loadSource(sourceHls)
      hls.attachMedia(video)
      hls.on(Hls.Events.ERROR, (_evenement, donnees) => {
        // Erreur fatale (manifeste absent, CDN indisponible…) : repli sur
        // la lecture directe de l'URL d'origine.
        if (donnees.fatal) {
          hls?.destroy()
          video.src = url
        }
      })
    } else if (sourceHls) {
      // Safari lit le HLS nativement, sans hls.js.
      video.src = sourceHls
    } else {
      video.src = url
    }

    return () => {
      hls?.destroy()
    }
  }, [url, idYoutube])

  if (!url) return null

  if (idYoutube) {
    return (
      <div className="video-cadre">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${idYoutube}`}
          title={titre}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    )
  }

  return (
    <div className="video-cadre">
      <video
        ref={refVideo}
        controls
        playsInline
        preload="metadata"
        aria-label={titre}
      />
    </div>
  )
}
