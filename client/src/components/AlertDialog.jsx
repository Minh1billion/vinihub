import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Button from './Button.jsx'
import Icon from './Icon.jsx'
import Modal from './Modal.jsx'

const ICONS = { info: 'info', warning: 'alert', error: 'error', confirm: 'help' }

export default function AlertDialog({ tone, title, message, ask, confirmLabel, danger, onResult }) {
  const { t } = useTranslation()
  const answer = useRef(false)
  const finish = (value, close) => {
    answer.current = value
    close()
  }

  return (
    <Modal title={title || t(`dialog.${tone}Title`)} className={`dialog dialog--${tone}`} onClose={() => onResult(answer.current)}>
      {(close) => (
        <>
          <div className="dialog-body">
            <span className="dialog-icon"><Icon name={ICONS[tone]} size={22} /></span>
            <p>{message}</p>
          </div>
          <div className="modal-actions">
            {ask && <Button variant="ghost" onClick={() => finish(false, close)}>{t('common.cancel')}</Button>}
            <Button variant={danger ? 'danger' : 'primary'} autoFocus onClick={() => finish(true, close)}>
              {confirmLabel || (ask ? t('dialog.confirm') : t('dialog.ok'))}
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
