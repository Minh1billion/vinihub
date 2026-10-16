import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Button from '@/shared/ui/Button.jsx'
import { resetLayouts } from '@/shared/hooks/useResizable.js'
import PageFrame from '@/layout/components/PageFrame.jsx'
import SimulatorPanel from '../simulator/SimulatorPanel.jsx'
import EditorPanel from '../editor/EditorPanel.jsx'
import FlyTransition from '../components/FlyTransition.jsx'

const TABS = [
  [
    { to: '/workshop/editor', labelKey: 'workshop.editor', icon: 'edit' },
    { to: '/workshop/simulator', labelKey: 'workshop.simulator', icon: 'simulator' },
  ],
]
const SECTIONS = ['editor', 'simulator']

export default function WorkshopPage() {
  const { t } = useTranslation()
  const { section } = useParams()
  const navigate = useNavigate()
  const body = useRef(null)
  const [simSeed, setSimSeed] = useState(null)
  const [fly, setFly] = useState(null)

  useEffect(() => { body.current?.scrollTo(0, 0) }, [section])

  if (!SECTIONS.includes(section)) return <Navigate to="/workshop/editor" replace />

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
      <div className="panel panel--fill" hidden={section !== 'editor'}>
        <EditorPanel active={section === 'editor'} onSend={sendAsset} onPreview={sendToSimulator} />
      </div>
      <div className="panel panel--fill" hidden={section !== 'simulator'}>
        <SimulatorPanel active={section === 'simulator'} seed={simSeed} onSeedUsed={() => setSimSeed(null)} />
      </div>
      {fly && <FlyTransition fly={fly} onSwitch={() => navigate('/workshop/simulator')} onDone={() => setFly(null)} />}
    </PageFrame>
  )
}
