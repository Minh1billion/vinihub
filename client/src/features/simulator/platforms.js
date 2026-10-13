export const PLATFORMS = ['tiktok', 'facebook', 'instagram', 'threads', 'youtube']
export const DEVICES = ['phone', 'tablet', 'desktop']
export const FORMATS = {
  tiktok: ['video', 'story'],
  facebook: ['post', 'reel', 'story'],
  instagram: ['post', 'reel', 'story'],
  threads: ['post'],
  youtube: ['video', 'shorts'],
}

export const TITLE_LIMIT = 100

const BASE = {
  tiktok: { limit: 4000, fold: 90, hashtags: 30, media: 35 },
  facebook: { limit: 63206, fold: 480, hashtags: 0, media: 10 },
  instagram: { limit: 2200, fold: 125, hashtags: 30, media: 20 },
  threads: { limit: 500, fold: 500, hashtags: 1, media: 20 },
  youtube: { limit: 5000, fold: 100, hashtags: 15, media: 1 },
}
const STORY = { limit: 100000, fold: 100000, hashtags: 0, media: 100 }
const CLIP = { media: 1 }

export const HASHTAG = /#[\p{L}\p{N}_]+/gu
export const TOKEN = /(#[\p{L}\p{N}_]+|@[\p{L}\p{N}_.]+|https?:\/\/\S+)/gu

export const layoutOf = (platform, format) => {
  if (format === 'story') return 'story'
  if (format === 'reel' || format === 'shorts' || platform === 'tiktok') return 'vertical'
  if (platform === 'youtube') return 'watch'
  return 'feed'
}

export const isVertical = (platform, format) => ['vertical', 'story'].includes(layoutOf(platform, format))

export const rulesFor = (platform, format) => {
  const base = BASE[platform]
  if (format === 'story') return { ...base, ...STORY }
  if (format === 'reel' || format === 'shorts') return { ...base, ...CLIP }
  return base
}

export const countTags = (text) => (text.match(HASHTAG) || []).length

export const ratioOf = (item) => (item?.w && item?.h ? item.w / item.h : null)
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

export function getIssues({ platform, format, title, caption, media }) {
  const rules = rulesFor(platform, format)
  const vertical = isVertical(platform, format)
  const videos = media.filter((m) => m.kind === 'video').length
  const ratios = media.map(ratioOf).filter(Boolean)
  const needsVideo = format === 'reel' || format === 'shorts' || (platform === 'youtube' && format === 'video')
  const tags = countTags(caption)
  const issues = []
  if (platform === 'youtube' && title.length > TITLE_LIMIT) issues.push({ key: 'title', values: { max: TITLE_LIMIT } })
  if (caption.length > rules.limit) issues.push({ key: 'over', values: { over: caption.length - rules.limit, limit: rules.limit } })
  if (rules.hashtags && tags > rules.hashtags) issues.push({ key: 'hashtags', values: { count: tags, max: rules.hashtags } })
  if (media.length > rules.media) issues.push({ key: 'media', values: { max: rules.media } })
  if (platform === 'tiktok' && format === 'video' && videos && videos < media.length) issues.push({ key: 'mixed' })
  if (platform === 'tiktok' && format === 'video' && videos > 1) issues.push({ key: 'oneVideo' })
  if (needsVideo && media.length && !videos) issues.push({ key: 'needVideo' })
  if (vertical && ratios.some((r) => r > 0.7)) issues.push({ key: 'vertical', values: { ratio: '9:16' } })
  if (platform === 'youtube' && format === 'video' && ratios.some((r) => r < 1.5)) issues.push({ key: 'landscape' })
  if (platform === 'instagram' && format === 'post' && ratios.some((r) => r < 0.79 || r > 1.92)) issues.push({ key: 'feedRatio' })
  if (format === 'story' && caption.length > 140) issues.push({ key: 'storyLong' })
  return issues
}
