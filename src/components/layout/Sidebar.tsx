import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  Settings,
  ScrollText,
  MessageCircle,
  QrCode,
  Settings2,
  BarChartBig,
  Kanban,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/integrations/supabase/types'
import { Skeleton } from '@/components/ui/loading'

const navItems: { to: string; label: string; icon: typeof LayoutDashboard; roles: UserRole[] }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'gestor', 'operacional'] },
  { to: '/kanban', label: 'Pipeline', icon: Kanban, roles: ['admin', 'gestor', 'operacional'] },
  { to: '/leads', label: 'Leads', icon: FileText, roles: ['admin', 'gestor', 'operacional'] },
  { to: '/chat', label: 'Chat', icon: MessageSquare, roles: ['admin', 'gestor', 'operacional'] },
  { to: '/admin/team', label: 'Equipe', icon: Users, roles: ['admin', 'gestor'] },
  { to: '/admin/integration-whatsapp', label: 'WhatsApp', icon: QrCode, roles: ['admin', 'gestor'] },
  { to: '/admin/classification-ai', label: 'IA Classificação', icon: Settings2, roles: ['admin'] },
  { to: '/admin/reports', label: 'Relatórios', icon: BarChartBig, roles: ['admin', 'gestor'] },
  { to: '/admin/settings', label: 'Configurações', icon: Settings, roles: ['admin', 'gestor'] },
  { to: '/logs', label: 'Logs', icon: ScrollText, roles: ['admin'] },
]

export function SidebarNav({
  onNavigate,
  mobile,
}: {
  onNavigate?: () => void
  mobile?: boolean
}) {
  const location = useLocation()
  const { checkRole, loading, user, profile } = useAuth()

  const visibleItems = navItems.filter((item) => checkRole(item.roles))

  if (loading && user && !profile) {
    return (
      <nav className={cn('flex flex-col gap-2', mobile ? 'p-4' : 'p-3')}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-10 w-full bg-white/20" />
        ))}
      </nav>
    )
  }

  if (visibleItems.length === 0 && user) {
    return (
      <nav className={cn('p-4 text-sm text-white/80', mobile ? 'p-4' : 'p-3')}>
        <p className="mb-2 font-medium text-white">Navegação básica</p>
        {navItems
          .filter((i) => i.roles.includes('operacional'))
          .map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-white/10"
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
      </nav>
    )
  }

  return (
    <nav className={cn('flex flex-col gap-1', mobile ? 'p-4' : 'p-3')}>
      {visibleItems.map(({ to, label, icon: Icon }) => {
        const active = location.pathname === to || location.pathname.startsWith(`${to}/`)
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              'relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-[var(--brand-accent,#1565C0)] text-white'
                : 'text-white/90 hover:bg-white/10 hover:text-white'
            )}
            aria-current={active ? 'page' : undefined}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-[#63B3ED]" />
            )}
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar() {
  return (
    <aside
      className="hidden w-64 shrink-0 flex-col border-r border-white/10 md:flex"
      style={{ backgroundColor: 'var(--brand-primary, #0D4F8B)' }}
    >
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <MessageCircle className="h-7 w-7 shrink-0 text-white" />
        <span className="ml-2 text-lg font-bold text-white">CRM IA</span>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <SidebarNav />
      </div>
    </aside>
  )
}
