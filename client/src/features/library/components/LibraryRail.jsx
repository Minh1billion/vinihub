import { useTranslation } from 'react-i18next'
import { useLibrary } from '../context/LibraryContext.jsx'
import Icon from '@/shared/ui/Icon.jsx'

export default function LibraryRail() {
  const { t } = useTranslation()
  const { toggle } = useLibrary()
  return (
    <div className="lib-rail">
      <button type="button" className="icon-btn" onClick={toggle} aria-label={t('library.title')} title={t('library.title')}>
        <Icon name="library" size={22} />
      </button>
    </div>
  )
}
