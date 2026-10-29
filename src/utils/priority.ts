/** Badge color helper for a checklist/task priority. */
export const getPriorityColor = (priority?: string): string => {
  switch (priority) {
    case 'CRITICAL': return 'bg-red-700 text-red-100'
    case 'HIGH': return 'bg-orange-700 text-orange-100'
    case 'MEDIUM': return 'bg-yellow-700 text-yellow-100'
    case 'LOW': return 'bg-green-700 text-green-100'
    default: return 'bg-gray-700 text-gray-100'
  }
}