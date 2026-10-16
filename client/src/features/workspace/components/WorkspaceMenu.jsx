import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '@/app/providers/AppContext.jsx'
import Icon from '@/shared/ui/Icon.jsx'
import { useClickOutside } from '@/shared/hooks/useClickOutside.js'
import CreateWorkspaceModal from './CreateWorkspaceModal.jsx'
import ShareModal from './ShareModal.jsx'

export default function WorkspaceMenu({ compact = false }) {
  const { t } = useTranslation()
  const { workspaces, wid, setWid } = useApp()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [sharing, setSharing] = useState(false)
  const closeSharing = useCallback(() => setSharing(false), [])
  const [fly, setFly] = useState(null)
  const ref = useRef(null)
  const trigger = useRef(null)
  useClickOutside(ref, () => setOpen(false))
  useEffect(() => { setOpen(false) }, [compact])
  const current = workspaces.find((w) => w.id === wid)

  const toggle = () => {
    if (!open && compact && trigger.current) {
      const r = trigger.current.getBoundingClientRect()
      const edge = trigger.current.closest('.side')?.getBoundingClientRect().right ?? r.right
      setFly({ left: edge + 8, top: r.top })
    }
    setOpen((o) => !o)
  }
  const flyStyle = compact && fly ? { left: fly.left, top: fly.top, maxHeight: `calc(100vh - ${fly.top}px - 16px)` } : undefined

  return (
    <div className="wsmenu" ref={ref}>
      <button className="ws-trigger" ref={trigger} aria-haspopup="listbox" aria-expanded={open}
        aria-label={compact ? current?.name : undefined} data-tip={compact ? current?.name : undefined} onClick={toggle}>
        <span className="ws-avatar">{current?.name?.[0]?.toUpperCase()}</span>
        <span className="ws-name">{current?.name}</span>
        <Icon name="chevron" size={16} />
      </button>
      {open && (
        <ul className={'ws-list' + (compact ? ' ws-list--fly' : '')} style={flyStyle} role="listbox">
          {workspaces.map((w) => (
            <li key={w.id}>
              <button role="option" aria-selected={w.id === wid} onClick={() => { setWid(w.id); setOpen(false) }}>
                <span>{w.name}</span>{w.id === wid && <Icon name="check" size={16} />}
              </button>
            </li>
          ))}
          <li>
            <button className="ws-share" onClick={() => { setOpen(false); setSharing(true) }}>
              <Icon name="users" size={16} />{t('workspace.membersMenu')}
            </button>
          </li>
          <li>
            <button className="ws-new" onClick={() => { setOpen(false); setCreating(true) }}>
              <Icon name="plus" size={16} />{t('workspace.create')}
            </button>
          </li>
        </ul>
      )}
      {creating && <CreateWorkspaceModal onClose={() => setCreating(false)} />}
      {sharing && <ShareModal onClose={closeSharing} />}
    </div>
  )
}
