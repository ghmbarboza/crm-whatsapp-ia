import { Outlet, useLocation } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/loading'

interface AuthLayoutProps {
  children?: React.ReactNode
  loading?: boolean
  title?: string
  subtitle?: string
}

export function AuthLayout({ children, loading, title, subtitle }: AuthLayoutProps) {
  const location = useLocation()

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0D4F8B] via-[#1565C0] to-[#0D4F8B] p-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div
        key={location.pathname}
        className={cn(
          'relative z-10 w-full max-w-md transition-all duration-300',
          loading && 'pointer-events-none opacity-70'
        )}
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <MessageCircle className="h-9 w-9 text-white" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            CRM Automatizado com IA
          </h1>
          {(title || subtitle) && (
            <div className="mt-2">
              {title && <p className="text-lg font-medium text-white/95">{title}</p>}
              {subtitle && <p className="text-sm text-white/75">{subtitle}</p>}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-2xl md:p-8">
          {loading ? (
            <div className="space-y-4" aria-busy="true" aria-label="Carregando autenticação">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          ) : (
            children ?? <Outlet />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-white/60">
          © {new Date().getFullYear()} CRM IA · Uso interno · LGPD
        </p>
      </div>
    </div>
  )
}
