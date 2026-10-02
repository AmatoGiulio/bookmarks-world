type ImageRecord = {
  image: HTMLImageElement
  ready: boolean
  failed: boolean
}

export function createImageCache(invalidate: () => void) {
  const records = new Map<string, ImageRecord>()

  return {
    get(src: string) {
      const cached = records.get(src)
      if (cached) {
        return cached.ready ? cached.image : null
      }

      const image = new Image()
      const record: ImageRecord = {
        image,
        ready: false,
        failed: false,
      }

      records.set(src, record)
      image.decoding = 'async'
      image.onload = () => {
        record.ready = true
        invalidate()
      }
      image.onerror = () => {
        record.failed = true
        invalidate()
      }
      image.src = src

      return null
    },
  }
}
