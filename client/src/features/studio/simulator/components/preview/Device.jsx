import { useLayoutEffect, useRef, useState } from 'react'

const SIZE = { phone: [376, 736], tablet: [648, 848], desktop: [1120, 700] }
const HOST = {
  tiktok: 'www.tiktok.com',
  facebook: 'www.facebook.com',
  instagram: 'www.instagram.com',
  threads: 'www.threads.com',
  youtube: 'www.youtube.com',
}

export default function Device({ device, platform, theme, vertical, children }) {
  const box = useRef(null)
  const [width, setWidth] = useState(0)

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
          <div className="sim-screen" data-platform={platform} data-theme={theme} data-vertical={vertical} data-device={device}>
            {device !== 'desktop' && <div className="sim-status"><b>9:41</b><i className="sim-batt" /></div>}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
