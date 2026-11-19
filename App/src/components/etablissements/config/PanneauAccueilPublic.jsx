/**
 * PanneauAccueilPublic - Configuration de la page d'accueil publique.
 * Sections : hero, statistiques, à propos (+ devise), galerie, actualités, réseaux sociaux.
 * Note : les formations = classes de Scolarité, gérées dans Configuration académique.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, Plus, Trash2, Save, X, ChevronUp, ChevronDown, Image as ImageIcon, Upload, Eye } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import { accueilAdminService } from '../../../services/etablissements/accueilPublic.service'
import { lienEtablissement } from '../../../lib/etablissements/subdomain'
import useSlugEtablissement from '../../../hooks/etablissements/useSlugEtablissement'
import Loader from '../../commun/Loader'
import RichEditor from '../../commun/RichEditor'

const STAT_ICONS = [
  { id: 'users', label: 'Personnes' }, { id: 'book', label: 'Livre' },
  { id: 'calendar', label: 'Calendrier' }, { id: 'graduation', label: 'Diplomation' },
  { id: 'microscope', label: 'Microscope' }, { id: 'award', label: 'Prix' },
  { id: 'building', label: 'Bâtiment' }, { id: 'clock', label: 'Horloge' },
]

const ONGLETS = [
  { id: 'hero',       label: 'Hero / Slider'   },
  { id: 'stats',      label: 'Statistiques'    },
  { id: 'apropos',    label: 'À propos'        },
  { id: 'galerie',    label: 'Galerie'         },
  { id: 'actualites', label: 'Actualités'      },
  { id: 'reseaux',    label: 'Réseaux sociaux' },
]

const PAGES_OPTIONS = [
  { id: 'toutes',       label: 'Toutes les pages'  },
  { id: 'presentation', label: 'Présentation'       },
  { id: 'formations',   label: 'Formations'         },
  { id: 'actualites',   label: 'Actualités'         },
  { id: 'galerie',      label: 'Galerie'            },
  { id: 'contact',      label: 'Contact'            },
]

const uid = () => Math.random().toString(36).slice(2)

const VIDE = {
  hero: [], statistiques: [],
  apropos: { texte: '', mission: '', vision: '', devise: '' },
  galerie: [], actualites: [],
  reseauxSociaux: { facebook: '', twitter: '', linkedin: '', instagram: '' },
}

export default function PanneauAccueilPublic() {
  const notify = useNotify()
  const slug   = useSlugEtablissement()
  const [onglet,  setOnglet]  = useState('hero')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const r = await accueilAdminService.lire()
      setData({
        hero:          Array.isArray(r?.hero)         ? r.hero         : [],
        statistiques:  Array.isArray(r?.statistiques) ? r.statistiques : [],
        apropos:       r?.apropos  ?? { texte: '', mission: '', vision: '', devise: '' },
        galerie:       Array.isArray(r?.galerie)      ? r.galerie      : [],
        actualites:    Array.isArray(r?.actualites)   ? r.actualites   : [],
        reseauxSociaux: r?.reseauxSociaux ?? { facebook: '', twitter: '', linkedin: '', instagram: '' },
      })
    } catch (err) {
      /* 404 = page non encore configurée : état vide sans notification d'erreur */
      if (err?.status !== 404) {
        notify.fromError(err)
      }
      setData({ ...VIDE })
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => { charger() }, [charger])

  async function sauvegarder(section, payload) {
    setSaving(true)
    try {
      await accueilAdminService.mettreAJour(section, payload)
      notify.success('Sauvegardé', 'La page d\'accueil a été mise à jour.')
    } catch (err) {
      notify.fromError(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}><Loader mode="inline" label="Chargement…" /></div>
  if (!data)   return null

  return (
    <div className="cfg-tab">
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">Page d'accueil publique</h2>
          <p className="ap-page-sub">Contenu affiché aux visiteurs sur la page publique de l'établissement.</p>
        </div>
        <div className="ap-page-actions">
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={charger} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'ap-spin' : ''} /> Actualiser
          </button>
          <a href={lienEtablissement(slug, '')} target="_blank" rel="noreferrer" className="ap-btn ap-btn--sm ap-btn--ghost">
            <Eye size={14} /> Voir la page
          </a>
        </div>
      </div>

      <div className="cfg-onglets" role="tablist">
        {ONGLETS.map((o) => (
          <button key={o.id} type="button" role="tab" aria-selected={onglet === o.id}
            className={`cfg-onglet${onglet === o.id ? ' is-actif' : ''}`}
            onClick={() => setOnglet(o.id)}>
            {o.label}
          </button>
        ))}
      </div>

      <div className="cfg-onglet-corps">
        {onglet === 'hero'       && <OngletHero       data={data} setData={setData} saving={saving} onSave={sauvegarder} notify={notify} />}
        {onglet === 'stats'      && <OngletStats      data={data} setData={setData} saving={saving} onSave={sauvegarder} />}
        {onglet === 'apropos'    && <OngletApropos    data={data} setData={setData} saving={saving} onSave={sauvegarder} />}
        {onglet === 'galerie'    && <OngletGalerie    data={data} setData={setData} saving={saving} onSave={sauvegarder} notify={notify} />}
        {onglet === 'actualites' && <OngletActualites data={data} setData={setData} saving={saving} onSave={sauvegarder} notify={notify} />}
        {onglet === 'reseaux'    && <OngletReseaux    data={data} setData={setData} saving={saving} onSave={sauvegarder} />}
      </div>
    </div>
  )
}

