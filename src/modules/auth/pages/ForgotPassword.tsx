import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import FormField from '../../../components/ui/FormField'
import { ActionButton } from '../../../components/ui/ActionButton'

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle forgot password logic here
    console.log('Forgot password for:', email)
    setIsSubmitted(true)
  }

  const handleSendResetLink = () => {
    handleSubmit(new Event('submit') as unknown as React.FormEvent<HTMLFormElement>)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <Link to="/login" className="text-primary hover:text-primary/80 font-medium">
              ← Back to Login
            </Link>
            <div className="flex-1 flex justify-center">
              <img src="/rk-logo.png" alt="RK BAZAAR" className="h-12 w-auto" />
            </div>
          </div>

          {/* Success Message */}
          <div className="bg-card border border-border rounded-lg p-8 shadow-lg text-center">
            <div className="w-16 h-16 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
            <p className="text-muted-foreground mb-6">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              If you don't see the email in your inbox, please check your spam folder.
            </p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex justify-center items-center mb-8">
            <img src="/rk-logo.png" alt="RK BAZAAR" className="h-18 w-auto" />
        </div>

        {/* Forgot Password Form */}
        <div className="bg-card border border-border rounded-lg p-8 shadow-lg">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-primary mb-2">Forgot Password</h1>
            <p className="text-muted-foreground">Enter your email address and we'll send you a link to reset your password.</p>
          </div>

          <div className="space-y-6">
            <FormField
              label="Email Address"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Enter your email"
              required={true}
            />

            <ActionButton
              action="send"
              layout='grid'
              onClick={handleSendResetLink}
              variant="default"
              size="default"
              className="w-full py-3 font-medium"
              title="Send Reset Link"
            />
          </div>

          <div className="mt-6 text-center">
              <Link to="/login" className="text-primary hover:text-primary/80 font-medium">
                ← Back to Login
              </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword