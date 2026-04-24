import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Users, CreditCard } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { FeePayment, Student } from '@/lib/database.types'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PendingPayment extends FeePayment {
  students: Pick<Student, 'name' | 'class' | 'section'> | null
  fee_structures: { name: string; amount: number } | null
}

type Tab = 'admissions' | 'payments'

export function ApprovalsPage() {
  const { user } = useAuth()
  const [tab, setTab]             = useState<Tab>('admissions')
  const [admissions, setAdmissions] = useState<Student[]>([])
  const [payments,   setPayments]   = useState<PendingPayment[]>([])
  const [loading,    setLoading]    = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    const [aRes, pRes] = await Promise.all([
      supabase.from('students').select('*').eq('admission_status', 'pending').order('created_at', { ascending: false }),
      supabase.from('fee_payments').select('*, students(name,class,section), fee_structures(name,amount)')
        .eq('approval_status', 'pending').order('created_at', { ascending: false }),
    ])
    setAdmissions(aRes.data ?? [])
    setPayments((pRes.data ?? []) as PendingPayment[])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const approveAdmission = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('students').update({
      admission_status: status,
      status: status === 'approved' ? 'active' : 'inactive',
    }).eq('id', id)
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'error' }); return }
    toast({ title: status === 'approved' ? 'Admission approved ✓' : 'Admission rejected', variant: status === 'approved' ? 'success' : 'warning' })
    fetchAll()
  }

  const approvePayment = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('fee_payments').update({
      approval_status: status,
      approved_by: user?.id ?? null,
      approved_at: new Date().toISOString(),
      status: status === 'approved' ? 'paid' : 'pending',
    }).eq('id', id)
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'error' }); return }
    toast({ title: status === 'approved' ? 'Payment approved ✓' : 'Payment rejected', variant: status === 'approved' ? 'success' : 'warning' })
    fetchAll()
  }

  const tabs: { id: Tab; label: string; count: number; icon: React.ElementType }[] = [
    { id: 'admissions', label: 'Admissions', count: admissions.length, icon: Users },
    { id: 'payments',   label: 'Payments',   count: payments.length,   icon: CreditCard },
  ]

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
        <p className="text-sm text-muted-foreground">Review and approve pending admissions and fee payments</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-secondary p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${tab === t.id ? 'bg-primary text-white' : 'bg-amber-100 text-amber-700'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : tab === 'admissions' ? (
        admissions.length === 0 ? (
          <Card><CardContent className="py-14 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">All admissions are processed</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {admissions.map(s => (
              <Card key={s.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                          <span>Roll: <span className="font-mono">{s.roll_number}</span></span>
                          <span>Class {s.class}-{s.section}</span>
                          <span className="capitalize">{s.gender}</span>
                          {s.guardian_name && <span>Guardian: {s.guardian_name}</span>}
                          {s.phone && <span>{s.phone}</span>}
                          {s.date_of_birth && <span>DOB: {formatDate(s.date_of_birth)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200"
                        onClick={() => approveAdmission(s.id, 'approved')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1.5" />Approve
                      </Button>
                      <Button
                        size="sm" variant="destructive"
                        onClick={() => approveAdmission(s.id, 'rejected')}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        payments.length === 0 ? (
          <Card><CardContent className="py-14 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No pending payment approvals</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {payments.map(p => (
              <Card key={p.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-sm">
                        ₹
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{p.students?.name ?? '—'}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                          <span>Class {p.students?.class}-{p.students?.section}</span>
                          <span>{p.fee_structures?.name}</span>
                          <span className="font-mono">#{p.receipt_number}</span>
                          <span>{formatDate(p.payment_date)}</span>
                          <span className="capitalize">{p.payment_method}</span>
                        </div>
                        {p.remarks && <p className="text-xs text-muted-foreground mt-1 italic">"{p.remarks}"</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xl font-bold text-gray-900">{formatCurrency(p.amount_paid)}</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200"
                          onClick={() => approvePayment(p.id, 'approved')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1.5" />Approve
                        </Button>
                        <Button
                          size="sm" variant="destructive"
                          onClick={() => approvePayment(p.id, 'rejected')}
                        >
                          <XCircle className="h-4 w-4 mr-1.5" />Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  )
}
