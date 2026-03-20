import { InputHTMLAttributes } from 'react'
import { LucideIcon } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  icon?: LucideIcon
}

export default function Input({
  label,
  error,
  icon: Icon,
  id,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className={`input-wrapper glass-card ${Icon ? 'has-icon' : ''} ${error ? 'has-error' : ''}`} style={{ borderRadius: 'var(--radius-md)' }}>
      {/* Input must come before label for the CSS :placeholder-shown sibling selector to work */}
      <input
        id={id}
        placeholder=" "
        className={`input-field ${className}`}
        {...props}
      />
      <label htmlFor={id} className="input-label" style={{ fontSize: '13px', fontWeight: 500 }}>
        {label}
      </label>
      {Icon && <Icon className="input-icon" size={20} color={error ? 'var(--primary)' : 'rgba(255,255,255,0.4)'} />}
      {error && <span className="input-error-msg" style={{ fontSize: '11px', fontWeight: 600 }}>{error}</span>}
    </div>
  )
}
