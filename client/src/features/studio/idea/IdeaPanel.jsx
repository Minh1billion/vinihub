import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, streamPost } from '../../../api/client.js'
import { useApp } from '../../../app/AppContext.jsx'
import { useDialog } from '../../../app/DialogContext.jsx'
import Button from '../../../components/Button.jsx'
import Checkbox from '../../../components/Checkbox.jsx'
import EmptyState, { SamplePrompts } from '../../../components/EmptyState.jsx'
import { FieldError } from '../../../components/Field.jsx'
import Icon from '../../../components/Icon.jsx'
import ModelSelect from '../../models/ModelSelect.jsx'
import RichText from './components/RichText.jsx'
import Select from '../../../components/Select.jsx'
import { useModels } from '../../models/useModels.js'
import { useTemplates } from './hooks/useTemplates.js'
import ConversationList from './components/ConversationList.jsx'
import Resizer from '../../../components/Resizer.jsx'
import useResizable, { SIDE_PANEL } from '../../../hooks/useResizable.js'
import { readEnvelope } from './utils/envelope.js'
import TemplateCard from './components/TemplateCard.jsx'
import TemplateManager from './components/TemplateManager.jsx'

const TEMPLATE_KEY = 'vinihub.template'
const MANAGE = '__manage__'

const appendDelta = (list, text) => {
  const last = list[list.length - 1]
  return [...list.slice(0, -1), { ...last, content: last.content + text }]
}

