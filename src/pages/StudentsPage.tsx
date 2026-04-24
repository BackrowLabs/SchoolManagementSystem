import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, Loader2, Filter, UserCheck, UserX } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Student, StudentInsert, AdmissionStatus } from '@/lib/database.types'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/utils'

const CLASSES  = ['1','2','3','4','5','6','7','8','9','10','11','12']
const SECTIONS = ['A','B','C','D']

const emptyForm: StudentInsert = {
  name: '', roll_number: '', class: '', section: 'A',
  gender: 'male', date_of_birth: null, phone: null,
  email: null, address: null, guardian_name: null,
  guardian_phone: null, status: 'active', admission_status: 'pending',
}

function admissionBadge(s: AdmissionStatus) {
  if (s === 'approved')  return <Badge variant="success">Approved</Badge>
  if (s === 'rejected')  return <Badge variant="destructive">Rejected</Badge>
  return <Badge variant="pending">Pending</Badge>
}

export function StudentsPage() {
  const { isAdmin, isOfficeStaff, user } = useAuth()
  const [students, setStudents]   = useState<Student[]>([])
  const [filtered, setFiltered]   = useState<Student[]>([])
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState<string>('all')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [deleteId, setDeleteId]   = useState<string | null>(null)
  const [form, setForm]           = useState<StudentInsert>(emptyForm)
  const [editId, setEditId]       = useState<string | null>(null)
  const [error, setError]         = useState('')

  const fetch = async () => {
    const { data } = await supabase.from('students').select('*').order('created_at', { ascending: false })
    setStudents(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      students.filter(s => {
        const matchSearch = !q || s.name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q) || s.class.includes(q)
        const matchFilter = filterStatus === 'all' || s.admission_status === filterStatus
        return matchSearch && matchFilter
      })
    )
  }, [search, students, filterStatus])

  const openAdd = () => { setForm({ ...emptyForm, submitted_by: user?.id ?? null }); setEditId(null); setError(''); setDialogOpen(true) }
  const openEdit = (s: Student) => {
    setForm({ name: s.name, roll_number: s.roll_number, class: s.class, section: s.section, gender: s.gender,
      date_of_birth: s.date_of_birth, phone: s.phone, email: s.email, address: s.address,
      guardian_name: s.guardian_name, guardian_phone: s.guardian_phone,
      status: s.status, admission_status: s.admission_status, submitted_by: s.submitted_by })
    setEditId(s.id); setError(''); setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.roll_number || !form.class) { setError('Name, Roll Number, and Class are required.'); return }
    setSaving(true); setError('')
    if (editId) {
      const { error: e } = await supabase.from('students').update(form).eq('id', editId)
      if (e) { setError(e.message); setSaving(false); return }
      toast({ title: 'Student updated', variant: 'success' })
    } else {
      const { error: e } = await supabase.from('students').insert(form)
      if (e) { setError(e.message); setSaving(false); return }
      toast({ title: 'Student added', description: 'Pending admin approval', variant: 'success' })
    }
    await fetch(); setSaving(false); setDialogOpen(false)
  }

  const handleDelete = async (id: string) => {
    const { error: e } = await supabase.from('students').delete().eq('id', id)
    if (e) { toast({ title: 'Delete failed', description: e.message, variant: 'error' }); return }
    toast({ title: 'Student deleted', variant: 'success' })
    setDeleteId(null); await fetch()
  }

  const handleApproval = async (id: string, status: AdmissionStatus) => {
    const { error: e } = await supabase.from('students').update({ admission_status: status, status: status === 'approved' ? 'active' : 'inactive' }).eq('id', id)
    if (e) { toast({ title: 'Failed', description: e.message, variant: 'error' }); return }
    toast({ title: status === 'approved' ? 'Admission approved' : 'Admission rejected', variant: status === 'approved' ? 'success' : 'warning' })
    await fetch()
  }

  const set = <K extends keyof StudentInsert>(k: K, v: StudentInsert[K]) => setForm(p => ({ ...p, [k]: v }))

  const pendingCount = students.filter(s => s.admission_status === 'pending').length

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-muted-foreground">{students.length} total · {pendingCount} pending approval</p>
        </div>
        {(isAdmin || isOfficeStaff) && (
          <Button onClick={openAdd} className="self-start sm:self-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, roll number..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={filterStatus} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All students</SelectItem>
              <SelectItem value="pending">Pending approval</SelectItem>
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
        <Card><CardContent className="py-14 text-center text-muted-foreground text-sm">
          {search ? 'No students match your search.' : 'No students yet. Add your first student.'}
        </CardContent></Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border bg-white overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b bg-secondary/60">
                <tr>
                  {['Roll No','Name','Class','Guardian','Phone','Admission','Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.roll_number}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{s.gender}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{s.class}-{s.section}</td>
                    <td className="px-4 py-3 text-sm">{s.guardian_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">{s.phone ?? '—'}</td>
                    <td className="px-4 py-3">{admissionBadge(s.admission_status)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === 'active' ? 'success' : 'secondary'}>{s.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {(isAdmin || isOfficeStaff) && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {isAdmin && s.admission_status === 'pending' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleApproval(s.id, 'approved')} title="Approve">
                              <UserCheck className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleApproval(s.id, 'rejected')} title="Reject">
                              <UserX className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
            {filtered.map(s => (
              <Card key={s.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">#{s.roll_number} · Class {s.class}-{s.section}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {admissionBadge(s.admission_status)}
                      <Badge variant={s.status === 'active' ? 'success' : 'secondary'}>{s.status}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground mb-3">
                    {s.guardian_name && <span>Guardian: {s.guardian_name}</span>}
                    {s.phone && <span>Phone: {s.phone}</span>}
                    {s.date_of_birth && <span>DOB: {formatDate(s.date_of_birth)}</span>}
                  </div>
                  <div className="flex gap-2">
                    {(isAdmin || isOfficeStaff) && (
                      <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
                      </Button>
                    )}
                    {isAdmin && s.admission_status === 'pending' && (
                      <>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApproval(s.id, 'approved')}>
                          <UserCheck className="h-3.5 w-3.5 mr-1.5" />Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleApproval(s.id, 'rejected')}>
                          <UserX className="h-3.5 w-3.5 mr-1.5" />Reject
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Student' : 'Add New Student'}</DialogTitle>
            <DialogDescription>{editId ? 'Update student information below.' : 'Fill in student details. Admission will be pending admin approval.'}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { label: 'Full Name *', field: 'name', placeholder: 'e.g. Arjun Kumar', type: 'text' },
              { label: 'Roll Number *', field: 'roll_number', placeholder: 'e.g. 2024001', type: 'text' },
            ] as const).map(({ label, field, placeholder }) => (
              <div key={field} className="space-y-1.5">
                <Label>{label}</Label>
                <Input value={(form[field] as string) ?? ''} onChange={e => set(field, e.target.value)} placeholder={placeholder} />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Class *</Label>
              <Select value={form.class} onValueChange={v => set('class', v)}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Section</Label>
              <Select value={form.section} onValueChange={v => set('section', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => set('gender', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input type="date" value={form.date_of_birth ?? ''} onChange={e => set('date_of_birth', e.target.value || null)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone ?? ''} onChange={e => set('phone', e.target.value || null)} placeholder="9876543210" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value || null)} placeholder="student@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Guardian Name</Label>
              <Input value={form.guardian_name ?? ''} onChange={e => set('guardian_name', e.target.value || null)} placeholder="Parent/Guardian name" />
            </div>
            <div className="space-y-1.5">
              <Label>Guardian Phone</Label>
              <Input value={form.guardian_phone ?? ''} onChange={e => set('guardian_phone', e.target.value || null)} placeholder="Guardian contact" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Textarea value={form.address ?? ''} onChange={e => set('address', e.target.value || null)} placeholder="Full address" rows={2} />
            </div>
            {isAdmin && (
              <div className="space-y-1.5">
                <Label>Admission Status</Label>
                <Select value={form.admission_status} onValueChange={v => set('admission_status', v as AdmissionStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editId ? 'Save Changes' : 'Add Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete student?</DialogTitle>
            <DialogDescription>This will permanently delete the student and all associated fee records. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
