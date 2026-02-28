import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import BottomNav from './components/BottomNav'
import Auth from './screens/Auth'
import Home from './screens/Home'
import Log from './screens/Log'
import Progress from './screens/Progress'
import Coach from './screens/Coach'

function AppLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const path = location.pathname.slice(1) || 'home'
  const activeTab = ['home', 'log', 'progress', 'coach'].includes(path) ? path : 'home'

  if (loading) {
    return (
      <div className="pwa-shell">
        <div className="pwa-phone" style={{ background: '#FFF8FB' }} />
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
      </AuthProvider>
    </BrowserRouter>
  )
}
