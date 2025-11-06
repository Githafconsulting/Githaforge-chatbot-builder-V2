import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import './index.css'
import App from './App.tsx'

// Create Emotion cache with optimized settings
const emotionCache = createCache({
  key: 'css',
  prepend: true,
  speedy: true,
})

// Add error boundary for debugging white screen issues
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error)
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `
      <div style="padding:20px;font-family:sans-serif;max-width:600px;margin:50px auto;background:#fee;border:2px solid #c00;border-radius:8px">
        <h1 style="color:#c00">⚠️ Error Loading App</h1>
        <p><strong>Error:</strong> ${e.error?.message || 'Unknown error'}</p>
        <p><strong>File:</strong> ${e.filename || 'Unknown'}</p>
        <p><strong>Line:</strong> ${e.lineno || 'Unknown'}</p>
        <details style="margin-top:20px">
          <summary style="cursor:pointer;font-weight:bold">Stack Trace</summary>
          <pre style="overflow:auto;background:#f5f5f5;padding:10px;border-radius:4px">${e.error?.stack || 'No stack trace'}</pre>
        </details>
      </div>
    `
  }
})

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

try {
  createRoot(rootElement).render(
    <StrictMode>
      <CacheProvider value={emotionCache}>
        <App />
      </CacheProvider>
    </StrictMode>,
  )
} catch (error) {
  console.error('Render error:', error)
  rootElement.innerHTML = `
    <div style="padding:20px;font-family:sans-serif;max-width:600px;margin:50px auto;background:#fee;border:2px solid #c00;border-radius:8px">
      <h1 style="color:#c00">⚠️ Failed to Render</h1>
      <p>${error instanceof Error ? error.message : 'Unknown rendering error'}</p>
    </div>
  `
}
