import { useTranslation } from 'react-i18next'
import Icon from '../../../../../components/Icon.jsx'
import Segmented from '../../../../../components/Segmented.jsx'
import { LAYER_TYPES, emptyLabel, layerName } from '../../utils/layers.js'
import AdjustPanel from './AdjustPanel.jsx'
import AlignBar from './AlignBar.jsx'
import CanvasPanel from './CanvasPanel.jsx'
import CropLayerPanel from './CropLayerPanel.jsx'
import FilterPanel from './FilterPanel.jsx'
import ImageProps from './ImageProps.jsx'
import PositionBar from './PositionBar.jsx'
import ShapeProps from './ShapeProps.jsx'
import TextProps from './TextProps.jsx'

export default function Inspector({ layer, actions, thumb, section, setSection, canvas, content, setCanvas, canvasActions, crop, cropActions, frame }) {
  const { t } = useTranslation()

  if (!layer) {
    return <CanvasPanel canvas={canvas} content={content} setCanvas={setCanvas} actions={canvasActions} />
  }

  const cropping = crop?.id === layer.id
  const kind = LAYER_TYPES[layer.type]
  const name = layerName(layer, emptyLabel(layer, t))

  return (
    <>
      <header className="ed-ihead">
        <span className="ed-ihead-ic"><Icon name={kind.icon} size={16} /></span>
        <input className="ed-iname" type="text" value={layer.name || ''} maxLength={60} disabled={layer.locked}
          placeholder={name} aria-label={t('editor.layers.name')}
          onChange={(e) => actions.patch(layer.id, { name: e.target.value }, `name:${layer.id}`)} />
        <button type="button" className="ed-lbtn danger" disabled={layer.locked} data-tip={t('editor.layers.remove')}
          aria-label={t('editor.layers.remove')} onClick={() => actions.remove(layer.id)}>
          <Icon name="trash" size={16} />
        </button>
      </header>
      <div className="ed-ibody">
        {layer.type === 'image' && !cropping && (
          <div className="ed-itabs">
            <h4 className="ed-sec-title">{t('editor.inspector.sections')}</h4>
            <Segmented label={t('editor.inspector.sections')} value={section} onChange={setSection}
              options={[
                { value: 'transform', label: t('editor.inspector.transform') },
                { value: 'adjust', label: t('editor.tool.adjust') },
                { value: 'filters', label: t('editor.tool.filters') },
              ]} />
          </div>
        )}
        {layer.locked && (
          <small className="ed-lockhint"><Icon name="lock" size={14} />{t('editor.layers.lockedHint')}</small>
        )}
        {cropping && <CropLayerPanel layer={layer} crop={crop} setCrop={cropActions.set} onApply={cropActions.apply} onCancel={cropActions.cancel} />}
        {!cropping && <fieldset className="ed-lock" disabled={layer.locked}>
          {(layer.type !== 'image' || section === 'transform') && (
            <>
              <AlignBar layer={layer} frame={frame} patch={actions.patch} />
              <PositionBar layer={layer} canvas={canvas} patch={actions.patch} />
            </>
          )}
          {layer.type === 'text' && <TextProps layer={layer} patch={actions.patch} actions={actions} />}
          {layer.type === 'shape' && <ShapeProps layer={layer} patch={actions.patch} actions={actions} />}
          {layer.type === 'image' && section === 'transform' && <ImageProps layer={layer} patch={actions.patch} actions={actions} />}
          {layer.type === 'image' && section === 'adjust' && <AdjustPanel layer={layer} patch={actions.patch} />}
          {layer.type === 'image' && section === 'filters' && <FilterPanel layer={layer} patch={actions.patch} thumb={thumb} />}
        </fieldset>}
      </div>
    </>
  )
}
