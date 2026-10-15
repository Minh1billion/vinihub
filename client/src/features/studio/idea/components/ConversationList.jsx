import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '../../../../components/Button.jsx'
import Icon from '../../../../components/Icon.jsx'

const DAY = 86400000

const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').toLowerCase()

function bucket(iso) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const t = new Date(iso).getTime()
  if (t >= start) return 'today'
  if (t >= start - DAY) return 'yesterday'
  if (t >= start - 7 * DAY) return 'week'
  if (t >= start - 30 * DAY) return 'month'
  return 'older'
}

export default function ConversationList({ items, activeId, canEdit, open, onOpen, onNew, onRename, onDelete }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState('')
  const skip = useRef(false)

  const groups = useMemo(() => {
    const q = fold(query.trim())
    const out = []
    for (const c of items) {
      if (q && !fold(c.title).includes(q)) continue
      const key = bucket(c.updated_at)
      const last = out[out.length - 1]
      if (last && last.key === key) last.items.push(c)
      else out.push({ key, items: [c] })
    }
    return out
  }, [items, query])

  const begin = (c) => { skip.current = false; setEditing(c.id); setDraft(c.title) }
  const commit = (c) => {
    if (skip.current) return
    skip.current = true
    const title = draft.trim()
    setEditing(null)
    if (title && title !== c.title) onRename(c.id, title)
  }
  const cancel = () => { skip.current = true; setEditing(null) }

  return (
    <aside className={'convs subside' + (open ? ' open' : '')} aria-label={t('conv.aria')}>
      <header className="subside-head">
        <Icon name="message" size={18} />
        <h2>{t('studio.idea')}</h2>
      </header>
      <div className="convs-tools">
        <Button variant="ghost" icon="plus" block onClick={onNew}>{t('conv.new')}</Button>
        {items.length > 0 && (
          <label className="convs-search">
            <Icon name="search" size={16} />
            <input type="search" value={query} placeholder={t('conv.search')} aria-label={t('conv.search')}
              onChange={(e) => setQuery(e.target.value)} />
          </label>
        )}
      </div>
      <h3 className="convs-heading"><Icon name="history" size={14} />{t('idea.history')}</h3>
      <div className="convs-scroll">
        {!items.length && <p className="convs-empty">{t('conv.empty')}</p>}
        {items.length > 0 && !groups.length && <p className="convs-empty">{t('conv.noResults')}</p>}
        {groups.map((g) => (
          <section key={g.key}>
            <h3 className="convs-label">{t('conv.' + g.key)}</h3>
            {g.items.map((c) => (
              <div key={c.id} className={'conv' + (c.id === activeId ? ' on' : '')}>
                {editing === c.id ? (
                  <input className="conv-edit" autoFocus value={draft} maxLength={200} aria-label={t('conv.nameAria')}
                    onChange={(e) => setDraft(e.target.value)} onBlur={() => commit(c)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); commit(c) }
                      if (e.key === 'Escape') cancel()
                    }} />
                ) : (
                  <button type="button" className="conv-open" title={c.title} onClick={() => onOpen(c.id)}
                    aria-current={c.id === activeId ? 'true' : undefined}>{c.title}</button>
                )}
                {editing !== c.id && canEdit(c) && (
                  <div className="conv-actions">
                    <button type="button" className="icon-btn sm" aria-label={t('conv.rename')} onClick={() => begin(c)}><Icon name="edit" size={15} /></button>
                    <button type="button" className="icon-btn sm danger" aria-label={t('common.delete')} onClick={() => onDelete(c.id)}><Icon name="trash" size={15} /></button>
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
    </aside>
  )
}
