import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clampRatio, masonry, ratioOf } from '../utils/justify.js'
import MediaCard from './MediaCard.jsx'

const GAP = 8

export default function JustifiedGrid({ items, onOpen, canDelete, onDelete }) {
  const box = useRef(null)
  const [width, setWidth] = useState(0)
  const [measured, setMeasured] = useState({})

  useEffect(() => {
    const el = box.current
    if (!el) return
    const update = () => setWidth(Math.floor(el.clientWidth))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onRatio = useCallback((id, ratio) => {
    if (!(ratio > 0)) return
    setMeasured((m) => (Math.abs((m[id] ?? 0) - ratio) < 0.001 ? m : { ...m, [id]: clampRatio(ratio) }))
  }, [])

  const cols = useMemo(() => {
    if (width <= 0) return []
    return masonry(items.map((a) => ratioOf(a, measured[a.id])), width, GAP)
  }, [items, measured, width])

  return (
    <div className="jgrid" ref={box}>
      {cols.map((col, n) => (
        <div className="jgrid-col" key={n}>
          {col.map(({ i, w, h }) => (
            <MediaCard key={items[i].id} asset={items[i]} fixed={{ w, h }} onRatio={onRatio}
              onOpen={onOpen} onDelete={canDelete(items[i]) ? onDelete : undefined} />
          ))}
        </div>
      ))}
    </div>
  )
}
