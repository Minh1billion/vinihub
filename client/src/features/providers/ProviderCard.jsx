import { useTranslation } from 'react-i18next'
import Button from '../../components/Button.jsx'
import Icon from '../../components/Icon.jsx'
import { intlLocale } from '../../i18n/index.js'
import ProviderLogo from '../models/ProviderLogo.jsx'

const TONE = { ok: 'ok', invalid: 'bad', error: 'bad', no_key: 'warn', unknown: 'idle', keyless: 'idle' }

export function StatusBadge({ state }) {
  const { t } = useTranslation()
  return <span className={`prov-status prov-status--${TONE[state] || 'idle'}`}><i />{t(`providers.state.${state}`)}</span>
}

function checkedAt(iso) {
  return new Intl.DateTimeFormat(intlLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}

function KeyRow({ k, busy, onActivate, onCheck, onDelete }) {
  const { t } = useTranslation()
  const meta = k.checked_at
    ? t('providers.checkedAt', { time: checkedAt(k.checked_at) }) + (k.detail ? ` · ${k.detail}` : '')
    : t('providers.neverChecked')
  return (
    <li className={'prov-key' + (k.active ? ' active' : '')}>
      <div className="prov-key-main">
        <strong>{k.label}</strong>
        <code>••••{k.hint}</code>
        {k.active && <span className="prov-active"><Icon name="check" size={14} />{t('providers.active')}</span>}
      </div>
      <div className="prov-key-meta">
        <StatusBadge state={k.status} />
        <small>{meta}</small>
      </div>
      <div className="prov-key-actions">
        {!k.active && <Button variant="soft" size="sm" loading={busy === `${k.id}:activate`} onClick={() => onActivate(k)}>{t('providers.activate')}</Button>}
        <button type="button" className="icon-btn" title={t('providers.check')} aria-label={t('providers.check')}
          disabled={!!busy} onClick={() => onCheck(k)}><Icon name="refresh" /></button>
        <button type="button" className="icon-btn danger" title={t('common.delete')} aria-label={t('common.delete')}
          disabled={!!busy} onClick={() => onDelete(k)}><Icon name="trash" /></button>
      </div>
    </li>
  )
}

export default function ProviderCard({ provider, busy, onAdd, onActivate, onCheck, onDelete }) {
  const { t } = useTranslation()
  const keyless = provider.state === 'keyless'
  return (
    <article className="prov">
      <header className="prov-head">
        <ProviderLogo id={provider.slug} vendor={provider.name} size={38} />
        <div className="prov-title">
          <h2>{provider.name}</h2>
          <small>{provider.base_url}</small>
        </div>
        <StatusBadge state={provider.state} />
        {!keyless && <Button variant="ghost" size="sm" icon="plus" onClick={() => onAdd(provider)}>{t('providers.addKey')}</Button>}
      </header>
      {!keyless && (provider.keys.length === 0
        ? <p className="prov-empty">{t('providers.noKeys')}</p>
        : <ul className="prov-keys">
            {provider.keys.map((k) => (
              <KeyRow key={k.id} k={k} busy={busy.startsWith(k.id) ? busy : ''}
                onActivate={(key) => onActivate(provider, key)} onCheck={(key) => onCheck(provider, key)} onDelete={(key) => onDelete(provider, key)} />
            ))}
          </ul>)}
    </article>
  )
}
