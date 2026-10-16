import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/shared/api/client.js'
import { useApp } from '@/app/providers/AppContext.jsx'
import { useDialog } from '@/app/providers/DialogContext.jsx'
import { useLibrary } from '../context/LibraryContext.jsx'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import { FieldError } from '@/shared/ui/Field.jsx'
import Icon from '@/shared/ui/Icon.jsx'
import MediaCard from './MediaCard.jsx'
import MediaViewer from './MediaViewer.jsx'

const FILTERS = [
  { value: 'all', labelKey: 'library.all' },
  { value: 'image', labelKey: 'library.images' },
  { value: 'video', labelKey: 'library.videos' },
]

export default function LibrarySidebar() {
  const { t } = useTranslation()
  const { wid, workspaces, user } = useApp()
  const { open, close, created, notifyDeleted } = useLibrary()
  const dialog = useDialog()
  const [filter, setFilter] = useState('all')
  const [mine, setMine] = useState(false)
  const [assets, setAssets] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [err, setErr] = useState('')
  const current = workspaces.find((w) => w.id === wid)

  useEffect(() => { setAssets(null) }, [wid])

  useEffect(() => {
    let alive = true
    api.get(`/workspaces/${wid}/assets`)
      .then((list) => { if (alive) { setAssets(list); setErr('') } })
      .catch((e) => { if (alive) setErr(e.message) })
    return () => { alive = false }
  }, [wid, created])

  const canDelete = (a) => a.user_id === user.id || current?.role === 'owner'

  const remove = async (asset) => {
    const ok = await dialog.confirm({ tone: 'warning', message: t('library.confirmDelete'), confirmLabel: t('common.delete'), danger: true })
    if (!ok) return
    try {
      await api.del(`/workspaces/${wid}/assets/${asset.id}`)
      setAssets((list) => list.filter((a) => a.id !== asset.id))
      setViewing(null)
      notifyDeleted()
    } catch (e) { dialog.error(e.message) }
  }

  const hasOthers = Boolean(assets?.some((a) => a.user_id !== user.id))
  const base = assets?.filter((a) => !mine || a.user_id === user.id) || []
  const count = (value) => base.filter((a) => value === 'all' || a.kind === value).length
  const shown = base.filter((a) => filter === 'all' || a.kind === filter)

  return (
    <aside className={'lib-side' + (open ? '' : ' lib-side--closing')} aria-label={t('library.title')}>
      <div className="lib-inner">
        <header className="lib-head">
          <div>
            <h2>{t('library.title')}</h2>
            <small>{t('library.subtitle', { name: current?.name })}</small>
          </div>
          <button type="button" className="icon-btn" onClick={close} aria-label={t('common.close')}><Icon name="close" /></button>
        </header>
        <div className="lib-tools">
          <div role="tablist" className="filters">
            {FILTERS.map((f) => (
              <button key={f.value} role="tab" aria-selected={filter === f.value} className={filter === f.value ? 'on' : ''}
                onClick={() => setFilter(f.value)}>
                {t(f.labelKey)}<span className="num">{count(f.value)}</span>
              </button>
            ))}
          </div>
          {hasOthers && (
            <button aria-pressed={mine} className={'filters-mine' + (mine ? ' on' : '')} onClick={() => setMine((m) => !m)}>
              {t('library.mine')}
            </button>
          )}
        </div>
        <div className="lib-body">
          <FieldError>{err}</FieldError>
          {assets && !shown.length && (
            <EmptyState
              title={mine && assets.length ? t('library.emptyMineTitle') : t('library.emptyTitle')}
              text={mine && assets.length ? t('library.emptyMineText') : t('library.emptyText')} />
          )}
          <div className="grid">
            {shown.map((a) => <MediaCard key={a.id} asset={a} onOpen={setViewing} onDelete={canDelete(a) ? remove : undefined} />)}
          </div>
        </div>
      </div>
      {viewing && <MediaViewer asset={viewing} onClose={() => setViewing(null)} onDelete={canDelete(viewing) ? remove : undefined} />}
    </aside>
  )
}
