import { useTranslation } from 'react-i18next'
import { loadLayerBitmap } from './source.js'
import { clamp, duplicateLayer, makeImage, makeText, patchLayer, placeLayer, removeLayer, stepLayer, uid } from './layers.js'

export default function useLayers({ commit, oriented, selected, onSelect, onTool, onError }) {
  const { t } = useTranslation()

  const put = (layer) => {
    commit((e) => ({ ...e, layers: [...e.layers, layer] }))
    onSelect(layer.id)
    onTool('layers')
  }

  const addText = () => put(makeText(t('editor.text.default')))

  const addFiles = async (files) => {
    if (!oriented) return
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (!images.length) { onError(t('editor.layers.imageOnly')); return }
    for (const file of images) {
      try {
        const bitmap = await loadLayerBitmap(file)
        put(makeImage(bitmap, file.name.replace(/\.[^.]+$/, ''), oriented))
      } catch (e) {
        onError(e.message || t('editor.layers.loadFailed'))
      }
    }
  }

  const patch = (id, change, key) => commit((e) => ({ ...e, layers: patchLayer(e.layers, id, change) }), key)

  const remove = (id) => {
    commit((e) => ({ ...e, layers: removeLayer(e.layers, id) }))
    if (selected === id) onSelect(null)
  }

  const duplicate = (id) => {
    const copyId = uid()
    commit((e) => ({ ...e, layers: duplicateLayer(e.layers, id, copyId, t('editor.layers.copySuffix')) }))
    onSelect(copyId)
  }

  const step = (id, amount) => commit((e) => ({ ...e, layers: stepLayer(e.layers, id, amount) }))

  const reorder = (id, targetId) => commit((e) => ({ ...e, layers: placeLayer(e.layers, id, targetId) }))

  const nudge = (id, dx, dy) => commit((e) => ({
    ...e,
    layers: e.layers.map((l) => (l.id === id && !l.locked ? { ...l, x: clamp(l.x + dx, 0, 1), y: clamp(l.y + dy, 0, 1) } : l)),
  }), `nudge:${id}`)

  return { addText, addFiles, patch, remove, duplicate, step, reorder, nudge }
}
