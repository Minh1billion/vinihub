import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '@/shared/ui/Button.jsx'
import { resetLayouts } from '@/shared/hooks/useResizable.js'
import PageFrame from '@/layout/components/PageFrame.jsx'
import SimulatorPanel from '../simulator/SimulatorPanel.jsx'
import ImagePanel from '../image/ImagePanel.jsx'
import VideoPanel from '../video/VideoPanel.jsx'
import FlyTransition from '../components/FlyTransition.jsx'

const TABS = [
  [
    { to: '/workshop/image', labelKey: 'workshop.image', icon: 'image' },
    { to: '/workshop/video', labelKey: 'workshop.video', icon: 'video' },
    { to: '/workshop/simulator', labelKey: 'workshop.simulator', icon: 'simulator' },
  ],
]
const SECTIONS = ['image', 'video', 'simulator']

export default function WorkshopPage() {
  const { t } = useTranslation()
  const { section } = useParams()
  const navigate = useNavigate()
  const { search } = useLocation()
  const body = useRef(null)
  const [simSeed, setSimSeed] = useState(null)
  const [fly, setFly] = useState(null)

  useEffect(() => { body.current?.scrollTo(0, 0) }, [section])

  if (section === 'editor') return <Navigate to={`/workshop/image${search}`} replace />
  if (!SECTIONS.includes(section)) return <Navigate to="/workshop/image" replace />

  const sendAsset = (kind, asset) => {
    const seed = { kind, asset: JSON.parse(JSON.stringify(asset)) }
    navigate(kind === 'imageRef' ? '/studio/image' : '/studio/video', { state: { seed } })
  }
  const sendToSimulator = ({ from, ...seed }) => {
    if (fly) return
    setSimSeed(seed)
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (from && !calm) {
      setFly({ url: seed.media.url, from })
      return
    }
    navigate('/workshop/simulator')
  }

  return (
    <PageFrame title={t('nav.workshop')} ariaLabel={t('workshop.navAria')} tabs={TABS} bodyRef={body} flush
      actions={<Button variant="ghost" size="sm" icon="refresh" title={t('workshop.resetLayoutHint')} onClick={resetLayouts}>{t('workshop.resetLayout')}</Button>}>
      <div className="panel panel--fill" hidden={section !== 'image'}>
        <ImagePanel active={section === 'image'} onSend={sendAsset} onPreview={sendToSimulator} />
      </div>
      <div className="panel panel--fill" hidden={section !== 'video'}>
        <VideoPanel active={section === 'video'} />
      </div>
      <div className="panel panel--fill" hidden={section !== 'simulator'}>
        <SimulatorPanel active={section === 'simulator'} seed={simSeed} onSeedUsed={() => setSimSeed(null)} />
      </div>
      {fly && <FlyTransition fly={fly} onSwitch={() => navigate('/workshop/simulator')} onDone={() => setFly(null)} />}
    </PageFrame>
  )
}
