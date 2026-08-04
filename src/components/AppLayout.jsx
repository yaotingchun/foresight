import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import SimulationDrawer from './simulation/SimulationDrawer'
import Chatbot from './Chatbot'

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
        <TopBar />
        <main className="flex flex-col flex-1 min-w-0 overflow-y-auto p-6 lg:p-8 bg-white">
          <Outlet />
        </main>
      </div>
      <SimulationDrawer />
      <Chatbot />
    </div>
  )
}
