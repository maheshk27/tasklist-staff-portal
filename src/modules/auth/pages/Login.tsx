import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import FormField from '../../../components/ui/FormField'
import { ActionButton } from '../../../components/ui/ActionButton'

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
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/rk-logo.png" alt="RK BAZAAR" className="h-18 w-auto mx-auto mb-4" />
        </div>

        {/* Login Form */}
        <div className="bg-card border border-border rounded-lg p-8 shadow-lg">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-primary mb-2">Staff Portal</h1>
            <p className="text-muted-foreground">Please sign in to your account</p>
          </div>

          {authError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-destructive text-sm">{authError}</p>
            </div>
          )}

          <div className="space-y-6">
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
            />

            <ActionButton
              action="signin"
              layout='grid'
              onClick={handleSignIn}
              variant="default"
              size="lg"
              className="w-full py-3 font-medium"
              title={isLoading ? "Signing in..." : "Sign In"}
              disabled={isLoading}
            />

            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:text-primary/80"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login