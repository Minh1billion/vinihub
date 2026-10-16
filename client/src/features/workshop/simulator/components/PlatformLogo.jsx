import { useId } from 'react'

const MARKS = {
  tiktok: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#000" />
      <path fill="#25F4EE" d="M13.6 5.2v8.7a2.5 2.5 0 1 1-2.5-2.5c.2 0 .4 0 .6.1V8.9a5.1 5.1 0 1 0 4.4 5V9.7a5.3 5.3 0 0 0 3 1V8.2a3.2 3.2 0 0 1-3.2-3z" transform="translate(-.8 -.6)" />
      <path fill="#FE2C55" d="M13.6 5.2v8.7a2.5 2.5 0 1 1-2.5-2.5c.2 0 .4 0 .6.1V8.9a5.1 5.1 0 1 0 4.4 5V9.7a5.3 5.3 0 0 0 3 1V8.2a3.2 3.2 0 0 1-3.2-3z" transform="translate(.8 .6)" />
      <path fill="#fff" d="M13.6 5.2v8.7a2.5 2.5 0 1 1-2.5-2.5c.2 0 .4 0 .6.1V8.9a5.1 5.1 0 1 0 4.4 5V9.7a5.3 5.3 0 0 0 3 1V8.2a3.2 3.2 0 0 1-3.2-3z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path fill="#fff" d="M16.67 15.47 17.2 12h-3.33V9.75c0-.95.47-1.88 1.96-1.88h1.52V4.92s-1.38-.24-2.7-.24c-2.75 0-4.55 1.66-4.55 4.68V12H6.05v3.47h3.05V24a12.1 12.1 0 0 0 3.77 0v-8.53z" />
    </svg>
  ),
  instagram: (gid) => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <radialGradient id={gid} cx="0.3" cy="1.05" r="1.1">
          <stop offset="0" stopColor="#FED576" />
          <stop offset="0.25" stopColor="#F47133" />
          <stop offset="0.55" stopColor="#BC3081" />
          <stop offset="1" stopColor="#4C63D2" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6.5" fill={`url(#${gid})`} />
      <rect x="5.2" y="5.2" width="13.6" height="13.6" rx="4" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="16.1" cy="7.9" r="1" fill="#fff" />
    </svg>
  ),
  threads: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#000" />
      <path fill="none" stroke="#fff" strokeWidth="1.55" strokeLinecap="round" d="M16.9 11.3c-.3-2.4-1.7-3.7-4.1-3.7-2.1 0-3.6 1-4.2 2.9M9.1 15.3c.1-1.1 1-1.8 2.4-1.8 1.6 0 2.7.9 2.7 2.2 0 1.3-1.2 2.1-2.8 2.1-1.4 0-2.5-.7-2.5-1.8 0-1.2 1.1-1.9 3-1.9 2.6 0 4.9.4 4.9 2.7 0 2.2-2.2 3.6-5.2 3.6-3.4 0-5.5-2-5.5-5.7 0-3.7 2.2-5.8 5.5-5.8 2.9 0 4.6 1.4 5.3 3.7" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="0" y="4" width="24" height="16" rx="5" fill="#FF0000" />
      <path fill="#fff" d="m10 8.8 5.2 3.2-5.2 3.2z" />
    </svg>
  ),
}

export default function PlatformLogo({ platform, size = 24 }) {
  const gid = 'ig' + useId().replace(/:/g, '')
  const mark = MARKS[platform]
  return <span className="plat-logo" style={{ width: size, height: size }}>{typeof mark === 'function' ? mark(gid) : mark}</span>
}
