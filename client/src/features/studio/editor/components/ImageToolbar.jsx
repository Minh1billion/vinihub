import { useTranslation } from 'react-i18next'
import Icon from '../../../../components/Icon.jsx'
import { fitImage, flipImage, sourceOf, turnImage } from '../utils/layers.js'

const FITS = [
  ['contain', 'fitContain'],
  ['cover', 'fitCover'],
  ['fill', 'fitFill'],
]

export default function ImageToolbar({ layer, canvas, patch, onCrop, open, disabled }) {
  const { t } = useTranslation()
  const set = (change) => patch(layer.id, change)
  const natural = sourceOf(layer).width
  const fitLabel = (mode) => (canvas ? t(`editor.image.fit.${mode}`) : `${t(`editor.image.fit.${mode}`)} · ${t('editor.image.needCanvas')}`)

  const items = [
    { id: 'crop', icon: 'crop', label: t('editor.tool.crop'), run: onCrop },
    { id: 'rotate', icon: 'rotate', label: t('editor.crop.rotateRight'), run: () => set(turnImage(layer)) },
    { id: 'flipH', icon: 'flip', label: t('editor.crop.flipH'), run: () => set(flipImage(layer, 'h')) },
    { id: 'flipV', icon: 'flip', label: t('editor.crop.flipV'), run: () => set(flipImage(layer, 'v')), className: 'ed-vert' },
    { id: 'sepA' },
    ...FITS.map(([mode, icon]) => ({
      id: mode,
      icon,
      label: fitLabel(mode),
      run: canvas ? () => set(fitImage(layer, mode, canvas)) : undefined,
      className: canvas ? '' : 'is-off',
      off: !canvas,
    })),
    { id: 'sepB' },
    { id: 'reset', icon: 'refresh', label: t('editor.image.reset'), run: () => set({ rotation: 0, w: natural, sy: 1, stretch: false }) },
  ]

  return (
    <div className={'ed-imgtools' + (open ? ' is-open' : '')} inert={open ? undefined : ''} aria-hidden={!open}>
      <div className="ed-group ed-imgtools-in" role="group" aria-label={t('editor.image.size')}>
        {items.map((it, i) => (it.icon ? (
          <button key={it.id} type="button" className={'icon-btn' + (it.className ? ` ${it.className}` : '')} style={{ '--i': i }}
            disabled={disabled} aria-label={it.label} aria-disabled={it.off || undefined} data-tip={it.label} onClick={it.run}>
            <Icon name={it.icon} />
          </button>
        ) : (
          <i key={it.id} className="ed-sep" style={{ '--i': i }} />
        )))}
      </div>
    </div>
  )
}
