import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-brand-primary text-white hover:bg-brand-primary-dark shadow-sm': variant === 'default',
            'bg-red-600 text-white hover:bg-red-700 shadow-sm': variant === 'destructive',
            'border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700': variant === 'outline',
            'bg-brand-secondary text-white hover:bg-brand-secondary-dark shadow-sm': variant === 'secondary',
            'hover:bg-neutral-100 text-neutral-700': variant === 'ghost',
            'text-brand-primary underline-offset-4 hover:underline': variant === 'link',
          },
          {
            'h-10 px-4 py-2': size === 'default',
            'h-9 px-3 text-xs': size === 'sm',
            'h-11 px-6': size === 'lg',
            'h-10 w-10 rounded-lg': size === 'icon',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
