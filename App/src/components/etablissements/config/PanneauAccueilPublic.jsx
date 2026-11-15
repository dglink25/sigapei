/**
 * PanneauAccueilPublic — Configuration de la page d'accueil publique
 * de l'établissement (hero slides, statistiques, formations, à propos,
 * galerie, actualités, réseaux sociaux).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  RefreshCw, Plus, Trash2, Save, X, ChevronUp, ChevronDown,
  Image as ImageIcon, Upload, Eye,
} from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import { accueilAdminService } from '../../../services/etablissements/accueilPublic.service'
import { detecterSlugEtablissement, lienEtablissement } from '../../../lib/etablissements/subdomain'
import useSlugEtablissement from '../../../hooks/etablissements/useSlugEtablissement'
import Loader from '../../commun/Loader'

/* ── Icônes de stats disponibles ── */
const STAT_ICONS_OPTIONS = [
  { id: 'users',      label: 'Personnes'     },
  { id: 'book',       label: 'Livre'         },
  { id: 'calendar',   label: 'Calendrier'    },
  { id: 'graduation', label: 'Diplomation'   },
  { id: 'microscope', label: 'Microscope'    },
  { id: 'award',      label: 'Prix'          },
  { id: 'building',   label: 'Bâtiment'      },
  { id: 'clock',      label: 'Horloge'       },
]

const NIVEAUX = ['Licence', 'Master', 'Doctorat', 'BTS', 'DUT', 'CAP', 'BAC', 'BAC+2', 'BAC+3', 'BAC+4', 'BAC+5']

/* ════════════════════════════════════════════════════════════
   ONGLETS
════════════════════════════════════════════════════════════ */
const ONGLETS = [
  { id: 'hero',        label: 'Hero / Slider'   },
  { id: 'stats',       label: 'Statistiques'    },
  { id: 'formations',  label: 'Formations'      },
  { id: 'apropos',     label: 'À propos'        },
  { id: 'galerie',     label: 'Galerie'         },
  { id: 'actualites',  label: 'Actualités'      },
  { id: 'reseaux',     label: 'Réseaux sociaux' },
]

/* ── Utilitaire UUID local ── */
const uid = () => Math.random().toString(36).slice(2)

