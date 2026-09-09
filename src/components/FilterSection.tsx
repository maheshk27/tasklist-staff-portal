import React from 'react'
import { Filter } from 'lucide-react'

export interface FilterSectionProps {
    title?: React.ReactNode
    hasActiveFilters?: boolean
    actions?: React.ReactNode
}

/**
 * FilterSection — collapsible-free search/filter card header used on list pages.
 * Mirrors admin-portal's FilterSection so management & staff portals stay
 * visually consistent.
 *
 * Usage:
 *   <FilterSection
 *     title="Search Filters"
 *     hasActiveFilters={hasActiveFilters}
 *     actions={<button ...>Reset</button>}
 *   />
 */
export const FilterSection: React.FC<FilterSectionProps> = ({
    title = "Search Filters",
    hasActiveFilters = false,
    actions,
}) => {
    return (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
            <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Filter className="h-4 w-4" />
                </span>
                <h2 className="text-base font-semibold">{title}</h2>
                {hasActiveFilters && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Active
                    </span>
                )}
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
        </div>
    )
}

export default FilterSection