import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import OverviewPage from './pages/OverviewPage'
import TopologyPage from './pages/TopologyPage'
import LogsPage from './pages/LogsPage'
import ComingSoon from './pages/ComingSoon'
import { navItems } from './config/navItems'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/topology" element={<TopologyPage />} />
          <Route path="/logs" element={<LogsPage />} />

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
