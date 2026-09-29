import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { toast } from 'react-hot-toast'
import PageHeader from '../components/PageHeader'
import ChartCard, { ChartStatePanel } from '../components/charts/ChartCard'
import CompletionTrendChart from '../components/charts/CompletionTrendChart'
import StatusDonutChart from '../components/charts/StatusDonutChart'
import StatusStackedBars from '../components/charts/StatusStackedBars'
import StoreRankingBars from '../components/charts/StoreRankingBars'
import OnTimeDelayedByStore from '../components/charts/OnTimeDelayedByStore'
import Heatmap from '../components/charts/Heatmap'
import { useChartTheme } from '../components/charts/chartTheme'
import { prettyStatus } from '../utils/dashboard-overview'
import {
  useChecklistAnalytics,
  useSurveyAnalytics,
  useTaskExecutionAnalytics,
  ANALYTICS_RANGES,
  type AnalyticsRange,
  type AnalyticsState,
} from '../hooks/useAnalyticsData'

/**
 * Reports & Analytics — chart dashboard for the logged-in user's mapped stores.
 *
 * Every chart is built from data scoped to the user's store mapping (never the
 * whole store list), and idle mapped stores are rendered explicitly as 0% so a
 * silent store is visible rather than missing.
 */
/** Sentinel metric for the default completion-% heatmap. */
const HEAT_COMPLETION = '__completion__'

