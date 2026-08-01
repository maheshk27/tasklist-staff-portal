/**
 * Client-side image compression for evidence uploads.
 *
 * Rear-camera photos on store devices are 5-7MB, which exceeded the server's
 * upload limit and failed outright. Evidence photos never need full sensor
 * resolution, so downscale and re-encode before uploading: a 6MB capture
 * becomes roughly 300-600KB, which also makes uploads survive a weak 4G
 * uplink.
 *
 * Compression is best-effort — if anything fails (unsupported format, decode
 * error, oversized bitmap) the original file is returned unchanged and the
 * server-side limit remains the backstop.
 */

/** Longest edge of the output image, in pixels. */
const MAX_DIMENSION = 1920

/** JPEG quality for the re-encoded image. */
const JPEG_QUALITY = 0.8

/** Files at or below this size are uploaded untouched. */
const SKIP_COMPRESSION_BELOW_BYTES = 1024 * 1024

function isCompressibleImage(file: File): boolean {
  // HEIC/HEIF cannot be decoded by canvas in most browsers — leave them alone.
  return /^image\/(jpeg|png|webp)$/.test(file.type)
}

/** Swap the extension so it matches the re-encoded JPEG payload. */
function toJpegFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, '') + '.jpg'
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap applies the EXIF orientation, which keeps photos taken
  // in portrait from being uploaded sideways.
  if (typeof createImageBitmap === 'function') {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  }

  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Image could not be decoded'))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Downscale and re-encode an image file. Returns the original file unchanged
 * when compression is not applicable or does not help.
 */
export async function compressImage(file: File): Promise<File> {
  if (!isCompressibleImage(file) || file.size <= SKIP_COMPRESSION_BELOW_BYTES) {
    return file
  }

  try {
    const source = await decode(file)
    const width = source.width
    const height = source.height

    if (!width || !height) {
      return file
    }

    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))
    const targetWidth = Math.round(width * scale)
    const targetHeight = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return file
    }
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight)

    if ('close' in source && typeof source.close === 'function') {
      source.close()
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    })

    // Re-encoding can enlarge an already well-compressed image — keep whichever
    // is smaller so we never make the upload worse.
    if (!blob || blob.size >= file.size) {
      return file
    }

    return new File([blob], toJpegFilename(file.name), {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    })
  } catch {
    // Best-effort: fall back to the original file.
    return file
  }
}
