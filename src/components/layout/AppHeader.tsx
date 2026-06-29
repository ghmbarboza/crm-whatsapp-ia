import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, LogOut, Menu, Settings, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { SidebarNav } from '@/components/layout/Sidebar'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/kanban': 'Painel de Leads',
  '/pipeline': 'Painel de Leads',
  '/leads': 'Leads',
  '/chat': 'Chat',
  '/admin/team': 'Gestão de Equipe',
  '/admin/integration-whatsapp': 'Integração WhatsApp',
  '/admin/classification-ai': 'Classificação IA',
  '/equipe': 'Gestão de Equipe',
  '/admin/settings': 'Configurações Gerais',
  '/configuracoes': 'Configurações Gerais',
  '/admin/reports': 'Relatórios e Histórico',
  '/relatorios': 'Relatórios e Histórico',
  '/logs': 'Logs de Atividade',
  '/perfil': 'Meu Perfil',
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/leads/')) return 'Detalhe do Lead'
  if (pathname.startsWith('/chat/')) return 'Chat ao Vivo'
  return pageTitles[pathname] ?? 'CRM Automatizado com IA'
}

function getInitials(name?: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function AppHeader() {
  const location = useLocation()
  const { profile, role, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const title = getPageTitle(location.pathname)
  const displayName = profile?.full_name ?? 'Usuário'

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-64 border-none p-0 text-white"
            style={{ backgroundColor: 'var(--brand-primary, #0D4F8B)' }}
          >
            <div className="flex h-16 items-center border-b border-white/10 px-6">
              <span className="text-lg font-bold text-white">CRM IA</span>
            </div>
            <SidebarNav mobile onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-semibold text-gray-900 md:text-xl">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {role && (
          <span className="hidden rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-600 lg:inline">
            {role}
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-gray-100">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{getInitials(displayName)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-gray-700 md:inline">{displayName}</span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/perfil" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="Sair" className="hidden md:inline-flex">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
