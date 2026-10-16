const OPEN_FENCE = /^\s*```(?:json)?\s*/i
const CLOSE_FENCE = /\s*```\s*$/

const tryParse = (source) => {
  try {
    const value = JSON.parse(source)
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}

function close(source) {
  const stack = []
  let inString = false
  let escaped = false
  for (const ch of source) {
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
    } else if (ch === '"') inString = true
    else if (ch === '{' || ch === '[') stack.push(ch)
    else if (ch === '}' || ch === ']') stack.pop()
  }
  let out = source
  if (inString) out = (escaped ? out.slice(0, -1) : out) + '"'
  out = out.trimEnd()
  if (out.endsWith(',')) out = out.slice(0, -1)
  else if (out.endsWith(':')) out += 'null'
  return out + stack.reverse().map((c) => (c === '{' ? '}' : ']')).join('')
}

function tolerant(source) {
  let cur = source
  for (let i = 0; i < 8; i++) {
    const value = tryParse(close(cur))
    if (value) return value
    const cut = cur.lastIndexOf(',')
    if (cut < 0) return null
    cur = cur.slice(0, cut)
  }
  return null
}

const text = (v) => (typeof v === 'string' ? v : v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v))

export const itemsOf = (v) => (Array.isArray(v) ? v.map(text) : v == null || v === '' ? [] : [text(v)])
export const valueText = (v) => (Array.isArray(v) ? itemsOf(v).join('\n') : text(v))

export function readEnvelope(content, streaming) {
  const head = content.replace(OPEN_FENCE, '')
  if (!head.startsWith('{')) return null
  const body = head.replace(CLOSE_FENCE, '')
  const value = tryParse(body) || (streaming ? tolerant(body) : null)
  const pending = streaming ? { state: 'pending' } : null
  if (!value) return pending
  if (value.kind === 'chat') return { state: 'chat', text: text(value.reply) }
  if (value.kind === 'template') {
    const data = value.data && typeof value.data === 'object' && !Array.isArray(value.data) ? value.data : {}
    return { state: 'template', id: text(value.template), reply: text(value.reply), data }
  }
  return pending
}

export function fieldsFor(template, data) {
  if (template) return template.fields
  return Object.keys(data).map((key) => ({ key, label: key, type: Array.isArray(data[key]) ? 'list' : 'string', send: null }))
}

export function toMarkdown(fields, data) {
  return fields
    .filter((f) => data[f.key] != null)
    .map((f) => {
      const body = f.type === 'list' ? itemsOf(data[f.key]).map((x) => `- ${x}`).join('\n') : valueText(data[f.key])
      return `## ${f.label}\n${body}`
    })
    .join('\n\n')
}
