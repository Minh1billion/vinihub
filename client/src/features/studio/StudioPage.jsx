import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/Button.jsx'
import { resetLayouts } from '../../hooks/useResizable.js'
import PageFrame from '../../layout/PageFrame.jsx'
import IdeaPanel from './idea/IdeaPanel.jsx'
import ImagePanel from './image/ImagePanel.jsx'
import VideoPanel from './video/VideoPanel.jsx'
import SimulatorPanel from '../simulator/SimulatorPanel.jsx'

const TABS = [
  [
    { to: '/studio/idea', labelKey: 'studio.idea', icon: 'message' },
    { to: '/studio/image', labelKey: 'studio.image', icon: 'image' },
    { to: '/studio/video', labelKey: 'studio.video', icon: 'video' },
  ],
  [{ to: '/studio/simulator', labelKey: 'studio.simulator', icon: 'simulator' }],
]
const SECTIONS = ['idea', 'image', 'video', 'simulator']

export default function StudioPage() {
  const { t } = useTranslation()
  const { section } = useParams()
  const navigate = useNavigate()
  const body = useRef(null)
  const [drafts, setDrafts] = useState({ image: '', video: '' })

  useEffect(() => { body.current?.scrollTo(0, 0) }, [section])

  if (!SECTIONS.includes(section)) return <Navigate to="/studio/idea" replace />

  const sendToStudio = (kind, text) => {
    setDrafts((d) => ({ ...d, [kind]: text }))
    navigate(`/studio/${kind}`)
  }
  const setDraft = (kind) => (value) => setDrafts((d) => ({ ...d, [kind]: value }))

  return (
    <PageFrame title={t('nav.studio')} ariaLabel={t('studio.navAria')} tabs={TABS} bodyRef={body} flush
      actions={<Button variant="ghost" size="sm" icon="refresh" title={t('studio.resetLayoutHint')} onClick={resetLayouts}>{t('studio.resetLayout')}</Button>}>
      <div className="panel panel--fill" hidden={section !== 'idea'}><IdeaPanel onSend={sendToStudio} /></div>
      <div className="panel panel--fill" hidden={section !== 'image'}>
        <ImagePanel prompt={drafts.image} setPrompt={setDraft('image')} />
      </div>
      <div className="panel panel--fill" hidden={section !== 'video'}>
        <VideoPanel prompt={drafts.video} setPrompt={setDraft('video')} />
      </div>
      <div className="panel panel--fill" hidden={section !== 'simulator'}>
        <SimulatorPanel active={section === 'simulator'} />
      </div>
    </PageFrame>
  )
}
