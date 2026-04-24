export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'admin' | 'office_staff' | 'teacher'
export type AdmissionStatus = 'pending' | 'approved' | 'rejected'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type AttendanceStatus = 'present' | 'absent' | 'late'
export type ExamType = 'unit_test' | 'midterm' | 'final' | 'assignment'

export type Database = {
  public: {
    Tables: {
      students: {
        Row: {
          id: string
          created_at: string
          name: string
          roll_number: string
          class: string
          section: string
          date_of_birth: string | null
          gender: string
          phone: string | null
          email: string | null
          address: string | null
          guardian_name: string | null
          guardian_phone: string | null
          status: 'active' | 'inactive'
          admission_status: AdmissionStatus
          submitted_by: string | null
        }
        Insert: {
          id?: string; created_at?: string
          name: string; roll_number: string; class: string; section?: string
          date_of_birth?: string | null; gender?: string
          phone?: string | null; email?: string | null; address?: string | null
          guardian_name?: string | null; guardian_phone?: string | null
          status?: 'active' | 'inactive'
          admission_status?: AdmissionStatus
          submitted_by?: string | null
        }
        Update: {
          id?: string; created_at?: string
          name?: string; roll_number?: string; class?: string; section?: string
          date_of_birth?: string | null; gender?: string
          phone?: string | null; email?: string | null; address?: string | null
          guardian_name?: string | null; guardian_phone?: string | null
          status?: 'active' | 'inactive'
          admission_status?: AdmissionStatus
          submitted_by?: string | null
        }
        Relationships: []
      }
      fee_structures: {
        Row: {
          id: string; created_at: string; name: string; class: string
          amount: number; frequency: 'monthly' | 'quarterly' | 'annually' | 'one-time'
          description: string | null; is_published: boolean; published_at: string | null
        }
        Insert: {
          id?: string; created_at?: string; name: string; class: string
          amount: number; frequency?: 'monthly' | 'quarterly' | 'annually' | 'one-time'
          description?: string | null; is_published?: boolean; published_at?: string | null
        }
        Update: {
          id?: string; created_at?: string; name?: string; class?: string
          amount?: number; frequency?: 'monthly' | 'quarterly' | 'annually' | 'one-time'
          description?: string | null; is_published?: boolean; published_at?: string | null
        }
        Relationships: []
      }
      fee_payments: {
        Row: {
          id: string; created_at: string
          student_id: string; fee_structure_id: string
          amount_paid: number; payment_date: string
          payment_method: 'cash' | 'online' | 'cheque'
          receipt_number: string
          status: 'paid' | 'partial' | 'pending'
          approval_status: ApprovalStatus
          approved_by: string | null; approved_at: string | null
          submitted_by: string | null; remarks: string | null
        }
        Insert: {
          id?: string; created_at?: string
          student_id: string; fee_structure_id: string
          amount_paid: number; payment_date?: string
          payment_method?: 'cash' | 'online' | 'cheque'
          receipt_number: string
          status?: 'paid' | 'partial' | 'pending'
          approval_status?: ApprovalStatus
          approved_by?: string | null; approved_at?: string | null
          submitted_by?: string | null; remarks?: string | null
        }
        Update: {
          id?: string; created_at?: string
          student_id?: string; fee_structure_id?: string
          amount_paid?: number; payment_date?: string
          payment_method?: 'cash' | 'online' | 'cheque'
          receipt_number?: string
          status?: 'paid' | 'partial' | 'pending'
          approval_status?: ApprovalStatus
          approved_by?: string | null; approved_at?: string | null
          submitted_by?: string | null; remarks?: string | null
        }
        Relationships: [
          { foreignKeyName: "fee_payments_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
          { foreignKeyName: "fee_payments_fee_structure_id_fkey"; columns: ["fee_structure_id"]; isOneToOne: false; referencedRelation: "fee_structures"; referencedColumns: ["id"] }
        ]
      }
      user_profiles: {
        Row: {
          id: string; created_at: string; name: string; role: UserRole; is_active: boolean
        }
        Insert: {
          id: string; created_at?: string; name: string; role?: UserRole; is_active?: boolean
        }
        Update: {
          id?: string; created_at?: string; name?: string; role?: UserRole; is_active?: boolean
        }
        Relationships: []
      }
      attendance: {
        Row: {
          id: string; created_at: string
          student_id: string; class: string; section: string
          date: string; status: AttendanceStatus; marked_by: string | null
        }
        Insert: {
          id?: string; created_at?: string
          student_id: string; class: string; section: string
          date?: string; status?: AttendanceStatus; marked_by?: string | null
        }
        Update: {
          id?: string; created_at?: string
          student_id?: string; class?: string; section?: string
          date?: string; status?: AttendanceStatus; marked_by?: string | null
        }
        Relationships: []
      }
      grades: {
        Row: {
          id: string; created_at: string
          student_id: string; class: string; subject: string
          exam_type: ExamType; marks: number; max_marks: number
          grade: string | null; teacher_id: string | null
        }
        Insert: {
          id?: string; created_at?: string
          student_id: string; class: string; subject: string
          exam_type?: ExamType; marks: number; max_marks?: number
          grade?: string | null; teacher_id?: string | null
        }
        Update: {
          id?: string; created_at?: string
          student_id?: string; class?: string; subject?: string
          exam_type?: ExamType; marks?: number; max_marks?: number
          grade?: string | null; teacher_id?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Student      = Database['public']['Tables']['students']['Row']
export type StudentInsert = Database['public']['Tables']['students']['Insert']
export type FeeStructure  = Database['public']['Tables']['fee_structures']['Row']
export type FeePayment    = Database['public']['Tables']['fee_payments']['Row']
export type FeePaymentInsert = Database['public']['Tables']['fee_payments']['Insert']
export type UserProfile   = Database['public']['Tables']['user_profiles']['Row']
export type Attendance    = Database['public']['Tables']['attendance']['Row']
export type AttendanceInsert = Database['public']['Tables']['attendance']['Insert']
export type Grade         = Database['public']['Tables']['grades']['Row']
export type GradeInsert   = Database['public']['Tables']['grades']['Insert']
