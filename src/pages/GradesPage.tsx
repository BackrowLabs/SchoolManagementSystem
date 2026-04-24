import { useEffect, useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { ExamType, Grade, GradeInsert, Student } from '@/lib/database.types'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const CLASSES   = ['1','2','3','4','5','6','7','8','9','10','11','12']
const SECTIONS  = ['A','B','C','D']
const SUBJECTS  = ['Mathematics','Science','English','Hindi','Social Studies','Computer','Physics','Chemistry','Biology','History','Geography','Economics']
const EXAM_TYPES: { value: ExamType; label: string }[] = [
  { value: 'unit_test', label: 'Unit Test' },
  { value: 'midterm',   label: 'Midterm' },
  { value: 'final',     label: 'Final Exam' },
  { value: 'assignment',label: 'Assignment' },
]

function calcGrade(marks: number, max: number): string {
  const pct = (marks / max) * 100
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B+'
  if (pct >= 60) return 'B'
  if (pct >= 50) return 'C'
  if (pct >= 40) return 'D'
  return 'F'
}

function gradeBadge(g: string) {
  const variant = ['A+','A'].includes(g) ? 'success' : ['B+','B'].includes(g) ? 'default' : ['C','D'].includes(g) ? 'warning' : 'destructive'
  return <Badge variant={variant}>{g}</Badge>
}

export function GradesPage() {
  const { user } = useAuth()
  const [selectedClass,   setSelectedClass]   = useState('1')
  const [selectedSection, setSelectedSection] = useState('A')
  const [selectedSubject, setSelectedSubject] = useState('Mathematics')
  const [selectedExam,    setSelectedExam]    = useState<ExamType>('unit_test')
  const [maxMarks,        setMaxMarks]        = useState(100)
  const [students,        setStudents]        = useState<Student[]>([])
  const [marks,           setMarks]           = useState<Record<string, string>>({})
  const [,  setExistingGrades]  = useState<Grade[]>([])
  const [loading,         setLoading]         = useState(false)
  const [saving,          setSaving]          = useState(false)

  const load = async () => {
    setLoading(true)
    const [sRes, gRes] = await Promise.all([
      supabase.from('students').select('*')
        .eq('class', selectedClass).eq('section', selectedSection)
        .eq('admission_status', 'approved').eq('status', 'active').order('name'),
      supabase.from('grades').select('*')
        .eq('class', selectedClass).eq('subject', selectedSubject).eq('exam_type', selectedExam),
    ])
    const sList = sRes.data ?? []
    const gList = gRes.data ?? []
    setStudents(sList)
    setExistingGrades(gList)
    const mMap: Record<string, string> = {}
    sList.forEach(s => { mMap[s.id] = '' })
    gList.forEach(g => { mMap[g.student_id] = String(g.marks) })
    setMarks(mMap)
    setLoading(false)
  }

  useEffect(() => { load() }, [selectedClass, selectedSection, selectedSubject, selectedExam])

  const handleSave = async () => {
    const toSave: GradeInsert[] = students
      .filter(s => marks[s.id] !== '' && !isNaN(parseFloat(marks[s.id])))
      .map(s => {
        const m = parseFloat(marks[s.id])
        return {
          student_id: s.id, class: selectedClass, subject: selectedSubject,
          exam_type: selectedExam, marks: m, max_marks: maxMarks,
          grade: calcGrade(m, maxMarks), teacher_id: user?.id ?? null,
        }
      })
    if (toSave.length === 0) { toast({ title: 'No marks entered', variant: 'warning' }); return }
    setSaving(true)
    const { error } = await supabase.from('grades').upsert(toSave, { onConflict: 'student_id,subject,exam_type' })
    if (error) { toast({ title: 'Failed to save', description: error.message, variant: 'error' }); setSaving(false); return }
    toast({ title: 'Grades saved', description: `${toSave.length} students updated`, variant: 'success' })
    await load(); setSaving(false)
  }

  const entered = Object.values(marks).filter(v => v !== '' && !isNaN(parseFloat(v))).length
  const avg = entered > 0
    ? Object.values(marks).filter(v => v !== '' && !isNaN(parseFloat(v))).reduce((s, v) => s + parseFloat(v), 0) / entered
    : 0

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Grades</h1>
        <p className="text-sm text-muted-foreground">Enter exam marks and grades for students</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Class</p>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Section</p>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</p>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Exam Type</p>
              <Select value={selectedExam} onValueChange={v => setSelectedExam(v as ExamType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EXAM_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <p className="text-sm font-medium text-muted-foreground">Max Marks:</p>
            <Input type="number" value={maxMarks} onChange={e => setMaxMarks(parseFloat(e.target.value) || 100)}
              className="w-24 h-8 text-sm" />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {students.length > 0 && !loading && (
        <div className="flex flex-wrap gap-4">
          <div className="text-center"><p className="text-lg font-bold text-gray-900">{entered}/{students.length}</p><p className="text-xs text-muted-foreground">Marks entered</p></div>
          <div className="text-center"><p className="text-lg font-bold text-primary">{avg.toFixed(1)}</p><p className="text-xs text-muted-foreground">Class avg</p></div>
          <div className="text-center"><p className="text-lg font-bold text-gray-900">{maxMarks}</p><p className="text-xs text-muted-foreground">Max marks</p></div>
        </div>
      )}

      {/* Grade entry */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : students.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-sm text-muted-foreground">
          No approved students in Class {selectedClass}-{selectedSection}.
        </CardContent></Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{selectedSubject} · {EXAM_TYPES.find(e => e.value === selectedExam)?.label} · Class {selectedClass}-{selectedSection}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {students.map((s, i) => {
                const m = marks[s.id] ?? ''
                const num = parseFloat(m)
                const g = !isNaN(num) && m !== '' ? calcGrade(num, maxMarks) : null
                const pct = !isNaN(num) && m !== '' ? (num / maxMarks) * 100 : null
                return (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                    <span className="w-6 text-xs text-muted-foreground font-medium">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">#{s.roll_number}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min={0} max={maxMarks}
                        value={m}
                        onChange={e => setMarks(prev => ({ ...prev, [s.id]: e.target.value }))}
                        className="w-20 h-8 text-sm text-center"
                        placeholder="—"
                      />
                      <span className="text-xs text-muted-foreground w-12 text-center">/{maxMarks}</span>
                      {pct !== null && (
                        <span className={cn('text-xs font-medium w-10 text-center',
                          pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-blue-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600'
                        )}>{pct.toFixed(0)}%</span>
                      )}
                      <div className="w-10">{g && gradeBadge(g)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {students.length > 0 && !loading && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Grades
          </Button>
        </div>
      )}
    </div>
  )
}
