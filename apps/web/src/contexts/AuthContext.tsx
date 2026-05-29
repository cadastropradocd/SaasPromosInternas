import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UserRole } from '@promos/types'
import { ApiError, setOnUnauthenticated } from '@/lib/api'

interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
  isAdmin: boolean
  isGestor: boolean
  isComprador: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
    
    // Set up unauthenticated handler
    setOnUnauthenticated(() => {
      logout()
      navigate('/login', { replace: true })
    })
  }, [navigate])

  const refreshMe = async () => {
    const storedToken = localStorage.getItem('token')
    if (!storedToken) return

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
      if (res.ok) {
        const userData = await res.json()
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
      } else {
        logout()
      }
    } catch {
      logout()
    }
  }

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Login failed')
    }

    const data = await res.json()
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      refreshMe,
      isAdmin: user?.role === 'ADMIN',
      isGestor: user?.role === 'GESTOR',
      isComprador: user?.role === 'COMPRADOR',
    }}>
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

export function handleApiError(error: unknown, logout: () => void) {
  if (error instanceof ApiError && error.status === 401) {
    logout()
    return true
  }
  return false
}