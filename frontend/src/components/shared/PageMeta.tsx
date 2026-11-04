import { toAbsoluteUrl } from '@/lib/seo/seo'

/**
 * Document metadata for a public page. React 19 hoists these elements into <head>.
 * The canonical URL uses the current origin, so it matches whatever host serves the store.
 */
interface PageMetaProps {
  title: string
  description: string
  /** Path + query of the canonical URL (e.g. "/products?category=mouse"). */
  canonicalPath: string
  /** Pages that must not be indexed (search results, filter combinations, 404). */
  noindex?: boolean
  type?: 'website' | 'product'
  imageUrl?: string
}

export function PageMeta({
  title,
  description,
  canonicalPath,
  noindex = false,
  type = 'website',
  imageUrl,
}: PageMetaProps) {
  const canonicalUrl = toAbsoluteUrl(canonicalPath)

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Nexora" />
      <meta property="og:locale" content="es_PE" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      {imageUrl && <meta property="og:image" content={toAbsoluteUrl(imageUrl)} />}
      <meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
    </>
  )
}
