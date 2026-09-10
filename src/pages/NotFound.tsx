import React from 'react'
import { Link } from 'react-router-dom'

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center px-4">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary">404</h1>
        </div>
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
          <p className="text-lg text-muted-foreground mx-auto">
            The page you are looking for does not exist or may have been moved.
          </p>
          <p className="text-lg text-muted-foreground mx-auto">
            Please verify the URL or navigate back to the dashboard.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/dashboard"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/"
            className="px-6 py-3 border border-border text-foreground rounded-md hover:bg-accent hover:text-accent-foreground transition-colors font-semibold"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound