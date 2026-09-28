import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface MultiSelectOption {
  value: number
  label: string
  badge?: string
  badgeColor?: string
}

interface MultiSelectDropdownProps {
  label: string
  options: MultiSelectOption[]
  selectedValues: number[]
  onChange: (values: number[]) => void
  placeholder?: string
  required?: boolean
  error?: string
  disabled?: boolean
  showSelectAll?: boolean
}

/**
 * MultiSelectDropdown — checkbox dropdown used by the report filters.
 * Mirrors admin-portal's component so both portals stay visually consistent.
 */
const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Select options...',
  required = false,
  error,
  disabled = false,
  showSelectAll = true,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const isAllSelected = options.length > 0 && options.every(opt => selectedValues.includes(opt.value))

  const toggleSelectAll = () => {
    if (isAllSelected) {
      onChange([])
    } else {
      onChange(options.map(opt => opt.value))
    }
  }

  const toggleOption = (value: number) => {
    const isSelected = selectedValues.includes(value)
    const updatedValues = isSelected
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value]
    onChange(updatedValues)
  }

  const selectedLabels = options
    .filter(opt => selectedValues.includes(opt.value))
    .map(opt => opt.label)

  return (
    <div className="space-y-2" ref={containerRef}>
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {/* Dropdown trigger button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-3 h-11 py-2 border rounded-lg bg-background text-left flex items-center justify-between transition-colors ${
            error ? 'border-red-500' : 'border-border'
          } ${isOpen ? 'ring-2 ring-primary ring-opacity-50 border-primary' : ''} ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'
          }`}
        >
          <span className={`text-sm truncate ${selectedValues.length === 0 ? 'text-muted-foreground' : ''}`}>
            {selectedValues.length === 0
              ? placeholder
              : isAllSelected && options.length > 1
                ? 'All stores selected'
                : selectedValues.length === 1
                  ? selectedLabels[0]
                  : `${selectedValues.length} stores selected`}
          </span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown panel */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-[250px] overflow-y-auto">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                No options available
              </div>
            ) : (
              <div className="p-1">
                {showSelectAll && options.length > 1 && (
                  <label
                    className={`flex items-center gap-3 px-3 py-2 border-b border-border rounded-md cursor-pointer transition-colors ${
                      isAllSelected ? 'bg-primary/10 font-semibold' : 'hover:bg-muted font-medium'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                    />
                    <span className="flex-1 text-sm">Select All</span>
                    {isAllSelected && <Check className="w-4 h-4 text-primary" />}
                  </label>
                )}

                {options.map(option => {
                  const isSelected = selectedValues.includes(option.value)
                  return (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOption(option.value)}
                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                      />
                      <span className="flex-1 text-sm">{option.label}</span>
                      {option.badge && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${option.badgeColor || 'bg-green-100 text-green-700'}`}>
                          {option.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  )
}

export default MultiSelectDropdown
