import React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const base =
    variant === 'primary'
      ? 'btn-primary'
      : 'btn-secondary'

  return <button className={`${base} ${className}`} {...props} />
}

