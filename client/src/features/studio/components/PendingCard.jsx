import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function PendingCard({ label, prompt, negative }) {
  const { t } = useTranslation()
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="pending" role="status">
      <span className="spin" />
      <strong>{label}</strong>
      <span className="timer num">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>
      {prompt && <small>{prompt}</small>}
      {negative && <small className="neg"><b>{t('model.negativePrompt')}:</b> {negative}</small>}
    </div>
  )
}
