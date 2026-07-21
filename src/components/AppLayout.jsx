import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import SimulationDrawer from './simulation/SimulationDrawer'

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex flex-col flex-1 min-w-0 overflow-y-auto px-6 py-5">
          <Outlet />
        </main>
      </div>
      <SimulationDrawer />
    </div>
  )
}
