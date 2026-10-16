import React from 'react'
import { createRoot } from 'react-dom/client'
import '@/shared/i18n/index.js'
import { initFitText } from '@/shared/i18n/fit.js'
import App from '@/app/App.jsx'
import '@/app/styles.js'

createRoot(document.getElementById('root')).render(<App />)
initFitText()
