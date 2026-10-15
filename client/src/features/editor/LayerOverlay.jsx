const CORNERS = ['nw', 'ne', 'se', 'sw']

export default function LayerOverlay({ box, interactive, onBegin }) {
  const style = {
    left: `${(box.cx - box.w / 2) * 100}%`,
    top: `${(box.cy - box.h / 2) * 100}%`,
    width: `${box.w * 100}%`,
    height: `${box.h * 100}%`,
    transform: `rotate(${box.rot}deg)`,
  }
  return (
    <div className={'ed-sel' + (interactive ? '' : ' is-static')} style={style}>
      {interactive && (
        <>
          {CORNERS.map((h) => <span key={h} className={`ed-handle ed-handle--${h}`} onPointerDown={(e) => onBegin('scale', e)} />)}
          <span className="ed-sel-stem" />
          <span className="ed-handle ed-handle--rot" onPointerDown={(e) => onBegin('rotate', e)} />
        </>
      )}
    </div>
  )
}
