/** Badge color helper for a checklist/task priority. */
export const getPriorityColor = (priority?: string): string => {
  switch (priority) {
    case 'CRITICAL': return 'bg-red-100 text-red-700'
    case 'HIGH': return 'bg-orange-100 text-orange-700'
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-700'
    case 'LOW': return 'bg-green-100 text-green-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}