import { useEffect, useState } from 'react'
import { Users, CreditCard, TrendingUp, ShieldAlert, CheckSquare, BookOpen, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { FeePayment, Student } from '@/lib/database.types'

interface RecentPayment extends FeePayment {
  students: Pick<Student, 'name' | 'class' | 'section'> | null
}

export function DashboardPage() {
  const { profile, isAdmin, isOfficeStaff, isTeacher } = useAuth()
  const [stats, setStats] = useState({
    totalStudents: 0, activeStudents: 0, pendingAdmissions: 0,
    totalCollected: 0, pendingApprovals: 0, todayAttendance: 0,
  })
  const [recent, setRecent] = useState<RecentPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]

      const [studentsRes, paymentsRes, recentRes, attendanceRes] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('fee_payments').select('*'),
        supabase.from('fee_payments').select('*, students(name, class, section)')
          .order('created_at', { ascending: false }).limit(6),
        supabase.from('attendance').select('id').eq('date', today),
      ])

      const students = studentsRes.data ?? []
      const payments = paymentsRes.data ?? []

      setStats({
        totalStudents: students.length,
        activeStudents: students.filter(s => s.status === 'active').length,
        pendingAdmissions: students.filter(s => s.admission_status === 'pending').length,
        totalCollected: payments
          .filter(p => p.approval_status === 'approved')
          .reduce((s, p) => s + p.amount_paid, 0),
        pendingApprovals: payments.filter(p => p.approval_status === 'pending').length,
        todayAttendance: attendanceRes.data?.length ?? 0,
      })
      setRecent((recentRes.data ?? []) as RecentPayment[])
      setLoading(false)
    }
    load()
  }, [])

  type StatCard = { label: string; value: string | number; sub: string; icon: React.ElementType; color: string; bg: string; show: boolean }

  const statCards: StatCard[] = [
    { label: 'Total Students',    value: stats.totalStudents,    sub: `${stats.activeStudents} active`,   icon: Users,       color: 'text-blue-600',   bg: 'bg-blue-50',   show: isAdmin || isOfficeStaff },
    { label: 'Fees Collected',    value: formatCurrency(stats.totalCollected), sub: 'Approved payments', icon: TrendingUp,  color: 'text-emerald-600',bg: 'bg-emerald-50',show: isAdmin || isOfficeStaff },
    { label: 'Pending Approvals', value: stats.pendingApprovals, sub: 'Awaiting admin review',            icon: ShieldAlert, color: 'text-amber-600',  bg: 'bg-amber-50',  show: isAdmin },
    { label: 'New Admissions',    value: stats.pendingAdmissions,sub: 'Pending approval',                icon: Clock,       color: 'text-purple-600', bg: 'bg-purple-50', show: isAdmin },
    { label: 'Today Attendance',  value: stats.todayAttendance,  sub: 'Records today',                   icon: CheckSquare, color: 'text-teal-600',   bg: 'bg-teal-50',   show: isAdmin || isTeacher },
    { label: 'Fee Records',       value: recent.length,          sub: 'Recent transactions',             icon: CreditCard,  color: 'text-indigo-600', bg: 'bg-indigo-50', show: isAdmin || isOfficeStaff },
  ]

  if (loading) return (
    <div className="flex h-full items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )

  const greeting = isAdmin ? 'Administrator' : isOfficeStaff ? 'Office Staff' : 'Teacher'

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {profile?.name ?? greeting}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.filter(c => c.show).map(({ label, value, sub, icon: Icon, color, bg }) => (
          <Card key={label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900 leading-none">{value}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
                </div>
                <div className={`shrink-0 rounded-xl p-2.5 ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Teacher quick links */}
      {isTeacher && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/2">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-teal-50 p-3">
                <CheckSquare className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Mark Attendance</p>
                <p className="text-sm text-muted-foreground">Record today's class attendance</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/2">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-indigo-50 p-3">
                <BookOpen className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Enter Grades</p>
                <p className="text-sm text-muted-foreground">Add exam results and marks</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Payments */}
      {(isAdmin || isOfficeStaff) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Recent Fee Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {recent.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-secondary/40 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.students?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        Class {p.students?.class}-{p.students?.section} · {formatDate(p.payment_date)} · <span className="font-mono">#{p.receipt_number}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(p.amount_paid)}</span>
                      <Badge variant={p.approval_status === 'approved' ? 'success' : p.approval_status === 'rejected' ? 'destructive' : 'pending'}>
                        {p.approval_status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
