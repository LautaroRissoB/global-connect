import { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${className}`}
      style={{ borderRadius: 'var(--radius-full)', fontWeight: 600, transition: 'all 0.3s var(--ease)', ...(props.style || {}) }}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}
