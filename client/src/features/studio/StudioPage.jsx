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
import EditorPanel from '../editor/EditorPanel.jsx'

const TABS = [
  [
    { to: '/studio/idea', labelKey: 'studio.idea', icon: 'message' },
    { to: '/studio/image', labelKey: 'studio.image', icon: 'image' },
    { to: '/studio/video', labelKey: 'studio.video', icon: 'video' },
  ],
  [
    { to: '/studio/editor', labelKey: 'studio.editor', icon: 'edit' },
    { to: '/studio/simulator', labelKey: 'studio.simulator', icon: 'simulator' },
  ],
]
const SECTIONS = ['idea', 'image', 'video', 'editor', 'simulator']

export default function StudioPage() {
  const { t } = useTranslation()
  const { section } = useParams()
  const navigate = useNavigate()
  const body = useRef(null)
  const [drafts, setDrafts] = useState({ image: '', video: '' })
  const [seeds, setSeeds] = useState({ imageRef: null, videoFrame: null })
  const [simSeed, setSimSeed] = useState(null)

  useEffect(() => { body.current?.scrollTo(0, 0) }, [section])

  if (!SECTIONS.includes(section)) return <Navigate to="/studio/idea" replace />

  const sendToStudio = (kind, text) => {
    setDrafts((d) => ({ ...d, [kind]: text }))
    navigate(`/studio/${kind}`)
  }
  const sendAsset = (kind, asset) => {
    setSeeds((s) => ({ ...s, [kind]: asset }))
    navigate(kind === 'imageRef' ? '/studio/image' : '/studio/video')
  }
  const sendToSimulator = (seed) => {
    setSimSeed(seed)
    navigate('/studio/simulator')
  }
  const clearSeed = (kind) => () => setSeeds((s) => ({ ...s, [kind]: null }))
  const setDraft = (kind) => (value) => setDrafts((d) => ({ ...d, [kind]: value }))

  return (
    <PageFrame title={t('nav.studio')} ariaLabel={t('studio.navAria')} tabs={TABS} bodyRef={body} flush
      actions={<Button variant="ghost" size="sm" icon="refresh" title={t('studio.resetLayoutHint')} onClick={resetLayouts}>{t('studio.resetLayout')}</Button>}>
      <div className="panel panel--fill" hidden={section !== 'idea'}><IdeaPanel onSend={sendToStudio} /></div>
      <div className="panel panel--fill" hidden={section !== 'image'}>
        <ImagePanel prompt={drafts.image} setPrompt={setDraft('image')} seed={seeds.imageRef} onSeedUsed={clearSeed('imageRef')} />
      </div>
      <div className="panel panel--fill" hidden={section !== 'video'}>
        <VideoPanel prompt={drafts.video} setPrompt={setDraft('video')} frame={seeds.videoFrame} onFrameUsed={clearSeed('videoFrame')} />
      </div>
      <div className="panel panel--fill" hidden={section !== 'editor'}>
        <EditorPanel active={section === 'editor'} onSend={sendAsset} onPreview={sendToSimulator} />
      </div>
      <div className="panel panel--fill" hidden={section !== 'simulator'}>
        <SimulatorPanel active={section === 'simulator'} seed={simSeed} onSeedUsed={() => setSimSeed(null)} />
      </div>
    </PageFrame>
  )
}
