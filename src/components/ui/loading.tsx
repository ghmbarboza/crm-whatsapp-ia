import { Loader2, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-label="Carregando" />
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8 text-gray-500">
      <Inbox className="h-10 w-10" aria-hidden />
      <p>{message}</p>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-gray-200', className)} />
}
