import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '../../../components/Button.jsx'
import Icon from '../../../components/Icon.jsx'
import { fieldsFor, itemsOf, toMarkdown, valueText } from './envelope.js'

function SendButton({ kind, value, onSend }) {
  const { t } = useTranslation()
  const label = t(kind === 'video' ? 'idea.toVideo' : 'idea.toImage')
  return (
    <button type="button" className="icon-btn" title={label} aria-label={label} onClick={() => onSend(kind, value)}>
      <Icon name={kind} size={16} />
    </button>
  )
}

export default function TemplateCard({ view, template, streaming, onSend }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(null)
  const fields = fieldsFor(template, view.data)

  const copy = async (id, value) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(id)
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500)
    } catch {}
  }

  return (
    <div className="tpl">
      {view.reply && <p className="tpl-reply">{view.reply}</p>}
      <div className="tpl-card">
        <div className="tpl-head">
          <span className="tpl-tag"><Icon name="braces" size={14} />{template?.name || t('template.label')}</span>
          {!streaming && (
            <span className="tpl-actions">
              <Button variant="ghost" size="sm" icon="copy" onClick={() => copy('json', JSON.stringify(view.data, null, 2))}>
                {copied === 'json' ? t('idea.copied') : t('template.copyJson')}
              </Button>
              <Button variant="ghost" size="sm" icon="copy" onClick={() => copy('markdown', toMarkdown(fields, view.data))}>
                {copied === 'markdown' ? t('idea.copied') : t('template.copyMarkdown')}
              </Button>
            </span>
          )}
        </div>
        {fields.filter((f) => view.data[f.key] !== undefined).map((f) => {
          const value = view.data[f.key]
          const canSend = f.send && !streaming
          return (
            <div className="tpl-row" key={f.key}>
              <span className="tpl-key">{f.label}</span>
              <div className="tpl-val">
                {f.type === 'list' ? (
                  <ol>
                    {itemsOf(value).map((item, i) => (
                      <li key={i}>
                        <span className="tpl-item">
                          <span>{item}</span>
                          {canSend && <SendButton kind={f.send} value={item} onSend={onSend} />}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <span className="tpl-item">
                    <span>{valueText(value)}</span>
                    {canSend && <SendButton kind={f.send} value={valueText(value)} onSend={onSend} />}
                  </span>
                )}
              </div>
              <button type="button" className="icon-btn" aria-label={t('template.copyField', { field: f.label })}
                onClick={() => copy(f.key, valueText(value))}>
                <Icon name={copied === f.key ? 'check' : 'copy'} size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
