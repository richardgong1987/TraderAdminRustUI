import type { ExampleImage } from '@/api/ai'

// Gemma's vision encoder works at a lower resolution anyway; this keeps requests and DB rows small.
const MAX_SIDE = 1600

/** Image files in a paste or drop event, ignoring text. */
export function imageFiles(data: DataTransfer | null): File[] {
  if (!data) return []
  return Array.from(data.files).filter((f) => f.type.startsWith('image/'))
}

/** Re-encodes as PNG (lossless, keeps chart lines sharp, and a format Ollama accepts), scaled down if large. */
export async function toExampleImage(file: File): Promise<ExampleImage> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/png')
    return { mime_type: 'image/png', data_base64: dataUrl.slice(dataUrl.indexOf(',') + 1) }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function toDataUrl(image: ExampleImage): string {
  return `data:${image.mime_type};base64,${image.data_base64}`
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
