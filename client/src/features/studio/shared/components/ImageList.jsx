import { useTranslation } from 'react-i18next'
import Dropzone from '../../../../components/Dropzone.jsx'
import Icon from '../../../../components/Icon.jsx'

export default function ImageList({ label, max, value, onChange }) {
  const { t } = useTranslation()
  return (
    <div className="field">
      <span className="field-label">{label}<span className="field-count num">{value.length}/{max}</span></span>
      {value.length > 0 && (
        <div className="thumbs">
          {value.map((a, i) => (
            <div key={a.id} className="thumb">
              <img src={a.url} alt="" />
              <button type="button" className="thumb-x" aria-label={t('imageList.removeAria', { n: i + 1 })}
                onClick={() => onChange(value.filter((x) => x.id !== a.id))}><Icon name="close" size={12} /></button>
            </div>
          ))}
        </div>
      )}
      {value.length < max && (
        <Dropzone key={value.length} compact accept="image/*" value={null} cta={t('imageList.add')}
          onChange={(a) => a && onChange([...value, a])} />
      )}
    </div>
  )
}
