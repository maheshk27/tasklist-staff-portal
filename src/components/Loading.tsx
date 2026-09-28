import React from 'react'

interface LoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Loading — shared spinner with an optional message.
 * Mirrors admin-portal's Loading so both portals stay visually consistent.
 */
const Loading: React.FC<LoadingProps> = ({
  message = 'Loading...',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  }

  return (
    <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]}`}></div>
      <p className="mt-4 text-center text-muted-foreground">{message}</p>
    </div>
  )
}

export default Loading
