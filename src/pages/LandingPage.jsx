import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Activity, Shield, Zap, Lock, Mail, ChevronRight, X } from 'lucide-react'
import foresightLogo from '../assets/logo_foresight.png'

function LoginModal({ isOpen, onClose }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    // Simulate network request
    setTimeout(() => {
      login(email || 'admin@foresight.ai')
      setIsSubmitting(false)
    }, 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Light Blur Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Light Glassmorphic Modal */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] backdrop-blur-xl animate-scale-up">
        {/* Soft Glow Effects inside Modal */}
        <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-indigo-500/10 blur-[50px]" />
        
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 shadow-sm p-3">
            <img src={foresightLogo} alt="Logo" className="h-full w-full object-contain" />
          </div>
          
          <h2 className="mb-2 text-2xl font-bold text-ink tracking-tight">Welcome to Foresight.ai</h2>
          <p className="mb-8 text-center text-[13px] text-slate-500">
            Sign in to access your AI-powered reliability engineering dashboard.
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Mail size={18} className="text-slate-400" />
              </div>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/50 py-3 pl-11 pr-4 text-sm text-ink placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                required
              />
            </div>
            
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Lock size={18} className="text-slate-400" />
              </div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/50 py-3 pl-11 pr-4 text-sm text-ink placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full overflow-hidden rounded-xl bg-indigo-600 px-4 py-3 text-[14px] font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-[0.98] disabled:opacity-70 mt-2"
            >
              <span className="relative flex items-center justify-center gap-2">
                {isSubmitting ? 'Authenticating...' : 'Sign In'}
                {!isSubmitting && <ChevronRight size={16} />}
              </span>
            </button>
          </form>
          
          <p className="mt-6 text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            For demo purposes, any credentials work.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Background Ambient Glows (Matching app theme) */}
      <div className="absolute top-0 -left-[10%] h-[50vw] w-[50vw] rounded-full bg-indigo-100/60 blur-[100px]" />
      <div className="absolute top-[40%] -right-[10%] h-[40vw] w-[40vw] rounded-full bg-cyan-50/50 blur-[100px]" />
      
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiIGZpbGw9Im5vbmUiLz4KPHBhdGggZD0iTTAgMTBoNDBNMTAgMHY0ME0wIDIwaDQwTTIwIDB2NDBNMCAzMGg0ME0zMCAwdjQwIiBzdHJva2U9InJnYmEoOTksMTAyLDI0MSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+Cjwvc3ZnPg==')] opacity-60 mask-image:linear-gradient(to_bottom,transparent,black,transparent)" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 md:px-16 md:py-8">
        <div className="flex items-center gap-3">
          <img src={foresightLogo} alt="Logo" className="h-9 w-9 object-contain drop-shadow-sm" />
          <span className="text-xl font-black tracking-tight text-ink">Foresight.ai</span>
        </div>
        
        <button 
          onClick={() => setIsLoginModalOpen(true)}
          className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-indigo-200 hover:text-indigo-700"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-indigo-50 px-4 py-1.5 text-[13px] font-bold text-indigo-700">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          Foresight Engine v2.0 Live
        </div>
        
        <h1 className="mb-6 max-w-4xl text-5xl font-extrabold tracking-tight text-ink sm:text-7xl">
          Zero-Touch Reliability for <br/>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-500">Complex Architectures</span>
        </h1>
        
        <p className="mb-10 max-w-2xl text-lg text-slate-500 sm:text-xl">
          Foresight AI autonomously analyzes telemetry, predicts cascading failures, and executes precision remediation plans before users are impacted.
        </p>
        
        <div className="flex flex-col gap-4 sm:flex-row">
          <button 
            onClick={() => setIsLoginModalOpen(true)}
            className="group flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-xl active:scale-[0.98]"
          >
            Launch Dashboard
            <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Feature Pills */}
        <div className="mt-20 flex flex-wrap justify-center gap-6">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/60 px-4 py-2 text-sm font-semibold text-slate-600 backdrop-blur-sm">
            <Zap size={16} className="text-amber-500" /> Real-time Anomaly Detection
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/60 px-4 py-2 text-sm font-semibold text-slate-600 backdrop-blur-sm">
            <Shield size={16} className="text-indigo-500" /> Autonomous Remediation
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/60 px-4 py-2 text-sm font-semibold text-slate-600 backdrop-blur-sm">
            <Activity size={16} className="text-emerald-500" /> Financial Impact Tracking
          </div>
        </div>
      </main>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  )
}
