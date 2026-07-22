import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import OverviewPage from './pages/OverviewPage'
import TopologyPage from './pages/TopologyPage'
import LogsPage from './pages/LogsPage'
import FinancialMonitorPage from './pages/FinancialMonitorPage'
import IncidentsPage from './pages/IncidentsPage'
import IncidentDetailPage from './pages/IncidentDetailPage'
import SettingsPage from './pages/SettingsPage'
import ComingSoon from './pages/ComingSoon'
import LandingPage from './pages/LandingPage'
import { navItems } from './config/navItems'
import { SimulationProvider } from './context/SimulationContext'
import { SettingsProvider } from './context/SettingsContext'
import { AuthProvider, useAuth } from './context/AuthContext'

function AppRouter() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/topology" element={<TopologyPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/financial-monitor" element={<FinancialMonitorPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
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
          <AppRouter />
        </SimulationProvider>
      </SettingsProvider>
    </AuthProvider>
  )
}
