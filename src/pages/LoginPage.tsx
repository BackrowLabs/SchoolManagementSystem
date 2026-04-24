import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { GraduationCap, Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginPage() {
  const { session, signIn } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  if (session) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold text-white text-lg">Nalanda Vidya Nikethan</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Nalanda Vidya<br />Nikethan
          </h1>
          <p className="text-primary-foreground/70 text-lg leading-relaxed">
            Manage students, fees, attendance, and grades — all in one place.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {['Student Management','Fee Tracking','Attendance','Grades'].map(f => (
              <span key={f} className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white">{f}</span>
            ))}
          </div>
        </div>
        <p className="text-sm text-primary-foreground/40">© 2025 Nalanda Vidya Nikethan. All rights reserved.</p>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30 mb-4">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Nalanda Vidya Nikethan</h2>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email" type="email" autoComplete="email" required
                placeholder="you@school.com"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password" type={showPwd ? 'text' : 'password'} autoComplete="current-password" required
                  placeholder="••••••••" className="pr-10"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
                <button type="button" tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPwd(v => !v)}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-base shadow-md shadow-primary/25" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign In
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Contact your administrator to get access.
          </p>
        </div>
      </div>
    </div>
  )
}
