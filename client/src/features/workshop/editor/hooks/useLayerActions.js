import { useTranslation } from 'react-i18next'
import { rememberSource } from '@/app/providers/sessionDb.js'
import { newImage, newShape, newText, uid } from '../utils/layers.js'

export default function useLayerActions({ commit, getView, onSelect, onError }) {
  const { t } = useTranslation()

  const insert = (layer) => {
    commit((e) => ({ ...e, layers: [...e.layers, layer] }))
    onSelect(layer.id)
  }

  const addText = () => insert(newText(t('editor.text.default'), getView()))

  const addShape = (kind = 'rect') => insert(newShape(kind, getView()))

  const addBitmap = (bitmap, name, at) => {
    const view = getView()
    insert(newImage(bitmap, name, at ? { ...view, cx: at.x, cy: at.y } : view))
  }

  const addImage = async (file, at) => {
    try {
      const bitmap = await createImageBitmap(file)
      rememberSource(bitmap, file)
      addBitmap(bitmap, file.name.replace(/\.[^.]+$/, ''), at)
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

  const place = (id, top) => commit((e) => {
    const item = e.layers.find((x) => x.id === id)
    if (!item || e.layers[top ? e.layers.length - 1 : 0] === item) return e
    const rest = e.layers.filter((x) => x.id !== id)
    return { ...e, layers: top ? [...rest, item] : [item, ...rest] }
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

  const paste = (layer) => {
    const v = getView()
    insert({ ...layer, id: uid(), locked: false, x: layer.x + v.vw * 0.03, y: layer.y + v.vw * 0.03 })
  }

  const remove = (id) => {
    commit((e) => ({ ...e, layers: e.layers.filter((x) => x.id !== id) }))
    onSelect(null)
  }

  return { addText, addShape, addImage, addBitmap, patch, move, place, reorder, duplicate, paste, remove }
}
