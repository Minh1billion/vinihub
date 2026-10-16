import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import Button from '../../../../components/Button.jsx'
import { Field, FieldError } from '../../../../components/Field.jsx'
import Modal from '../../../../components/Modal.jsx'
import Segmented from '../../../../components/Segmented.jsx'
import PlatformLogo from '../../simulator/components/PlatformLogo.jsx'
import Slider from './Slider.jsx'
import { PLATFORM_PRESETS, exportWidth } from '../utils/edit.js'

const FORMATS = ['png', 'jpeg', 'webp']
const SCALES = [2, 1, 0.5, 0.25]

export default function ExportModal({ measure, hasSelection, onSave, onDownload, onDownloadSet, renderPreset, onClose }) {
  const { t } = useTranslation()
  const [format, setFormat] = useState('png')
  const [quality, setQuality] = useState(90)
  const [scale, setScale] = useState(1)
  const [target, setTarget] = useState('all')
  const [mode, setMode] = useState('single')
  const [picked, setPicked] = useState([])
  const [fit, setFit] = useState('cover')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const opts = { format, quality: quality / 100, scale, target }
  const setOpts = { format, quality: quality / 100, target, fit, presets: picked }
  const [hover, setHover] = useState(null)
  const [thumb, setThumb] = useState('')
  const cache = useRef(new Map())
  const token = useRef(0)

  useEffect(() => {
    if (!hover || mode !== 'platforms') return
    const id = `${hover.key}|${fit}|${target}|${format}`
    const hit = cache.current.get(id)
    if (hit) { setThumb(hit); return }
    setThumb('')
    const mine = ++token.current
    renderPreset(hover.key, { target, format, fit }).then((url) => {
      if (!url) return
      cache.current.set(id, url)
      if (mine === token.current) setThumb(url)
    }).catch(() => null)
  }, [hover?.key, fit, target, format, mode])

  const showHover = (p) => (e) => setHover({ key: p.key, rect: e.currentTarget.getBoundingClientRect() })
  const hoverP = hover && PLATFORM_PRESETS.find((p) => p.key === hover.key)
  const above = hover && hover.rect.top > 280
  const toggle = (key) => setPicked((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]))
  const box = measure(target)
  const out = box && exportWidth(box, scale)

  const run = (kind, fn, close) => async () => {
    setBusy(kind)
    setErr('')
    try {
      await fn(kind === 'zip' ? setOpts : opts)
      close()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <Modal title={t('editor.export.title')} className="ed-theme" onClose={onClose}>
      {(close) => (
        <>
          <Field label={t('editor.export.mode')} group>
            <Segmented label={t('editor.export.mode')} value={mode} onChange={setMode}
              options={[{ value: 'single', label: t('editor.export.modeSingle') }, { value: 'platforms', label: t('editor.export.modePlatforms') }]} />
          </Field>
          {hasSelection && (
            <Field label={t('editor.export.target')} group>
              <Segmented label={t('editor.export.target')} value={target} onChange={setTarget}
                options={[{ value: 'all', label: t('editor.export.all') }, { value: 'selection', label: t('editor.export.selection') }]} />
            </Field>
          )}
          <Field label={t('editor.export.format')} group>
            <Segmented label={t('editor.export.format')} value={format} onChange={setFormat}
              options={FORMATS.map((f) => ({ value: f, label: f.toUpperCase() }))} />
          </Field>
          {format !== 'png' && <Slider label={t('editor.export.quality')} min={40} max={100} value={quality} onChange={setQuality} />}
          {mode === 'single' ? (
            <Field label={t('editor.export.scale')} group>
              <Segmented label={t('editor.export.scale')} value={scale} onChange={setScale}
                options={SCALES.map((s) => ({ value: s, label: `${Math.round(s * 100)}%` }))} />
              {box && <small className="num">{out} × {Math.max(1, Math.round((out * box.h) / box.w))} px</small>}
            </Field>
          ) : (
            <>
              <Field label={t('editor.export.platforms')} group>
                <div className="ed-presets" role="group" aria-label={t('editor.export.platforms')}>
                  {PLATFORM_PRESETS.map((p) => (
                    <button key={p.key} type="button" role="checkbox" aria-checked={picked.includes(p.key)}
                      className={'ed-preset' + (picked.includes(p.key) ? ' on' : '')} onClick={() => toggle(p.key)}
                      onMouseEnter={showHover(p)} onMouseLeave={() => setHover(null)} onFocus={showHover(p)} onBlur={() => setHover(null)}>
                      <PlatformLogo platform={p.platform} size={26} />
                      <span className="ed-pname">
                        <b>{t(`sim.platform.${p.platform}`)}</b>
                        <small>{t(`sim.format.${p.format}`)} · {p.w}×{p.h}</small>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="ed-cv-row">
                  <Button variant="ghost" size="sm" onClick={() => setPicked(PLATFORM_PRESETS.map((p) => p.key))}>{t('editor.export.selectAll')}</Button>
                  <Button variant="ghost" size="sm" disabled={!picked.length} onClick={() => setPicked([])}>{t('editor.export.clear')}</Button>
                </div>
              </Field>
              <Field label={t('editor.export.fit')} group>
                <Segmented label={t('editor.export.fit')} value={fit} onChange={setFit}
                  options={[{ value: 'cover', label: t('editor.export.fitCover') }, { value: 'contain', label: t('editor.export.fitContain') }]} />
              </Field>
            </>
          )}
          {mode === 'platforms' && hoverP && createPortal(
            <div className="ed-hover" style={{ left: Math.min(Math.max(hover.rect.left + hover.rect.width / 2, 130), window.innerWidth - 130), top: above ? hover.rect.top - 10 : hover.rect.bottom + 10, transform: above ? 'translate(-50%, -100%)' : 'translateX(-50%)' }}>
              <div className="ed-hover-img" style={{ width: Math.round((hoverP.w * 220) / Math.max(hoverP.w, hoverP.h)), height: Math.round((hoverP.h * 220) / Math.max(hoverP.w, hoverP.h)) }}>
                {thumb ? <img src={thumb} alt="" /> : <span className="ed-hover-wait" />}
              </div>
              <small className="num">{t(`sim.platform.${hoverP.platform}`)} · {t(`sim.format.${hoverP.format}`)} · {hoverP.w}×{hoverP.h}</small>
            </div>,
            document.body
          )}
          <FieldError>{err}</FieldError>
          <div className="viewer-actions">
            {mode === 'single' ? (
              <>
                <Button loading={busy === 'save'} disabled={Boolean(busy) || !box} icon="check" onClick={run('save', onSave, close)}>{t('editor.export.save')}</Button>
                <Button variant="ghost" loading={busy === 'download'} disabled={Boolean(busy) || !box} icon="download" onClick={run('download', onDownload, close)}>{t('common.download')}</Button>
              </>
            ) : (
              <>
                <Button loading={busy === 'zip'} disabled={Boolean(busy) || !box || !picked.length} icon="download" onClick={run('zip', onDownloadSet, close)}>{t('editor.export.zip')}</Button>
                {picked.length > 0 && <small className="num">{t('editor.export.count', { count: picked.length })}</small>}
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
