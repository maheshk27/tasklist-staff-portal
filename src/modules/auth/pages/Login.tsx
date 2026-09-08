import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LockKeyhole, User, Lock } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import FormField from '../../../components/ui/FormField'
import { ActionButton } from '../../../components/ui/ActionButton'
import AuthLayout from '../../../components/layout/AuthLayout'

const Login: React.FC = () => {
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { login, error: authError, clearError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isFormSubmitted = useRef(false)

  // Clear any existing errors when Login component mounts (navigation scenario)
  useEffect(() => {
    // Only clear errors if form hasn't been submitted yet (navigation scenario)
    if (!isFormSubmitted.current) {
      clearError()
    }
  }, [clearError])

  // Reset the form submission flag when component mounts
  useEffect(() => {
    isFormSubmitted.current = false
  }, [])

  // Get the redirect path from location state, default to dashboard
  const from = location.state?.from?.pathname || '/dashboard'

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!userName.trim()) {
      newErrors.userName = 'Username is required'
    }

    if (!password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Mark that form has been submitted to prevent auto-clearing
    isFormSubmitted.current = true

    setIsLoading(true)

    try {
      await login(userName, password)
      // Redirect to the page they were trying to visit before being redirected to login
      navigate(from, { replace: true })
    } catch (error) {
      // Error is handled by the auth context - don't clear it here
      console.error('Login failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignIn = async () => {
    // Create a synthetic form event for the ActionButton
    const syntheticEvent = {
      preventDefault: () => {},
      target: { checkValidity: () => true }
    } as unknown as React.FormEvent<HTMLFormElement>

    await handleSubmit(syntheticEvent)
  }

  return (
    <AuthLayout>
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <LockKeyhole className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-foreground mb-1.5">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to continue to the staff portal
        </p>
      </div>

      {authError && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-destructive shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-destructive text-sm">{authError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormField
          label="Username"
          name="userName"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          type="text"
          placeholder="Enter your username"
          required={true}
          disabled={isLoading}
          error={errors.userName}
          icon={<User className="w-5 h-5" />}
        />

        <FormField
          label="Password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Enter your password"
          required={true}
          disabled={isLoading}
          showPasswordToggle={true}
          error={errors.password}
          icon={<Lock className="w-5 h-5" />}
        />

        {/* Submit button */}
        <div className="flex justify-center pt-1">
          <ActionButton
            action="signin"
            layout='grid'
            onClick={handleSignIn}
            variant="default"
            size="lg"
            className="w-full py-3 font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
            title={isLoading ? "Signing in..." : "Sign In"}
            disabled={isLoading}
          />
        </div>
      </form>
    </AuthLayout>
  )
}

export default Login