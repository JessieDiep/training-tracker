import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Lock app height to the initial viewport so the iOS keyboard can't shrink the layout.
// We listen to orientationchange (not resize) so the keyboard never triggers a recalc.
function setAppHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
}
setAppHeight()
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 300))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
