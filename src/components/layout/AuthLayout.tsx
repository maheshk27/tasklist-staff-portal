import React from 'react'
import { Store, ClipboardCheck, ShieldCheck, BarChart3, Sun, Moon } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

interface AuthLayoutProps {
  children: React.ReactNode
}

const features = [
  { icon: Store, title: 'Multi-Store Operations', desc: 'Manage every RK Bazar outlet from one control center' },
  { icon: ClipboardCheck, title: 'Task & Checklist Compliance', desc: 'Executions, daily surveys and checklists tracked end-to-end' },
  { icon: BarChart3, title: 'Reports & Accountability', desc: 'Real-time analytics and audit-ready records across teams' },
  { icon: ShieldCheck, title: 'Role-Based Access', desc: 'Granular, secure permissions for every level of staff' }
]

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ================= Brand showcase panel (desktop) ================= */}
      <aside className="auth-brand-bg relative hidden lg:flex flex-col justify-between overflow-hidden p-12 lg:p-16 text-white">
        {/* Decorative glows */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-1/3 -left-40 w-96 h-96 rounded-full bg-black/10 blur-3xl" />

        {/* Top: logo */}
        <div className="relative animate-auth-fade-up">
          <div className="inline-flex items-center rounded-2xl bg-white px-5 py-3 shadow-xl shadow-black/25 ring-1 ring-white/50">
            <img src="/rk-logo.png" alt="RK Bazar" className="h-12 w-auto" />
          </div>
        </div>

        {/* Middle: headline + features */}
        <div className="relative max-w-xl">
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.1] mb-5 animate-auth-fade-up">
            Task & Workflow Management
            <span className="block mt-2 text-white/90 font-medium text-xl xl:text-2xl">
              for every RK Bazar store
            </span>
          </h1>
          <p className="text-white/80 text-base xl:text-lg mb-10 leading-relaxed animate-auth-fade-up-d1">
            Centralize store operations, enforce accountability and drive
            efficiency across all departments with one enterprise-grade platform.
          </p>

          <ul className="space-y-5 animate-auth-fade-up-d2">
            {features.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="shrink-0 w-10 h-10 rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-sm text-white/70">{desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ================= Auth form panel ================= */}
      <main className="auth-page-bg relative flex min-h-screen items-center justify-center text-foreground p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="flex items-center justify-between mb-8 lg:hidden">
            <img src="/rk-logo.png" alt="RK Bazar" className="h-12 w-auto" />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-card border border-border hover:bg-accent transition-colors"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>

          {/* Card */}
          <div className="relative animate-auth-fade-up">
            {/* Desktop theme toggle */}
            <div className="hidden lg:flex justify-end">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border transition-all"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {theme === 'light' ? 'Dark mode' : 'Light mode'}
              </button>
            </div>

            <div className="bg-card border border-border rounded-2xl p-8 sm:p-10 shadow-xl shadow-primary/5 mt-3">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AuthLayout