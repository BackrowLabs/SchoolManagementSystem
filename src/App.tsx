import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage }     from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { StudentsPage }  from '@/pages/StudentsPage'
import { FeesPage }      from '@/pages/FeesPage'
import { AttendancePage }from '@/pages/AttendancePage'
import { GradesPage }    from '@/pages/GradesPage'
import { ApprovalsPage } from '@/pages/ApprovalsPage'
import { UsersPage }     from '@/pages/UsersPage'

function RoleGuard({ allow, children }: { allow: ('admin' | 'office_staff' | 'teacher')[]; children: React.ReactNode }) {
  const { role } = useAuth()
  if (!role || !allow.includes(role)) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/"           element={<DashboardPage />} />
            <Route path="/students"   element={<RoleGuard allow={['admin','office_staff']}><StudentsPage /></RoleGuard>} />
            <Route path="/fees"       element={<RoleGuard allow={['admin','office_staff']}><FeesPage /></RoleGuard>} />
            <Route path="/attendance" element={<RoleGuard allow={['admin','teacher']}><AttendancePage /></RoleGuard>} />
            <Route path="/grades"     element={<RoleGuard allow={['admin','teacher']}><GradesPage /></RoleGuard>} />
            <Route path="/approvals"  element={<RoleGuard allow={['admin']}><ApprovalsPage /></RoleGuard>} />
            <Route path="/users"      element={<RoleGuard allow={['admin']}><UsersPage /></RoleGuard>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
