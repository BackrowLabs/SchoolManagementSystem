import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Student, StudentInsert } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const SECTIONS = ['A', 'B', 'C', 'D']

const emptyForm: StudentInsert = {
  name: '', roll_number: '', class: '', section: 'A',
  gender: 'male', date_of_birth: null, phone: null,
  email: null, address: null, guardian_name: null,
  guardian_phone: null, status: 'active',
}

export function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [filtered, setFiltered] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<StudentInsert>(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*').order('created_at', { ascending: false })
    setStudents(data ?? [])
    setFiltered(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchStudents() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      students.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.roll_number.toLowerCase().includes(q) ||
        s.class.includes(q)
      )
    )
  }, [search, students])

  const openAdd = () => {
    setForm(emptyForm)
    setEditId(null)
    setError('')
    setDialogOpen(true)
  }

  const openEdit = (s: Student) => {
    setForm({
      name: s.name, roll_number: s.roll_number, class: s.class,
      section: s.section, gender: s.gender, date_of_birth: s.date_of_birth,
      phone: s.phone, email: s.email, address: s.address,
      guardian_name: s.guardian_name, guardian_phone: s.guardian_phone, status: s.status,
    })
    setEditId(s.id)
    setError('')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.roll_number || !form.class) {
      setError('Name, Roll Number, and Class are required.')
      return
    }
    setSaving(true)
    setError('')

    if (editId) {
      const { error } = await supabase.from('students').update(form).eq('id', editId)
      if (error) { setError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('students').insert(form)
      if (error) { setError(error.message); setSaving(false); return }
    }

    await fetchStudents()
    setSaving(false)
    setDialogOpen(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('students').delete().eq('id', id)
    setDeleteId(null)
    await fetchStudents()
  }

  const setField = <K extends keyof StudentInsert>(key: K, value: StudentInsert[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-muted-foreground">{students.length} total students</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, roll number, or class..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search ? 'No students match your search.' : 'No students yet. Add your first student.'}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                {['Roll No', 'Name', 'Class', 'Gender', 'Guardian', 'Phone', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{s.roll_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3">{s.class}-{s.section}</td>
                  <td className="px-4 py-3 capitalize">{s.gender}</td>
                  <td className="px-4 py-3">{s.guardian_name ?? '—'}</td>
                  <td className="px-4 py-3">{s.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.status === 'active' ? 'success' : 'secondary'}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Student' : 'Add New Student'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Arjun Kumar" />
            </div>
            <div className="space-y-2">
              <Label>Roll Number *</Label>
              <Input value={form.roll_number} onChange={e => setField('roll_number', e.target.value)} placeholder="e.g. 2024001" />
            </div>
            <div className="space-y-2">
              <Label>Class *</Label>
              <Select value={form.class} onValueChange={v => setField('class', v)}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {CLASSES.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={form.section} onValueChange={v => setField('section', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTIONS.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => setField('gender', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input type="date" value={form.date_of_birth ?? ''} onChange={e => setField('date_of_birth', e.target.value || null)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone ?? ''} onChange={e => setField('phone', e.target.value || null)} placeholder="e.g. 9876543210" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email ?? ''} onChange={e => setField('email', e.target.value || null)} placeholder="student@email.com" />
            </div>
            <div className="space-y-2">
              <Label>Guardian Name</Label>
              <Input value={form.guardian_name ?? ''} onChange={e => setField('guardian_name', e.target.value || null)} placeholder="Parent/Guardian name" />
            </div>
            <div className="space-y-2">
              <Label>Guardian Phone</Label>
              <Input value={form.guardian_phone ?? ''} onChange={e => setField('guardian_phone', e.target.value || null)} placeholder="Guardian contact" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Address</Label>
              <Textarea value={form.address ?? ''} onChange={e => setField('address', e.target.value || null)} placeholder="Full address" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setField('status', v as 'active' | 'inactive')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editId ? 'Save Changes' : 'Add Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Student?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the student and all their fee records. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
