import { useEffect, type RefObject } from 'react'

export function useViewportCulling(viewportRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement
          element.dataset.culled = entry.isIntersecting ? 'false' : 'true'
        }
      },
      {
        root: viewport,
        rootMargin: '70%',
      },
    )

    const objects = viewport.querySelectorAll<HTMLElement>('[data-space-object="true"]')
    objects.forEach((object) => observer.observe(object))

    return () => observer.disconnect()
  }, [viewportRef])
}
