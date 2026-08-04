import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import SplashScreen from './components/SplashScreen'
import OverviewPage from './pages/OverviewPage'
import TopologyPage from './pages/TopologyPage'
import LogsPage from './pages/LogsPage'
import FinancialMonitorPage from './pages/FinancialMonitorPage'
import IncidentsPage from './pages/IncidentsPage'
import IncidentDetailPage from './pages/IncidentDetailPage'
import SettingsPage from './pages/SettingsPage'
import ComingSoon from './pages/ComingSoon'
import LandingPage from './pages/LandingPage'
import PredictionPage from './pages/PredictionPage'
import { navItems } from './config/navItems'
import { SimulationProvider } from './context/SimulationContext'
import { SettingsProvider } from './context/SettingsContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PredictionProvider } from './context/PredictionContext'

function AppRouter() {
  const { isAuthenticated } = useAuth()
  const [showSplash, setShowSplash] = useState(true)
  const timerRef = useRef(null)
  const isInitialAuthCheck = useRef(true)
  const prevAuthenticated = useRef(isAuthenticated)

  const triggerSplash = (duration) => {
    clearTimeout(timerRef.current)
    setShowSplash(true)
    timerRef.current = setTimeout(() => setShowSplash(false), duration)
  }

  // Cover the initial page load / refresh
  useEffect(() => {
    triggerSplash(1400)
    return () => clearTimeout(timerRef.current)
  }, [])

  // Cover the transition right after a successful login
  useEffect(() => {
    if (isInitialAuthCheck.current) {
      isInitialAuthCheck.current = false
      prevAuthenticated.current = isAuthenticated
      return
    }
    if (!prevAuthenticated.current && isAuthenticated) {
      triggerSplash(1200)
    }
    prevAuthenticated.current = isAuthenticated
  }, [isAuthenticated])

  const splash = (
    <SplashScreen
      visible={showSplash}
      label={isAuthenticated ? 'Preparing your dashboard' : 'Loading Foresight.ai'}
    />
  )

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        {splash}
        <Routes>
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      {splash}
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/topology" element={<TopologyPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/financial-monitor" element={<FinancialMonitorPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
          <Route path="/prediction" element={<PredictionPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {navItems
            .filter((item) => !item.built)
            .map(({ path, label, icon }) => (
              <Route
                key={path}
                path={path}
                element={<ComingSoon label={label} icon={icon} />}
              />
            ))}

          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <SimulationProvider>
          <PredictionProvider>
            <AppRouter />
          </PredictionProvider>
        </SimulationProvider>
      </SettingsProvider>
    </AuthProvider>
  )
}
