import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

export function HomePage() {
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
        Tecnología que te impulsa
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Laptops, componentes y accesorios con envío a todo el Perú.
      </p>
      <Button asChild size="lg">
        <Link to="/products">Ver catálogo</Link>
      </Button>
    </section>
  )
}
