import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundScreen() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-[#0D4F8B]">404</p>
      <h1 className="text-2xl font-semibold text-gray-900">Página não encontrada</h1>
      <p className="max-w-md text-gray-500">
        A página que você procurou não existe ou foi movida.
      </p>
      <Button asChild>
        <Link to="/dashboard">
          <Home className="h-4 w-4" />
          Voltar ao Dashboard
        </Link>
      </Button>
    </div>
  )
}
