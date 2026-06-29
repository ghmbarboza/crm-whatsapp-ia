import { Link, useLocation } from 'react-router-dom'
import {
  BarChart2,
  Columns,
  User,
  Settings,
  MessageCircle,
  Bell,
  Menu,
  LogOut,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAlertas } from '@/hooks/useAlertas'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { t } from '@/i18n'

const navItems = [
  { to: '/dashboard', label: t('nav.dashboard'), icon: BarChart2, roles: ['admin', 'gestor', 'operacional'] as const },
  { to: '/pipeline', label: t('nav.pipeline'), icon: Columns, roles: ['admin', 'gestor', 'operacional'] as const },
  { to: '/leads', label: t('nav.leads'), icon: User, roles: ['admin', 'gestor', 'operacional'] as const },
  { to: '/relatorios', label: t('nav.reports'), icon: FileText, roles: ['admin', 'gestor'] as const },
  { to: '/configuracoes', label: t('nav.config'), icon: Settings, roles: ['admin'] as const },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()
  const { checkRole } = useAuth()

  return (
    <nav className="flex flex-col gap-1">
      {navItems
        .filter((item) => checkRole([...item.roles]))
        .map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              location.pathname.startsWith(to)
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            )}
            aria-current={location.pathname.startsWith(to) ? 'page' : undefined}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
    </nav>
  )
}

export function Sidebar() {
  const { profile, signOut } = useAuth()
  const { unreadCount } = useAlertas()

  return (
    <aside className="hidden w-64 flex-col border-r bg-white md:flex">
      <div className="flex h-16 items-center border-b px-6">
        <MessageCircle className="h-6 w-6 text-blue-600" />
        <span className="ml-2 text-lg font-bold text-blue-800">CRM IA</span>
      </div>
      <div className="flex-1 p-4">
        <NavLinks />
      </div>
      <div className="border-t p-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
          <Bell className="h-4 w-4" />
          <span>{unreadCount} alertas</span>
        </div>
        <p className="mb-2 truncate text-sm font-semibold">{profile?.full_name}</p>
        <p className="mb-3 truncate text-xs text-gray-500 capitalize">{profile?.role}</p>
        <Button variant="secondary" size="sm" className="w-full" onClick={() => signOut()}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  )
}

export function MobileHeader() {
  const { signOut } = useAuth()

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-4 md:hidden">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <div className="mb-6 flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-bold text-blue-800">CRM IA</span>
            </div>
            <NavLinks />
            <Button variant="secondary" className="mt-6 w-full" onClick={() => signOut()}>
              Sair
            </Button>
          </SheetContent>
        </Sheet>
        <span className="font-bold text-blue-800">CRM IA</span>
      </div>
    </header>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <MobileHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
