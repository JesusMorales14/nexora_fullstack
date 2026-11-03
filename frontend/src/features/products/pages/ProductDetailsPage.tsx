import { useParams } from 'react-router'

export function ProductDetailsPage() {
  const { slug } = useParams()

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Producto {slug}</h1>
    </section>
  )
}
