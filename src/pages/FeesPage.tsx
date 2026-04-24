import { useEffect, useState } from 'react'
import { Plus, Search, Loader2, Receipt } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { FeePayment, FeePaymentInsert, FeeStructure, Student } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PaymentRow extends FeePayment {
  students: Pick<Student, 'name' | 'class' | 'section'> | null
  fee_structures: Pick<FeeStructure, 'name' | 'amount'> | null
}

const emptyForm: FeePaymentInsert = {
  student_id: '',
  fee_structure_id: '',
  amount_paid: 0,
  payment_date: new Date().toISOString().split('T')[0],
  payment_method: 'cash',
  receipt_number: '',
  status: 'paid',
  remarks: null,
}

function generateReceipt() {
  return `RCP-${Date.now().toString().slice(-8)}`
}

export function FeesPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [filtered, setFiltered] = useState<PaymentRow[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [structures, setStructures] = useState<FeeStructure[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [structureDialogOpen, setStructureDialogOpen] = useState(false)
  const [form, setForm] = useState<FeePaymentInsert>({ ...emptyForm, receipt_number: generateReceipt() })
  const [structureForm, setStructureForm] = useState({ name: '', class: '', amount: '', frequency: 'monthly' as FeeStructure['frequency'], description: '' })
  const [error, setError] = useState('')

  const fetchAll = async () => {
    const [paymentsRes, studentsRes, structuresRes] = await Promise.all([
      supabase
        .from('fee_payments')
        .select('*, students(name, class, section), fee_structures(name, amount)')
        .order('created_at', { ascending: false }),
      supabase.from('students').select('*').eq('status', 'active').order('name'),
      supabase.from('fee_structures').select('*').order('name'),
    ])

    setPayments((paymentsRes.data ?? []) as PaymentRow[])
    setFiltered((paymentsRes.data ?? []) as PaymentRow[])
    setStudents(studentsRes.data ?? [])
    setStructures(structuresRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      payments.filter(p =>
        (p.students?.name ?? '').toLowerCase().includes(q) ||
        p.receipt_number.toLowerCase().includes(q) ||
        (p.fee_structures?.name ?? '').toLowerCase().includes(q)
      )
    )
  }, [search, payments])

  const openAddPayment = () => {
    setForm({ ...emptyForm, receipt_number: generateReceipt() })
    setError('')
    setDialogOpen(true)
  }

  const handleSavePayment = async () => {
    if (!form.student_id || !form.fee_structure_id || !form.amount_paid || !form.payment_date) {
      setError('Student, Fee Type, Amount, and Date are required.')
      return
    }
    setSaving(true)
    setError('')
    const { error } = await supabase.from('fee_payments').insert(form)
    if (error) { setError(error.message); setSaving(false); return }
    await fetchAll()
    setSaving(false)
    setDialogOpen(false)
  }

  const handleSaveStructure = async () => {
    if (!structureForm.name || !structureForm.class || !structureForm.amount) {
      setError('Name, Class, and Amount are required.')
      return
    }
    setSaving(true)
    setError('')
    const { error } = await supabase.from('fee_structures').insert({
      name: structureForm.name,
      class: structureForm.class,
      amount: parseFloat(structureForm.amount),
      frequency: structureForm.frequency,
      description: structureForm.description || null,
    })
    if (error) { setError(error.message); setSaving(false); return }
    await fetchAll()
    setSaving(false)
    setStructureDialogOpen(false)
    setStructureForm({ name: '', class: '', amount: '', frequency: 'monthly', description: '' })
  }

  const setField = <K extends keyof FeePaymentInsert>(key: K, value: FeePaymentInsert[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const totalCollected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_paid, 0)
  const totalPending = payments.filter(p => p.status === 'pending').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
          <p className="text-sm text-muted-foreground">{payments.length} payment records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setError(''); setStructureDialogOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Fee Type
          </Button>
          <Button onClick={openAddPayment}>
            <Receipt className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Total Collected</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCollected)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Pending Records</p>
          <p className="text-2xl font-bold text-orange-600">{totalPending}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Fee Types Configured</p>
          <p className="text-2xl font-bold text-primary">{structures.length}</p>
        </CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by student name, receipt number, or fee type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Fee Structures Summary */}
      {structures.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Fee Types</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {structures.map(s => (
                <div key={s.id} className="rounded-lg border px-3 py-2 text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground"> · Class {s.class} · {formatCurrency(s.amount)} / {s.frequency}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search ? 'No payments match your search.' : 'No fee payments recorded yet.'}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                {['Receipt #', 'Student', 'Class', 'Fee Type', 'Amount', 'Date', 'Method', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.receipt_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.students?.name ?? '—'}</td>
                  <td className="px-4 py-3">{p.students ? `${p.students.class}-${p.students.section}` : '—'}</td>
                  <td className="px-4 py-3">{p.fee_structures?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(p.amount_paid)}</td>
                  <td className="px-4 py-3">{formatDate(p.payment_date)}</td>
                  <td className="px-4 py-3 capitalize">{p.payment_method}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.status === 'paid' ? 'success' : p.status === 'partial' ? 'warning' : 'outline'}>
                      {p.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Record Fee Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Student *</Label>
              <Select value={form.student_id} onValueChange={v => setField('student_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — Class {s.class}-{s.section} (#{s.roll_number})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fee Type *</Label>
              <Select value={form.fee_structure_id} onValueChange={v => {
                setField('fee_structure_id', v)
                const s = structures.find(s => s.id === v)
                if (s) setField('amount_paid', s.amount)
              }}>
                <SelectTrigger><SelectValue placeholder="Select fee type" /></SelectTrigger>
                <SelectContent>
                  {structures.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — {formatCurrency(s.amount)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount Paid (₹) *</Label>
                <Input type="number" value={form.amount_paid || ''} onChange={e => setField('amount_paid', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Payment Date *</Label>
                <Input type="date" value={form.payment_date} onChange={e => setField('payment_date', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={form.payment_method} onValueChange={v => setField('payment_method', v as FeePaymentInsert['payment_method'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setField('status', v as FeePaymentInsert['status'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Receipt Number</Label>
              <Input value={form.receipt_number} onChange={e => setField('receipt_number', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea value={form.remarks ?? ''} onChange={e => setField('remarks', e.target.value || null)} rows={2} placeholder="Optional notes..." />
            </div>
            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePayment} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Fee Structure Dialog */}
      <Dialog open={structureDialogOpen} onOpenChange={setStructureDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Fee Type</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fee Name *</Label>
              <Input value={structureForm.name} onChange={e => setStructureForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Tuition Fee, Lab Fee" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class *</Label>
                <Select value={structureForm.class} onValueChange={v => setStructureForm(p => ({ ...p, class: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {['All', '1','2','3','4','5','6','7','8','9','10','11','12'].map(c => (
                      <SelectItem key={c} value={c}>{c === 'All' ? 'All Classes' : `Class ${c}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input type="number" value={structureForm.amount} onChange={e => setStructureForm(p => ({ ...p, amount: e.target.value }))} placeholder="5000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={structureForm.frequency} onValueChange={v => setStructureForm(p => ({ ...p, frequency: v as FeeStructure['frequency'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                  <SelectItem value="one-time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={structureForm.description} onChange={e => setStructureForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Optional description..." />
            </div>
            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStructureDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveStructure} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Fee Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
