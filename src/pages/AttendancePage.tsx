import { useEffect, useState } from 'react'
import { Save, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Attendance, AttendanceStatus, Student } from '@/lib/database.types'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const CLASSES  = ['1','2','3','4','5','6','7','8','9','10','11','12']
const SECTIONS = ['A','B','C','D']

const statusConfig: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  present: { label: 'Present', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
  absent:  { label: 'Absent',  color: 'text-red-700',     bg: 'bg-red-50 border-red-200 hover:bg-red-100' },
  late:    { label: 'Late',    color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200 hover:bg-amber-100' },
}

export function AttendancePage() {
  const { user } = useAuth()
  const [selectedClass,   setSelectedClass]   = useState('1')
  const [selectedSection, setSelectedSection] = useState('A')
  const [selectedDate,    setSelectedDate]    = useState(new Date().toISOString().split('T')[0])
  const [students,    setStudents]    = useState<Student[]>([])
  const [attendance,  setAttendance]  = useState<Record<string, AttendanceStatus>>({})
  const [,    setExisting]    = useState<Attendance[]>([])
  const [loading,     setLoading]     = useState(false)
  const [saving,      setSaving]      = useState(false)

  const loadStudentsAndAttendance = async () => {
    setLoading(true)
    const [sRes, aRes] = await Promise.all([
      supabase.from('students').select('*')
        .eq('class', selectedClass).eq('section', selectedSection)
        .eq('admission_status', 'approved').eq('status', 'active').order('name'),
      supabase.from('attendance').select('*')
        .eq('class', selectedClass).eq('section', selectedSection).eq('date', selectedDate),
    ])
    const sList = sRes.data ?? []
    const aList = aRes.data ?? []
    setStudents(sList)
    setExisting(aList)
    const map: Record<string, AttendanceStatus> = {}
    sList.forEach(s => { map[s.id] = 'present' })
    aList.forEach(a => { map[a.student_id] = a.status })
    setAttendance(map)
    setLoading(false)
  }

  useEffect(() => { loadStudentsAndAttendance() }, [selectedClass, selectedSection, selectedDate])

  const toggle = (studentId: string) => {
    setAttendance(prev => {
      const cur = prev[studentId] ?? 'present'
      const next: AttendanceStatus = cur === 'present' ? 'absent' : cur === 'absent' ? 'late' : 'present'
      return { ...prev, [studentId]: next }
    })
  }

  const markAll = (status: AttendanceStatus) => {
    const map: Record<string, AttendanceStatus> = {}
    students.forEach(s => { map[s.id] = status })
    setAttendance(map)
  }

  const handleSave = async () => {
    if (students.length === 0) return
    setSaving(true)
    const records = students.map(s => ({
      student_id: s.id, class: selectedClass, section: selectedSection,
      date: selectedDate, status: attendance[s.id] ?? 'present',
      marked_by: user?.id ?? null,
    }))
    const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'student_id,date' })
    if (error) { toast({ title: 'Failed to save', description: error.message, variant: 'error' }); setSaving(false); return }
    toast({ title: 'Attendance saved', description: `${students.length} records updated`, variant: 'success' })
    setSaving(false)
  }

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const presentCount = Object.values(attendance).filter(v => v === 'present').length
  const absentCount  = Object.values(attendance).filter(v => v === 'absent').length
  const lateCount    = Object.values(attendance).filter(v => v === 'late').length
  const isToday      = selectedDate === new Date().toISOString().split('T')[0]

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-sm text-muted-foreground">Mark daily attendance for your class</p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Class</p>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Section</p>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => shiftDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                  className="flex h-10 flex-1 rounded-lg border border-input bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => shiftDate(1)} disabled={isToday}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary + Quick Actions */}
      {students.length > 0 && !loading && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex gap-3">
            <div className="text-center"><p className="text-xl font-bold text-emerald-600">{presentCount}</p><p className="text-xs text-muted-foreground">Present</p></div>
            <div className="text-center"><p className="text-xl font-bold text-red-500">{absentCount}</p><p className="text-xs text-muted-foreground">Absent</p></div>
            <div className="text-center"><p className="text-xl font-bold text-amber-500">{lateCount}</p><p className="text-xs text-muted-foreground">Late</p></div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => markAll('present')}>All Present</Button>
            <Button variant="outline" size="sm" onClick={() => markAll('absent')}>All Absent</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Student list */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : students.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-sm text-muted-foreground">
          No approved students found in Class {selectedClass}-{selectedSection}.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {students.map((s, i) => {
            const status = attendance[s.id] ?? 'present'
            const cfg = statusConfig[status]
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition-all',
                  cfg.bg, cfg.color
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold bg-white/60', cfg.color)}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{s.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">#{s.roll_number}</p>
                  </div>
                </div>
                <Badge variant={status === 'present' ? 'success' : status === 'absent' ? 'destructive' : 'warning'}>
                  {cfg.label}
                </Badge>
              </button>
            )
          })}
        </div>
      )}

      {students.length > 0 && !loading && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Attendance ({students.length} students)
          </Button>
        </div>
      )}
    </div>
  )
}
