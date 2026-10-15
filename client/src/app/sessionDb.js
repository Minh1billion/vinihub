const DB_NAME = 'vinihub-session'
const MAX_SIDE = 8192
const STATE = 'kv'
const BITMAPS = 'bitmaps'

let opened = null
let disabled = false
const ids = new WeakMap()
const sources = new WeakMap()
const known = new Set()

const open = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, 1)
  req.onupgradeneeded = () => {
    req.result.createObjectStore(STATE)
    req.result.createObjectStore(BITMAPS)
  }
  req.onsuccess = () => resolve(req.result)
  req.onerror = () => reject(req.error)
})

const db = () => {
  if (!opened) opened = open()
  return opened
}

const wrap = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result)
  req.onerror = () => reject(req.error)
})

const finish = (tx) => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve()
  tx.onerror = () => reject(tx.error)
  tx.onabort = () => reject(tx.error)
})

async function read(store, key) {
  const d = await db()
  return wrap(d.transaction(store).objectStore(store).get(key))
}

async function write(store, key, value) {
  const d = await db()
  const tx = d.transaction(store, 'readwrite')
  tx.objectStore(store).put(value, key)
  await finish(tx)
}

async function listKeys(store) {
  const d = await db()
  return wrap(d.transaction(store).objectStore(store).getAllKeys())
}

async function removeKeys(store, list) {
  if (!list.length) return
  const d = await db()
  const tx = d.transaction(store, 'readwrite')
  list.forEach((key) => tx.objectStore(store).delete(key))
  await finish(tx)
}

export const rememberSource = (bitmap, blob) => { if (bitmap && blob) sources.set(bitmap, blob) }

const isBitmap = (v) => typeof ImageBitmap !== 'undefined' && v instanceof ImageBitmap
const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

function pack(value, memo, used) {
  if (isBitmap(value)) {
    let id = ids.get(value)
    if (!id) {
      id = newId()
      ids.set(value, id)
    }
    used.set(id, value)
    return { $bmp: id }
  }
  if (value === null || typeof value !== 'object') return typeof value === 'function' ? undefined : value
  if (memo.has(value)) return memo.get(value)
  if (Array.isArray(value)) {
    const out = []
    memo.set(value, out)
    for (const item of value) out.push(pack(item, memo, used))
    return out
  }
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) return null
  const out = {}
  memo.set(value, out)
  for (const key of Object.keys(value)) {
    const next = pack(value[key], memo, used)
    if (next !== undefined) out[key] = next
  }
  return out
}

const isMarker = (v) => !Array.isArray(v) && Object.keys(v).length === 1 && typeof v.$bmp === 'string'

function scan(value, found, seen) {
  if (value === null || typeof value !== 'object') return
  if (isMarker(value)) { found.add(value.$bmp); return }
  if (seen.has(value)) return
  seen.add(value)
  if (Array.isArray(value)) value.forEach((item) => scan(item, found, seen))
  else Object.keys(value).forEach((key) => scan(value[key], found, seen))
}

function unpack(value, seen, bitmaps) {
  if (value === null || typeof value !== 'object') return value
  if (isMarker(value)) return bitmaps.get(value.$bmp) ?? null
  if (seen.has(value)) return value
  seen.add(value)
  if (Array.isArray(value)) value.forEach((item, i) => { value[i] = unpack(item, seen, bitmaps) })
  else Object.keys(value).forEach((key) => { value[key] = unpack(value[key], seen, bitmaps) })
  return value
}

async function decode(blob) {
  let bitmap = await createImageBitmap(blob)
  const side = Math.max(bitmap.width, bitmap.height)
  if (side > MAX_SIDE) {
    const k = MAX_SIDE / side
    const next = await createImageBitmap(blob, { resizeWidth: Math.round(bitmap.width * k), resizeHeight: Math.round(bitmap.height * k), resizeQuality: 'high' })
    bitmap.close()
    bitmap = next
  }
  return bitmap
}

async function encode(bitmap) {
  if (!bitmap.width || !bitmap.height) throw new Error('empty bitmap')
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    canvas.getContext('2d').drawImage(bitmap, 0, 0)
    return canvas.convertToBlob({ type: 'image/png' })
  }
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d').drawImage(bitmap, 0, 0)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/png'))
}

async function wipe() {
  const d = await db()
  const tx = d.transaction([STATE, BITMAPS], 'readwrite')
  tx.objectStore(STATE).clear()
  tx.objectStore(BITMAPS).clear()
  await finish(tx)
  known.clear()
}

export async function clearSession() {
  disabled = true
  try { await wipe() } catch { return }
}

export async function loadSession(userId) {
  const out = new Map()
  try {
    const prefix = `${userId}:`
    await removeKeys(STATE, (await listKeys(STATE)).filter((k) => !k.startsWith(prefix)))
    await removeKeys(BITMAPS, (await listKeys(BITMAPS)).filter((k) => !k.startsWith(prefix)))
    const record = await read(STATE, `${prefix}state`)
    if (!record) return out
    const found = new Set()
    scan(record.data, found, new Set())
    const bitmaps = new Map()
    await Promise.all([...found].map(async (id) => {
      const blob = await read(BITMAPS, `${prefix}${id}`)
      if (!blob) throw new Error('missing bitmap')
      const bitmap = await decode(blob)
      sources.set(bitmap, blob)
      ids.set(bitmap, id)
      known.add(`${prefix}${id}`)
      bitmaps.set(id, bitmap)
    }))
    const seen = new Set()
    for (const key of Object.keys(record.data)) out.set(key, unpack(record.data[key], seen, bitmaps))
    return out
  } catch (e) {
    console.warn('[session] restore failed', e)
    try { await wipe() } catch { return new Map() }
    return new Map()
  }
}

export async function saveSession(userId, entries) {
  if (disabled) return
  const prefix = `${userId}:`
  const memo = new Map()
  const used = new Map()
  const data = {}
  for (const [key, value] of entries) data[key] = pack(value, memo, used)
  const blobs = new Map()
  for (const [id, bitmap] of used) {
    if (known.has(`${prefix}${id}`)) continue
    blobs.set(id, sources.get(bitmap) || (await encode(bitmap)))
    if (disabled) return
  }
  for (const [id, blob] of blobs) {
    await write(BITMAPS, `${prefix}${id}`, blob)
    known.add(`${prefix}${id}`)
  }
  if (disabled) return
  await write(STATE, `${prefix}state`, { data, at: Date.now() })
  const stale = (await listKeys(BITMAPS)).filter((k) => k.startsWith(prefix) && !used.has(k.slice(prefix.length)))
  await removeKeys(BITMAPS, stale)
  stale.forEach((k) => known.delete(k))
}
