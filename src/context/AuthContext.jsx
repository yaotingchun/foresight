import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)

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
  }, [])

  const login = (email) => {
    setIsAuthenticated(true)
    const newUser = { email, name: email.split('@')[0] }
    setUser(newUser)
    localStorage.setItem('foresight_auth', JSON.stringify({ isAuthenticated: true, user: newUser }))
  }

  const logout = () => {
    setIsAuthenticated(false)
    setUser(null)
    localStorage.removeItem('foresight_auth')
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
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
