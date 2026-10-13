import { useTranslation } from 'react-i18next'
import Button from '../../components/Button.jsx'
import Modal from '../../components/Modal.jsx'

export default function MediaViewer({ asset, onClose, onDelete }) {
  const { t } = useTranslation()
  return (
    <Modal wide onClose={onClose} title={asset.kind === 'video' ? t('media.video') : t('media.image')}>
      <div className="viewer">
        {asset.kind === 'video' ? <video src={asset.url} controls autoPlay /> : <img src={asset.url} alt={asset.prompt || ''} />}
      </div>
      {asset.prompt && <p className="viewer-prompt">{asset.prompt}</p>}
      {asset.negative_prompt && <p className="viewer-prompt viewer-neg"><b>{t('model.negativePrompt')}:</b> {asset.negative_prompt}</p>}
      <div className="viewer-actions">
        <Button href={asset.url} download target="_blank" rel="noreferrer" icon="download">{t('common.download')}</Button>
        {onDelete && <Button variant="danger" icon="trash" onClick={() => onDelete(asset)}>{t('common.delete')}</Button>}
      </div>
    </Modal>
  )
}
