import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, CircleCheck, ClipboardCheck, FileText, MapPin, MessageSquareWarning, Paperclip, TriangleAlert } from 'lucide-react'
import { useNotify } from '../../../context/commun/NotifyContext'
import ConfirmDialog from '../../../components/commun/ConfirmDialog'
import { ADMIN_PATHS, DOC_TYPES, SECTIONS, SECTIONS_CORRIGEABLES, TYPES } from '../../../config/etablissements/config'
import { EMPTY_FORM, localisationTexte, normaliserDemande, typesTexte } from '../../../lib/etablissements/form'
import { formatSize } from '../../../lib/etablissements/upload'
import { useGeoLabels } from '../../../hooks/etablissements/useGeoLabels'
import { adminService } from '../../../services/etablissements/etablissement.service'
import { StatusBadge } from '../../../components/etablissements/ui'
import { dateFr } from './DemandesPage'
import './admin.css'

function DocLine({ type, doc }) {
  const rule = DOC_TYPES[type]
  const isImage = doc?.mime?.startsWith('image/') || /\.(png|jpe?g|svg)$/i.test(doc?.nom ?? '')
  return (
    <div className="ad-doc">
      <div className="ad-doc-ico"><Paperclip size={18} /></div>
      <div className="ad-doc-info">
        <strong>{rule.label}{rule.required ? '' : ' (facultatif)'}</strong>
        {doc ? <small>{doc.nom}{doc.taille ? ` · ${formatSize(doc.taille)}` : ''}</small> : <small className="ad-muted">Non fourni</small>}
      </div>
      {doc?.url && (
        <>
          {isImage && <img className="ad-doc-thumb" src={doc.url} alt={rule.label} />}
          <a className="ad-btn ad-btn--ghost ad-btn--sm" href={doc.url} target="_blank" rel="noreferrer">Ouvrir</a>
        </>
      )}
    </div>
  )
}

function SectionCard({ section, review, mark, onToggle, onMotif, existing, children }) {
  const checked = mark !== undefined
  return (
    <section className={`ad-card ad-section ${checked ? 'is-marked' : ''}`}>
      <header className="ad-section-head">
        <h2>{section.titre}</h2>
        {review && SECTIONS_CORRIGEABLES.includes(section.id) && (
          <label className={`ad-flagtoggle ${checked ? 'is-on' : ''}`}>
            <input type="checkbox" checked={checked} onChange={onToggle} />
            <MessageSquareWarning size={16} /> À corriger
          </label>
        )}
      </header>
      {existing !== undefined && (
        <p className="ad-existing"><TriangleAlert size={16} /><span><strong>Correction demandée</strong>{existing ? ` : ${existing}` : ''}</span></p>
      )}
      {children}
      {checked && (
        <div className="ad-motif">
          <label htmlFor={`motif-${section.id}`}>Motif de la correction <span aria-hidden="true">*</span></label>
          <textarea id={`motif-${section.id}`} rows={2} value={mark} onChange={(e) => onMotif(e.target.value)} placeholder="Expliquez précisément ce qui doit être corrigé…" />
        </div>
      )}
    </section>
  )
}

const Rows = ({ rows }) => (
  <dl className="ad-rows">
    {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v || '—'}</dd></div>)}
  </dl>
)

