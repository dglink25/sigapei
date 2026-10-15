import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, BadgeCheck, CircleCheck, ClipboardCheck,
  FileText, MapPin, MessageSquareWarning, Paperclip, TriangleAlert
} from 'lucide-react'
import { useNotify }    from '../../context/commun/NotifyContext'
import ConfirmDialog    from '../../components/commun/ConfirmDialog'
import Loader           from '../../components/commun/Loader'
import { ADMIN_PATHS, DOC_TYPES, SECTIONS, SECTIONS_CORRIGEABLES, TYPES } from '../../config/etablissements/config'
import { EMPTY_FORM, localisationTexte, normaliserDemande, typesTexte } from '../../lib/etablissements/form'
import { formatSize }   from '../../lib/etablissements/upload'
import { useGeoLabels } from '../../hooks/etablissements/useGeoLabels'
import { adminService } from '../../services/etablissements/etablissement.service'
import { StatusBadge }  from '../../components/etablissements/ui'
import { dateFr }       from './DemandesPage'
import './admin.css'

/* ── Ligne document ── */
function DocLine({ type, doc }) {
  const rule    = DOC_TYPES[type]
  const isImage = doc?.mime?.startsWith('image/') || /\.(png|jpe?g|svg)$/i.test(doc?.nom ?? '')
  return (
    <div className="ddt-doc">
      <div className="ddt-doc-ico"><Paperclip size={16} aria-hidden="true" /></div>
      <div className="ddt-doc-info">
        <strong>{rule.label}{rule.required ? '' : ' (facultatif)'}</strong>
        {doc
          ? <small>{doc.nom}{doc.taille ? ` · ${formatSize(doc.taille)}` : ''}</small>
          : <small className="ap-muted">Non fourni</small>
        }
      </div>
      {doc?.url && (
        <>
          {isImage && <img className="ddt-doc-thumb" src={doc.url} alt={rule.label} />}
          <a className="ap-btn ap-btn--ghost ap-btn--sm" href={doc.url} target="_blank" rel="noreferrer">
            Ouvrir
          </a>
        </>
      )}
    </div>
  )
}

/* ── Section avec flag correction ── */
function SectionCard({ section, review, mark, onToggle, onMotif, existing, children }) {
  return (
    <div className={`ap-card ddt-section${mark !== undefined ? ' is-flagged' : ''}`}>
      <div className="ddt-section-head">
        <h3>{section.titre}</h3>
        {review && SECTIONS_CORRIGEABLES.includes(section.id) && (
          <label className={`ddt-flag${mark !== undefined ? ' is-on' : ''}`}>
            <input type="checkbox" checked={mark !== undefined} onChange={onToggle} />
            <MessageSquareWarning size={15} aria-hidden="true" />
            À corriger
          </label>
        )}
      </div>
      {existing !== undefined && (
        <div className="ddt-existing">
          <TriangleAlert size={15} aria-hidden="true" />
          <span><strong>Correction demandée</strong>{existing ? ` : ${existing}` : ''}</span>
        </div>
      )}
      {children}
      {mark !== undefined && (
        <div className="ddt-motif">
          <label htmlFor={`motif-${section.id}`}>
            Motif de correction <span aria-hidden="true">*</span>
          </label>
          <textarea
            id={`motif-${section.id}`}
            rows={2}
            value={mark}
            onChange={e => onMotif(e.target.value)}
            placeholder="Expliquez précisément ce qui doit être corrigé…"
          />
        </div>
      )}
    </div>
  )
}

const Rows = ({ rows }) => (
  <dl className="ap-rows">
    {rows.map(([k, v]) => (
      <div key={k}><dt>{k}</dt><dd>{v || '-'}</dd></div>
    ))}
  </dl>
)

