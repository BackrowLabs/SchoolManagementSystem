import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, CreditCard, LogOut,
  GraduationCap, CheckSquare, BookOpen,
  ShieldCheck, UserCog, X, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/lib/database.types'

interface NavItem { to: string; icon: React.ElementType; label: string; roles: UserRole[] }

const navItems: NavItem[] = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard',  roles: ['admin', 'office_staff', 'teacher'] },
  { to: '/students',   icon: Users,           label: 'Students',   roles: ['admin', 'office_staff'] },
  { to: '/fees',       icon: CreditCard,      label: 'Fees',       roles: ['admin', 'office_staff'] },
  { to: '/attendance', icon: CheckSquare,     label: 'Attendance', roles: ['admin', 'teacher'] },
  { to: '/grades',     icon: BookOpen,        label: 'Grades',     roles: ['admin', 'teacher'] },
  { to: '/approvals',  icon: ShieldCheck,     label: 'Approvals',  roles: ['admin'] },
  { to: '/users',      icon: UserCog,         label: 'Users',      roles: ['admin'] },
]

const roleLabel: Record<UserRole, string> = {
  admin: 'Administrator',
  office_staff: 'Office Staff',
  teacher: 'Teacher',
}

const roleBadgeClass: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  office_staff: 'bg-blue-100 text-blue-700',
  teacher: 'bg-emerald-100 text-emerald-700',
}

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { signOut, user, profile, role } = useAuth()
  const visibleItems = navItems.filter(item => role && item.roles.includes(role))

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col bg-white border-r border-border',
          'transition-transform duration-300 ease-in-out',
          'lg:static lg:translate-x-0 lg:flex',
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/30">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-tight">Nalanda Vidya Nikethan</p>
            <p className="text-[11px] text-muted-foreground">School Management Portal</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Role badge */}
        {role && (
          <div className="px-4 pt-4 pb-1">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', roleBadgeClass[role])}>
              <ChevronRight className="h-3 w-3" />
              {roleLabel[role]}
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {visibleItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('h-4 w-4 shrink-0 transition-transform', isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600')} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-border p-3">
          <div className="rounded-lg bg-secondary px-3 py-2.5 mb-2">
            <p className="text-xs font-semibold text-foreground truncate">{profile?.name ?? user?.email}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
