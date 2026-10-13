import i18n from '../i18n/index.js'

async function fail(res) {
  let detail
  try { detail = (await res.json()).detail } catch {}
  const err = new Error(typeof detail === 'string' ? detail : i18n.t('errors.generic'))
  err.status = res.status
  throw err
}

async function req(path, { method = 'GET', body } = {}) {
  const form = body instanceof FormData
  const res = await fetch('/api' + path, {
    method,
    credentials: 'include',
    headers: body && !form ? { 'Content-Type': 'application/json' } : undefined,
    body: body === undefined ? undefined : form ? body : JSON.stringify(body),
  })
  if (!res.ok) await fail(res)
  return res.status === 204 ? null : res.json()
}

export const api = {
  get: (p) => req(p),
  post: (p, body) => req(p, { method: 'POST', body }),
  patch: (p, body) => req(p, { method: 'PATCH', body }),
  del: (p) => req(p, { method: 'DELETE' }),
}

export function uploadFile(wid, file) {
  const fd = new FormData()
  fd.append('file', file)
  return req(`/workspaces/${wid}/assets`, { method: 'POST', body: fd })
}

export async function streamPost(path, body, onEvent, signal) {
  const res = await fetch('/api' + path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) await fail(res)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let end
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, end)
      buffer = buffer.slice(end + 2)
      let event = 'message'
      let data = ''
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data += line.slice(5).trim()
      }
      if (data) onEvent(event, JSON.parse(data))
    }
  }
}
