import { useEffect, useState } from 'react'
import { Users, CreditCard, TrendingUp, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { FeePayment, Student } from '@/lib/database.types'

interface Stats {
  totalStudents: number
  activeStudents: number
  totalCollected: number
  pendingPayments: number
}

interface RecentPayment extends FeePayment {
  students: Pick<Student, 'name' | 'class'> | null
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalStudents: 0, activeStudents: 0, totalCollected: 0, pendingPayments: 0 })
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [studentsRes, paymentsRes, recentRes] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('fee_payments').select('*'),
        supabase
          .from('fee_payments')
          .select('*, students(name, class)')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const students = studentsRes.data ?? []
      const payments = paymentsRes.data ?? []

      setStats({
        totalStudents: students.length,
        activeStudents: students.filter(s => s.status === 'active').length,
        totalCollected: payments
          .filter(p => p.status === 'paid' || p.status === 'partial')
          .reduce((sum, p) => sum + (p.amount_paid ?? 0), 0),
        pendingPayments: payments.filter(p => p.status === 'pending').length,
      })

      setRecentPayments((recentRes.data ?? []) as RecentPayment[])
      setLoading(false)
    }

    fetchData()
  }, [])

  const statCards = [
    { title: 'Total Students', value: stats.totalStudents, sub: `${stats.activeStudents} active`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Fees Collected', value: formatCurrency(stats.totalCollected), sub: 'All time', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Pending Payments', value: stats.pendingPayments, sub: 'Needs attention', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Fee Records', value: recentPayments.length > 0 ? 'Active' : '—', sub: 'Tracking enabled', icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your school</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ title, value, sub, icon: Icon, color, bg }) => (
          <Card key={title}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{title}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
                </div>
                <div className={`rounded-lg p-2 ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Fee Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {recentPayments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {payment.students?.name ?? 'Unknown Student'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Class {payment.students?.class} · {formatDate(payment.payment_date)} · #{payment.receipt_number}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(payment.amount_paid)}
                    </span>
                    <Badge
                      variant={
                        payment.status === 'paid' ? 'success' :
                        payment.status === 'partial' ? 'warning' : 'outline'
                      }
                    >
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
