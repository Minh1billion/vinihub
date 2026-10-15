import { useTranslation } from 'react-i18next'
import Button from '../../../../../components/Button.jsx'
import { Field } from '../../../../../components/Field.jsx'
import Segmented from '../../../../../components/Segmented.jsx'
import PlatformLogo from '../../../simulator/components/PlatformLogo.jsx'
import RatioPicker from '../../../shared/components/RatioPicker.jsx'
import { DEFAULT_AREA, MIN_FRAME, PLATFORM_PRESETS, RATIOS, fitRect, ratioOf } from '../../utils/edit.js'

export default function CanvasPanel({ canvas, content, setCanvas }) {
  const { t } = useTranslation()
  const base = content || DEFAULT_AREA
  const preset = PLATFORM_PRESETS.find((p) => p.key === canvas?.preset)

  const pickRatio = (key, presetKey = null) => setCanvas({ ...fitRect(ratioOf(key), base), ratio: key, preset: presetKey })

  const setSize = (key) => (e) => {
    const v = Math.max(MIN_FRAME, Math.min(16000, Math.round(Number(e.target.value) || 0)))
    const r = canvas.ratio ? ratioOf(canvas.ratio) : null
    if (!r) setCanvas({ [key]: v })
    else if (key === 'w') setCanvas({ w: v, h: Math.max(MIN_FRAME, Math.round(v / r)) })
    else setCanvas({ h: v, w: Math.max(MIN_FRAME, Math.round(v * r)) })
  }

  return (
    <div className="ed-ibody">
      <section className="ed-sec">
        <h4 className="ed-sec-title">{t('editor.layers.canvas')}</h4>
        <Field label={t('common.aspectRatio')} group>
          <Segmented label={t('common.aspectRatio')} value={canvas && !canvas.ratio ? 'free' : ''}
            onChange={() => setCanvas({ ratio: null, preset: null, ...(canvas ? {} : { ...base, x: Math.round(base.x), y: Math.round(base.y), w: Math.round(base.w), h: Math.round(base.h) }) })}
            options={[{ value: 'free', label: t('editor.crop.free') }]} />
          <RatioPicker options={RATIOS} value={canvas?.ratio} onChange={(k) => pickRatio(k)} />
        </Field>
        <Field label={t('editor.crop.presets')} group>
          <div className="ed-presets" role="radiogroup" aria-label={t('editor.crop.presets')}>
            {PLATFORM_PRESETS.map((p) => (
              <button key={p.key} type="button" role="radio" aria-checked={p.key === canvas?.preset}
                className={'ed-preset' + (p.key === canvas?.preset ? ' on' : '')} onClick={() => pickRatio(p.ratio, p.key)}>
                <PlatformLogo platform={p.platform} size={26} />
                <span className="ed-pname">
                  <b>{t(`sim.platform.${p.platform}`)}</b>
                  <small>{t(`sim.format.${p.format}`)} · {p.ratio}</small>
                </span>
              </button>
            ))}
          </div>
          {preset && <small>{t('editor.crop.presetSize', { w: preset.w, h: preset.h })}</small>}
          {preset && canvas.w < preset.w && <small className="ed-warn">{t('editor.crop.presetSmall')}</small>}
        </Field>
      </section>
      {canvas && (
        <section className="ed-sec">
          <h4 className="ed-sec-title">{t('editor.canvas.size')}</h4>
          <div className="ed-cv-size">
            <Field label={t('editor.canvas.width')}>
              <input type="number" min={MIN_FRAME} max={16000} value={canvas.w} onChange={setSize('w')} />
            </Field>
            <Field label={t('editor.canvas.height')}>
              <input type="number" min={MIN_FRAME} max={16000} value={canvas.h} onChange={setSize('h')} />
            </Field>
          </div>
          <small>{t('editor.crop.hint')}</small>
          <Field label={t('editor.canvas.background')} group>
            <div className="ed-grid2">
              <Segmented label={t('editor.canvas.background')} value={canvas.bg ? 'color' : 'none'}
                onChange={(v) => setCanvas({ bg: v === 'none' ? null : '#ffffff' })}
                options={[{ value: 'none', label: t('editor.canvas.transparent') }, { value: 'color', label: t('editor.canvas.color') }]} />
              <input type="color" className="ed-color" disabled={!canvas.bg} value={canvas.bg || '#ffffff'} onChange={(e) => setCanvas({ bg: e.target.value })} />
            </div>
          </Field>
          <Button variant="soft" size="sm" block icon="expand" disabled={!content} onClick={() => setCanvas({ x: Math.round(content.x), y: Math.round(content.y), w: Math.round(content.w), h: Math.round(content.h), ratio: null, preset: null })}>
            {t('editor.canvas.fit')}
          </Button>
        </section>
      )}
      <ul className="ed-tips">
        <li>{t('editor.nav.zoom')}</li>
        <li>{t('editor.nav.pan')}</li>
      </ul>
    </div>
  )
}
