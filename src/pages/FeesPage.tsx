import { useEffect, useRef, useState } from 'react'
import { Plus, Search, Receipt, Printer, CheckCircle, XCircle, Loader2, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { FeePayment, FeePaymentInsert, FeeStructure, Student } from '@/lib/database.types'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

interface PaymentRow extends FeePayment {
  students: Pick<Student, 'name' | 'class' | 'section' | 'roll_number' | 'guardian_name'> | null
  fee_structures: Pick<FeeStructure, 'name' | 'amount'> | null
}

const emptyForm: FeePaymentInsert = {
  student_id: '', fee_structure_id: '', amount_paid: 0,
  payment_date: new Date().toISOString().split('T')[0],
  payment_method: 'cash', receipt_number: '', status: 'paid',
  approval_status: 'pending', remarks: null,
}

const genReceipt = () => `RCP-${Date.now().toString().slice(-8)}`

export function FeesPage() {
  const { isAdmin, isOfficeStaff, user } = useAuth()
  const [payments,    setPayments]    = useState<PaymentRow[]>([])
  const [filtered,    setFiltered]    = useState<PaymentRow[]>([])
  const [students,    setStudents]    = useState<Student[]>([])
  const [structures,  setStructures]  = useState<FeeStructure[]>([])
  const [search,      setSearch]      = useState('')
  const [filterApproval, setFilter]   = useState<string>('all')
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [payDialog,   setPayDialog]   = useState(false)
  const [structDialog,setStructDialog]= useState(false)
  const [receiptPay,  setReceiptPay]  = useState<PaymentRow | null>(null)
  const [form,        setForm]        = useState<FeePaymentInsert>({ ...emptyForm, receipt_number: genReceipt() })
  const [structForm,  setStructForm]  = useState({ name: '', class: '', amount: '', frequency: 'monthly' as FeeStructure['frequency'], description: '', is_published: false })
  const [error,       setError]       = useState('')
  const receiptRef = useRef<HTMLDivElement>(null)

  const fetchAll = async () => {
    const [pRes, sRes, fRes] = await Promise.all([
      supabase.from('fee_payments').select('*, students(name,class,section,roll_number,guardian_name), fee_structures(name,amount)').order('created_at', { ascending: false }),
      supabase.from('students').select('*').eq('admission_status', 'approved').eq('status', 'active').order('name'),
      supabase.from('fee_structures').select('*').order('name'),
    ])
    setPayments((pRes.data ?? []) as PaymentRow[])
    setStudents(sRes.data ?? [])
    setStructures(fRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(payments.filter(p => {
      const match = !q || (p.students?.name ?? '').toLowerCase().includes(q) || p.receipt_number.toLowerCase().includes(q)
      const approval = filterApproval === 'all' || p.approval_status === filterApproval
      return match && approval
    }))
  }, [search, payments, filterApproval])

  const savePayment = async () => {
    if (!form.student_id || !form.fee_structure_id || !form.amount_paid) { setError('Student, Fee Type, and Amount are required.'); return }
    setSaving(true); setError('')
    const { error: e } = await supabase.from('fee_payments').insert({ ...form, submitted_by: user?.id ?? null })
    if (e) { setError(e.message); setSaving(false); return }
    toast({ title: 'Payment recorded', description: 'Submitted for admin approval', variant: 'success' })
    await fetchAll(); setSaving(false); setPayDialog(false)
  }

  const saveStructure = async () => {
    if (!structForm.name || !structForm.class || !structForm.amount) { setError('Name, Class, and Amount are required.'); return }
    setSaving(true); setError('')
    const { error: e } = await supabase.from('fee_structures').insert({
      name: structForm.name, class: structForm.class,
      amount: parseFloat(structForm.amount), frequency: structForm.frequency,
      description: structForm.description || null, is_published: structForm.is_published,
      published_at: structForm.is_published ? new Date().toISOString() : null,
    })
    if (e) { setError(e.message); setSaving(false); return }
    toast({ title: 'Fee type created', description: structForm.is_published ? 'Published to all students' : 'Saved as draft', variant: 'success' })
    await fetchAll(); setSaving(false); setStructDialog(false)
    setStructForm({ name: '', class: '', amount: '', frequency: 'monthly', description: '', is_published: false })
  }

  const approvePayment = async (id: string, status: 'approved' | 'rejected') => {
    const { error: e } = await supabase.from('fee_payments').update({
      approval_status: status, approved_by: user?.id ?? null,
      approved_at: new Date().toISOString(),
      status: status === 'approved' ? 'paid' : 'pending',
    }).eq('id', id)
    if (e) { toast({ title: 'Failed', description: e.message, variant: 'error' }); return }
    toast({ title: status === 'approved' ? 'Payment approved' : 'Payment rejected', variant: status === 'approved' ? 'success' : 'warning' })
    await fetchAll()
  }

  const togglePublish = async (f: FeeStructure) => {
    const now = !f.is_published
    await supabase.from('fee_structures').update({ is_published: now, published_at: now ? new Date().toISOString() : null }).eq('id', f.id)
    toast({ title: now ? 'Fee published' : 'Fee unpublished', variant: 'success' })
    await fetchAll()
  }

  const handlePrint = () => window.print()

  const set = <K extends keyof FeePaymentInsert>(k: K, v: FeePaymentInsert[K]) => setForm(p => ({ ...p, [k]: v }))

  const totalApproved = payments.filter(p => p.approval_status === 'approved').reduce((s, p) => s + p.amount_paid, 0)
  const pendingCount  = payments.filter(p => p.approval_status === 'pending').length

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
          <p className="text-sm text-muted-foreground">{payments.length} records · {pendingCount} awaiting approval</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          {isAdmin && (
            <Button variant="outline" onClick={() => { setError(''); setStructDialog(true) }}>
              <Plus className="h-4 w-4 mr-2" />Fee Type
            </Button>
          )}
          {(isAdmin || isOfficeStaff) && (
            <Button onClick={() => { setForm({ ...emptyForm, receipt_number: genReceipt() }); setError(''); setPayDialog(true) }}>
              <Receipt className="h-4 w-4 mr-2" />Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Collected</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalApproved)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Approved payments</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Approval</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Awaiting admin review</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fee Types</p>
          <p className="text-2xl font-bold text-primary mt-1">{structures.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{structures.filter(s => s.is_published).length} published</p>
        </CardContent></Card>
      </div>

      {/* Fee Types */}
      {structures.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Fee Types</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {structures.map(s => (
                <div key={s.id} className={cn(
                  "rounded-lg border px-3 py-2.5 flex items-start justify-between gap-2",
                  s.is_published ? 'border-emerald-200 bg-emerald-50/50' : 'border-border bg-white'
                )}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">Class {s.class} · {formatCurrency(s.amount)} / {s.frequency}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={s.is_published ? 'success' : 'secondary'}>{s.is_published ? 'Published' : 'Draft'}</Badge>
                    {isAdmin && (
                      <button onClick={() => togglePublish(s)} className="text-[11px] text-primary hover:underline font-medium">
                        {s.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by student or receipt..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={filterApproval} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-sm text-muted-foreground">No fee records found.</CardContent></Card>
      ) : (
        <>
          <div className="hidden md:block rounded-xl border bg-white overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b bg-secondary/60">
                <tr>
                  {['Receipt','Student','Fee Type','Amount','Date','Method','Status','Approval','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.receipt_number}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{p.students?.name ?? '—'}<p className="text-xs font-normal text-muted-foreground">Class {p.students?.class}-{p.students?.section}</p></td>
                    <td className="px-4 py-3">{p.fee_structures?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-bold">{formatCurrency(p.amount_paid)}</td>
                    <td className="px-4 py-3">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-3 capitalize">{p.payment_method}</td>
                    <td className="px-4 py-3"><Badge variant={p.status === 'paid' ? 'success' : p.status === 'partial' ? 'warning' : 'secondary'}>{p.status}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={p.approval_status === 'approved' ? 'success' : p.approval_status === 'rejected' ? 'destructive' : 'pending'}>{p.approval_status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="View Receipt" onClick={() => setReceiptPay(p)}>
                          <Receipt className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && p.approval_status === 'pending' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" onClick={() => approvePayment(p.id, 'approved')}>
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => approvePayment(p.id, 'rejected')}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(p => (
              <Card key={p.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{p.students?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground font-mono">#{p.receipt_number}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge variant={p.approval_status === 'approved' ? 'success' : p.approval_status === 'rejected' ? 'destructive' : 'pending'}>{p.approval_status}</Badge>
                      <span className="text-base font-bold text-gray-900">{formatCurrency(p.amount_paid)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{p.fee_structures?.name} · {formatDate(p.payment_date)} · {p.payment_method}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setReceiptPay(p)}><Receipt className="h-3.5 w-3.5 mr-1.5" />Receipt</Button>
                    {isAdmin && p.approval_status === 'pending' && (
                      <>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => approvePayment(p.id, 'approved')}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => approvePayment(p.id, 'rejected')}>Reject</Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Fee Payment</DialogTitle>
            <DialogDescription>Payment will be submitted for admin approval before receipt is finalized.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Student *</Label>
              <Select value={form.student_id} onValueChange={v => set('student_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select approved student" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — Class {s.class}-{s.section} (#{s.roll_number})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fee Type *</Label>
              <Select value={form.fee_structure_id} onValueChange={v => {
                set('fee_structure_id', v)
                const f = structures.find(f => f.id === v)
                if (f) set('amount_paid', f.amount)
              }}>
                <SelectTrigger><SelectValue placeholder="Select fee type" /></SelectTrigger>
                <SelectContent>{structures.map(f => <SelectItem key={f.id} value={f.id}>{f.name} — {formatCurrency(f.amount)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Amount Paid (₹) *</Label>
                <Input type="number" value={form.amount_paid || ''} onChange={e => set('amount_paid', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Date</Label>
                <Input type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Select value={form.payment_method} onValueChange={v => set('payment_method', v as FeePaymentInsert['payment_method'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Receipt No.</Label>
                <Input value={form.receipt_number} onChange={e => set('receipt_number', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Textarea value={form.remarks ?? ''} onChange={e => set('remarks', e.target.value || null)} rows={2} placeholder="Optional notes..." />
            </div>
            {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPayDialog(false)}>Cancel</Button>
            <Button onClick={savePayment} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fee Type Dialog */}
      <Dialog open={structDialog} onOpenChange={setStructDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Fee Type</DialogTitle>
            <DialogDescription>Create a new fee structure. You can publish it immediately or save as draft.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Fee Name *</Label>
              <Input value={structForm.name} onChange={e => setStructForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Tuition Fee, Lab Fee" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Class *</Label>
                <Select value={structForm.class} onValueChange={v => setStructForm(p => ({ ...p, class: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {['All','1','2','3','4','5','6','7','8','9','10','11','12'].map(c => (
                      <SelectItem key={c} value={c}>{c === 'All' ? 'All Classes' : `Class ${c}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount (₹) *</Label>
                <Input type="number" value={structForm.amount} onChange={e => setStructForm(p => ({ ...p, amount: e.target.value }))} placeholder="5000" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={structForm.frequency} onValueChange={v => setStructForm(p => ({ ...p, frequency: v as FeeStructure['frequency'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                  <SelectItem value="one-time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={structForm.description} onChange={e => setStructForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={structForm.is_published} onChange={e => setStructForm(p => ({ ...p, is_published: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-primary" />
              <span className="text-sm font-medium">Publish immediately to student profiles</span>
            </label>
            {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStructDialog(false)}>Cancel</Button>
            <Button onClick={saveStructure} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {structForm.is_published ? 'Create & Publish' : 'Save as Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={!!receiptPay} onOpenChange={() => setReceiptPay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Fee Receipt
              {receiptPay?.approval_status !== 'approved' && (
                <Badge variant="destructive">Unapproved</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {receiptPay && (
            <div ref={receiptRef} className={cn('space-y-4', receiptPay.approval_status !== 'approved' && 'receipt-unapproved')}>
              <div className="rounded-xl border-2 border-dashed border-border p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg text-gray-900">Nalanda Vidya Nikethan</p>
                    <p className="text-xs text-muted-foreground">Fee Receipt</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold">#{receiptPay.receipt_number}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(receiptPay.payment_date)}</p>
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Student</p><p className="font-semibold">{receiptPay.students?.name}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Class</p><p className="font-semibold">{receiptPay.students?.class}-{receiptPay.students?.section}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Fee Type</p><p className="font-semibold">{receiptPay.fee_structures?.name}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Method</p><p className="font-semibold capitalize">{receiptPay.payment_method}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Guardian</p><p className="font-semibold">{receiptPay.students?.guardian_name ?? '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                    <Badge variant={receiptPay.approval_status === 'approved' ? 'success' : 'destructive'}>{receiptPay.approval_status}</Badge>
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <p className="text-sm font-semibold text-muted-foreground">Amount Paid</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(receiptPay.amount_paid)}</p>
                </div>
                {receiptPay.approval_status !== 'approved' && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 font-medium text-center">
                    ⚠️ This receipt is not yet approved by admin. It is not an official receipt.
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="no-print gap-2">
            <Button variant="outline" onClick={() => setReceiptPay(null)}>Close</Button>
            <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-2" />Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
