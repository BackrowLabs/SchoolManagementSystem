export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

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
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          roll_number: string
          class: string
          section?: string
          date_of_birth?: string | null
          gender?: string
          phone?: string | null
          email?: string | null
          address?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          status?: 'active' | 'inactive'
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          roll_number?: string
          class?: string
          section?: string
          date_of_birth?: string | null
          gender?: string
          phone?: string | null
          email?: string | null
          address?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          status?: 'active' | 'inactive'
        }
        Relationships: []
      }
      fee_structures: {
        Row: {
          id: string
          created_at: string
          name: string
          class: string
          amount: number
          frequency: 'monthly' | 'quarterly' | 'annually' | 'one-time'
          description: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          class: string
          amount: number
          frequency?: 'monthly' | 'quarterly' | 'annually' | 'one-time'
          description?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          class?: string
          amount?: number
          frequency?: 'monthly' | 'quarterly' | 'annually' | 'one-time'
          description?: string | null
        }
        Relationships: []
      }
      fee_payments: {
        Row: {
          id: string
          created_at: string
          student_id: string
          fee_structure_id: string
          amount_paid: number
          payment_date: string
          payment_method: 'cash' | 'online' | 'cheque'
          receipt_number: string
          status: 'paid' | 'partial' | 'pending'
          remarks: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          student_id: string
          fee_structure_id: string
          amount_paid: number
          payment_date?: string
          payment_method?: 'cash' | 'online' | 'cheque'
          receipt_number: string
          status?: 'paid' | 'partial' | 'pending'
          remarks?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          student_id?: string
          fee_structure_id?: string
          amount_paid?: number
          payment_date?: string
          payment_method?: 'cash' | 'online' | 'cheque'
          receipt_number?: string
          status?: 'paid' | 'partial' | 'pending'
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Student = Database['public']['Tables']['students']['Row']
export type StudentInsert = Database['public']['Tables']['students']['Insert']
export type StudentUpdate = Database['public']['Tables']['students']['Update']
export type FeeStructure = Database['public']['Tables']['fee_structures']['Row']
export type FeeStructureInsert = Database['public']['Tables']['fee_structures']['Insert']
export type FeePayment = Database['public']['Tables']['fee_payments']['Row']
export type FeePaymentInsert = Database['public']['Tables']['fee_payments']['Insert']
