import { useEffect, useState } from 'react'
import { Plus, Loader2, UserCog } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { UserProfile, UserRole } from '@/lib/database.types'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  office_staff: 'Office Staff',
  teacher: 'Teacher',
}

export function UsersPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [dialog,   setDialog]   = useState(false)
  const [form,     setForm]     = useState({ email: '', password: '', name: '', role: 'office_staff' as UserRole })
  const [error,    setError]    = useState('')

  const fetchProfiles = async () => {
    const { data } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false })
    setProfiles(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchProfiles() }, [])

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.name) { setError('Email, password, and name are required.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setSaving(true); setError('')

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name, role: form.role } },
    })

    if (signUpErr) { setError(signUpErr.message); setSaving(false); return }

    if (data.user) {
      // Upsert profile in case the trigger didn't fire yet
      await supabase.from('user_profiles').upsert({
        id: data.user.id, name: form.name, role: form.role,
      })
    }

    toast({ title: 'User created', description: `${form.name} added as ${ROLE_LABELS[form.role]}`, variant: 'success' })
    await fetchProfiles(); setSaving(false); setDialog(false)
    setForm({ email: '', password: '', name: '', role: 'office_staff' })
  }

  const toggleActive = async (p: UserProfile) => {
    await supabase.from('user_profiles').update({ is_active: !p.is_active }).eq('id', p.id)
    toast({ title: p.is_active ? 'User deactivated' : 'User activated', variant: 'success' })
    fetchProfiles()
  }

  const updateRole = async (id: string, role: UserRole) => {
    await supabase.from('user_profiles').update({ role }).eq('id', id)
    toast({ title: 'Role updated', variant: 'success' })
    fetchProfiles()
  }

  const roleCount = (role: UserRole) => profiles.filter(p => p.role === role).length

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-muted-foreground">{profiles.length} users · {profiles.filter(p => p.is_active).length} active</p>
        </div>
        <Button onClick={() => { setError(''); setDialog(true) }} className="self-start sm:self-auto">
          <Plus className="h-4 w-4 mr-2" />Add User
        </Button>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-3 gap-3">
        {(['admin', 'office_staff', 'teacher'] as UserRole[]).map(role => (
          <Card key={role}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{roleCount(role)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{ROLE_LABELS[role]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : profiles.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-sm text-muted-foreground">No users yet.</CardContent></Card>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block rounded-xl border bg-white overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b bg-secondary/60">
                <tr>
                  {['Name','Role','Status','Added','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profiles.map(p => (
                  <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-semibold text-gray-900">{p.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select value={p.role} onValueChange={v => updateRole(p.id, v as UserRole)}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="office_staff">Office Staff</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.is_active ? 'success' : 'secondary'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" onClick={() => toggleActive(p)}>
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {profiles.map(p => (
              <Card key={p.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
                    </div>
                    <Badge variant={p.is_active ? 'success' : 'secondary'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Select value={p.role} onValueChange={v => updateRole(p.id, v as UserRole)}>
                      <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="office_staff">Office Staff</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => toggleActive(p)}>
                      {p.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Create User Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserCog className="h-5 w-5 text-primary" />Add New User</DialogTitle>
            <DialogDescription>Create a login account for staff or teacher. They can sign in immediately.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Priya Sharma" />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="priya@school.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min. 6 characters" />
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v as UserRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="office_staff">Office Staff</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
