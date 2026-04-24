import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserProfile, UserRole } from '@/lib/database.types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  role: UserRole | null
  loading: boolean
  isAdmin: boolean
  isOfficeStaff: boolean
  isTeacher: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession]   = useState<Session | null>(null)
  const [profile, setProfile]   = useState<UserProfile | null>(null)
  const [loading, setLoading]   = useState(true)
  const mountedRef               = useRef(true)

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (mountedRef.current) setProfile(data ?? null)
    } catch {
      if (mountedRef.current) setProfile(null)
    }
  }

  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id)
  }

  useEffect(() => {
    mountedRef.current = true

    // Safety net: always unblock loading after 6 seconds
    const safetyTimer = setTimeout(() => {
      if (mountedRef.current) setLoading(false)
    }, 6000)

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mountedRef.current) return
        setSession(session)
        if (session?.user) await fetchProfile(session.user.id)
      } catch {
        // network error — fall through to finally
      } finally {
        if (mountedRef.current) {
          clearTimeout(safetyTimer)
          setLoading(false)
        }
      }
    }

    init()

    // Listen for sign-in / sign-out events (skip INITIAL_SESSION to avoid double-fetch)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') return   // handled by init() above
        if (!mountedRef.current) return
        setSession(session)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      mountedRef.current = false
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    if (mountedRef.current) setProfile(null)
  }

  const role = profile?.role ?? null

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      role,
      loading,
      isAdmin:      role === 'admin',
      isOfficeStaff:role === 'office_staff',
      isTeacher:    role === 'teacher',
      signIn,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
