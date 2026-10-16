import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { uploadFile } from '@/shared/api/client.js'
import { useApp } from '@/app/providers/AppContext.jsx'
import { useLibrary } from '../context/LibraryContext.jsx'

const FAMILIES = ['image', 'video']

export default function useLibraryUpload({ families = FAMILIES } = {}) {
  const { t } = useTranslation()
  const { wid } = useApp()
  const { notifyCreated } = useLibrary()
  const [pending, setPending] = useState(0)
  const [err, setErr] = useState('')

  const unsupported = families.length === 1
    ? t(families[0] === 'image' ? 'dropzone.pickImage' : 'dropzone.pickVideo')
    : t('library.upload.unsupported')

  const upload = useCallback(async (files) => {
    const list = Array.from(files || [])
    if (!list.length) return []
    const ok = list.filter((f) => families.some((x) => f.type.startsWith(x + '/')))
    if (!ok.length) { setErr(unsupported); return [] }
    setErr('')
    setPending((n) => n + ok.length)
    const done = []
    const failed = []
    for (const file of ok) {
      try { done.push(await uploadFile(wid, file)) } catch (e) { failed.push(`${file.name}: ${e.message}`) } finally { setPending((n) => n - 1) }
    }
    if (done.length) notifyCreated()
    if (failed.length) setErr(failed[0] + (failed.length > 1 ? ` (+${failed.length - 1})` : ''))
    else if (ok.length < list.length) setErr(unsupported)
    return done
  }, [wid, families, notifyCreated, unsupported])

  return { upload, pending, busy: pending > 0, err, clearErr: () => setErr('') }
}
