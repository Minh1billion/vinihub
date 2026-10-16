import { VIDEO_ASSET_MIME } from '@/shared/constants/assetMime.js'

export const hasFiles = (e) => [...e.dataTransfer.types].includes('Files')

export const hasAsset = (e) => [...e.dataTransfer.types].includes(VIDEO_ASSET_MIME)

export const videoFiles = (files) => files.filter((f) => f.type.startsWith('video/'))
