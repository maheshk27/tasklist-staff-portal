import React from 'react'

interface FormSelectOption {
  value: string | number
  label: string
}

interface FormSelectProps {
  label: string
  name: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: FormSelectOption[]
  placeholder?: string
  error?: string
  required?: boolean
  disabled?: boolean
  width?: 'full' | 'auto' // Add width prop
  icon?: React.ReactNode
}

const FormSelect: React.FC<FormSelectProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  error,
  required = false,
  disabled = false,
  width = 'full',
  icon
}) => {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
            {icon}
          </span>
        )}
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className={`px-3 h-11 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${width === 'full' ? 'w-full' : 'w-auto'
            } ${error ? 'border-red-500' : 'border-border'
            } ${icon ? 'pl-11' : ''}`}
          disabled={disabled}
          required={required}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}
    </div>
  )
}

export default FormSelect