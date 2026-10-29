import React from 'react'

export interface OnTimeDelayedItem {
  storeId: number
  /** Store (branch) name. */
  label: string
  /** Secondary line — store code • city. */
  subLabel?: string
  onTime: number
  delayed: number
  /** Measurable completions (onTime + delayed). */
  measured: number
  /** On-time share of `measured` (0 when nothing was measurable). */
  onTimePercent: number
}

interface OnTimeDelayedByStoreProps {
  items: OnTimeDelayedItem[]
  /** Called with the clicked store id (drill-down). */
  onSelect?: (storeId: number) => void
}

/**
 * OnTimeDelayedByStore — store-wise (branchwise) on-time vs delayed split.
 *
 * Each row shows one mapped store with a green/red bar for the share of
 * completions that landed inside vs after the scheduled window. Mapped stores
 * with nothing measurable are still listed (as "—") so a silent branch is
 * visible instead of simply being absent from the report.
 */
const OnTimeDelayedByStore: React.FC<OnTimeDelayedByStoreProps> = ({ items, onSelect }) => {
  if (items.length === 0) return null

  return (
    <div>
      <div className="mb-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          On time
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          Delayed
        </span>
      </div>

      <div className="max-h-[420px] overflow-y-auto pr-1">
        <ul className="space-y-2">
          {items.map(item => (
            <li key={item.storeId}>
              <button
                type="button"
                onClick={() => onSelect?.(item.storeId)}
                disabled={!onSelect}
                className="w-full rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:border-border hover:bg-muted disabled:cursor-default disabled:hover:border-transparent disabled:hover:bg-transparent"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                    {item.subLabel ? (
                      <p className="truncate text-xs text-muted-foreground">{item.subLabel}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {item.measured > 0 ? `${item.onTimePercent}%` : '—'}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">on time</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.onTime} on time • {item.delayed} delayed
                    </p>
                  </div>
                </div>

                <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-muted">
                  {item.measured > 0 ? (
                    <>
                      <div
                        className="h-2 bg-green-500"
                        style={{ width: `${(item.onTime / item.measured) * 100}%` }}
                      />
                      <div
                        className="h-2 bg-red-500"
                        style={{ width: `${(item.delayed / item.measured) * 100}%` }}
                      />
                    </>
                  ) : (
                    <div className="h-2 w-full bg-muted-foreground/30" />
                  )}
                </div>

                {item.measured === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    No completed items with a scheduled window in this range
                  </p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default OnTimeDelayedByStore