import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '../../components/Button.jsx'
import { Field, FieldError } from '../../components/Field.jsx'
import Modal from '../../components/Modal.jsx'
import Segmented from '../../components/Segmented.jsx'
import Slider from './Slider.jsx'

const FORMATS = ['png', 'jpeg', 'webp']
const SCALES = [1, 0.75, 0.5, 0.25]

export default function ExportModal({ size, onSave, onDownload, onClose }) {
  const { t } = useTranslation()
  const [format, setFormat] = useState('png')
  const [quality, setQuality] = useState(90)
  const [scale, setScale] = useState(1)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const opts = { format, quality: quality / 100, scale }

  const run = (kind, fn, close) => async () => {
    setBusy(kind)
    setErr('')
    try {
      await fn(opts)
      close()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <Modal title={t('editor.export.title')} onClose={onClose}>
      {(close) => (
        <>
          <Field label={t('editor.export.format')} group>
            <Segmented label={t('editor.export.format')} value={format} onChange={setFormat}
              options={FORMATS.map((f) => ({ value: f, label: f.toUpperCase() }))} />
          </Field>
          {format !== 'png' && <Slider label={t('editor.export.quality')} min={40} max={100} value={quality} onChange={setQuality} />}
          <Field label={t('editor.export.scale')} group>
            <Segmented label={t('editor.export.scale')} value={scale} onChange={setScale}
              options={SCALES.map((s) => ({ value: s, label: `${Math.round(s * 100)}%` }))} />
            <small className="num">{Math.max(1, Math.round(size.w * scale))} × {Math.max(1, Math.round(size.h * scale))} px</small>
          </Field>
          <FieldError>{err}</FieldError>
          <div className="viewer-actions">
            <Button loading={busy === 'save'} disabled={Boolean(busy)} icon="check" onClick={run('save', onSave, close)}>{t('editor.export.save')}</Button>
            <Button variant="ghost" loading={busy === 'download'} disabled={Boolean(busy)} icon="download" onClick={run('download', onDownload, close)}>{t('common.download')}</Button>
          </div>
        </>
      )}
    </Modal>
  )
}
