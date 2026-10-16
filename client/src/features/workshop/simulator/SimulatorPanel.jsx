import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '@/app/providers/AppContext.jsx'
import Button from '@/shared/ui/Button.jsx'
import { Field } from '@/shared/ui/Field.jsx'
import Icon from '@/shared/ui/Icon.jsx'
import Segmented from '@/shared/ui/Segmented.jsx'
import Toggle from '@/shared/ui/Toggle.jsx'
import SplitLayout from '@/shared/ui/SplitLayout.jsx'
import MediaPicker from './components/MediaPicker.jsx'
import PlatformPicker from './components/PlatformPicker.jsx'
import Preview from './components/preview/Previews.jsx'
import { DEVICES, FORMATS, TITLE_LIMIT, countTags, getIssues, isVertical, rulesFor } from './utils/platforms.js'

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9._]/g, '')

export default function SimulatorPanel({ active, seed, onSeedUsed }) {
  const { t } = useTranslation()
  const { user } = useApp()
  const avatarInput = useRef(null)
  const timer = useRef(0)
  const [platform, setPlatform] = useState('tiktok')
  const [formats, setFormats] = useState({})
  const [device, setDevice] = useState('phone')
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [media, setMedia] = useState([])
  const [name, setName] = useState(user?.name || '')
  const [handle, setHandle] = useState(user?.handle || slug((user?.email || user?.name || 'vinihub').split('@')[0]))
  const [avatar, setAvatar] = useState(user?.avatar_url || '')
  const [dark, setDark] = useState(false)
  const [copied, setCopied] = useState(false)
  const avatarRef = useRef(avatar)
  const mediaRef = useRef(media)

  avatarRef.current = avatar
  mediaRef.current = media
  useEffect(() => () => {
    clearTimeout(timer.current)
    if (avatarRef.current.startsWith('blob:')) URL.revokeObjectURL(avatarRef.current)
  }, [])

  useEffect(() => {
    if (!seed) return
    if (seed.platform) {
      setPlatform(seed.platform)
      setFormats((cur) => ({ ...cur, [seed.platform]: seed.format }))
    }
    mediaRef.current.forEach((m) => { if (m.url !== seed.media.url) URL.revokeObjectURL(m.url) })
    setMedia([seed.media])
    onSeedUsed()
  }, [seed])

  const options = FORMATS[platform]
  const format = formats[platform] ?? options[0]
  const youtube = platform === 'youtube'
  const story = format === 'story'
  const rules = rulesFor(platform, format)
  const vertical = isVertical(platform, format)
  const issues = useMemo(() => getIssues({ platform, format, title, caption, media }), [platform, format, title, caption, media])
  const post = useMemo(() => ({ title, caption, media, name, handle, avatar }), [title, caption, media, name, handle, avatar])
  const platformLabel = t(`sim.platform.${platform}`)
  const over = caption.length > rules.limit
  const body = youtube ? 'desc' : story ? 'storyText' : 'caption'

  const pickAvatar = (file) => {
    if (!file?.type.startsWith('image/')) return
    if (avatar.startsWith('blob:')) URL.revokeObjectURL(avatar)
    setAvatar(URL.createObjectURL(file))
  }
  const clearAvatar = () => {
    if (avatar.startsWith('blob:')) URL.revokeObjectURL(avatar)
    setAvatar('')
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText([youtube && title.trim(), caption.trim()].filter(Boolean).join('\n\n')) } catch { return }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1600)
  }

  const form = (
    <>
      <Field label={t('sim.platformLabel')} group>
        <PlatformPicker label={t('sim.platformLabel')} value={platform} onChange={setPlatform} />
      </Field>
      {options.length > 1 && (
        <Field label={t('sim.formatLabel')} group>
          <Segmented label={t('sim.formatLabel')} value={format} onChange={(f) => setFormats((cur) => ({ ...cur, [platform]: f }))}
            options={options.map((f) => ({ value: f, label: t(`sim.format.${f}`) }))} />
        </Field>
      )}
      {youtube && (
        <Field label={<>{t('sim.title')}<span className={'field-count num' + (title.length > TITLE_LIMIT ? ' sim-over' : '')}>{title.length}/{TITLE_LIMIT}</span></>}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('sim.titlePlaceholder')} />
        </Field>
      )}
      <Field
        label={<>{t(`sim.${body}`)}<span className={'field-count num' + (over ? ' sim-over' : '')}>{caption.length}{rules.limit <= 10000 && `/${rules.limit}`}</span></>}
        hint={rules.fold < rules.limit ? t('sim.captionHint', { count: rules.fold }) : undefined}>
        <textarea rows={6} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={t(`sim.${body}Placeholder`)} />
      </Field>
      <MediaPicker value={media} setValue={setMedia} />
      <div className="sim-identity">
        <Field label={t('sim.name')}><input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={t('sim.handle')}><input value={handle} maxLength={30} onChange={(e) => setHandle(slug(e.target.value))} /></Field>
      </div>
      <div className="field">
        <span className="field-label">{t('sim.avatar')}</span>
        <div className="sim-avatar-row">
          {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" /> : <span className="sim-avatar-dot"><Icon name="users" size={18} /></span>}
          <Button variant="ghost" size="sm" icon="upload" onClick={() => avatarInput.current.click()}>{t('sim.avatarPick')}</Button>
          {avatar && <Button variant="link" size="sm" onClick={clearAvatar}>{t('dropzone.clear')}</Button>}
          <input ref={avatarInput} type="file" accept="image/*" hidden onChange={(e) => { pickAvatar(e.target.files?.[0]); e.target.value = '' }} />
        </div>
      </div>
      {!vertical && (
        <div className="field">
          <Toggle checked={dark} onChange={setDark} label={t('sim.dark')} />
        </div>
      )}
      <div className="field" aria-live="polite">
        <span className="field-label">{t('sim.checks')}</span>
        {issues.length > 0 ? (
          <ul className="sim-issues">
            {issues.map((i) => <li key={i.key}><Icon name="alert" size={16} /><span>{t(`sim.issue.${i.key}`, { platform: platformLabel, ...i.values })}</span></li>)}
          </ul>
        ) : (
          <p className="sim-ok"><Icon name="check" size={16} />{t('sim.ok', { platform: platformLabel })}</p>
        )}
        {countTags(caption) > 0 && <small>{t('sim.tags', { count: countTags(caption) })}</small>}
      </div>
    </>
  )

  const footer = (
    <Button block icon={copied ? 'check' : 'copy'} disabled={!caption.trim() && !title.trim()} onClick={copy}>{copied ? t('sim.copied') : t('sim.copy')}</Button>
  )

  return (
    <SplitLayout id="simulator" title={t('workshop.simulator')} icon="simulator" aside={form} footer={footer}>
      <div className="sim-stage">
        <div className="sim-devicebar">
          <Segmented label={t('sim.deviceLabel')} value={device} onChange={setDevice}
            options={DEVICES.map((d) => ({
              value: d,
              title: t(`sim.device.${d}`),
              label: <span className="sim-device-opt"><Icon name={d === 'phone' ? 'simulator' : d} size={16} />{t(`sim.device.${d}`)}</span>,
            }))} />
        </div>
        {active && <Preview platform={platform} format={format} device={device} post={post} dark={dark} />}
        <p className="sim-hint">{t('sim.hint')}</p>
      </div>
    </SplitLayout>
  )
}
