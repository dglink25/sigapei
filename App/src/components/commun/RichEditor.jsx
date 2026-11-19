/**
 * RichEditor - Éditeur de texte riche basé sur TipTap.
 * Équivalent Word : titres, gras, italique, souligné, listes, tableaux,
 * liens, images (upload ou URL), taille, couleur, alignement, copier-coller.
 *
 * Usage :
 *   <RichEditor value={html} onChange={setHtml} onImageUpload={fn} />
 *
 * Props :
 *   value         : string HTML
 *   onChange      : (html: string) => void
 *   onImageUpload : async (file) => string (URL) - optionnel
 *   placeholder   : string
 *   minHeight     : number (px, défaut 240)
 *   disabled      : boolean
 */
import { useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import Highlight from '@tiptap/extension-highlight'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import './RichEditor.css'

/* ── Bouton de la barre d'outils ── */
function Btn({ title, active, disabled, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`re-btn${active ? ' re-btn--on' : ''}${disabled ? ' re-btn--off' : ''}`}
    >
      {children}
    </button>
  )
}

function Sep() { return <span className="re-sep" /> }

/* ── SVG icons inline ── */
const I = {
  Bold:        <svg viewBox="0 0 24 24"><path d="M6 4h8a4 4 0 0 1 0 8H6zm0 8h9a4 4 0 0 1 0 8H6z" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Italic:      <svg viewBox="0 0 24 24"><line x1="19" y1="4" x2="10" y2="4" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/><line x1="14" y1="20" x2="5" y2="20" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/><line x1="15" y1="4" x2="9" y2="20" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/></svg>,
  Underline:   <svg viewBox="0 0 24 24"><path d="M6 3v7a6 6 0 0 0 12 0V3" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round"/><line x1="4" y1="21" x2="20" y2="21" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/></svg>,
  Strike:      <svg viewBox="0 0 24 24"><path d="M17.3 12H6.7M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4M12 16a4 4 0 0 1 4 4" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round"/><line x1="4" y1="12" x2="20" y2="12" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/></svg>,
  H1:          <svg viewBox="0 0 24 24"><text x="1" y="17" fontSize="13" fontWeight="bold" fill="currentColor">H1</text></svg>,
  H2:          <svg viewBox="0 0 24 24"><text x="1" y="17" fontSize="13" fontWeight="bold" fill="currentColor">H2</text></svg>,
  H3:          <svg viewBox="0 0 24 24"><text x="1" y="17" fontSize="13" fontWeight="bold" fill="currentColor">H3</text></svg>,
  UL:          <svg viewBox="0 0 24 24"><line x1="9" y1="6" x2="20" y2="6" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/><line x1="9" y1="12" x2="20" y2="12" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/><line x1="9" y1="18" x2="20" y2="18" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg>,
  OL:          <svg viewBox="0 0 24 24"><line x1="10" y1="6" x2="21" y2="6" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/><line x1="10" y1="12" x2="21" y2="12" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/><line x1="10" y1="18" x2="21" y2="18" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/><text x="1" y="8" fontSize="8" fill="currentColor" fontWeight="bold">1.</text><text x="1" y="14" fontSize="8" fill="currentColor" fontWeight="bold">2.</text><text x="1" y="20" fontSize="8" fill="currentColor" fontWeight="bold">3.</text></svg>,
  Quote:       <svg viewBox="0 0 24 24"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" strokeWidth="2" stroke="currentColor" fill="none"/></svg>,
  Code:        <svg viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/><polyline points="8 6 2 12 8 18" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  AlignL:      <svg viewBox="0 0 24 24"><line x1="21" y1="6" x2="3" y2="6" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/><line x1="15" y1="12" x2="3" y2="12" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/><line x1="17" y1="18" x2="3" y2="18" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/></svg>,
  AlignC:      <svg viewBox="0 0 24 24"><line x1="21" y1="6" x2="3" y2="6" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/><line x1="17" y1="12" x2="7" y2="12" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/><line x1="19" y1="18" x2="5" y2="18" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/></svg>,
  AlignR:      <svg viewBox="0 0 24 24"><line x1="21" y1="6" x2="3" y2="6" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/><line x1="21" y1="12" x2="9" y2="12" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/><line x1="21" y1="18" x2="7" y2="18" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/></svg>,
  AlignJ:      <svg viewBox="0 0 24 24"><line x1="21" y1="6" x2="3" y2="6" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/><line x1="21" y1="12" x2="3" y2="12" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/><line x1="21" y1="18" x2="3" y2="18" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/></svg>,
  Link:        <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Unlink:      <svg viewBox="0 0 24 24"><path d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round"/><path d="M5.17 11.75l-1.72 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round"/><line x1="4" y1="4" x2="20" y2="20" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/></svg>,
  Image:       <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" stroke="currentColor" fill="none"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><polyline points="21 15 16 10 5 21" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Table:       <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" stroke="currentColor" fill="none"/><line x1="3" y1="9" x2="21" y2="9" strokeWidth="2" stroke="currentColor"/><line x1="3" y1="15" x2="21" y2="15" strokeWidth="2" stroke="currentColor"/><line x1="12" y1="3" x2="12" y2="21" strokeWidth="2" stroke="currentColor"/></svg>,
  Highlight:   <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeWidth="2" stroke="currentColor" fill="none" strokeLinejoin="round"/></svg>,
  Undo:        <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Redo:        <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  HR:          <svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/></svg>,
  Sub:         <svg viewBox="0 0 24 24"><text x="1" y="15" fontSize="12" fontWeight="bold" fill="currentColor">x</text><text x="11" y="20" fontSize="8" fill="currentColor">2</text></svg>,
  Sup:         <svg viewBox="0 0 24 24"><text x="1" y="17" fontSize="12" fontWeight="bold" fill="currentColor">x</text><text x="11" y="10" fontSize="8" fill="currentColor">2</text></svg>,
}

