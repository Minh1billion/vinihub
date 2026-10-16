import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '@/shared/ui/Button.jsx'
import { resetLayouts } from '@/shared/hooks/useResizable.js'
import PageFrame from '@/layout/components/PageFrame.jsx'
import IdeaPanel from '../idea/IdeaPanel.jsx'
import ImagePanel from '../image/ImagePanel.jsx'
import VideoPanel from '../video/VideoPanel.jsx'

const TABS = [
  [
    { to: '/studio/idea', labelKey: 'studio.idea', icon: 'message' },
    { to: '/studio/image', labelKey: 'studio.image', icon: 'image' },
    { to: '/studio/video', labelKey: 'studio.video', icon: 'video' },
  ],
]
const SECTIONS = ['idea', 'image', 'video']

export default function StudioPage() {
  const { t } = useTranslation()
  const { section } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const body = useRef(null)
  const [drafts, setDrafts] = useState({ image: '', video: '' })
  const [seeds, setSeeds] = useState({ imageRef: null, videoFrame: null })

  useEffect(() => { body.current?.scrollTo(0, 0) }, [section])

  useEffect(() => {
    const seed = location.state?.seed
    if (!seed) return
    setSeeds((s) => ({ ...s, [seed.kind]: seed.asset }))
    navigate(location.pathname + location.search, { replace: true, state: null })
  }, [location.state])

  if (section === 'editor' || section === 'simulator') return <Navigate to={{ pathname: `/workshop/${section}`, search: location.search }} replace />
  if (!SECTIONS.includes(section)) return <Navigate to="/studio/idea" replace />

  const sendToStudio = (kind, text) => {
    setDrafts((d) => ({ ...d, [kind]: text }))
    navigate(`/studio/${kind}`)
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
    </PageFrame>
  )
}