export default function DemandeDetailPage() {
  const { uuid }   = useParams()
  const navigate   = useNavigate()
  const notify     = useNotify()
  const [state,    setState]  = useState({ loading: true, demande: null })
  const [marks,    setMarks]  = useState({})
  const [confirm,  setConfirm] = useState(null)
  const [busy,     setBusy]   = useState(false)
  const [result,   setResult] = useState(null)

  const load = useCallback(async () => {
    setState({ loading: true, demande: null })
    try {
      const raw = await adminService.afficher(uuid)
      const d   = raw ? normaliserDemande(raw) : null
      setState({ loading: false, demande: d })
    } catch (err) {
      notify.fromError(err)
      setState({ loading: false, demande: null })
    }
  }, [uuid, notify])

  useEffect(() => { load() }, [load])

  const d      = state.demande
  const f      = d?.form ?? EMPTY_FORM
  const labels = useGeoLabels(f)
  const review = d?.statut === 'soumise'
  const marked = Object.keys(marks)
  const motifsOk = marked.length > 0 && marked.every(s => marks[s].trim().length >= 5)

  const toggle  = s => setMarks(m => { const n = { ...m }; if (s in n) delete n[s]; else n[s] = ''; return n })

  const rows = useMemo(() => ({
    etablissement: [
      ['Nom', f.nom],
      ['Type', typesTexte(f.types, TYPES)],
      ["Année d'ouverture", f.annee_ouverture],
      ['E-mail', f.email],
      ['Téléphone 1', f.telephone_1],
      ['Téléphone 2', f.telephone_2],
    ],
    localisation: [
      ['Localisation', localisationTexte({ ...f, geo_labels: labels })],
      ['Adresse complète', f.adresse_complete],
    ],
    dirigeant: [
      ['Nom complet', f.dirigeant_nom],
      ['Titre / fonction', f.dirigeant_titre],
      ['E-mail', f.dirigeant_email],
      ['Téléphone', f.dirigeant_telephone],
    ],
  }), [f, labels])

  async function envoyerCorrections() {
    setBusy(true)
    try {
      await adminService.marquerCorrections(
        uuid,
        Object.fromEntries(marked.map(s => [s, marks[s].trim()])),
      )
      notify.success(
        'Correction demandée',
        "L'établissement et le dirigeant sont notifiés ; une relance est envoyée chaque jour à 18h59.",
      )
      navigate(ADMIN_PATHS.demandes)
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false); setConfirm(null)
    }
  }

  async function valider() {
    setBusy(true)
    try {
      const r = await adminService.valider(uuid)
      setResult({ slug: r?.slug, matricule: r?.matricule })
      notify.success('Demande validée', "L'établissement est créé et ses identifiants sont envoyés au dirigeant.")
    } catch (err) {
      notify.fromError(err)
    } finally {
      setBusy(false); setConfirm(null)
    }
  }

  /* ── États ── */
  if (state.loading) return <div className="ap"><Loader mode="inline" label="Chargement du dossier…" /></div>

  if (!d) return (
    <div className="ap">
      <div className="ap-page-head">
        <Link to={ADMIN_PATHS.demandes} className="ap-btn ap-btn--ghost ap-btn--sm">
          <ArrowLeft size={15} /> Demandes
        </Link>
      </div>
      <div className="ap-card ap-empty">
        <TriangleAlert size={32} aria-hidden="true" />
        <p>Ce dossier n'existe pas ou n'est plus à instruire.</p>
      </div>
    </div>
  )

  if (result) return (
    <div className="ap">
      <div className="ap-card ddt-result">
        <div className="ddt-result-ico"><BadgeCheck size={40} aria-hidden="true" /></div>
        <h2>Demande validée</h2>
        <p>{f.nom} est désormais un établissement actif sur SIGAPEI.</p>
        <dl className="ap-rows">
          {result.slug     && <div><dt>Slug</dt><dd><span className="ap-code">{result.slug}</span></dd></div>}
          {result.matricule && <div><dt>Matricule</dt><dd><span className="ap-code">{result.matricule}</span></dd></div>}
        </dl>
        <Link to={ADMIN_PATHS.demandes} className="ap-btn" style={{ marginTop: 8 }}>
          Retour aux demandes
        </Link>
      </div>
    </div>
  )

  const mapSrc = d.geo
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${d.geo.longitude - 0.01}%2C${d.geo.latitude - 0.01}%2C${d.geo.longitude + 0.01}%2C${d.geo.latitude + 0.01}&layer=mapnik&marker=${d.geo.latitude}%2C${d.geo.longitude}`
    : null

  return (
    <div className="ap">
      {/* Breadcrumb */}
      <nav className="ap-bread" aria-label="Fil d'ariane">
        <Link to={ADMIN_PATHS.demandes}>Demandes</Link>
        <span className="ap-bread-sep" aria-hidden="true">/</span>
        <span>{f.nom || 'Dossier'}</span>
      </nav>

      {/* En-tête */}
      <div className="ap-page-head">
        <div>
          <h2 className="ap-page-title">{f.nom || 'Demande'}</h2>
          <p className="ap-page-sub">
            Dossier <span className="ap-code">{d.reference}</span>
            {d.dateSoumission && ` · soumis le ${dateFr(d.dateSoumission)}`}
          </p>
        </div>
        <div className="ap-page-actions">
          <StatusBadge statut={d.statut} />
        </div>
      </div>

      {/* Layout */}
      <div className="ap-layout">
        <div className="ap-col">
          {SECTIONS.filter(s => s.id !== 'documents').map(s => (
            <SectionCard
              key={s.id}
              section={s}
              review={review}
              mark={marks[s.id]}
              existing={d.statut === 'correction_demandee' ? d.flags[s.id] : undefined}
              onToggle={() => toggle(s.id)}
              onMotif={v => setMarks(m => ({ ...m, [s.id]: v }))}
            >
              <Rows rows={rows[s.id]} />
              {s.id === 'localisation' && mapSrc && (
                <div className="ddt-map">
                  <p><MapPin size={13} aria-hidden="true" /> Position capturée à la soumission</p>
                  <iframe title="Position géographique" src={mapSrc} loading="lazy" />
                </div>
              )}
            </SectionCard>
          ))}

          <SectionCard
            section={SECTIONS.find(s => s.id === 'documents')}
            review={review}
            mark={marks.documents}
            existing={d.statut === 'correction_demandee' ? d.flags.documents : undefined}
            onToggle={() => toggle('documents')}
            onMotif={v => setMarks(m => ({ ...m, documents: v }))}
          >
            {['autorisation', 'piece_identite', 'logo'].map(t => (
              <DocLine key={t} type={t} doc={d.docs[t]} />
            ))}
          </SectionCard>
        </div>

        {/* Panneau instruction */}
        <aside className="ap-aside">
          <div className="ap-card ddt-panel">
            <h3><ClipboardCheck size={16} aria-hidden="true" /> Instruction</h3>
            {review ? (
              <>
                <p>
                  {marked.length === 0
                    ? 'Dossier conforme ? Validez-le. Sinon cochez « À corriger » sur les sections concernées.'
                    : `${marked.length} section${marked.length > 1 ? 's' : ''} marquée${marked.length > 1 ? 's' : ''} à corriger.`
                  }
                </p>
                <button
                  type="button"
                  className="ap-btn ap-btn--warn"
                  disabled={!motifsOk || busy}
                  onClick={() => setConfirm('corrections')}
                >
                  <MessageSquareWarning size={16} aria-hidden="true" />
                  Demander des corrections
                </button>
                {marked.length > 0 && !motifsOk && (
                  <small className="ddt-hint">Un motif (5 car. min.) est requis pour chaque section.</small>
                )}
                <button
                  type="button"
                  className="ap-btn"
                  disabled={marked.length > 0 || busy}
                  onClick={() => setConfirm('valider')}
                >
                  <CircleCheck size={16} aria-hidden="true" />
                  Valider la demande
                </button>
                {marked.length > 0 && (
                  <small className="ddt-hint">Décochez les sections pour pouvoir valider.</small>
                )}
              </>
            ) : d.statut === 'correction_demandee' ? (
              <>
                <p>En attente de correction. Relance automatique chaque jour à 18h59.</p>
                <button
                  type="button"
                  className="ap-btn ap-btn--ghost"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    try {
                      await adminService.renvoyerLienCorrection(uuid)
                      notify.success('Lien renvoyé', 'Un nouveau lien de correction a été envoyé par WhatsApp et par e-mail.')
                    } catch (err) {
                      notify.fromError(err)
                    } finally { setBusy(false) }
                  }}
                >
                  Renvoyer le lien maintenant
                </button>
              </>
            ) : (
              <p>Ce dossier n'est plus en instruction.</p>
            )}
          </div>
        </aside>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={confirm === 'corrections'}
        tone="warning"
        title="Demander des corrections ?"
        message="L'établissement recevra un lien de correction (72 h, usage unique) par WhatsApp et par e-mail."
        confirmLabel="Envoyer la demande"
        loading={busy}
        onConfirm={envoyerCorrections}
        onCancel={() => setConfirm(null)}
      >
        <ul className="ddt-confirm-list">
          {marked.map(s => (
            <li key={s}>
              <strong>{SECTIONS.find(x => x.id === s)?.titre}</strong> : {marks[s]}
            </li>
          ))}
        </ul>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === 'valider'}
        title="Valider définitivement ?"
        message="L'établissement sera créé (slug, matricule, cycles autorisés) et le compte du dirigeant sera généré. Action irréversible."
        confirmLabel="Valider la demande"
        loading={busy}
        onConfirm={valider}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
