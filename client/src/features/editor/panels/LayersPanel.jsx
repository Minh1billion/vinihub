import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '../../../components/Button.jsx'
import LayerList from './LayerList.jsx'
import LayerProps from './LayerProps.jsx'

export default function LayersPanel({ edit, selected, onSelect, actions }) {
  const { t } = useTranslation()
  const input = useRef(null)
  const index = edit.layers.findIndex((l) => l.id === selected)
  const layer = index >= 0 ? edit.layers[index] : null

  return (
    <>
      <div className="ed-btnrow">
        <Button variant="soft" size="sm" icon="type" onClick={actions.addText}>{t('editor.layers.addText')}</Button>
        <Button variant="soft" size="sm" icon="image" onClick={() => input.current.click()}>{t('editor.layers.addImage')}</Button>
        <input ref={input} type="file" accept="image/*" multiple hidden
          onChange={(e) => { actions.addFiles(Array.from(e.target.files || [])); e.target.value = '' }} />
      </div>
      {edit.layers.length > 0
        ? <LayerList layers={edit.layers} selected={selected} onSelect={onSelect} onPatch={actions.patch} onReorder={actions.reorder} />
        : <small>{t('editor.layers.empty')}</small>}
      {layer && <LayerProps key={layer.id} layer={layer} index={index} count={edit.layers.length} actions={actions} />}
      {edit.layers.length > 0 && <small>{t('editor.layers.hint')}</small>}
    </>
  )
}
