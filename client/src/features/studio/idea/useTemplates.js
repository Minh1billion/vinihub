import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../../api/client.js'

export function useTemplates(wid) {
  const { i18n } = useTranslation()
  const [templates, setTemplates] = useState(null)

  const reload = useCallback(
    () => api.get(`/workspaces/${wid}/templates`).then(setTemplates).catch(() => setTemplates([])),
    [wid],
  )

  useEffect(() => { setTemplates(null) }, [wid])
  useEffect(() => { reload() }, [reload, i18n.resolvedLanguage])

  return { templates, reload }
}
