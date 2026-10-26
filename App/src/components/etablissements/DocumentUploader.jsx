import { useRef, useState } from 'react'
import { CircleCheck, FileUp, RefreshCw, TriangleAlert } from 'lucide-react'
import { useNotify } from '../../context/commun/NotifyContext'
import { unwrap } from '../../lib/commun/http'
import { DOC_TYPES } from '../../config/etablissements/config'
import { formatSize, uploadDocument, validateFile } from '../../lib/etablissements/upload'
import { Field } from './ui'

/** Televersement d'un document (progression, validation format/taille, remplacement). */
export default function DocumentUploader({ type, demandeUuid, value, onChange, disabled, error, flagged, motif }) {
  const rule = DOC_TYPES[type]
  const notify = useNotify()
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)
  const status = value?.status ?? 'idle'

  async function handleFile(file) {
    if (!file) return
    const refus = validateFile(type, file)
    if (refus) return notify.warning('Fichier refusé', refus)
    if (!demandeUuid) {
      return notify.error('Brouillon introuvable', "Revenez aux étapes précédentes pour enregistrer votre demande, puis réessayez.")
    }
    const base = { nom: file.name, taille: file.size }
    onChange({ ...base, status: 'uploading', progress: 0 })
    try {
      const res = unwrap(await uploadDocument({ demandeUuid, type, file, onProgress: (p) => onChange({ ...base, status: 'uploading', progress: p }) }))
      const doc = res?.document ?? res ?? {}
      onChange({ ...base, status: 'done', progress: 100, uuid: res?.documentUuid ?? doc.uuid ?? null, url: doc.url ?? null })
      notify.success('Document téléversé', `${rule.label} enregistré.`)
    } catch (err) {
      onChange({ ...base, status: 'error' })
      notify.fromError(err)
    }
  }

  const pickFile = () => !disabled && inputRef.current?.click()
  const accept = [...rule.mimes, ...rule.exts.map((e) => `.${e}`)].join(',')

  return (
    <Field id={`doc-${type}`} label={rule.label} required={rule.required} hint={`${rule.help} · ${rule.formats} · max. ${rule.maxMo} Mo`} error={error} flagged={flagged} motif={motif}>
      <input
        ref={inputRef}
        id={`doc-${type}`}
        type="file"
        hidden
        accept={accept}
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }}
      />

      {(status === 'idle' || status === 'error') && (
        <button
          type="button"
          className={`dm-drop ${over ? 'is-over' : ''} ${status === 'error' ? 'is-error' : ''}`}
          onClick={pickFile}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) handleFile(e.dataTransfer.files?.[0]) }}
          disabled={disabled}
        >
          {status === 'error' ? <TriangleAlert size={26} /> : <FileUp size={26} />}
          <strong>{status === 'error' ? 'Échec du téléversement : réessayer' : 'Glissez un fichier ici ou cliquez pour parcourir'}</strong>
          {status === 'error' && value?.nom && <small>{value.nom}</small>}
        </button>
      )}

      {status === 'uploading' && (
        <div className="dm-file is-uploading">
          <div className="dm-file-row"><strong>{value.nom}</strong><span>{value.progress ?? 0} %</span></div>
          <div className="dm-progress" role="progressbar" aria-valuenow={value.progress ?? 0} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${value.progress ?? 0}%` }} />
          </div>
        </div>
      )}

      {status === 'done' && (
        <div className="dm-file is-done">
          <CircleCheck size={22} aria-hidden="true" />
          <div className="dm-file-info">
            <strong>{value.nom}</strong>
            {value.taille ? <small>{formatSize(value.taille)}</small> : null}
          </div>
          {!disabled && (
            <button type="button" className="dm-link" onClick={pickFile}><RefreshCw size={15} /> Remplacer</button>
          )}
        </div>
      )}
    </Field>
  )
}
