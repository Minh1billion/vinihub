import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PLATFORMS } from '../../utils/platforms.js'

const SIZE = { phone: [376, 736], tablet: [648, 848], desktop: [1120, 700] }
const HOST = {
  tiktok: 'www.tiktok.com',
  facebook: 'www.facebook.com',
  instagram: 'www.instagram.com',
  threads: 'www.threads.com',
  youtube: 'www.youtube.com',
}

const SWIPE = 520

const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Screen({ platform, theme, vertical, device, status, className = '', children, ...rest }) {
  return (
    <div className={'sim-screen ' + className} data-platform={platform} data-theme={theme} data-vertical={vertical} data-device={device} {...rest}>
      {status && <div className="sim-status"><b>9:41</b><i className="sim-batt" /></div>}
      {children}
    </div>
  )
}

export default function Device({ device, platform, theme, vertical, children }) {
  const box = useRef(null)
  const [width, setWidth] = useState(0)
  const snap = useRef(null)
  const [seen, setSeen] = useState(platform)
  const [leaving, setLeaving] = useState(null)

  if (seen !== platform) {
    setSeen(platform)
    if (snap.current && !calm()) {
      const dir = PLATFORMS.indexOf(platform) >= PLATFORMS.indexOf(snap.current.platform) ? 'up' : 'down'
      setLeaving({ ...snap.current, dir, id: Date.now() })
    } else {
      setLeaving(null)
    }
  }

  useEffect(() => { snap.current = { platform, theme, vertical, children } })

  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(() => setLeaving(null), SWIPE + 60)
    return () => clearTimeout(timer)
  }, [leaving])

  useLayoutEffect(() => {
    const el = box.current
    const measure = () => setWidth(el.clientWidth)
    measure()
    const watcher = new ResizeObserver(measure)
    watcher.observe(el)
    return () => watcher.disconnect()
  }, [])

  const [w, h] = SIZE[device]
  const scale = width ? Math.min(1, width / w) : 1

  return (
    <div ref={box} className="sim-fit">
      <div className="sim-scaled" style={{ width: w * scale, height: h * scale }}>
        <div className="sim-device" data-device={device} style={{ width: w, height: h, transform: `scale(${scale})` }}>
          {device === 'desktop' && (
            <div className="sim-chrome">
              <span className="sim-lights"><i /><i /><i /></span>
              <span className="sim-url">{HOST[platform]}</span>
            </div>
          )}
          <div className="sim-stack">
            <Screen platform={platform} theme={theme} vertical={vertical} device={device} status={device !== 'desktop'} data-enter={leaving?.dir}>
              {children}
            </Screen>
            {leaving && (
              <Screen key={leaving.id} className="is-leaving" platform={leaving.platform} theme={leaving.theme} vertical={leaving.vertical} device={device}
                status={device !== 'desktop'} data-leave={leaving.dir} aria-hidden="true" inert="">
                {leaving.children}
              </Screen>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
