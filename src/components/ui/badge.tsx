import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'bg-blue-600 text-white',
      quente: 'bg-red-500 text-white',
      morno: 'bg-yellow-400 text-gray-900',
      frio: 'bg-gray-400 text-white',
      outline: 'border border-gray-300 text-gray-700',
    },
  },
  defaultVariants: { variant: 'default' },
})

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
