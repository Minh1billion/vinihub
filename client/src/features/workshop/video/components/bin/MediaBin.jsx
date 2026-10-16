import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/shared/ui/Button.jsx'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import { FieldError } from '@/shared/ui/Field.jsx'
import Icon from '@/shared/ui/Icon.jsx'
import Select from '@/shared/ui/Select.jsx'
import { VIDEO_ASSET_MIME } from '@/shared/constants/assetMime.js'
import { INITIAL_FILTERS, SORTS, filterVideos, formatSize, isFiltered } from '../../utils/bin.js'

const hasFiles = (e) => [...e.dataTransfer.types].includes('Files')

function Thumb({ url }) {
  const box = useRef(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = box.current
    if (!el || near) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNear(true); io.disconnect() }
    }, { rootMargin: '240px' })
    io.observe(el)
    return () => io.disconnect()
  }, [near])
  return (
    <span ref={box} className="vd-bin-thumb" aria-hidden="true">
      {near && <video src={`${url}#t=0.1`} muted playsInline preload="metadata" />}
    </span>
  )
}

export default function MediaBin({ assets, error, onRetry, up, workspaceName, userId, onAdd }) {
  const { t } = useTranslation()
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [over, setOver] = useState(false)
  const picker = useRef(null)
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }))

  const hasOthers = Boolean(assets?.some((a) => a.user_id !== userId))
  const { base, shown } = useMemo(
    () => (assets ? filterVideos(assets, filters, userId) : { base: [], shown: [] }),
    [assets, filters, userId]
  )
  const sources = useMemo(() => ['all', ...new Set((assets || []).map((a) => a.source))], [assets])
  const count = (source) => base.filter((a) => source === 'all' || a.source === source).length
  const send = async (files) => {
    const done = await up.upload(files)
    if (done.length) setFilters(INITIAL_FILTERS)
  }
  const pickFiles = () => picker.current?.click()
  const sortOptions = SORTS.map((s) => ({ value: s, label: t(`videoEditor.bin.sort.${s}`) }))

  return (
    <aside className={'ed-props vd-bin' + (over ? ' is-over' : '')} aria-label={t('videoEditor.bin.title')}
      onDragOver={(e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setOver(true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false) }}
      onDrop={(e) => { setOver(false); if (!hasFiles(e)) return; e.preventDefault(); e.stopPropagation(); send([...e.dataTransfer.files]) }}>
      <header className="ed-ihead">
        <span className="ed-ihead-ic"><Icon name="library" size={18} /></span>
        <div className="vd-bin-title">
          <strong className="ed-name">{t('videoEditor.bin.title')}</strong>
          {workspaceName && <small>{t('videoEditor.bin.subtitle', { name: workspaceName })}</small>}
        </div>
        <button type="button" className="icon-btn vd-bin-up" disabled={up.busy} onClick={pickFiles}
          aria-label={t('library.upload.label')} data-tip={t('library.upload.label')}><Icon name="upload" size={18} /></button>
        <input ref={picker} type="file" accept="video/*" multiple hidden
          onChange={(e) => { send([...e.target.files]); e.target.value = '' }} />
      </header>
      <div className="vd-bin-tools">
        <label className="vd-bin-search">
          <Icon name="search" size={16} />
          <input type="search" value={filters.query} placeholder={t('videoEditor.bin.search')}
            aria-label={t('videoEditor.bin.search')} onChange={(e) => set({ query: e.target.value })} />
        </label>
        {sources.length > 2 && (
          <div role="tablist" className="filters">
            {sources.map((s) => (
              <button key={s} type="button" role="tab" aria-selected={filters.source === s} className={filters.source === s ? 'on' : ''}
                onClick={() => set({ source: s })}>
                {t(`videoEditor.bin.source.${s}`, { defaultValue: s })}<span className="num">{count(s)}</span>
              </button>
            ))}
          </div>
        )}
        <div className="vd-bin-row-tools">
          <Select className="sm" popClassName="ed-theme" searchable={false} label={t('videoEditor.bin.sortLabel')}
            options={sortOptions} value={filters.sort} onChange={(sort) => set({ sort })} />
          {hasOthers && (
            <button type="button" aria-pressed={filters.mine} className={'filters-mine' + (filters.mine ? ' on' : '')}
              onClick={() => set({ mine: !filters.mine })}>
              {t('library.mine')}
            </button>
          )}
        </div>
      </div>
      <div className="vd-bin-body">
        <FieldError>{error || up.err}</FieldError>
        {up.busy && <p className="vd-bin-note" role="status">{t('library.upload.busy', { count: up.pending })}</p>}
        {error && !assets && <Button variant="ghost" size="sm" icon="refresh" onClick={onRetry}>{t('videoEditor.bin.retry')}</Button>}
        {!assets && !error && <p className="vd-bin-note" role="status">{t('videoEditor.bin.loading')}</p>}
        {assets && !assets.length && (
          <EmptyState title={t('videoEditor.bin.emptyTitle')} text={t('videoEditor.bin.emptyText')}>
            <Button variant="ghost" size="sm" icon="upload" disabled={up.busy} onClick={pickFiles}>{t('library.upload.button')}</Button>
          </EmptyState>
        )}
        {assets && assets.length > 0 && !shown.length && (
          <EmptyState title={t('videoEditor.bin.noMatchTitle')} text={t('videoEditor.bin.noMatchText')}>
            {isFiltered(filters) && <Button variant="ghost" size="sm" onClick={() => setFilters(INITIAL_FILTERS)}>{t('videoEditor.bin.clear')}</Button>}
          </EmptyState>
        )}
        {shown.length > 0 && (
          <>
            <p className="vd-bin-note num">{t('videoEditor.bin.count', { shown: shown.length, total: assets.length })}</p>
            <ul className="vd-bin-list">
              {shown.map((a) => {
                const name = a.prompt || t('videoEditor.bin.untitled')
                return (
                  <li key={a.id} draggable
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData(VIDEO_ASSET_MIME, a.id) }}>
                    <button type="button" className="vd-bin-item" aria-label={t('videoEditor.bin.add', { name })} onClick={() => onAdd(a)}>
                      <Thumb url={a.url} />
                      <span className="vd-bin-meta">
                        <strong title={name}>{name}</strong>
                        <small>{t(`videoEditor.bin.source.${a.source}`, { defaultValue: a.source })} · {formatSize(a.size)}</small>
                      </span>
                      <span className="vd-bin-plus" aria-hidden="true"><Icon name="plus" size={16} /></span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </aside>
  )
}
