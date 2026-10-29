/**
 * Utility helpers for downloading files served by the upload host.
 *
 * Evidence files live on a separate host (see `VITE_FILE_UPLOAD_BASE_URL`), so
 * they are cross-origin to the portal. Browsers ignore the anchor `download`
 * attribute for cross-origin URLs, which means a plain link would open/preview
 * the file instead of saving it. Fetching the file as a blob first lets the
 * browser save it under its original file name.
 */

/**
 * Derive a file name from a URL when the server did not provide one
 * @param url - Absolute or relative file URL
 * @returns The last path segment of the URL (e.g. "1640995200000_abc.pdf")
 */
function fileNameFromUrl(url: string): string {
  const withoutQuery = url.split('?')[0].split('#')[0]
  const lastSegment = withoutQuery.substring(withoutQuery.lastIndexOf('/') + 1)
  return decodeURIComponent(lastSegment) || 'download'
}

/**
 * Click a temporary anchor so the browser saves the given URL as `fileName`
 * @param url - URL (or blob URL) of the file to save
 * @param fileName - Name to save the file as
 * @param openInNewTab - Fallback mode: open the file instead of saving it
 */
function triggerAnchorDownload(url: string, fileName: string, openInNewTab = false): void {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  if (openInNewTab) {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  }
  document.body.appendChild(link)
  link.click()
  link.remove()
}

/**
 * Download a file from the upload host.
 *
 * The file is fetched as a blob so the browser saves it with its original file
 * name instead of navigating to it. If the host does not allow the fetch (no
 * CORS headers), the file is opened in a new tab as a fallback so the user can
 * still save it from the browser's file viewer.
 *
 * @param url - Absolute URL of the file to download
 * @param fileName - Preferred name to save the file as
 */
export async function downloadFile(url: string, fileName?: string): Promise<void> {
  const resolvedName = fileName?.trim() || fileNameFromUrl(url)

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download file (status ${response.status})`)
    }

    const blobUrl = URL.createObjectURL(await response.blob())
    triggerAnchorDownload(blobUrl, resolvedName)
    // Release the blob once the browser has had time to start the download
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  } catch {
    // Cross-origin file hosts may block the blob fetch; fall back to opening
    // the file so the user can still download it from the viewer.
    triggerAnchorDownload(url, resolvedName, true)
  }
}
