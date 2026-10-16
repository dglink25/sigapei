// Formats acceptés : youtube.com/watch?v=…, youtu.be/…, /embed/…, /shorts/…
const MOTIF_YOUTUBE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/

export function extraireIdYoutube(url) {
  if (!url) return null
  const correspondance = String(url).match(MOTIF_YOUTUBE)
  return correspondance ? correspondance[1] : null
}

const MOTIF_CLOUDINARY =
  /^https:\/\/res\.cloudinary\.com\/([^/]+)\/video\/upload\/(.+)$/

/**
 * Dérive le manifeste HLS adaptatif (.m3u8) d'une URL de vidéo Cloudinary.
 * Cloudinary génère automatiquement les variantes de débit : le lecteur
 * hls.js sélectionnera la qualité adaptée à la connexion (règle du cahier
 * des charges : utilisable en connexion faible).
 */
export function urlHlsCloudinary(url) {
  const correspondance = String(url || '').match(MOTIF_CLOUDINARY)
  if (!correspondance) return null
  const [, cloud, chemin] = correspondance
  const identifiantPublic = chemin.replace(/\.[a-z0-9]+$/i, '')
  return `https://res.cloudinary.com/${cloud}/video/upload/sp_auto/${identifiantPublic}.m3u8`
}

export function estManifesteHls(url) {
  return /\.m3u8($|\?)/i.test(String(url || ''))
}
