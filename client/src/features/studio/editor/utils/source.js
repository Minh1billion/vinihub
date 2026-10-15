import i18n from '../../../../i18n/index.js'

const MAX_SIDE = 8192

export const ASSET_MIME = 'application/x-vinihub-asset'

export async function loadBitmap(wid, id) {
  const res = await fetch(`/api/workspaces/${wid}/assets/${id}/content`, { credentials: 'include' })
  if (!res.ok) throw new Error(i18n.t('editor.loadFailed'))
  const blob = await res.blob()
  let bitmap
  try { bitmap = await createImageBitmap(blob) } catch { throw new Error(i18n.t('editor.loadFailed')) }
  const side = Math.max(bitmap.width, bitmap.height)
  if (side > MAX_SIDE) {
    const k = MAX_SIDE / side
    const next = await createImageBitmap(blob, {
      resizeWidth: Math.round(bitmap.width * k),
      resizeHeight: Math.round(bitmap.height * k),
      resizeQuality: 'high',
    })
    bitmap.close()
    bitmap = next
  }
  return bitmap
}
