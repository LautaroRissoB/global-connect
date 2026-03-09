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
    <div className={`input-wrapper ${Icon ? 'has-icon' : ''} ${error ? 'has-error' : ''}`}>
      {/* Input must come before label for the CSS :placeholder-shown sibling selector to work */}
      <input
        id={id}
        placeholder=" "
        className={`input-field ${className}`}
        {...props}
      />
      <label htmlFor={id} className="input-label">
        {label}
      </label>
      {Icon && <Icon className="input-icon" size={17} />}
      {error && <span className="input-error-msg">{error}</span>}
    </div>
  )
}
