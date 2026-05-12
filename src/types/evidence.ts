export interface EvidenceResponseDto {
  taskEvidenceId: number
  taskExecutionId: number
  taskChecklistExecutionId?: number
  evidenceUrl: string
  fileName?: string
  mimeType?: string
  notes?: string
  uploadedAt: string
  createdAt: string
  updatedAt: string
}

export function getEvidenceFileIcon(mimeType?: string): string {
  if (!mimeType) return '📄'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎬'
  if (mimeType.includes('pdf')) return '📕'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('sheet')) return '📊'
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text')) return '📄'
  return '📎'
}

export function isImageFile(mimeType?: string): boolean {
  return !!mimeType?.startsWith('image/')
}