/* ════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
════════════════════════════════════════════════════════════ */
export default function PanneauAccueilPublic() {
  const notify = useNotify()
  const slug   = useSlugEtablissement()

  const [onglet,   setOnglet]   = useState('hero')
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const r = await accueilAdminService.lire()
      setData({
        hero:          Array.isArray(r?.hero)          ? r.hero          : [],
        statistiques:  Array.isArray(r?.statistiques)  ? r.statistiques  : [],
        formations:    Array.isArray(r?.formations)    ? r.formations    : [],
        apropos:       r?.apropos  ?? { texte: '', mission: '', vision: '' },
        galerie:       Array.isArray(r?.galerie)       ? r.galerie       : [],
        actualites:    Array.isArray(r?.actualites)    ? r.actualites    : [],
        reseauxSociaux: r?.reseauxSociaux ?? { facebook:'', twitter:'', linkedin:'', instagram:'' },
      })
    } catch {
      notify.warning('Chargement', 'La page d\'accueil publique n\'est pas encore configurée. Commencez par ajouter du contenu.')
      setData({
        hero: [], statistiques: [], formations: [],
        apropos: { texte: '', mission: '', vision: '' },
        galerie: [], actualites: [],
        reseauxSociaux: { facebook: '', twitter: '', linkedin: '', instagram: '' },
      })
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => { charger() }, [charger])

  async function sauvegarder(section, payload) {
    setSaving(true)
    try {
      await accueilAdminService.mettreAJour(section, payload)
      notify.success('Sauvegardé', 'La page d\'accueil publique a été mise à jour.')
    } catch (err) {
      notify.fromError(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}><Loader mode="inline" label="Chargement de la configuration…" /></div>
  if (!data) return null

  const lienPreview = lienEtablissement(slug, '')

  return (
    <div className="cfg-tab">
      {/* En-tête */}
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Page d'accueil publique</h2>
          <p className="ap-page-sub">
            Configurez le contenu affiché aux visiteurs sur la page publique de votre établissement.
          </p>
        </div>
        <div className="ap-page-actions">
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={charger} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'ap-spin' : ''} /> Actualiser
          </button>
          <a href={lienPreview} target="_blank" rel="noreferrer" className="ap-btn ap-btn--sm ap-btn--ghost">
            <Eye size={14} /> Voir la page
          </a>
        </div>
      </div>

      {/* Onglets */}
      <div className="cfg-onglets" role="tablist">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={onglet === o.id}
            className={`cfg-onglet ${onglet === o.id ? 'is-actif' : ''}`}
            onClick={() => setOnglet(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Contenu onglet */}
      <div className="cfg-onglet-corps">
        {onglet === 'hero'       && <OngletHero       data={data} setData={setData} saving={saving} onSave={sauvegarder} notify={notify} />}
        {onglet === 'stats'      && <OngletStats      data={data} setData={setData} saving={saving} onSave={sauvegarder} />}
        {onglet === 'formations' && <OngletFormations  data={data} setData={setData} saving={saving} onSave={sauvegarder} notify={notify} />}
        {onglet === 'apropos'    && <OngletApropos    data={data} setData={setData} saving={saving} onSave={sauvegarder} />}
        {onglet === 'galerie'    && <OngletGalerie    data={data} setData={setData} saving={saving} onSave={sauvegarder} notify={notify} />}
        {onglet === 'actualites' && <OngletActualites  data={data} setData={setData} saving={saving} onSave={sauvegarder} notify={notify} />}
        {onglet === 'reseaux'    && <OngletReseaux    data={data} setData={setData} saving={saving} onSave={sauvegarder} />}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   ONGLET HERO / SLIDER
════════════════════════════════════════════════════════════ */
function OngletHero({ data, setData, saving, onSave, notify }) {
  const slides = data.hero
  const fileRef = useRef(null)
  const [uploadingIdx, setUploadingIdx] = useState(null)

  const setSlides = (fn) => setData((d) => ({ ...d, hero: typeof fn === 'function' ? fn(d.hero) : fn }))

  function ajouter() {
    setSlides((s) => [...s, { _id: uid(), imageUrl: '', titre: '', sousTitre: '', ctaLibelle: '', ctaUrl: '' }])
  }

  function maj(idx, patch) {
    setSlides((s) => s.map((item, i) => i === idx ? { ...item, ...patch } : item))
  }

  function supprimer(idx) {
    setSlides((s) => s.filter((_, i) => i !== idx))
  }

  function monter(idx) {
    if (idx === 0) return
    setSlides((s) => { const a = [...s]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a })
  }

  function descendre(idx) {
    setSlides((s) => { if (idx === s.length - 1) return s; const a = [...s]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a })
  }

  async function uploadImage(idx, file) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      notify.warning('Format invalide', 'Utilisez JPG, PNG ou WebP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.warning('Fichier trop lourd', 'L\'image ne doit pas dépasser 5 Mo.')
      return
    }
    setUploadingIdx(idx)
    try {
      const url = await accueilAdminService.uploadImage(file)
      if (url) maj(idx, { imageUrl: url })
    } catch { notify.warning('Upload échoué', 'Impossible d\'envoyer l\'image.') }
    finally { setUploadingIdx(null) }
  }

  return (
    <div className="pac-section">
      <div className="pac-section-head">
        <p className="ap-page-sub">Ajoutez des slides avec image, titre et bouton d'appel à l'action. Ils défileront en boucle sur la page d'accueil.</p>
        <button type="button" className="ap-btn ap-btn--sm" onClick={ajouter}>
          <Plus size={14} /> Ajouter un slide
        </button>
      </div>

      {slides.length === 0 && (
        <div className="ap-empty" style={{ padding: '2.5rem', border: '1px dashed var(--sg-border)', borderRadius: 12 }}>
          <ImageIcon size={32} />
          <p>Aucun slide. Ajoutez-en un pour créer le carousel de la page d'accueil.</p>
        </div>
      )}

      <div className="pac-liste">
        {slides.map((s, idx) => (
          <div key={s._id ?? idx} className="pac-item">
            <div className="pac-item-ordre">
              <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => monter(idx)} disabled={idx === 0} aria-label="Monter"><ChevronUp size={14} /></button>
              <span className="pac-item-num">{idx + 1}</span>
              <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => descendre(idx)} disabled={idx === slides.length - 1} aria-label="Descendre"><ChevronDown size={14} /></button>
            </div>

            <div className="pac-item-body">
              {/* Image */}
              <div className="pac-img-row">
                <div className="pac-img-preview">
                  {s.imageUrl
                    ? <img src={s.imageUrl} alt="Aperçu slide" />
                    : <div className="pac-img-ph"><ImageIcon size={24} /></div>
                  }
                </div>
                <div className="pac-img-actions">
                  <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { uploadImage(idx, e.target.files?.[0]); e.target.value = '' }} />
                  <button
                    type="button"
                    className="ap-btn ap-btn--ghost ap-btn--sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingIdx === idx}
                  >
                    {uploadingIdx === idx ? <><Loader mode="button" /> Envoi…</> : <><Upload size={13} /> {s.imageUrl ? 'Changer' : 'Choisir une image'}</>}
                  </button>
                  <p className="ap-hint">JPG, PNG ou WebP · 5 Mo max</p>
                  <div className="ap-field">
                    <label className="ap-label">Ou coller l'URL de l'image</label>
                    <input className="ap-input" value={s.imageUrl} onChange={(e) => maj(idx, { imageUrl: e.target.value })} placeholder="https://…" />
                  </div>
                </div>
              </div>

              {/* Champs texte */}
              <div className="pac-fields">
                <div className="ap-field pac-field-wide">
                  <label className="ap-label">Titre <em>*</em></label>
                  <input className="ap-input" value={s.titre} onChange={(e) => maj(idx, { titre: e.target.value })} placeholder="Ex. Des laboratoires à la pointe de la technologie" maxLength={120} />
                </div>
                <div className="ap-field pac-field-wide">
                  <label className="ap-label">Sous-titre</label>
                  <input className="ap-input" value={s.sousTitre} onChange={(e) => maj(idx, { sousTitre: e.target.value })} placeholder="Description courte visible sous le titre" maxLength={200} />
                </div>
                <div className="ap-field">
                  <label className="ap-label">Libellé du bouton CTA</label>
                  <input className="ap-input" value={s.ctaLibelle} onChange={(e) => maj(idx, { ctaLibelle: e.target.value })} placeholder="Ex. Découvrir" maxLength={40} />
                </div>
                <div className="ap-field">
                  <label className="ap-label">URL du bouton CTA</label>
                  <input className="ap-input" value={s.ctaUrl} onChange={(e) => maj(idx, { ctaUrl: e.target.value })} placeholder="https://… ou #section" maxLength={300} />
                </div>
              </div>
            </div>

            <button type="button" className="ap-btn ap-btn--danger ap-btn--sm pac-suppr" onClick={() => supprimer(idx)} aria-label="Supprimer le slide">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="pac-footer">
        <button type="button" className="ap-btn" onClick={() => onSave('hero', { hero: slides })} disabled={saving}>
          {saving ? <><Loader mode="button" /> Sauvegarde…</> : <><Save size={14} /> Enregistrer le slider</>}
        </button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   ONGLET STATISTIQUES
════════════════════════════════════════════════════════════ */
function OngletStats({ data, setData, saving, onSave }) {
  const stats = data.statistiques
  const setStats = (fn) => setData((d) => ({ ...d, statistiques: typeof fn === 'function' ? fn(d.statistiques) : fn }))

  function ajouter() {
    setStats((s) => [...s, { _id: uid(), icone: 'users', valeur: 0, libelle: '' }])
  }
  function maj(idx, patch) { setStats((s) => s.map((item, i) => i === idx ? { ...item, ...patch } : item)) }
  function supprimer(idx) { setStats((s) => s.filter((_, i) => i !== idx)) }

  return (
    <div className="pac-section">
      <div className="pac-section-head">
        <p className="ap-page-sub">Ces chiffres s'animent au défilement sur la page d'accueil (effet compte à rebours).</p>
        <button type="button" className="ap-btn ap-btn--sm" onClick={ajouter}><Plus size={14} /> Ajouter une statistique</button>
      </div>

      {stats.length === 0 && (
        <div className="ap-empty" style={{ padding: '2rem', border: '1px dashed var(--sg-border)', borderRadius: 12 }}>
          <p>Aucune statistique. Ajoutez des chiffres clés (étudiants, spécialités, année de création…).</p>
        </div>
      )}

      <div className="pac-stats-liste">
        {stats.map((s, idx) => (
          <div key={s._id ?? idx} className="pac-stat-item">
            <div className="ap-field">
              <label className="ap-label">Icône</label>
              <select className="ap-input" value={s.icone} onChange={(e) => maj(idx, { icone: e.target.value })}>
                {STAT_ICONS_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <div className="ap-field">
              <label className="ap-label">Valeur <em>*</em></label>
              <input className="ap-input" type="number" min="0" value={s.valeur} onChange={(e) => maj(idx, { valeur: parseInt(e.target.value, 10) || 0 })} placeholder="1950" />
            </div>
            <div className="ap-field pac-stat-libelle">
              <label className="ap-label">Libellé <em>*</em></label>
              <input className="ap-input" value={s.libelle} onChange={(e) => maj(idx, { libelle: e.target.value })} placeholder="Étudiants en formation" maxLength={60} />
            </div>
            <button type="button" className="ap-btn ap-btn--danger ap-btn--sm" onClick={() => supprimer(idx)} aria-label="Supprimer"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      <div className="pac-footer">
        <button type="button" className="ap-btn" onClick={() => onSave('statistiques', { statistiques: stats })} disabled={saving}>
          {saving ? <><Loader mode="button" /> Sauvegarde…</> : <><Save size={14} /> Enregistrer</>}
        </button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   ONGLET FORMATIONS
════════════════════════════════════════════════════════════ */
function OngletFormations({ data, setData, saving, onSave, notify }) {
  const formations = data.formations
  const setFormations = (fn) => setData((d) => ({ ...d, formations: typeof fn === 'function' ? fn(d.formations) : fn }))
  const fileRef = useRef(null)
  const [uploadingIdx, setUploadingIdx] = useState(null)

  function ajouter() {
    setFormations((s) => [...s, { _id: uid(), imageUrl: '', niveau: 'Licence', duree: '', titre: '', description: '', lienUrl: '' }])
  }
  function maj(idx, patch) { setFormations((s) => s.map((item, i) => i === idx ? { ...item, ...patch } : item)) }
  function supprimer(idx) { setFormations((s) => s.filter((_, i) => i !== idx)) }

  async function uploadImage(idx, file) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { notify.warning('Fichier trop lourd', 'Max 5 Mo.'); return }
    setUploadingIdx(idx)
    try {
      const url = await accueilAdminService.uploadImage(file)
      if (url) maj(idx, { imageUrl: url })
    } catch { notify.warning('Upload échoué', 'Impossible d\'envoyer l\'image.') }
    finally { setUploadingIdx(null) }
  }

  return (
    <div className="pac-section">
      <div className="pac-section-head">
        <p className="ap-page-sub">Présentez vos programmes et filières aux visiteurs de votre page d'accueil.</p>
        <button type="button" className="ap-btn ap-btn--sm" onClick={ajouter}><Plus size={14} /> Ajouter une formation</button>
      </div>

      {formations.length === 0 && (
        <div className="ap-empty" style={{ padding: '2rem', border: '1px dashed var(--sg-border)', borderRadius: 12 }}>
          <p>Aucune formation. Ajoutez vos programmes pour les présenter aux visiteurs.</p>
        </div>
      )}

      <div className="pac-liste">
        {formations.map((f, idx) => (
          <div key={f._id ?? idx} className="pac-item">
            <div className="pac-item-body">
              <div className="pac-img-row">
                <div className="pac-img-preview">
                  {f.imageUrl
                    ? <img src={f.imageUrl} alt="Aperçu formation" />
                    : <div className="pac-img-ph"><ImageIcon size={22} /></div>
                  }
                </div>
                <div className="pac-img-actions">
                  <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { uploadImage(idx, e.target.files?.[0]); e.target.value = '' }} />
                  <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => fileRef.current?.click()} disabled={uploadingIdx === idx}>
                    {uploadingIdx === idx ? <><Loader mode="button" /> Envoi…</> : <><Upload size={13} /> {f.imageUrl ? 'Changer' : 'Image'}</>}
                  </button>
                  <div className="ap-field">
                    <label className="ap-label">URL image</label>
                    <input className="ap-input" value={f.imageUrl} onChange={(e) => maj(idx, { imageUrl: e.target.value })} placeholder="https://…" />
                  </div>
                </div>
              </div>
              <div className="pac-fields">
                <div className="ap-field">
                  <label className="ap-label">Niveau</label>
                  <select className="ap-input" value={f.niveau} onChange={(e) => maj(idx, { niveau: e.target.value })}>
                    {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="ap-field">
                  <label className="ap-label">Durée</label>
                  <input className="ap-input" value={f.duree} onChange={(e) => maj(idx, { duree: e.target.value })} placeholder="Ex. 3 ans" maxLength={40} />
                </div>
                <div className="ap-field pac-field-wide">
                  <label className="ap-label">Titre <em>*</em></label>
                  <input className="ap-input" value={f.titre} onChange={(e) => maj(idx, { titre: e.target.value })} placeholder="Génie Civil" maxLength={120} />
                </div>
                <div className="ap-field pac-field-wide">
                  <label className="ap-label">Description</label>
                  <textarea className="ap-textarea" rows={2} value={f.description} onChange={(e) => maj(idx, { description: e.target.value })} placeholder="Courte description de la formation" maxLength={400} />
                </div>
                <div className="ap-field pac-field-wide">
                  <label className="ap-label">Lien "Découvrir"</label>
                  <input className="ap-input" value={f.lienUrl} onChange={(e) => maj(idx, { lienUrl: e.target.value })} placeholder="https://…" maxLength={300} />
                </div>
              </div>
            </div>
            <button type="button" className="ap-btn ap-btn--danger ap-btn--sm pac-suppr" onClick={() => supprimer(idx)} aria-label="Supprimer"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      <div className="pac-footer">
        <button type="button" className="ap-btn" onClick={() => onSave('formations', { formations })} disabled={saving}>
          {saving ? <><Loader mode="button" /> Sauvegarde…</> : <><Save size={14} /> Enregistrer</>}
        </button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   ONGLET À PROPOS
════════════════════════════════════════════════════════════ */
function OngletApropos({ data, setData, saving, onSave }) {
  const apropos = data.apropos
  const set = (patch) => setData((d) => ({ ...d, apropos: { ...d.apropos, ...patch } }))

  return (
    <div className="pac-section">
      <p className="ap-page-sub">Présentez votre établissement, sa mission et sa vision aux visiteurs.</p>
      <div className="ap-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="ap-field">
          <label className="ap-label">Présentation générale</label>
          <textarea className="ap-textarea" rows={5} value={apropos.texte} onChange={(e) => set({ texte: e.target.value })} placeholder="Décrivez votre établissement, son histoire, ses valeurs…" maxLength={2000} />
          <p className="ap-hint">{apropos.texte?.length ?? 0} / 2000 caractères</p>
        </div>
        <div className="ap-field">
          <label className="ap-label">Notre Mission</label>
          <textarea className="ap-textarea" rows={3} value={apropos.mission} onChange={(e) => set({ mission: e.target.value })} placeholder="La mission de notre établissement est…" maxLength={800} />
        </div>
        <div className="ap-field">
          <label className="ap-label">Notre Vision</label>
          <textarea className="ap-textarea" rows={3} value={apropos.vision} onChange={(e) => set({ vision: e.target.value })} placeholder="Notre vision pour les années à venir…" maxLength={800} />
        </div>
      </div>
      <div className="pac-footer">
        <button type="button" className="ap-btn" onClick={() => onSave('apropos', { apropos })} disabled={saving}>
          {saving ? <><Loader mode="button" /> Sauvegarde…</> : <><Save size={14} /> Enregistrer</>}
        </button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   ONGLET GALERIE
════════════════════════════════════════════════════════════ */
function OngletGalerie({ data, setData, saving, onSave, notify }) {
  const galerie = data.galerie
  const setGalerie = (fn) => setData((d) => ({ ...d, galerie: typeof fn === 'function' ? fn(d.galerie) : fn }))
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [nouvelleUrl, setNouvelleUrl] = useState('')

  function ajouterUrl() {
    if (!nouvelleUrl.trim()) return
    setGalerie((g) => [...g, nouvelleUrl.trim()])
    setNouvelleUrl('')
  }

  async function uploadMultiple(files) {
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) { notify.warning('Fichier trop lourd', `${file.name} dépasse 5 Mo.`); continue }
        const url = await accueilAdminService.uploadImage(file)
        if (url) setGalerie((g) => [...g, url])
      }
    } catch { notify.warning('Upload', 'Certains fichiers n\'ont pas pu être envoyés.') }
    finally { setUploading(false) }
  }

  return (
    <div className="pac-section">
      <p className="ap-page-sub">Ajoutez des photos de votre établissement. Les visiteurs pourront les voir en plein écran.</p>

      {/* Upload multiple */}
      <div className="ap-card" style={{ padding: '20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input ref={fileRef} type="file" hidden multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => { uploadMultiple(e.target.files); e.target.value = '' }} />
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <><Loader mode="button" /> Envoi…</> : <><Upload size={13} /> Uploader des photos</>}
          </button>
          <span className="ap-hint">ou</span>
          <input className="ap-input" style={{ flex: 1, minWidth: 220 }} value={nouvelleUrl} onChange={(e) => setNouvelleUrl(e.target.value)} placeholder="Coller une URL d'image…" onKeyDown={(e) => e.key === 'Enter' && ajouterUrl()} />
          <button type="button" className="ap-btn ap-btn--sm" onClick={ajouterUrl} disabled={!nouvelleUrl.trim()}><Plus size={14} /></button>
        </div>
      </div>

      {/* Grille galerie */}
      {galerie.length === 0 ? (
        <div className="ap-empty" style={{ padding: '2rem', border: '1px dashed var(--sg-border)', borderRadius: 12 }}>
          <ImageIcon size={32} />
          <p>Aucune photo. Ajoutez des images pour illustrer votre établissement.</p>
        </div>
      ) : (
        <div className="pac-galerie-grid">
          {galerie.map((url, idx) => (
            <div key={idx} className="pac-galerie-item">
              <img src={url} alt={`Photo ${idx + 1}`} loading="lazy" />
              <button type="button" className="pac-galerie-suppr" onClick={() => setGalerie((g) => g.filter((_, i) => i !== idx))} aria-label="Supprimer">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="pac-footer">
        <button type="button" className="ap-btn" onClick={() => onSave('galerie', { galerie })} disabled={saving}>
          {saving ? <><Loader mode="button" /> Sauvegarde…</> : <><Save size={14} /> Enregistrer</>}
        </button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   ONGLET ACTUALITÉS
════════════════════════════════════════════════════════════ */
function OngletActualites({ data, setData, saving, onSave, notify }) {
  const actualites = data.actualites
  const setActualites = (fn) => setData((d) => ({ ...d, actualites: typeof fn === 'function' ? fn(d.actualites) : fn }))
  const fileRef = useRef(null)
  const [uploadingIdx, setUploadingIdx] = useState(null)

  function ajouter() {
    setActualites((s) => [...s, { _id: uid(), imageUrl: '', titre: '', date: new Date().toISOString().slice(0, 10), extrait: '' }])
  }
  function maj(idx, patch) { setActualites((s) => s.map((item, i) => i === idx ? { ...item, ...patch } : item)) }
  function supprimer(idx) { setActualites((s) => s.filter((_, i) => i !== idx)) }

  async function uploadImage(idx, file) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { notify.warning('Fichier trop lourd', 'Max 5 Mo.'); return }
    setUploadingIdx(idx)
    try {
      const url = await accueilAdminService.uploadImage(file)
      if (url) maj(idx, { imageUrl: url })
    } catch { notify.warning('Upload échoué', '') }
    finally { setUploadingIdx(null) }
  }

  return (
    <div className="pac-section">
      <div className="pac-section-head">
        <p className="ap-page-sub">Publiez des annonces et actualités de votre établissement visibles par tous.</p>
        <button type="button" className="ap-btn ap-btn--sm" onClick={ajouter}><Plus size={14} /> Ajouter une actualité</button>
      </div>

      {actualites.length === 0 && (
        <div className="ap-empty" style={{ padding: '2rem', border: '1px dashed var(--sg-border)', borderRadius: 12 }}>
          <p>Aucune actualité. Partagez des événements et annonces avec vos visiteurs.</p>
        </div>
      )}

      <div className="pac-liste">
        {actualites.map((a, idx) => (
          <div key={a._id ?? idx} className="pac-item">
            <div className="pac-item-body">
              <div className="pac-img-row">
                <div className="pac-img-preview">
                  {a.imageUrl ? <img src={a.imageUrl} alt="Aperçu" /> : <div className="pac-img-ph"><ImageIcon size={20} /></div>}
                </div>
                <div className="pac-img-actions">
                  <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { uploadImage(idx, e.target.files?.[0]); e.target.value = '' }} />
                  <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => fileRef.current?.click()} disabled={uploadingIdx === idx}>
                    {uploadingIdx === idx ? <><Loader mode="button" /> Envoi…</> : <><Upload size={13} /> Image</>}
                  </button>
                  <div className="ap-field">
                    <input className="ap-input" value={a.imageUrl} onChange={(e) => maj(idx, { imageUrl: e.target.value })} placeholder="URL image" />
                  </div>
                </div>
              </div>
              <div className="pac-fields">
                <div className="ap-field pac-field-wide">
                  <label className="ap-label">Titre <em>*</em></label>
                  <input className="ap-input" value={a.titre} onChange={(e) => maj(idx, { titre: e.target.value })} placeholder="Titre de l'actualité" maxLength={160} />
                </div>
                <div className="ap-field">
                  <label className="ap-label">Date <em>*</em></label>
                  <input className="ap-input" type="date" value={a.date} onChange={(e) => maj(idx, { date: e.target.value })} />
                </div>
                <div className="ap-field pac-field-wide">
                  <label className="ap-label">Extrait</label>
                  <textarea className="ap-textarea" rows={2} value={a.extrait} onChange={(e) => maj(idx, { extrait: e.target.value })} placeholder="Résumé court de l'actualité" maxLength={400} />
                </div>
              </div>
            </div>
            <button type="button" className="ap-btn ap-btn--danger ap-btn--sm pac-suppr" onClick={() => supprimer(idx)} aria-label="Supprimer"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      <div className="pac-footer">
        <button type="button" className="ap-btn" onClick={() => onSave('actualites', { actualites })} disabled={saving}>
          {saving ? <><Loader mode="button" /> Sauvegarde…</> : <><Save size={14} /> Enregistrer</>}
        </button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   ONGLET RÉSEAUX SOCIAUX
════════════════════════════════════════════════════════════ */
function OngletReseaux({ data, setData, saving, onSave }) {
  const rs = data.reseauxSociaux
  const set = (patch) => setData((d) => ({ ...d, reseauxSociaux: { ...d.reseauxSociaux, ...patch } }))

  return (
    <div className="pac-section">
      <p className="ap-page-sub">Ces liens apparaissent dans le footer de votre page d'accueil.</p>
      <div className="ap-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          { key: 'facebook',  label: 'Facebook',  ph: 'https://facebook.com/votre-page' },
          { key: 'twitter',   label: 'Twitter / X', ph: 'https://twitter.com/votre-compte' },
          { key: 'linkedin',  label: 'LinkedIn',  ph: 'https://linkedin.com/company/votre-page' },
          { key: 'instagram', label: 'Instagram', ph: 'https://instagram.com/votre-compte' },
        ].map(({ key, label, ph }) => (
          <div key={key} className="ap-field">
            <label className="ap-label">{label}</label>
            <input className="ap-input" value={rs[key] ?? ''} onChange={(e) => set({ [key]: e.target.value })} placeholder={ph} type="url" maxLength={300} />
          </div>
        ))}
      </div>
      <div className="pac-footer">
        <button type="button" className="ap-btn" onClick={() => onSave('reseaux-sociaux', { reseauxSociaux: rs })} disabled={saving}>
          {saving ? <><Loader mode="button" /> Sauvegarde…</> : <><Save size={14} /> Enregistrer</>}
        </button>
      </div>
    </div>
  )
}
