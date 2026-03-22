import React from 'react'

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'glass' | 'solid'
}

export function Card({ variant = 'glass', className = '', ...props }: CardProps) {
  const base =
    variant === 'glass'
      ? 'glass-card'
      : 'bg-slate-900/70 border border-white/10 rounded-3xl shadow-xl'

  return <div className={`${base} ${className}`} {...props} />
}

