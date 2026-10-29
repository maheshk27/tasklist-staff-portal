import React from 'react'

/**
 * PageHeader — shared page title/description + optional right-side actions.
 *
 * Handles the two header layouts used across the portal:
 *  - `default`     : inline row (title left, actions right) — the classic
 *                    management pages (Roles, Departments, Users, Reports...).
 *  - `responsive`  : stacks vertically on mobile and becomes a single row on
 *                    lg screens — the task/ticket style headers.
 *
 * Usage:
 *   <PageHeader
 *     title="Role Management"
 *     subtitle="Manage user roles and permissions"
 *     actions={<ActionButton action="add" layout="grid" onClick={...} />}
 *   />
 */
export interface PageHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Right-side actions (e.g. ActionButton, layout toggles, Links). */
  actions?: React.ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  className = '',
}) => {
  return (
    <div className={`flex flex-wrap justify-between items-center gap-4 mb-8 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className=" text-md text-muted-foreground sm:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  )
}

export default PageHeader