export default function IdeaPanel({ onSend }) {
  const { t } = useTranslation()
  const rz = useResizable({ id: 'idea.convs', ...SIDE_PANEL })
  const { wid, user, workspaces, refreshSubscription } = useApp()
  const dialog = useDialog()
  const models = useModels()
  const { templates, reload: reloadTemplates } = useTemplates(wid)
  const [managing, setManaging] = useState(false)
  const [convs, setConvs] = useState([])
  const [cid, setCid] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [model, setModel] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [copied, setCopied] = useState(null)
  const [templateId, setTemplateId] = useState(() => localStorage.getItem(TEMPLATE_KEY) || '')
  const [skip, setSkip] = useState(false)
  const end = useRef(null)
  const input = useRef(null)
  const abort = useRef(null)
  const run = useRef(0)
  const role = workspaces.find((w) => w.id === wid)?.role
  const template = templates?.find((x) => x.id === templateId)
  const active = template?.id || ''

  const templateOptions = useMemo(() => [
    { value: '', label: t('template.none') },
    ...(templates || []).map((x) => ({
      value: x.id,
      label: x.name,
      info: { logo: <Icon name="braces" size={22} />, title: x.name, subtitle: x.description, rows: x.fields.map((f) => [f.label, f.key]) },
    })),
    { value: MANAGE, label: t('template.manage'), leading: <Icon name="plus" size={16} /> },
  ], [templates, t])

  const pickTemplate = (id) => {
    if (id === MANAGE) { setManaging(true); return }
    setTemplateId(id)
    setSkip(false)
    if (id) localStorage.setItem(TEMPLATE_KEY, id)
    else localStorage.removeItem(TEMPLATE_KEY)
  }

  const loadConvs = () => api.get(`/workspaces/${wid}/conversations`).then(setConvs).catch(() => {})
  useEffect(() => { loadConvs() }, [wid])
  useEffect(() => {
    run.current += 1
    abort.current?.abort()
    setCid(null); setMsgs([]); setErr(''); setBusy(false)
  }, [wid])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end', behavior: busy ? 'auto' : 'smooth' }) }, [msgs, busy])

  useLayoutEffect(() => {
    const el = input.current
    if (!el) return
    el.style.height = 'auto'
    const h = Math.min(el.scrollHeight, 160)
    el.style.height = h + 'px'
    el.classList.toggle('scroll', el.scrollHeight > 160)
  }, [text])

  const canEdit = (c) => c.user_id === user.id || role === 'owner'

  const interrupt = () => {
    run.current += 1
    abort.current?.abort()
    abort.current = null
    setBusy(false)
  }

  const open = async (id) => {
    interrupt()
    setCid(id); setErr(''); setListOpen(false)
    const conv = convs.find((c) => c.id === id)
    if (conv) setModel(models?.chat.find((m) => m.model_id === conv.model)?.id || '')
    try {
      const list = await api.get(`/workspaces/${wid}/conversations/${id}/messages`)
      setMsgs(list)
    } catch (e) { setErr(e.message) }
  }

  const fresh = () => {
    interrupt()
    setCid(null); setMsgs([]); setErr(''); setListOpen(false)
  }

  const rename = async (id, title) => {
    try {
      await api.patch(`/workspaces/${wid}/conversations/${id}`, { title })
      setConvs((list) => list.map((c) => (c.id === id ? { ...c, title } : c)))
    } catch (e) { dialog.error(e.message) }
  }

  const remove = async (id) => {
    const ok = await dialog.confirm({ tone: 'warning', message: t('idea.confirmDelete'), confirmLabel: t('common.delete'), danger: true })
    if (!ok) return
    try {
      await api.del(`/workspaces/${wid}/conversations/${id}`)
      setConvs((list) => list.filter((c) => c.id !== id))
      if (id === cid) fresh()
    } catch (e) { dialog.error(e.message) }
  }

  const copy = async (index, content) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(index)
      setTimeout(() => setCopied((c) => (c === index ? null : c)), 1500)
    } catch {}
  }

  const send = async () => {
    const message = text.trim()
    if (!message || busy) return
    const mine = ++run.current
    const live = () => run.current === mine
    const ctrl = new AbortController()
    abort.current = ctrl
    const wasNew = !cid
    let received = false
    setText(''); setErr(''); setBusy(true); setSkip(false)
    setMsgs((m) => [...m, { role: 'user', content: message }, { role: 'assistant', content: '' }])
    try {
      await streamPost(`/workspaces/${wid}/chat`, { message, conversation_id: cid, model: model || undefined, template_id: active && !skip ? active : undefined }, (event, data) => {
        if (!live()) return
        if (event === 'meta') setCid(data.conversation_id)
        else if (event === 'delta') { received = true; setMsgs((m) => appendDelta(m, data.text)) }
        else if (event === 'error') setErr(data.message)
      }, ctrl.signal)
    } catch (e) {
      if (live() && e.name !== 'AbortError') setErr(e.message)
    } finally {
      if (live()) {
        if (!received) {
          setMsgs((m) => m.slice(0, -2))
          setText(message)
          if (wasNew) setCid(null)
        }
        abort.current = null
        setBusy(false)
      }
      loadConvs()
      refreshSubscription()
    }
  }

  const stop = () => abort.current?.abort()

  return (
    <div className="idea" ref={rz.box} style={{ '--convs-w': `${rz.width}px` }}>
      <ConversationList
        items={convs} activeId={cid} canEdit={canEdit} open={listOpen}
        onOpen={open} onNew={fresh} onRename={rename} onDelete={remove}
      />
      <Resizer rz={rz} label={t('common.resize')} />
      <div className="idea-chat">
        <div className="idea-bar">
          <Button variant="ghost" size="sm" icon="history" className="idea-toggle" onClick={() => setListOpen((v) => !v)}>{t('idea.history')}</Button>
          <strong className="idea-title">{convs.find((c) => c.id === cid)?.title || t('conv.new')}</strong>
          <div className="idea-bar-end"><ModelSelect kind="chat" value={model} onChange={setModel} className="sm" /></div>
        </div>
        <div className="idea-main">
          <div className="thread">
            {!msgs.length && (
              <EmptyState title={t('idea.emptyTitle')} text={t('idea.emptyText')}>
                <SamplePrompts items={t('samples.idea', { returnObjects: true })} onPick={setText} />
              </EmptyState>
            )}
            {msgs.map((m, i) => {
              const streaming = busy && i === msgs.length - 1
              const view = m.role === 'assistant' ? readEnvelope(m.content, streaming) : null
              if (m.role === 'assistant' && (!m.content || view?.state === 'pending')) {
                return (
                  <div key={i} className="bubble assistant typing" role="status">
                    <span className="sr-only">{t('idea.typing')}</span><i /><i /><i />
                  </div>
                )
              }
              if (view?.state === 'template') {
                return (
                  <div key={m.id ?? i} className="bubble assistant bubble--card">
                    <TemplateCard view={view} template={templates?.find((x) => x.id === view.id)} streaming={streaming} onSend={onSend} />
                  </div>
                )
              }
              const body = view ? view.text : m.content
              return (
                <div key={m.id ?? i} className={'bubble ' + m.role}>
                  {m.role === 'assistant' ? <RichText text={body} /> : m.content}
                  {m.role === 'assistant' && !streaming && (
                    <div className="bubble-actions">
                      <Button variant="link" size="sm" icon="copy" onClick={() => copy(i, body)}>{copied === i ? t('idea.copied') : t('idea.copy')}</Button>
                      <Button variant="link" size="sm" icon="image" onClick={() => onSend('image', body)}>{t('idea.toImage')}</Button>
                      <Button variant="link" size="sm" icon="video" onClick={() => onSend('video', body)}>{t('idea.toVideo')}</Button>
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={end} />
          </div>
          <div className="idea-dock">
            <FieldError>{err}</FieldError>
            <div className="tpl-bar">
              <Select
                label={t('template.label')} className="sm" icon="braces" options={templateOptions} value={active} onChange={pickTemplate}
                loading={!templates} triggerLabel={active ? `${t('template.label')}: ${template.name}` : t('template.none')}
              />
              {active && <Checkbox checked={!skip} onChange={(v) => setSkip(!v)}>{t('template.apply')}</Checkbox>}
            </div>
            <div className="composer">
              <textarea ref={input} rows={1} value={text} placeholder={t('idea.placeholder')} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
              {busy
                ? <Button variant="ghost" icon="stop" onClick={stop}>{t('idea.stop')}</Button>
                : <Button icon="send" disabled={!text.trim()} onClick={send}>{t('idea.send')}</Button>}
            </div>
          </div>
        </div>
      </div>
      {managing && (
        <TemplateManager
          templates={templates} onChanged={reloadTemplates} onClose={() => setManaging(false)}
          onUse={(id) => { pickTemplate(id); setManaging(false) }}
        />
      )}
    </div>
  )
}
