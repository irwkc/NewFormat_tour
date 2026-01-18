'use client'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function Select({
  options,
  value,
  onChange,
  placeholder = 'Выберите...',
  className = '',
  disabled = false,
}: SelectProps) {
  const selectedOption = options.find((opt) => opt.value === value) || options[0]
  const currentIndex = options.findIndex((opt) => opt.value === value)

  const handlePrevious = () => {
    if (disabled) return
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1
    onChange(options[prevIndex].value)
  }

  const handleNext = () => {
    if (disabled) return
    const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0
    onChange(options[nextIndex].value)
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 input-glass flex items-center px-4 py-3">
        <span className={selectedOption ? 'text-white' : 'text-white/60'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
      </div>
      
      <div className="flex gap-1">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={disabled}
          className={`p-2 rounded-xl border border-white/30 bg-white/20 backdrop-blur-lg transition-all duration-200 ${
            disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-white/30 active:scale-95 cursor-pointer'
          }`}
          aria-label="Предыдущий вариант"
        >
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        
        <button
          type="button"
          onClick={handleNext}
          disabled={disabled}
          className={`p-2 rounded-xl border border-white/30 bg-white/20 backdrop-blur-lg transition-all duration-200 ${
            disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-white/30 active:scale-95 cursor-pointer'
          }`}
          aria-label="Следующий вариант"
        >
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