export default function RichEditor({
  value = '',
  onChange,
  onImageUpload,
  placeholder = 'Rédigez votre contenu ici…',
  minHeight = 240,
  disabled = false,
}) {
  const fileRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Subscript,
      Superscript,
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  })

  /* Sync value externe → éditeur (ex. rechargement données) */
  const prevValue = useRef(value)
  if (editor && value !== prevValue.current && value !== editor.getHTML()) {
    prevValue.current = value
    editor.commands.setContent(value, false)
  }

  /* ── Insérer un lien ── */
  const setLink = useCallback(() => {
    const prev = editor?.getAttributes('link').href ?? ''
    const url = window.prompt('URL du lien :', prev)
    if (url === null) return
    if (url === '') { editor?.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  /* ── Insérer une image ── */
  const insertImageUrl = useCallback(() => {
    const url = window.prompt('URL de l\'image :')
    if (url?.trim()) editor?.chain().focus().setImage({ src: url.trim() }).run()
  }, [editor])

  const handleImageFile = useCallback(async (file) => {
    if (!file) return
    if (onImageUpload) {
      try {
        const url = await onImageUpload(file)
        if (url) editor?.chain().focus().setImage({ src: url }).run()
      } catch { /* silencieux */ }
    } else {
      /* base64 fallback */
      const reader = new FileReader()
      reader.onload = (e) => editor?.chain().focus().setImage({ src: e.target.result }).run()
      reader.readAsDataURL(file)
    }
  }, [editor, onImageUpload])

  /* ── Insérer un tableau ── */
  const insertTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  if (!editor) return null

  const e = editor
  const a = (name, attrs) => e.isActive(name, attrs)

  return (
    <div className={`re-wrap${disabled ? ' re-wrap--disabled' : ''}`}>

      {/* ══ BARRE D'OUTILS ══ */}
      <div className="re-toolbar" role="toolbar" aria-label="Mise en forme">

        {/* Annuler / Refaire */}
        <Btn title="Annuler (Ctrl+Z)" onClick={() => e.chain().focus().undo().run()} disabled={!e.can().undo()}>{I.Undo}</Btn>
        <Btn title="Refaire (Ctrl+Y)" onClick={() => e.chain().focus().redo().run()} disabled={!e.can().redo()}>{I.Redo}</Btn>

        <Sep/>

        {/* Titres */}
        <Btn title="Titre 1" active={a('heading',{level:1})} onClick={() => e.chain().focus().toggleHeading({level:1}).run()}>{I.H1}</Btn>
        <Btn title="Titre 2" active={a('heading',{level:2})} onClick={() => e.chain().focus().toggleHeading({level:2}).run()}>{I.H2}</Btn>
        <Btn title="Titre 3" active={a('heading',{level:3})} onClick={() => e.chain().focus().toggleHeading({level:3}).run()}>{I.H3}</Btn>

        <Sep/>

        {/* Mise en forme */}
        <Btn title="Gras (Ctrl+B)"     active={a('bold')}      onClick={() => e.chain().focus().toggleBold().run()}>{I.Bold}</Btn>
        <Btn title="Italique (Ctrl+I)" active={a('italic')}    onClick={() => e.chain().focus().toggleItalic().run()}>{I.Italic}</Btn>
        <Btn title="Souligné (Ctrl+U)" active={a('underline')} onClick={() => e.chain().focus().toggleUnderline().run()}>{I.Underline}</Btn>
        <Btn title="Barré"             active={a('strike')}    onClick={() => e.chain().focus().toggleStrike().run()}>{I.Strike}</Btn>
        <Btn title="Surligné"          active={a('highlight')} onClick={() => e.chain().focus().toggleHighlight().run()}>{I.Highlight}</Btn>

        <Sep/>

        {/* Couleur du texte */}
        <label className="re-color-wrap" title="Couleur du texte">
          <svg viewBox="0 0 24 24" className="re-color-icon"><text x="4" y="17" fontSize="14" fontWeight="bold" fill="currentColor">A</text></svg>
          <input type="color" className="re-color-input"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            defaultValue="#000000"
          />
        </label>

        <Sep/>

        {/* Alignement */}
        <Btn title="Aligner à gauche"  active={a({textAlign:'left'})}    onClick={() => e.chain().focus().setTextAlign('left').run()}>{I.AlignL}</Btn>
        <Btn title="Centrer"           active={a({textAlign:'center'})}  onClick={() => e.chain().focus().setTextAlign('center').run()}>{I.AlignC}</Btn>
        <Btn title="Aligner à droite"  active={a({textAlign:'right'})}   onClick={() => e.chain().focus().setTextAlign('right').run()}>{I.AlignR}</Btn>
        <Btn title="Justifier"         active={a({textAlign:'justify'})} onClick={() => e.chain().focus().setTextAlign('justify').run()}>{I.AlignJ}</Btn>

        <Sep/>

        {/* Listes */}
        <Btn title="Liste à puces"    active={a('bulletList')}  onClick={() => e.chain().focus().toggleBulletList().run()}>{I.UL}</Btn>
        <Btn title="Liste numérotée"  active={a('orderedList')} onClick={() => e.chain().focus().toggleOrderedList().run()}>{I.OL}</Btn>
        <Btn title="Citation"         active={a('blockquote')}  onClick={() => e.chain().focus().toggleBlockquote().run()}>{I.Quote}</Btn>
        <Btn title="Code"             active={a('code')}        onClick={() => e.chain().focus().toggleCode().run()}>{I.Code}</Btn>

        <Sep/>

        {/* Lien */}
        <Btn title="Insérer un lien"   active={a('link')}  onClick={setLink}>{I.Link}</Btn>
        <Btn title="Supprimer le lien" disabled={!a('link')} onClick={() => e.chain().focus().unsetLink().run()}>{I.Unlink}</Btn>

        <Sep/>

        {/* Image */}
        <Btn title="Image (depuis URL)" onClick={insertImageUrl}>{I.Image}</Btn>
        {onImageUpload && (
          <>
            <Btn title="Uploader une image" onClick={() => fileRef.current?.click()}>{I.Image}</Btn>
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={(e) => { handleImageFile(e.target.files[0]); e.target.value = '' }} />
          </>
        )}

        <Sep/>

        {/* Tableau */}
        <Btn title="Insérer un tableau 3×3" onClick={insertTable}>{I.Table}</Btn>
        {a('table') && (
          <>
            <Btn title="Ajouter une colonne après"  onClick={() => e.chain().focus().addColumnAfter().run()}>+Col</Btn>
            <Btn title="Supprimer la colonne"        onClick={() => e.chain().focus().deleteColumn().run()}>-Col</Btn>
            <Btn title="Ajouter une ligne après"     onClick={() => e.chain().focus().addRowAfter().run()}>+Lig</Btn>
            <Btn title="Supprimer la ligne"          onClick={() => e.chain().focus().deleteRow().run()}>-Lig</Btn>
            <Btn title="Supprimer le tableau"        onClick={() => e.chain().focus().deleteTable().run()}>✕Tab</Btn>
          </>
        )}

        <Sep/>

        {/* Séparateur horizontal / subscript / superscript */}
        <Btn title="Ligne séparatrice" onClick={() => e.chain().focus().setHorizontalRule().run()}>{I.HR}</Btn>
        <Btn title="Indice"    active={a('subscript')}   onClick={() => e.chain().focus().toggleSubscript().run()}>{I.Sub}</Btn>
        <Btn title="Exposant"  active={a('superscript')} onClick={() => e.chain().focus().toggleSuperscript().run()}>{I.Sup}</Btn>

      </div>

      {/* ══ ZONE D'ÉDITION ══ */}
      <EditorContent
        editor={editor}
        className="re-content"
        style={{ minHeight }}
      />

      {/* Placeholder */}
      {editor.isEmpty && (
        <p className="re-placeholder">{placeholder}</p>
      )}
    </div>
  )
}
