import { useTranslation } from 'react-i18next'
import Icon from '../../../../components/Icon.jsx'
import Resizer from '../../../../components/Resizer.jsx'
import useResizable, { SIDE_PANEL } from '../../../../hooks/useResizable.js'

// Settings column on the left (sticky header, scrolling form, pinned footer), results on the right.
export default function SplitLayout({ id, title, icon, aside, footer, children }) {
  const { t } = useTranslation()
  const rz = useResizable({ id: `split.${id}`, ...SIDE_PANEL })
  return (
    <div className="split" ref={rz.box} style={{ '--aside-w': `${rz.width}px` }}>
      <section className="split-aside subside">
        <header className="subside-head">
          {icon && <Icon name={icon} size={18} />}
          <h2>{title}</h2>
        </header>
        <div className="subside-body">{aside}</div>
        {footer && <footer className="subside-foot">{footer}</footer>}
      </section>
      <Resizer rz={rz} label={t('common.resize')} />
      <section className="split-main">{children}</section>
    </div>
  )
}
