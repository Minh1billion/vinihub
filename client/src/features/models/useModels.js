import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'

let cache

export function useModels() {
  const [models, setModels] = useState(null)
  useEffect(() => {
    cache ||= api.get('/models')
    cache.then(setModels).catch(() => { cache = null })
  }, [])
  return models
}

const FALLBACK = {
  image: {
    aspect_ratios: [], image_sizes: [], reference_images: 0, qualities: [], backgrounds: [],
    output_formats: [], negative_prompt_key: '',
  },
  video: {
    durations: [], resolutions: [], aspect_ratios: [], frame_images: [],
    reference_images: 0, audio: false, seed: false, motion_control: false, negative_prompt_key: '',
  },
}

export function useModelCaps(kind, id) {
  const models = useModels()
  const mid = id || models?.defaults[kind]
  return models?.[kind]?.find((m) => m.id === mid)?.caps || FALLBACK[kind]
}
