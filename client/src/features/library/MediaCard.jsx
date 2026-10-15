import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { ASSET_MIME } from '../studio/editor/utils/source.js'

export default function MediaCard({ asset, onOpen, onDelete }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isVideo = asset.kind === 'video'
  const [ready, setReady] = useState(false)
  const show = () => setReady(true)
  return (
    <figure className="media" draggable={!isVideo && Boolean(asset.id)}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData(ASSET_MIME, asset.id) }}>
      <button type="button" className="media-hit" onClick={() => onOpen(asset)} aria-label={t('media.view')}>
        {isVideo ? <video src={asset.url} muted preload="metadata" /> : <img className={ready ? 'is-ready' : ''} src={asset.url} alt={asset.prompt || ''} draggable={false} loading="lazy" onLoad={show} onError={show} />}
        {isVideo && <span className="badge"><Icon name="play" size={14} /></span>}
      </button>
      <div className="media-actions">
        {!isVideo && asset.id && <button type="button" className="icon-btn" onClick={() => navigate(`/studio/editor?asset=${asset.id}`)} aria-label={t('media.edit')} title={t('media.edit')}><Icon name="edit" /></button>}
        <a className="icon-btn" href={asset.url} download target="_blank" rel="noreferrer" aria-label={t('common.download')}><Icon name="download" /></a>
        {onDelete && <button className="icon-btn danger" onClick={() => onDelete(asset)} aria-label={t('common.delete')}><Icon name="trash" /></button>}
      </div>
      {asset.prompt && <figcaption title={asset.prompt}>{asset.prompt}</figcaption>}
      {asset.negative_prompt && (
        <figcaption className="media-neg" title={asset.negative_prompt}>
          <b>{t('model.negativePrompt')}:</b> {asset.negative_prompt}
        </figcaption>
      )}
    </figure>
  )
}
