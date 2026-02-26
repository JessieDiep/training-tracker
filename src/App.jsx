import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Home from './screens/Home'
import Log from './screens/Log'
import Progress from './screens/Progress'
import Coach from './screens/Coach'

function AppLayout() {
  const location = useLocation()
  // Derive active tab from pathname
  const path = location.pathname.slice(1) || 'home'
  const activeTab = ['home', 'log', 'progress', 'coach'].includes(path) ? path : 'home'

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
      <AppLayout />
    </BrowserRouter>
  )
}
