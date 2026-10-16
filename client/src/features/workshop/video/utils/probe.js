export function probeVideo(url) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const { duration, videoWidth, videoHeight } = video
      video.removeAttribute('src')
      video.load()
      if (!Number.isFinite(duration) || duration <= 0) reject(new Error('duration'))
      else resolve({ duration, width: videoWidth, height: videoHeight })
    }
    video.onerror = () => reject(new Error('load'))
    video.src = url
  })
}
