import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const AuthContext = createContext()

// How long the branded splash stays up on a cold load / after signing in.
const SPLASH_MS = 2300

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [isSplashing, setIsSplashing] = useState(true)
  const [splashMessage, setSplashMessage] = useState('Initialising telemetry')
  const splashTimer = useRef(null)

  const runSplash = useCallback((message) => {
    clearTimeout(splashTimer.current)
    if (message) setSplashMessage(message)
    setIsSplashing(true)
    splashTimer.current = setTimeout(() => setIsSplashing(false), SPLASH_MS)
  }, [])

  useEffect(() => {
    // Load from local storage
    const storedAuth = localStorage.getItem('foresight_auth')
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth)
        if (parsed.isAuthenticated) {
          setIsAuthenticated(true)
          setUser(parsed.user)
        }
      } catch (e) {
        console.error('Failed to parse auth state', e)
      }
    }
    runSplash()
    return () => clearTimeout(splashTimer.current)
  }, [runSplash])

  const login = (email) => {
    setIsAuthenticated(true)
    const newUser = { email, name: email.split('@')[0] }
    setUser(newUser)
    localStorage.setItem('foresight_auth', JSON.stringify({ isAuthenticated: true, user: newUser }))
    runSplash('Preparing your dashboard')
  }

  const logout = () => {
    clearTimeout(splashTimer.current)
    setIsSplashing(false)
    setIsAuthenticated(false)
    setUser(null)
    localStorage.removeItem('foresight_auth')
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, login, logout, isSplashing, splashMessage }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
