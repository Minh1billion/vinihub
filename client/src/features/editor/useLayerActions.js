import { useTranslation } from 'react-i18next'
import { newImage, newText, uid } from './layers.js'

export default function useLayerActions({ commit, getView, onSelect, onError }) {
  const { t } = useTranslation()

  const insert = (layer) => {
    commit((e) => ({ ...e, layers: [...e.layers, layer] }))
    onSelect(layer.id)
  }

  const addText = () => insert(newText(t('editor.text.default'), getView()))

  const addImage = async (file) => {
    try {
      insert(newImage(await createImageBitmap(file), file.name.replace(/\.[^.]+$/, ''), getView()))
    } catch {
      onError(t('editor.layers.imageFailed'))
    }
  }

  const patch = (id, change, key) => commit((e) => ({ ...e, layers: e.layers.map((x) => (x.id === id ? { ...x, ...change } : x)) }), key)

  const move = (id, dir) => commit((e) => {
    const i = e.layers.findIndex((x) => x.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= e.layers.length) return e
    const layers = [...e.layers]
    ;[layers[i], layers[j]] = [layers[j], layers[i]]
    return { ...e, layers }
  })

  const reorder = (id, targetId) => commit((e) => {
    const from = e.layers.findIndex((x) => x.id === id)
    const to = e.layers.findIndex((x) => x.id === targetId)
    if (from < 0 || to < 0 || from === to) return e
    const layers = [...e.layers]
    const [item] = layers.splice(from, 1)
    layers.splice(to, 0, item)
    return { ...e, layers }
  })

  const duplicate = (layer) => {
    const copy = { ...layer, id: uid(), locked: false, name: layer.name ? `${layer.name} ${t('editor.layers.copySuffix')}` : '', x: layer.x + getView().vw * 0.03, y: layer.y + getView().vw * 0.03 }
    commit((e) => {
      const i = e.layers.findIndex((x) => x.id === layer.id)
      const layers = [...e.layers]
      layers.splice(i + 1, 0, copy)
      return { ...e, layers }
    })
    onSelect(copy.id)
  }

  const remove = (id) => {
    commit((e) => ({ ...e, layers: e.layers.filter((x) => x.id !== id) }))
    onSelect(null)
  }

  return { addText, addImage, patch, move, reorder, duplicate, remove }
}