const ReportsAnalytics: React.FC = () => {
  const navigate = useNavigate()
  const theme = useChartTheme()
  const [days, setDays] = useState<AnalyticsRange>(7)
  /** Heatmap metric: completion % (default) or one status' daily counts. */
  const [heatMetric, setHeatMetric] = useState<string>(HEAT_COMPLETION)

  const checklist = useChecklistAnalytics(days)
  const survey = useSurveyAnalytics(days)
  const tasks = useTaskExecutionAnalytics(days)

  const isRefreshing = checklist.isLoading || survey.isLoading || tasks.isLoading

  const handleRefresh = () => {
    checklist.refetch()
    survey.refetch()
    tasks.refetch()
    toast.success('Refreshing analytics…', { duration: 1500 })
  }

  /** Resolve the right placeholder (or the chart) for a hook state. */
  const chartBody = <T,>(
    state: AnalyticsState<T>,
    hasData: boolean,
    emptyMessage: string,
    render: () => React.ReactNode,
  ): React.ReactNode => {
    if (state.error) return <ChartStatePanel variant="error" message={state.error} />
    if (state.isLoading) return <ChartStatePanel variant="loading" />
    if (state.noMappedStores) return <ChartStatePanel variant="no-stores" />
    if (!hasData) return <ChartStatePanel variant="empty" message={emptyMessage} />
    return render()
  }

  // ── Heatmap metric picker ──────────────────────────────────────────────────
  const heatStatuses = checklist.data?.statuses ?? []
  // The choice sticks across ranges, but falls back to completion % when the
  // picked status has no data in the current range.
  const activeHeat =
    heatMetric === HEAT_COMPLETION || heatStatuses.includes(heatMetric) ? heatMetric : HEAT_COMPLETION
  const isCompletionHeat = activeHeat === HEAT_COMPLETION
  const heatStatusLabel = isCompletionHeat ? null : prettyStatus(activeHeat)
  const heatChipClass = (active: boolean): string =>
    `inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
    }`

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Trends and breakdowns for the stores mapped to you."
        actions={
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {/* Range presets */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <p className="text-xs text-muted-foreground">
          Reporting on {checklist.stores.length} mapped store{checklist.stores.length === 1 ? '' : 's'} • idle
          stores are shown as 0%
        </p>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {ANALYTICS_RANGES.map(range => (
            <button
              key={range}
              type="button"
              onClick={() => setDays(range)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                days === range
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Last {range} days
            </button>
          ))}
        </div>
      </div>

      {/* ================= Checklist completion ================= */}
      <div className="mb-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Checklist Completion
        </h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Completion Trend" subtitle={`Daily completion % • last ${days} days`}>
            {chartBody(checklist, (checklist.data?.trend.length ?? 0) > 0, 'No checklist executions in this range.', () => (
              <CompletionTrendChart points={checklist.data!.trend} />
            ))}
          </ChartCard>

          <ChartCard title="Status Mix Over Time" subtitle="Status-wise execution counts per day">
            {chartBody(checklist, (checklist.data?.statuses.length ?? 0) > 0, 'No status data in this range.', () => (
              <StatusStackedBars
                groups={checklist.data!.statusByDay}
                statuses={checklist.data!.statuses}
                onSelect={() => navigate('/store-wise-checklist-status')}
              />
            ))}
          </ChartCard>
        </div>

        <ChartCard
          title="Store Ranking"
          subtitle="Completion % per store across the range (tap a bar to open the report)"
          actions={
            <span className="text-xs text-muted-foreground">
              Range total: {checklist.data?.totals.completionPercent ?? 0}% ({checklist.data?.totals.completed ?? 0}/
              {checklist.data?.totals.total ?? 0})
            </span>
          }
        >
          {chartBody(checklist, (checklist.data?.ranking.length ?? 0) > 0, 'No stores to rank yet.', () => (
            <StoreRankingBars
              items={checklist.data!.ranking}
              height={Math.max(220, checklist.data!.ranking.length * 34)}
              onSelect={() => navigate('/store-date-wise-checklist-completion')}
            />
          ))}
        </ChartCard>

        <ChartCard
          title={heatStatusLabel ? `${heatStatusLabel} Heatmap` : 'Completion Heatmap'}
          subtitle={
            heatStatusLabel
              ? `Store × day ${heatStatusLabel.toLowerCase()} count (darker = more)`
              : 'Store × day completion % (darker = better)'
          }
        >
          {chartBody(checklist, (checklist.data?.heatRows.length ?? 0) > 0, 'No heatmap data in this range.', () => {
            const data = checklist.data!
            const statusRows = isCompletionHeat ? null : data.heatByStatus[activeHeat]
            return (
              <>
                {/* Metric picker: completion % (default) or a single status. */}
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHeatMetric(HEAT_COMPLETION)}
                    className={heatChipClass(isCompletionHeat)}
                  >
                    Completion %
                  </button>
                  {heatStatuses.map((status, index) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setHeatMetric(status)}
                      className={heatChipClass(activeHeat === status)}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: theme.statusColor(status, index) }}
                      />
                      {prettyStatus(status)}
                    </button>
                  ))}
                </div>
                <Heatmap
                  columns={data.heatColumns}
                  rows={statusRows ?? data.heatRows}
                  accentColor={
                    statusRows ? theme.statusColor(activeHeat, heatStatuses.indexOf(activeHeat)) : undefined
                  }
                  onSelect={() => navigate('/store-date-wise-checklist-completion')}
                />
              </>
            )
          })}
        </ChartCard>
      </div>

      {/* ================= Survey completion ================= */}
      <div className="mb-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Survey Completion
        </h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Survey Completion Trend" subtitle={`Daily survey item completion % • last ${days} days`}>
            {chartBody(survey, (survey.data?.trend.length ?? 0) > 0, 'No survey executions in this range.', () => (
              <CompletionTrendChart points={survey.data!.trend} />
            ))}
          </ChartCard>

          <ChartCard title="Survey Status Mix" subtitle="Survey statuses recorded per day">
            {chartBody(survey, (survey.data?.statuses.length ?? 0) > 0, 'No survey status data in this range.', () => (
              <StatusStackedBars
                groups={survey.data!.statusByDay}
                statuses={survey.data!.statuses}
                onSelect={() => navigate('/store-survey-date-wise-completion')}
              />
            ))}
          </ChartCard>
        </div>

        <ChartCard
          title="Survey Completion by Store"
          subtitle="Item completion % per store across the range (tap to open the report)"
          actions={
            <span className="text-xs text-muted-foreground">
              Range total: {survey.data?.totals.completionPercent ?? 0}% (
              {survey.data?.totals.completedItems ?? 0}/{survey.data?.totals.totalItems ?? 0} items)
            </span>
          }
        >
          {chartBody(survey, (survey.data?.ranking.length ?? 0) > 0, 'No stores to rank yet.', () => (
            <StoreRankingBars
              items={survey.data!.ranking}
              height={Math.max(220, survey.data!.ranking.length * 34)}
              onSelect={() => navigate('/store-survey-date-wise-completion')}
            />
          ))}
        </ChartCard>
      </div>

      {/* ================= Task execution health ================= */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Task Execution Health
        </h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title="Checklist Status Distribution"
            subtitle="All checklist executions in the range"
            actions={
              <span className="text-xs text-muted-foreground">
                {tasks.data?.totals.overdue ?? 0} overdue
              </span>
            }
          >
            {chartBody(tasks, (tasks.data?.statusDonut.length ?? 0) > 0, 'No checklist executions in this range.', () => (
              <StatusDonutChart
                slices={tasks.data!.statusDonut}
                centerLabel="Checklists"
                onSelect={() => navigate('/store-wise-checklist-status')}
              />
            ))}
          </ChartCard>

          <ChartCard title="Execution Trend" subtitle="Daily checklist completion % from execution rows">
            {chartBody(tasks, (tasks.data?.trend.length ?? 0) > 0, 'No executions in this range.', () => (
              <CompletionTrendChart points={tasks.data!.trend} />
            ))}
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* On-time vs delayed summary + store-wise breakdown (one chartBody) */}
          <ChartCard
            title="On-Time vs Delayed"
            subtitle="Completed within the scheduled window vs after it — overall and per store"
          >
            {chartBody(tasks, (tasks.data?.onTime ?? 0) + (tasks.data?.delayed ?? 0) > 0, 'Nothing completed with a scheduled window in this range yet.', () => {
              const onTime = tasks.data!.onTime
              const delayed = tasks.data!.delayed
              const total = onTime + delayed
              return (
                <>
                  <div className="space-y-5 py-2">
                    <div className="flex items-end justify-center gap-2">
                      <span className="text-4xl font-bold text-foreground">{tasks.data!.onTimePercent}%</span>
                      <span className="pb-1 text-sm text-muted-foreground">on time</span>
                    </div>
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-3 bg-green-500" style={{ width: `${(onTime / total) * 100}%` }} />
                      <div className="h-3 bg-red-500" style={{ width: `${(delayed / total) * 100}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wider text-green-700">On Time</p>
                        <p className="mt-1 text-xl font-bold text-green-700">{onTime}</p>
                      </div>
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wider text-red-700">Delayed</p>
                        <p className="mt-1 text-xl font-bold text-red-700">{delayed}</p>
                      </div>
                    </div>
                    <p className="text-center text-xs text-muted-foreground">
                      {tasks.data!.totals.tasks} task executions • {tasks.data!.totals.checklists} checklist executions
                    </p>
                  </div>

                  {/* Store-wise (branchwise) breakdown */}
                  <div className="mt-5 border-t border-border pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      By store
                    </p>
                    <OnTimeDelayedByStore
                      items={tasks.data!.onTimeByStore}
                      onSelect={() => navigate('/store-wise-checklist-status')}
                    />
                  </div>
                </>
              )
            })}
          </ChartCard>

          {/* Team leaderboard */}
          <ChartCard
            title="Team Completion"
            subtitle="Users ranked by checklist completion % (tap to open the report)"
          >
            {chartBody(tasks, (tasks.data?.leaderboard.length ?? 0) > 0, 'No user activity in this range.', () => (
              <div className="max-h-[720px] overflow-y-auto pr-1">
                <StoreRankingBars
                  items={tasks.data!.leaderboard}
                  height={Math.max(220, tasks.data!.leaderboard.length * 34)}
                  onSelect={() => navigate('/store-wise-checklist-status')}
                />
              </div>
            ))}
          </ChartCard>
        </div>

        {/* Overdue by store (only when there is something overdue) */}
        {(tasks.data?.overdueByStore.length ?? 0) > 0 && (
          <ChartCard
            title="Overdue by Store"
            subtitle="Checklist executions currently overdue, per store"
          >
            <StoreRankingBars
              items={tasks.data!.overdueByStore}
              unit="count"
              height={Math.max(200, tasks.data!.overdueByStore.length * 34)}
            />
          </ChartCard>
        )}
      </div>
    </>
  )
}

export default ReportsAnalytics