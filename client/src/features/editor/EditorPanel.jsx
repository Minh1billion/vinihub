import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, uploadFile } from '../../api/client.js'
import { useApp } from '../../app/AppContext.jsx'
import { useDialog } from '../../app/DialogContext.jsx'
import Button from '../../components/Button.jsx'
import Dropzone from '../../components/Dropzone.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import { FieldError } from '../../components/Field.jsx'
import Icon from '../../components/Icon.jsx'
import { useLibrary } from '../library/LibraryContext.jsx'
import ExportModal from './ExportModal.jsx'
import Stage from './Stage.jsx'
import AdjustPanel from './panels/AdjustPanel.jsx'
import CropPanel from './panels/CropPanel.jsx'
import FilterPanel from './panels/FilterPanel.jsx'
import TextPanel from './panels/TextPanel.jsx'
import { drawResult, initialEdit, makeThumb, orient, ratioValue, rectOf } from './edit.js'
import { loadBitmap } from './source.js'
import useEditor from './useEditor.js'

const TOOLS = [
  { key: 'crop', icon: 'crop' },
  { key: 'adjust', icon: 'sliders' },
  { key: 'filters', icon: 'drop' },
  { key: 'text', icon: 'type' },
]

export default function EditorPanel({ active, onSend }) {
  const { t } = useTranslation()
  const { wid } = useApp()
  const dialog = useDialog()
  const { notifyCreated } = useLibrary()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const wanted = params.get('asset')
  const { edit, commit, undo, redo, clear, canUndo, canRedo } = useEditor()
  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [tool, setTool] = useState('crop')
  const [ratioKey, setRatioKey] = useState('free')
  const [selected, setSelected] = useState(null)
  const [original, setOriginal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [saved, setSaved] = useState(null)
  const latest = useRef({})
  latest.current = { doc, dirty: canUndo, saved }

  const oriented = useMemo(
    () => (doc ? orient(doc.bitmap, edit.rotate, edit.flipH, edit.flipV) : null),
    [doc, edit.rotate, edit.flipH, edit.flipV]
  )
  const thumb = useMemo(() => (oriented ? makeThumb(oriented) : null), [oriented])
  const lock = oriented ? ratioValue(ratioKey, oriented.width, oriented.height) : null
  const crop = oriented ? rectOf(oriented, edit.crop) : null

  useEffect(() => () => doc?.bitmap.close(), [doc])
  useEffect(() => { setSaved(null) }, [edit])

  useEffect(() => {
    if (!wanted || latest.current.doc?.asset.id === wanted) return
    let alive = true
    const open = async () => {
      if (latest.current.dirty && !latest.current.saved) {
        const ok = await dialog.confirm({ tone: 'warning', message: t('editor.confirmDiscard'), confirmLabel: t('editor.discard'), danger: true })
        if (!ok) { navigate('/studio/editor', { replace: true }); return }
      }
      setLoading(true)
      setErr('')
      try {
        const asset = await api.get(`/workspaces/${wid}/assets/${wanted}`)
        if (asset.kind !== 'image') throw new Error(t('editor.imageOnly'))
        const bitmap = await loadBitmap(wid, wanted)
        if (!alive) { bitmap.close(); return }
        setDoc({ asset, bitmap })
        clear()
        setSaved(null)
        setSelected(null)
        setRatioKey('free')
        setTool('crop')
      } catch (e) {
        if (alive) setErr(e.message || t('editor.loadFailed'))
      } finally {
        if (alive) setLoading(false)
      }
    }
    open()
    return () => { alive = false }
  }, [wanted, wid])

  useEffect(() => {
    if (!active) return
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, undo, redo])

  useEffect(() => {
    if (!canUndo || saved) return
    const warn = (e) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [canUndo, saved])

  const render = async ({ format, quality, scale }) => {
    const canvas = document.createElement('canvas')
    drawResult(canvas, oriented, edit, Math.max(1, Math.round(crop.w * scale)), format === 'jpeg')
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, `image/${format}`, quality))
    if (!blob) throw new Error(t('editor.export.failed'))
    return { blob, width: canvas.width, height: canvas.height, ext: blob.type.split('/')[1].replace('jpeg', 'jpg') }
  }

  const save = async (opts) => {
    const { blob, width, height, ext } = await render(opts)
    const file = new File([blob], `edit-${doc.asset.id.slice(0, 8)}.${ext}`, { type: blob.type })
    const asset = await uploadFile(wid, file, { parent_id: doc.asset.id, meta: JSON.stringify({ width, height }) })
    notifyCreated()
    setSaved(asset)
  }

  const download = async (opts) => {
    const { blob, ext } = await render(opts)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `edit-${doc.asset.id.slice(0, 8)}.${ext}`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const onMoveText = (id, x, y) => commit((e) => ({ ...e, texts: e.texts.map((v) => (v.id === id ? { ...v, x, y } : v)) }), `move:${id}`)
  const onCrop = (rect) => commit((e) => ({ ...e, crop: rect }), 'crop')

  if (!doc) {
    return (
      <div className="ed ed-empty">
        {loading ? <p className="page-loading">{t('editor.loading')}</p> : (
          <EmptyState title={t('editor.emptyTitle')} text={t('editor.emptyText')}>
            <FieldError>{err}</FieldError>
            <Dropzone accept="image/*" cta={t('editor.upload')} value={null}
              onChange={(a) => a && navigate(`/studio/editor?asset=${a.id}`)} />
          </EmptyState>
        )}
      </div>
    )
  }

  return (
    <div className="ed">
      <header className="ed-bar">
        <strong className="ed-name">{t('editor.title')}</strong>
        <span className="num ed-dims">{crop.w} × {crop.h}</span>
        <button type="button" className="icon-btn" disabled={!canUndo} onClick={undo} aria-label={t('editor.undo')} title={t('editor.undo')}><Icon name="undo" /></button>
        <button type="button" className="icon-btn" disabled={!canRedo} onClick={redo} aria-label={t('editor.redo')} title={t('editor.redo')}><Icon name="redo" /></button>
        <button type="button" className="icon-btn" aria-label={t('editor.compare')} title={t('editor.compare')}
          onPointerDown={() => setOriginal(true)} onPointerUp={() => setOriginal(false)}
          onPointerLeave={() => setOriginal(false)} onPointerCancel={() => setOriginal(false)}><Icon name="eye" /></button>
        <Button variant="ghost" size="sm" icon="refresh" disabled={!canUndo} onClick={() => { setRatioKey('free'); commit(() => initialEdit) }}>{t('editor.reset')}</Button>
        <Button size="sm" icon="download" onClick={() => setExporting(true)}>{t('editor.export.open')}</Button>
      </header>
      {saved && (
        <div className="ed-saved" role="status">
          <Icon name="check" size={16} />
          <strong>{t('editor.saved.title')}</strong>
          <Button variant="link" size="sm" onClick={() => { clear(); navigate(`/studio/editor?asset=${saved.id}`) }}>{t('editor.saved.continue')}</Button>
          <Button variant="link" size="sm" onClick={() => onSend('imageRef', saved)}>{t('editor.saved.asReference')}</Button>
          <Button variant="link" size="sm" onClick={() => onSend('videoFrame', saved)}>{t('editor.saved.asFrame')}</Button>
          <button type="button" className="icon-btn" onClick={() => setSaved(null)} aria-label={t('common.close')}><Icon name="close" size={14} /></button>
        </div>
      )}
      <div className="ed-body">
        <nav className="ed-rail" aria-label={t('editor.tools')}>
          {TOOLS.map((x) => (
            <button key={x.key} type="button" className={'ed-tool' + (tool === x.key ? ' on' : '')} aria-pressed={tool === x.key} onClick={() => setTool(x.key)}>
              <Icon name={x.icon} size={22} />
              <span>{t(`editor.tool.${x.key}`)}</span>
            </button>
          ))}
        </nav>
        <Stage source={doc.bitmap} oriented={oriented} edit={edit} tool={tool} lock={lock} original={original} active={active}
          onSelect={setSelected} onMoveText={onMoveText} onCrop={onCrop} />
        <aside className="ed-props">
          {tool === 'crop' && <CropPanel edit={edit} commit={commit} oriented={oriented} ratioKey={ratioKey} setRatioKey={setRatioKey} />}
          {tool === 'adjust' && <AdjustPanel edit={edit} commit={commit} />}
          {tool === 'filters' && <FilterPanel edit={edit} commit={commit} thumb={thumb} />}
          {tool === 'text' && <TextPanel edit={edit} commit={commit} selected={selected} onSelect={setSelected} />}
        </aside>
      </div>
      {exporting && <ExportModal size={crop} onSave={save} onDownload={download} onClose={() => setExporting(false)} />}
    </div>
  )
}
