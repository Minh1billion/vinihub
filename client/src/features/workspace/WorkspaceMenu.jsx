import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../app/AppContext.jsx'
import Icon from '../../components/Icon.jsx'
import { useClickOutside } from '../../hooks/useClickOutside.js'
import CreateWorkspaceModal from './CreateWorkspaceModal.jsx'
import ShareModal from './ShareModal.jsx'

export default function WorkspaceMenu() {
  const { t } = useTranslation()
  const { workspaces, wid, setWid } = useApp()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [sharing, setSharing] = useState(false)
  const closeSharing = useCallback(() => setSharing(false), [])
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false))
  const current = workspaces.find((w) => w.id === wid)

  return (
    <div className="wsmenu" ref={ref}>
      <button className="ws-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="ws-avatar">{current?.name?.[0]?.toUpperCase()}</span>
        <span className="ws-name">{current?.name}</span>
        <Icon name="chevron" size={16} />
      </button>
      {open && (
        <ul className="ws-list" role="listbox">
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
