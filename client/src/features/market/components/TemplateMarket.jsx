import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/shared/api/client.js'
import { useApp } from '@/app/providers/AppContext.jsx'
import { useDialog } from '@/app/providers/DialogContext.jsx'
import Button from '@/shared/ui/Button.jsx'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import { FieldError } from '@/shared/ui/Field.jsx'
import Icon from '@/shared/ui/Icon.jsx'
import Segmented from '@/shared/ui/Segmented.jsx'
import { useTemplates, PublishModal } from '@/features/templates'

const PREVIEW_FIELDS = 4

function Code({ code }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <button type="button" className="mk-code" title={t('market.copyId')} aria-label={t('market.copyId')} onClick={copy}>
      <Icon name={copied ? 'check' : 'copy'} size={13} />
      {copied ? t('idea.copied') : code}
    </button>
  )
}

function Author({ author }) {
  return (
    <span className="mk-author">
      {author.avatar_url
        ? <img src={author.avatar_url} alt="" referrerPolicy="no-referrer" />
        : <span className="avatar-dot" />}
      <span>{author.name}</span>
    </span>
  )
}

function Card({ item, busy, onInstall, onEdit, onDelete }) {
  const { t } = useTranslation()
  const hidden = item.field_count - PREVIEW_FIELDS
  return (
    <article className="mk-card">
      <header>
        <h3>{item.title}</h3>
        <div className="mk-meta">
          <Author author={item.author} />
          <Code code={item.code} />
        </div>
      </header>
      {item.description && <p className="mk-desc">{item.description}</p>}
      <ul className="mk-fields">
        {item.fields.slice(0, PREVIEW_FIELDS).map((f) => (
          <li key={f.key}>
            <span>{f.label}</span>
            <small>{t(f.type === 'list' ? 'template.typeList' : 'template.typeString')}</small>
          </li>
        ))}
        {hidden > 0 && <li className="mk-more">{t('market.moreFields', { count: hidden })}</li>}
      </ul>
      {item.tags.length > 0 && (
        <div className="mk-tags">{item.tags.map((tag) => <span className="mk-tag" key={tag}>{tag}</span>)}</div>
      )}
      <footer>
        <span className="mk-installs"><Icon name="download" size={15} />{t('market.installs', { count: item.installs })}</span>
        <span className="mk-actions">
          {item.mine && <button type="button" className="icon-btn" aria-label={t('template.edit')} onClick={() => onEdit(item)}><Icon name="edit" size={16} /></button>}
          {item.mine && <button type="button" className="icon-btn" aria-label={t('common.delete')} onClick={() => onDelete(item)}><Icon name="trash" size={16} /></button>}
          <Button variant={item.installed ? 'ghost' : 'soft'} size="sm" icon={item.installed ? 'check' : 'plus'} disabled={item.installed}
            loading={busy} onClick={() => onInstall(item)}>
            {item.installed ? t('market.added') : t('market.add')}
          </Button>
        </span>
      </footer>
    </article>
  )
}

export default function TemplateMarket() {
  const { t, i18n } = useTranslation()
  const { wid, workspaces } = useApp()
  const dialog = useDialog()
  const { templates, reload } = useTemplates(wid)
  const [items, setItems] = useState(null)
  const [query, setQuery] = useState('')
  const [term, setTerm] = useState('')
  const [sort, setSort] = useState('new')
  const [scope, setScope] = useState('all')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const workspace = workspaces.find((w) => w.id === wid)

  useEffect(() => {
    const id = setTimeout(() => setTerm(query.trim()), 250)
    return () => clearTimeout(id)
  }, [query])

  const load = useCallback(async () => {
    const params = new URLSearchParams({ kind: 'template', sort, mine: String(scope === 'mine') })
    if (wid) params.set('workspace_id', wid)
    if (term) params.set('q', term)
    try { setItems(await api.get(`/market/items?${params}`)); setErr('') } catch (e) { setErr(e.message); setItems([]) }
  }, [term, sort, scope, wid])

  useEffect(() => { load() }, [load, i18n.resolvedLanguage])

  const install = async (item) => {
    setBusy(item.id); setErr('')
    try {
      await api.post(`/market/items/${item.id}/install`, { workspace_id: wid })
      setItems((list) => list.map((x) => (x.id === item.id ? { ...x, installed: true, installs: x.installs + 1 } : x)))
      await reload()
    } catch (e) { setErr(e.message) }
    setBusy('')
  }

  const remove = async (item) => {
    const ok = await dialog.confirm({ tone: 'warning', message: t('market.confirmDelete', { name: item.title }), confirmLabel: t('common.delete'), danger: true })
    if (!ok) return
    try {
      await api.del(`/market/items/${item.id}`)
      setItems((list) => list.filter((x) => x.id !== item.id))
    } catch (e) { dialog.error(e.message) }
  }

  const published = async () => {
    setPublishing(false)
    setScope('all')
    setSort('new')
    setQuery('')
    await load()
  }

  const saved = (item) => {
    setItems((list) => list.map((x) => (x.id === item.id ? { ...x, ...item } : x)))
    setEditing(null)
  }

  const sortOptions = [
    { value: 'new', label: t('market.sortNew') },
    { value: 'popular', label: t('market.sortPopular') },
  ]
  const scopeOptions = [
    { value: 'all', label: t('market.scopeAll') },
    { value: 'mine', label: t('market.scopeMine') },
  ]

  return (
    <section className="page-main mk">
      <div className="mk-bar">
        <label className="convs-search mk-search">
          <Icon name="search" size={16} />
          <input type="search" value={query} placeholder={t('market.search')} aria-label={t('market.search')} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <Segmented label={t('market.scopeLabel')} options={scopeOptions} value={scope} onChange={setScope} />
        <Segmented label={t('market.sortLabel')} options={sortOptions} value={sort} onChange={setSort} />
        <Button icon="share" className="mk-publish" disabled={templates === null} onClick={() => setPublishing(true)}>{t('market.publishAction')}</Button>
      </div>
      {workspace && <small className="mk-target">{t('market.installTo', { name: workspace.name })}</small>}
      <FieldError>{err}</FieldError>
      <div className="mk-scroll scroll">
        {items === null && <p className="page-loading">{t('market.loading')}</p>}
        {items?.length === 0 && !err && (
          <EmptyState title={t(scope === 'mine' ? 'market.emptyMineTitle' : 'market.emptyTitle')} text={t(scope === 'mine' ? 'market.emptyMineText' : 'market.emptyText')} />
        )}
        {items?.length > 0 && (
          <div className="mk-grid">
            {items.map((item) => (
              <Card key={item.id} item={item} busy={busy === item.id}
                onInstall={install} onEdit={setEditing} onDelete={remove} />
            ))}
          </div>
        )}
      </div>
      {publishing && <PublishModal sources={templates || []} onDone={published} onClose={() => setPublishing(false)} />}
      {editing && <PublishModal initial={editing} itemId={editing.id} onDone={saved} onClose={() => setEditing(null)} />}
    </section>
  )
}