/* ════ HERO ════════════════════════════════════════════════ */
function OngletHero({ data, setData, saving, onSave, notify }) {
  const slides  = data.hero
  const fileRef = useRef(null)
  const [uploadIdx, setUploadIdx] = useState(null)

  const set = (fn) => setData((d) => ({ ...d, hero: typeof fn === 'function' ? fn(d.hero) : fn }))
  const maj = (i, p) => set((s) => s.map((x, j) => j === i ? { ...x, ...p } : x))
  const del = (i)    => set((s) => s.filter((_, j) => j !== i))
  const up  = (i)    => { if (i === 0) return; set((s) => { const a = [...s]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a }) }
  const dn  = (i)    => set((s) => { if (i === s.length - 1) return s; const a = [...s]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a })

  async function upload(i, file) {
    if (!file) return
    if (file.size > 5e6) { notify.warning('Trop lourd', 'Max 5 Mo'); return }
    setUploadIdx(i)
    try { const url = await accueilAdminService.uploadImage(file); if (url) maj(i, { imageUrl: url }) }
    catch { notify.warning('Upload échoué', '') }
    finally { setUploadIdx(null) }
  }

  return (
    <div className="pac-section">
      <div className="pac-section-head">
        <p className="ap-page-sub">Slides du carousel plein écran. Chaque slide a une image, un titre et un bouton CTA.</p>
        <button type="button" className="ap-btn ap-btn--sm" onClick={() => set((s) => [...s, { _id: uid(), imageUrl: '', titre: '', sousTitre: '', ctaLibelle: '', ctaUrl: '', pages: ['toutes'] }])}>
          <Plus size={14} /> Ajouter un slide
        </button>
      </div>
      {slides.length === 0 && <EmptyMsg>Aucun slide. Ajoutez-en un pour créer le carousel.</EmptyMsg>}
      <div className="pac-liste">
        {slides.map((s, i) => (
          <div key={s._id ?? i} className="pac-item">
            <div className="pac-item-ordre">
              <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => up(i)} disabled={i === 0}><ChevronUp size={14} /></button>
              <span className="pac-item-num">{i + 1}</span>
              <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => dn(i)} disabled={i === slides.length - 1}><ChevronDown size={14} /></button>
            </div>
            <div className="pac-item-body">
              <div className="pac-img-row">
                <div className="pac-img-preview">
                  {s.imageUrl ? <img src={s.imageUrl} alt="" /> : <div className="pac-img-ph"><ImageIcon size={22} /></div>}
                </div>
                <div className="pac-img-actions">
                  <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { upload(i, e.target.files?.[0]); e.target.value='' }} />
                  <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => fileRef.current?.click()} disabled={uploadIdx === i}>
                    {uploadIdx === i ? <><Loader mode="button" /> Envoi…</> : <><Upload size={13} /> Image</>}
                  </button>
                  <div className="ap-field"><label className="ap-label">URL image</label>
                    <input className="ap-input" value={s.imageUrl} onChange={(e) => maj(i, { imageUrl: e.target.value })} placeholder="https://…" />
                  </div>
                </div>
              </div>
              <div className="pac-fields">
                <Field wide label="Titre *"><input className="ap-input" value={s.titre} onChange={(e) => maj(i, { titre: e.target.value })} maxLength={120} placeholder="Titre du slide" /></Field>
                <Field wide label="Sous-titre"><input className="ap-input" value={s.sousTitre} onChange={(e) => maj(i, { sousTitre: e.target.value })} maxLength={200} placeholder="Description courte" /></Field>
                <Field label="Libellé CTA"><input className="ap-input" value={s.ctaLibelle} onChange={(e) => maj(i, { ctaLibelle: e.target.value })} maxLength={40} placeholder="Ex. Découvrir" /></Field>
                <Field label="URL CTA"><input className="ap-input" value={s.ctaUrl} onChange={(e) => maj(i, { ctaUrl: e.target.value })} maxLength={300} placeholder="https://…" /></Field>
                <Field wide label="Pages d'affichage">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {PAGES_OPTIONS.map((p) => {
                      const pages = Array.isArray(s.pages) ? s.pages : ['toutes']
                      const checked = pages.includes(p.id)
                      function toggle() {
                        let next
                        if (p.id === 'toutes') {
                          next = checked ? [] : ['toutes']
                        } else {
                          const sans = pages.filter((x) => x !== 'toutes' && x !== p.id)
                          next = checked ? sans : [...sans, p.id]
                          if (next.length === 0) next = ['toutes']
                        }
                        maj(i, { pages: next })
                      }
                      return (
                        <label key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, padding: '4px 10px', borderRadius: 6, border: `1.5px solid ${checked ? '#006B3C' : 'var(--sg-border)'}`, background: checked ? 'rgba(0,107,60,0.08)' : 'transparent', color: checked ? '#006B3C' : 'var(--sg-text-secondary)', transition: 'all 0.15s' }}>
                          <input type="checkbox" checked={checked} onChange={toggle} style={{ display: 'none' }} />
                          {p.label}
                        </label>
                      )
                    })}
                  </div>
                  <p className="ap-hint">Choisissez les pages où ce slide apparaîtra. "Toutes" = toutes les pages.</p>
                </Field>
              </div>
            </div>
            <button type="button" className="ap-btn ap-btn--danger ap-btn--sm pac-suppr" onClick={() => del(i)}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <SaveBtn saving={saving} onClick={() => onSave('hero', { hero: slides })} />
    </div>
  )
}

