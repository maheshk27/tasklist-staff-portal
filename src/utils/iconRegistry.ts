import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Ticket,
  BarChart3,
  TrendingUp,
  ListChecks,
  ClipboardList,
  User,
  Settings,
  Lock,
  Eye,
  ClipboardCopy,
  Inbox,
  Building2,
  Shield,
  Network,
  Store,
  Users,
  ClipboardCheck,
  Tags,
  Zap,
  List,
  FileSearch,
  Bell,
  Smartphone,
  Circle,
  type LucideIcon,
} from 'lucide-react'

/**
 * Maps the icon name stored on `mst_menus.icon` to a Lucide component for the
 * staff portal sidebar. Add entries here when new icons are introduced.
 */
export const iconRegistry: Record<string, LucideIcon> = {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Ticket,
  BarChart3,
  TrendingUp,
  ListChecks,
  ClipboardList,
  User,
  Settings,
  Lock,
  Eye,
  ClipboardCopy,
  Inbox,
  Building2,
  Shield,
  Network,
  Store,
  Users,
  ClipboardCheck,
  Tags,
  Zap,
  List,
  FileSearch,
  Bell,
  Smartphone,
}

/** Resolve a stored icon name to a Lucide component with a neutral fallback. */
export const getMenuIcon = (name?: string | null): LucideIcon => {
  if (name && iconRegistry[name]) {
    return iconRegistry[name]
  }
  return Circle
}