export default function DemandeDetailPage() {
  const { uuid } = useParams()
  const navigate = useNavigate()
  const notify = useNotify()
  const [state, setState] = useState({ loading: true, demande: null })
  const [marks, setMarks] = useState({}) // section -> motif
  const [confirm, setConfirm] = useState(null) // 'corrections' | 'valider'
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  const load = useCallback(async () => {
    setState({ loading: true, demande: null })
    try {
      const d = (await adminService.lister()).map(normaliserDemande).find((x) => x.uuid === uuid) ?? null
      setState({ loading: false, demande: d })
    } catch (err) {
      notify.fromError(err)
      setState({ loading: false, demande: null })
    }
  }, [uuid, notify])

  useEffect(() => { load() }, [load])

  const d = state.demande
  const f = d?.form ?? EMPTY_FORM
  const labels = useGeoLabels(f)
  const review = d?.statut === 'soumise'
  const marked = Object.keys(marks)
  const motifsOk = marked.length > 0 && marked.every((s) => marks[s].trim().length >= 5)

  const toggle = (s) => setMarks((m) => { const n = { ...m }; if (s in n) delete n[s]; else n[s] = ''; return n })

  const rows = useMemo(() => ({
    etablissement: [
      ['Nom', f.nom], ['Type', typesTexte(f.types, TYPES)], ["Année d'ouverture", f.annee_ouverture],
      ['E-mail', f.email], ['Téléphone 1', f.telephone_1], ['Téléphone 2', f.telephone_2],
    ],
    localisation: [['Localisation', localisationTexte({ ...f, geo_labels: labels })], ['Adresse complète', f.adresse_complete]],
    dirigeant: [['Nom complet', f.dirigeant_nom], ['Titre / fonction', f.dirigeant_titre], ['E-mail', f.dirigeant_email], ['Téléphone', f.dirigeant_telephone]],
  }), [f, labels])

  async function envoyerCorrections() {
    setBusy(true)
    try {
      await adminService.marquerCorrections(uuid, Object.fromEntries(marked.map((s) => [s, marks[s].trim()])))
      notify.success('Correction demandée', "L'établissement et le dirigeant sont notifiés par WhatsApp et par e-mail ; une relance est envoyée chaque jour à 18h59.")
      navigate(ADMIN_PATHS.demandes)
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  async function valider() {
    setBusy(true)
    try {
      const r = await adminService.valider(uuid)
      setResult({ slug: r?.slug ?? r?.etablissement?.slug, matricule: r?.matricule ?? r?.etablissement?.matricule })
      notify.success('Demande validée', "L'établissement est créé ; ses identifiants sont envoyés au dirigeant.")
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  if (state.loading) return <div className="ad"><p className="ad-empty">Chargement du dossier…</p></div>

  if (!d) {
    return (
      <div className="ad">
        <header className="ad-header"><Link to={ADMIN_PATHS.demandes} className="ad-back"><ArrowLeft size={18} /> Demandes</Link><h1>Dossier introuvable</h1></header>
        <main className="ad-main"><div className="ad-card ad-empty"><TriangleAlert size={34} /><p>Cette demande n'existe pas ou n'est plus à instruire.</p></div></main>
      </div>
    )
  }

  if (result) {
    return (
      <div className="ad">
        <main className="ad-main ad-main--narrow">
          <div className="ad-card ad-result">
            <div className="ad-result-ico"><BadgeCheck size={44} /></div>
            <h1>Demande validée</h1>
            <p>{f.nom} est désormais un établissement actif.</p>
            <dl className="ad-rows">
              {result.slug && <div><dt>Slug</dt><dd><code>{result.slug}</code></dd></div>}
              {result.matricule && <div><dt>Matricule</dt><dd><code>{result.matricule}</code></dd></div>}
            </dl>
            <Link to={ADMIN_PATHS.demandes} className="ad-btn">Retour aux demandes</Link>
          </div>
        </main>
      </div>
    )
  }

  const mapSrc = d.geo
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${d.geo.longitude - 0.01}%2C${d.geo.latitude - 0.01}%2C${d.geo.longitude + 0.01}%2C${d.geo.latitude + 0.01}&layer=mapnik&marker=${d.geo.latitude}%2C${d.geo.longitude}`
    : null

  return (
    <div className="ad">
      <header className="ad-header">
        <Link to={ADMIN_PATHS.demandes} className="ad-back"><ArrowLeft size={18} /> Demandes</Link>
        <h1>{f.nom || 'Demande'}</h1>
        <StatusBadge statut={d.statut} />
      </header>

      <main className="ad-main ad-layout">
        <div className="ad-col">
          <p className="ad-meta">Dossier <code>{d.reference}</code> · soumis le {dateFr(d.dateSoumission)}</p>

          {SECTIONS.filter((s) => s.id !== 'documents').map((s) => (
            <SectionCard
              key={s.id}
              section={s}
              review={review}
              mark={marks[s.id]}
              existing={d.statut === 'correction_demandee' ? d.flags[s.id] : undefined}
              onToggle={() => toggle(s.id)}
              onMotif={(v) => setMarks((m) => ({ ...m, [s.id]: v }))}
            >
              <Rows rows={rows[s.id]} />
              {s.id === 'localisation' && mapSrc && (
                <div className="ad-map">
                  <p><MapPin size={15} /> Position capturée lors de la soumission (aide au recoupement{d.geo.precision ? `, précision ≈ ${Math.round(d.geo.precision)} m` : ''})</p>
                  <iframe title="Position capturée" src={mapSrc} loading="lazy" />
                </div>
              )}
            </SectionCard>
          ))}

          <SectionCard
            section={SECTIONS.find((s) => s.id === 'documents')}
            review={review}
            mark={marks.documents}
            existing={d.statut === 'correction_demandee' ? d.flags.documents : undefined}
            onToggle={() => toggle('documents')}
            onMotif={(v) => setMarks((m) => ({ ...m, documents: v }))}
          >
            {['autorisation', 'piece_identite', 'logo'].map((t) => <DocLine key={t} type={t} doc={d.docs[t]} />)}
            {!Object.values(d.docs).some((x) => x.url) && <p className="ad-note"><FileText size={14} /> Aperçu indisponible : l'API ne renvoie pas encore de lien de consultation sécurisé des documents.</p>}
          </SectionCard>
        </div>

        <aside className="ad-aside">
          <div className="ad-card ad-panel">
            <h2><ClipboardCheck size={18} /> Instruction</h2>
            {review ? (
              <>
                <p>{marked.length === 0 ? 'Dossier conforme ? Validez-le. Sinon cochez « À corriger » sur chaque section concernée et précisez le motif.' : `${marked.length} section${marked.length > 1 ? 's' : ''} marquée${marked.length > 1 ? 's' : ''} à corriger.`}</p>
                <button type="button" className="ad-btn ad-btn--warn" disabled={!motifsOk || busy} onClick={() => setConfirm('corrections')}>
                  <MessageSquareWarning size={18} /> Demander des corrections
                </button>
                {marked.length > 0 && !motifsOk && <small className="ad-hint">Un motif (5 caractères min.) est obligatoire pour chaque section marquée.</small>}
                <button type="button" className="ad-btn" disabled={marked.length > 0 || busy} onClick={() => setConfirm('valider')}>
                  <CircleCheck size={18} /> Valider la demande
                </button>
                {marked.length > 0 && <small className="ad-hint">Décochez les sections pour pouvoir valider.</small>}
              </>
            ) : d.statut === 'correction_demandee' ? (
              <p>En attente de correction par l'établissement. Une relance automatique est envoyée chaque jour à 18h59 jusqu'à la nouvelle soumission.</p>
            ) : (
              <p>Ce dossier n'est plus en instruction.</p>
            )}
          </div>
        </aside>
      </main>

      <ConfirmDialog
        open={confirm === 'corrections'}
        tone="warning"
        title="Demander des corrections ?"
        message="L'établissement et le dirigeant recevront un lien de correction (72 h, usage unique) par WhatsApp et par e-mail."
        confirmLabel="Envoyer la demande"
        loading={busy}
        onConfirm={envoyerCorrections}
        onCancel={() => setConfirm(null)}
      >
        <ul className="ad-confirm-list">
          {marked.map((s) => <li key={s}><strong>{SECTIONS.find((x) => x.id === s)?.titre}</strong> : {marks[s]}</li>)}
        </ul>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === 'valider'}
        title="Valider définitivement ?"
        message="L'établissement sera créé (slug, matricule, cycles autorisés) et le compte administrateur du dirigeant sera créé. Cette action est définitive."
        confirmLabel="Valider la demande"
        icon={BadgeCheck}
        loading={busy}
        onConfirm={valider}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
