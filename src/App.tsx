import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/layout/Layout'
import Login from './modules/auth/pages/Login'
import ForgotPassword from './modules/auth/pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import ChangePassword from './pages/ChangePassword'
import MyTasks from './pages/MyTasks'
import TeamTasks from './pages/TeamTasks'
import TicketList from './modules/tickets/pages/TicketList'
import TicketDetail from './modules/tickets/pages/TicketDetail'
import CreateTicket from './modules/tickets/pages/CreateTicket'
import EditTicket from './modules/tickets/pages/EditTicket'
import TaskExecutionDetail from './pages/TaskExecutionDetail'
import ChecklistExecutionDetail from './pages/ChecklistExecutionDetail'
import SurveyList from './pages/SurveyList'
import SurveyEntryPage from './pages/SurveyEntry'
import LoginLogs from './pages/LoginLogs'
import NotFound from './pages/NotFound'

// Scroll to top on route change
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

function App() {

  return (
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        {/* Public routes without layout */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected routes with layout */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout><Profile /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout><Settings /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/change-password" element={
          <ProtectedRoute>
            <Layout><ChangePassword /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/login-logs" element={
          <ProtectedRoute>
            <Layout><LoginLogs /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/my-tasks" element={
          <ProtectedRoute>
            <Layout><MyTasks /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/my-tasks/:taskExecutionId" element={
          <ProtectedRoute>
            <Layout><TaskExecutionDetail /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/my-tasks/:taskExecutionId/checklist/:checklistExecutionId" element={
          <ProtectedRoute>
            <Layout><ChecklistExecutionDetail /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/team-tasks" element={
          <ProtectedRoute>
            <Layout><TeamTasks /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/team-tasks/:taskExecutionId" element={
          <ProtectedRoute>
            <Layout><TaskExecutionDetail readOnly={true} /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/team-tasks/:taskExecutionId/checklist/:checklistExecutionId" element={
          <ProtectedRoute>
            <Layout><ChecklistExecutionDetail readOnly={true} /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/survey" element={
          <ProtectedRoute>
            <Layout><SurveyList /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/survey/:dailySurveyId" element={
          <ProtectedRoute>
            <Layout><SurveyEntryPage /></Layout>
          </ProtectedRoute>
        } />

        {/* Ticket routes */}
        <Route path="/tickets" element={
          <ProtectedRoute>
            <Layout><TicketList /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/tickets/create" element={
          <ProtectedRoute>
            <Layout><CreateTicket /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/tickets/:id" element={
          <ProtectedRoute>
            <Layout><TicketDetail /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/tickets/:id/edit" element={
          <ProtectedRoute>
            <Layout><EditTicket /></Layout>
          </ProtectedRoute>
        } />

        {/* 404 - Catch all unmatched routes */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            // background: 'hsl(var(--card))',
            // color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
            style: {
              border: '1px solid rgba(74, 222, 128, 0.3)',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
            style: {
              border: '1px solid rgba(239, 68, 68, 0.3)',
            },
          },
        }}
      />
    </AuthProvider>
  )
}

export default App