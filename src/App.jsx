import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Analytics } from '@vercel/analytics/react'
import BottomNav from './components/BottomNav'
import Auth from './screens/Auth'
import Home from './screens/Home'
import Log from './screens/Log'
import Plan from './screens/Plan'
import Progress from './screens/Progress'
import Coach from './screens/Coach'
import { applyTheme, loadTheme } from './lib/themes'

function AppLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const path = location.pathname.slice(1) || 'home'
  const activeTab = ['home', 'log', 'plan', 'progress', 'coach'].includes(path) ? path : 'home'

  useEffect(() => { applyTheme(loadTheme()) }, [])

  if (loading) {
    return (
      <div className="pwa-shell">
        <div className="pwa-phone" style={{ background: 'var(--t-bg, #FFF8FB)' }} />
      </div>
    )
  }

  if (!user) return <Auth />

  return (
    <div className="pwa-shell">
      <div className="pwa-phone">
        <div className="routes-wrapper">
          <Routes>
            <Route path="/"         element={<Home />} />
            <Route path="/log"      element={<Log />} />
            <Route path="/plan"     element={<Plan />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/coach"    element={<Coach />} />
          </Routes>
        </div>
        <BottomNav activeTab={activeTab} />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
        <Analytics />
      </AuthProvider>
    </BrowserRouter>
  )
}
