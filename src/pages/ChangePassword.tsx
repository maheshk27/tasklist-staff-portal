import React, { useState } from 'react'
import FormField from '../components/ui/FormField'
import { ActionButton } from '../components/ui/ActionButton'
import { onboardingService } from '../services/apiManager'

const ChangePassword: React.FC = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setErrors({
      ...errors,
      [e.target.name]: ''
    })
    setApiError(null)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required'
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required'
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password'
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setApiError(null)
    
    try {
      const response = await onboardingService.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      })

      if (response.success) {
        setIsSuccess(true)
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
        
        setTimeout(() => {
          setIsSuccess(false)
        }, 3000)
      } else {
        setApiError(response.message || 'Failed to change password')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password'
      setApiError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Change Password</h1>
        <p className="text-muted-foreground mt-2">Update your account password</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 shadow-sm max-w-xl">
        {isSuccess && (
          <div className="mb-6 p-4 bg-green-100 border border-green-200 rounded-md">
            <p className="text-green-800">Password changed successfully!</p>
          </div>
        )}

        {apiError && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-destructive text-sm">{apiError}</p>
          </div>
        )}

        <div className="space-y-6">
          <FormField
            label="Current Password"
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleChange}
            type="password"
            placeholder="Enter your current password"
            required={true}
            disabled={isLoading}
            showPasswordToggle={true}
            error={errors.currentPassword}
          />

          <FormField
            label="New Password"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            type="password"
            placeholder="Enter your new password"
            required={true}
            disabled={isLoading}
            showPasswordToggle={true}
            error={errors.newPassword}
          />

          <FormField
            label="Confirm New Password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            type="password"
            placeholder="Confirm your new password"
            required={true}
            disabled={isLoading}
            showPasswordToggle={true}
            error={errors.confirmPassword}
          />

          <div className="pt-4">
            <ActionButton
              action="save"
              layout="grid"
              onClick={handleSubmit}
              variant="default"
              size="lg"
              className="w-full py-3"
              title={isLoading ? "Updating Password..." : "Update Password"}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChangePassword