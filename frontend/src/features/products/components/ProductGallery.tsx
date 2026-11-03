import { useState } from 'react'

import type { ProductImage } from '@/features/products/types'
import { cn } from '@/lib/utils/cn'

interface ProductGalleryProps {
  images: ProductImage[]
}

export function ProductGallery({ images }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedImage = images[selectedIndex] ?? images[0]

  if (!selectedImage) {
    return <div className="aspect-square rounded-xl bg-muted" />
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square overflow-hidden rounded-xl border bg-muted">
        <img
          src={selectedImage.url}
          alt={selectedImage.altText}
          width={selectedImage.width}
          height={selectedImage.height}
          // The main product image is the LCP element of this page.
          fetchPriority="high"
          className="size-full object-cover"
        />
      </div>

      {images.length > 1 && (
        <ul className="flex gap-2" aria-label="Imágenes del producto">
          {images.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                aria-label={`Ver imagen ${String(index + 1)} de ${String(images.length)}`}
                aria-pressed={index === selectedIndex}
                onClick={() => {
                  setSelectedIndex(index)
                }}
                className={cn(
                  'size-16 overflow-hidden rounded-lg border-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  index === selectedIndex ? 'border-primary' : 'border-transparent',
                )}
              >
                <img
                  src={image.url}
                  alt=""
                  width={image.width}
                  height={image.height}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
