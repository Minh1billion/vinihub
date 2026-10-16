import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Button from '@/shared/ui/Button.jsx'
import Modal from '@/shared/ui/Modal.jsx'

export default function MediaViewer({ asset, onClose, onDelete }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <Modal wide onClose={onClose} title={asset.kind === 'video' ? t('media.video') : t('media.image')}>
      <div className="viewer">
        {asset.kind === 'video' ? <video src={asset.url} controls autoPlay /> : <img src={asset.url} alt={asset.prompt || ''} />}
      </div>
      {asset.prompt && <p className="viewer-prompt">{asset.prompt}</p>}
      {asset.negative_prompt && <p className="viewer-prompt viewer-neg"><b>{t('model.negativePrompt')}:</b> {asset.negative_prompt}</p>}
      <div className="viewer-actions">
        {asset.kind !== 'video' && asset.id && <Button icon="edit" onClick={() => { navigate(`/workshop/editor?asset=${asset.id}`); onClose() }}>{t('media.edit')}</Button>}
        <Button variant="ghost" href={asset.url} download target="_blank" rel="noreferrer" icon="download">{t('common.download')}</Button>
        {onDelete && <Button variant="danger" icon="trash" onClick={() => onDelete(asset)}>{t('common.delete')}</Button>}
      </div>
    </Modal>
  )
}