/* ════ STATISTIQUES ════════════════════════════════════════ */
function OngletStats({ data, setData, saving, onSave }) {
  const stats = data.statistiques
  const set = (fn) => setData((d) => ({ ...d, statistiques: typeof fn === 'function' ? fn(d.statistiques) : fn }))
  const maj = (i, p) => set((s) => s.map((x, j) => j === i ? { ...x, ...p } : x))
  const del = (i)    => set((s) => s.filter((_, j) => j !== i))

  return (
    <div className="pac-section">
      <div className="pac-section-head">
        <p className="ap-page-sub">Chiffres clés animés (count-up) déclenchés au défilement.</p>
        <button type="button" className="ap-btn ap-btn--sm" onClick={() => set((s) => [...s, { _id: uid(), icone: 'users', valeur: 0, libelle: '' }])}>
          <Plus size={14} /> Ajouter
        </button>
      </div>
      {stats.length === 0 && <EmptyMsg>Aucune statistique. Ajoutez des chiffres clés (étudiants, spécialités, année de création…).</EmptyMsg>}
      <div className="pac-stats-liste">
        {stats.map((s, i) => (
          <div key={s._id ?? i} className="pac-stat-item">
            <div className="ap-field">
              <label className="ap-label">Icône</label>
              <select className="ap-input" value={s.icone} onChange={(e) => maj(i, { icone: e.target.value })}>
                {STAT_ICONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <div className="ap-field">
              <label className="ap-label">Valeur *</label>
              <input className="ap-input" type="number" min="0" value={s.valeur} onChange={(e) => maj(i, { valeur: parseInt(e.target.value, 10) || 0 })} />
            </div>
            <div className="ap-field pac-stat-libelle">
              <label className="ap-label">Libellé *</label>
              <input className="ap-input" value={s.libelle} onChange={(e) => maj(i, { libelle: e.target.value })} maxLength={60} placeholder="Étudiants en formation" />
            </div>
            <button type="button" className="ap-btn ap-btn--danger ap-btn--sm" onClick={() => del(i)}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <SaveBtn saving={saving} onClick={() => onSave('statistiques', { statistiques: stats })} />
    </div>
  )
}

/* ════ À PROPOS ════════════════════════════════════════════ */
function OngletApropos({ data, setData, saving, onSave }) {
  const ap  = data.apropos
  const set = (p) => setData((d) => ({ ...d, apropos: { ...d.apropos, ...p } }))

  async function uploadImage(file) {
    return accueilAdminService.uploadImage(file)
  }

  return (
    <div className="pac-section">
      <p className="ap-page-sub">Présentez votre établissement, sa devise, sa mission et sa vision.</p>
      <div className="ap-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        <Field label="Devise (affichée dans le header)">
          <input className="ap-input" value={ap.devise ?? ''} onChange={(e) => set({ devise: e.target.value })} maxLength={200} placeholder="Excellence · Intégrité · Innovation" />
        </Field>

        <Field wide label="Présentation générale">
          <RichEditor
            value={ap.texte ?? ''}
            onChange={(html) => set({ texte: html })}
            onImageUpload={uploadImage}
            placeholder="Histoire, valeurs, description de l'établissement… (titres, tableaux, images, liens…)"
            minHeight={280}
          />
        </Field>

        <Field wide label="Notre Mission">
          <RichEditor
            value={ap.mission ?? ''}
            onChange={(html) => set({ mission: html })}
            onImageUpload={uploadImage}
            placeholder="La mission de notre établissement…"
            minHeight={180}
          />
        </Field>

        <Field wide label="Notre Vision">
          <RichEditor
            value={ap.vision ?? ''}
            onChange={(html) => set({ vision: html })}
            onImageUpload={uploadImage}
            placeholder="Notre vision pour l'avenir…"
            minHeight={180}
          />
        </Field>

      </div>
      <SaveBtn saving={saving} onClick={() => onSave('apropos', { apropos: ap })} />
    </div>
  )
}

/* ════ GALERIE ══════════════════════════════════════════════ */
function OngletGalerie({ data, setData, saving, onSave, notify }) {
  const galerie = data.galerie
  const setG = (fn) => setData((d) => ({ ...d, galerie: typeof fn === 'function' ? fn(d.galerie) : fn }))
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [url, setUrl] = useState('')

  async function uploadMultiple(files) {
    setUploading(true)
    try {
      for (const f of Array.from(files)) {
        if (f.size > 5e6) { notify.warning('Trop lourd', f.name); continue }
        const u = await accueilAdminService.uploadImage(f)
        if (u) setG((g) => [...g, u])
      }
    } catch { notify.warning('Upload', 'Certains fichiers ont échoué.') }
    finally { setUploading(false) }
  }

  return (
    <div className="pac-section">
      <p className="ap-page-sub">Photos de l'établissement. Les visiteurs peuvent les voir en plein écran.</p>
      <div className="ap-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input ref={fileRef} type="file" hidden multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => { uploadMultiple(e.target.files); e.target.value='' }} />
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <><Loader mode="button" /> Envoi…</> : <><Upload size={13} /> Uploader</>}
          </button>
          <span className="ap-hint">ou</span>
          <input className="ap-input" style={{ flex: 1, minWidth: 220 }} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Coller une URL d'image…" onKeyDown={(e) => { if (e.key === 'Enter' && url.trim()) { setG((g) => [...g, url.trim()]); setUrl('') } }} />
          <button type="button" className="ap-btn ap-btn--sm" onClick={() => { if (url.trim()) { setG((g) => [...g, url.trim()]); setUrl('') } }} disabled={!url.trim()}><Plus size={14} /></button>
        </div>
      </div>
      {galerie.length === 0
        ? <EmptyMsg><ImageIcon size={28} /><span>Aucune photo.</span></EmptyMsg>
        : <div className="pac-galerie-grid">
            {galerie.map((u, i) => (
              <div key={i} className="pac-galerie-item">
                <img src={u} alt={`Photo ${i+1}`} loading="lazy" />
                <button type="button" className="pac-galerie-suppr" onClick={() => setG((g) => g.filter((_, j) => j !== i))}><X size={14} /></button>
              </div>
            ))}
          </div>
      }
      <SaveBtn saving={saving} onClick={() => onSave('galerie', { galerie })} />
    </div>
  )
}

/* ════ ACTUALITÉS ═══════════════════════════════════════════ */
function OngletActualites({ data, setData, saving, onSave, notify }) {
  const actu  = data.actualites
  const fileRef = useRef(null)
  const [uploadIdx, setUploadIdx] = useState(null)
  const set = (fn) => setData((d) => ({ ...d, actualites: typeof fn === 'function' ? fn(d.actualites) : fn }))
  const maj = (i, p) => set((s) => s.map((x, j) => j === i ? { ...x, ...p } : x))
  const del = (i)    => set((s) => s.filter((_, j) => j !== i))

  async function upload(i, file) {
    if (!file || file.size > 5e6) { notify.warning('Trop lourd', ''); return }
    setUploadIdx(i)
    try { const u = await accueilAdminService.uploadImage(file); if (u) maj(i, { imageUrl: u }) }
    catch { notify.warning('Upload échoué', '') }
    finally { setUploadIdx(null) }
  }

  async function uploadImageContenu(file) {
    return accueilAdminService.uploadImage(file)
  }

  return (
    <div className="pac-section">
      <div className="pac-section-head">
        <p className="ap-page-sub">Annonces et événements affichés sur la page d'accueil.</p>
        <button type="button" className="ap-btn ap-btn--sm" onClick={() => set((s) => [...s, { _id: uid(), imageUrl: '', titre: '', date: new Date().toISOString().slice(0,10), extrait: '', corps: '' }])}>
          <Plus size={14} /> Ajouter
        </button>
      </div>
      {actu.length === 0 && <EmptyMsg>Aucune actualité.</EmptyMsg>}
      <div className="pac-liste">
        {actu.map((a, i) => (
          <div key={a._id ?? i} className="pac-item">
            <div className="pac-item-body">
              <div className="pac-img-row">
                <div className="pac-img-preview">
                  {a.imageUrl ? <img src={a.imageUrl} alt="" /> : <div className="pac-img-ph"><ImageIcon size={18} /></div>}
                </div>
                <div className="pac-img-actions">
                  <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { upload(i, e.target.files?.[0]); e.target.value='' }} />
                  <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={() => fileRef.current?.click()} disabled={uploadIdx === i}>
                    {uploadIdx === i ? <><Loader mode="button" /> Envoi…</> : <><Upload size={13} /> Image de couverture</>}
                  </button>
                  <div className="ap-field"><input className="ap-input" value={a.imageUrl} onChange={(e) => maj(i, { imageUrl: e.target.value })} placeholder="URL image de couverture" /></div>
                </div>
              </div>
              <div className="pac-fields">
                <Field wide label="Titre *">
                  <input className="ap-input" value={a.titre} onChange={(e) => maj(i, { titre: e.target.value })} maxLength={160} />
                </Field>
                <Field label="Date *">
                  <input className="ap-input" type="date" value={a.date} onChange={(e) => maj(i, { date: e.target.value })} />
                </Field>
                <Field wide label="Extrait (résumé affiché en liste)">
                  <RichEditor
                    value={a.extrait ?? ''}
                    onChange={(html) => maj(i, { extrait: html })}
                    onImageUpload={uploadImageContenu}
                    placeholder="Résumé court de l'actualité…"
                    minHeight={120}
                  />
                </Field>
                <Field wide label="Contenu complet (page de détail)">
                  <RichEditor
                    value={a.corps ?? ''}
                    onChange={(html) => maj(i, { corps: html })}
                    onImageUpload={uploadImageContenu}
                    placeholder="Rédigez le contenu complet de l'actualité ici (titres, tableaux, images, liens…)"
                    minHeight={240}
                  />
                </Field>
              </div>
            </div>
            <button type="button" className="ap-btn ap-btn--danger ap-btn--sm pac-suppr" onClick={() => del(i)}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <SaveBtn saving={saving} onClick={() => onSave('actualites', { actualites: actu })} />
    </div>
  )
}

/* ════ RÉSEAUX SOCIAUX ══════════════════════════════════════ */
function OngletReseaux({ data, setData, saving, onSave }) {
  const rs  = data.reseauxSociaux
  const set = (p) => setData((d) => ({ ...d, reseauxSociaux: { ...d.reseauxSociaux, ...p } }))
  const cfg = [
    { key: 'facebook',  label: 'Facebook',   ph: 'https://facebook.com/votre-page' },
    { key: 'twitter',   label: 'Twitter / X', ph: 'https://twitter.com/votre-compte' },
    { key: 'linkedin',  label: 'LinkedIn',   ph: 'https://linkedin.com/company/votre-page' },
    { key: 'instagram', label: 'Instagram',  ph: 'https://instagram.com/votre-compte' },
  ]
  return (
    <div className="pac-section">
      <p className="ap-page-sub">Liens affichés dans le footer de la page d'accueil.</p>
      <div className="ap-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {cfg.map(({ key, label, ph }) => (
          <Field key={key} label={label}>
            <input className="ap-input" type="url" value={rs[key] ?? ''} onChange={(e) => set({ [key]: e.target.value })} placeholder={ph} maxLength={300} />
          </Field>
        ))}
      </div>
      <SaveBtn saving={saving} onClick={() => onSave('reseaux-sociaux', { reseauxSociaux: rs })} />
    </div>
  )
}

/* ════ HELPERS UI ═══════════════════════════════════════════ */
function Field({ label, wide, children }) {
  return (
    <div className={`ap-field${wide ? ' pac-field-wide' : ''}`}>
      {label && <label className="ap-label">{label}</label>}
      {children}
    </div>
  )
}
function EmptyMsg({ children }) {
  return (
    <div className="ap-empty" style={{ padding: '2rem', border: '1px dashed var(--sg-border)', borderRadius: 12 }}>
      {children}
    </div>
  )
}
function SaveBtn({ saving, onClick }) {
  return (
    <div className="pac-footer">
      <button type="button" className="ap-btn" onClick={onClick} disabled={saving}>
        {saving ? <><Loader mode="button" /> Sauvegarde…</> : <><Save size={14} /> Enregistrer</>}
      </button>
    </div>
  )
}
