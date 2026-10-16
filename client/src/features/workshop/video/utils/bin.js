export const SORTS = ['newest', 'oldest', 'largest']
export const INITIAL_FILTERS = { query: '', source: 'all', mine: false, sort: 'newest' }

const fold = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase()
const time = (a) => new Date(a.created_at).getTime()

const ORDER = {
  newest: (a, b) => time(b) - time(a),
  oldest: (a, b) => time(a) - time(b),
  largest: (a, b) => b.size - a.size,
}

export function matchesBase(asset, { query, mine }, userId) {
  if (mine && asset.user_id !== userId) return false
  const q = fold(query.trim())
  return !q || fold(asset.prompt || '').includes(q)
}

export function filterVideos(assets, filters, userId) {
  const base = assets.filter((a) => matchesBase(a, filters, userId))
  const shown = base.filter((a) => filters.source === 'all' || a.source === filters.source)
  return { base, shown: shown.sort(ORDER[filters.sort] || ORDER.newest) }
}

export const isFiltered = (f) => Boolean(f.query.trim()) || f.source !== 'all' || f.mine

export function formatSize(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`
}
