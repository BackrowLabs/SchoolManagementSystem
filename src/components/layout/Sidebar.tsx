import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, CreditCard, LogOut, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/students', icon: Users, label: 'Students' },
  { to: '/fees', icon: CreditCard, label: 'Fees' },
]

export function Sidebar() {
  const { signOut, user } = useAuth()

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-white">
      <div className="flex items-center gap-2 border-b px-6 py-5">
        <GraduationCap className="h-7 w-7 text-primary" />
        <div>
          <p className="font-bold text-gray-900 leading-tight">SchoolMS</p>
          <p className="text-xs text-muted-foreground">Management System</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t px-3 py-4">
        <div className="mb-3 px-3">
          <p className="text-xs font-medium text-muted-foreground truncate">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-gray-600 hover:text-gray-900"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
