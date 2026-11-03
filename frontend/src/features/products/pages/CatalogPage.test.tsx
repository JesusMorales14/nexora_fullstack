import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { pageOf, productSummariesFixture } from '@/test/msw/catalogFixtures'
import { apiUrl, server } from '@/test/msw/server'
import { renderRoute } from '@/test/renderRoute'

describe('CatalogPage', () => {
  it('lists products with price, compare-at price and availability', async () => {
    renderRoute('/products')

    const productsRegion = await screen.findByRole('region', { name: 'Productos' })
    const firstCard = (await within(productsRegion).findAllByRole('article'))[0]
    if (!firstCard) throw new Error('Expected at least one product card')

    expect(within(firstCard).getByRole('link', { name: 'Logitech MX Master 3S' })).toHaveAttribute(
      'href',
      '/products/logitech-mx-master-3s',
    )
    expect(within(firstCard).getByText(/449\.00/)).toBeInTheDocument()
    expect(within(firstCard).getByText('Precio anterior:')).toBeInTheDocument()
    expect(within(firstCard).getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByText('Agotado')).toBeInTheDocument()
    expect(screen.getByText('2 productos')).toBeInTheDocument()
  })

  it('sends the selected filters to the API and keeps them in the URL', async () => {
    const requestedUrls: URL[] = []
    server.use(
      http.get(apiUrl('products'), ({ request }) => {
        requestedUrls.push(new URL(request.url))
        return HttpResponse.json(pageOf(productSummariesFixture))
      }),
    )
    const user = userEvent.setup()
    const { router } = renderRoute('/products?page=2')

    await screen.findAllByRole('article')
    await user.selectOptions(await screen.findByLabelText('Marca'), 'logitech')
    await user.click(screen.getByLabelText('Solo productos disponibles'))

    await screen.findAllByRole('article')
    const lastRequest = requestedUrls.at(-1)
    expect(lastRequest?.searchParams.get('brand')).toBe('logitech')
    expect(lastRequest?.searchParams.get('inStock')).toBe('true')
    // Changing a filter goes back to the first page.
    expect(lastRequest?.searchParams.get('page')).toBe('1')
    expect(router.state.location.search).toBe('?brand=logitech&inStock=true')
  })

  it('shows an empty state when nothing matches', async () => {
    server.use(http.get(apiUrl('products'), () => HttpResponse.json(pageOf([]))))

    renderRoute('/products?q=zzz')

    expect(await screen.findByText('No encontramos productos')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Resultados para “zzz”')
  })

  it('shows a recoverable error and retries on demand', async () => {
    let attempts = 0
    server.use(
      http.get(apiUrl('products'), () => {
        attempts += 1
        return attempts === 1
          ? HttpResponse.json({ title: 'Server error' }, { status: 500 })
          : HttpResponse.json(pageOf(productSummariesFixture))
      }),
    )
    const user = userEvent.setup()
    renderRoute('/products')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('problema en el servidor')

    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('link', { name: 'Logitech MX Master 3S' })).toBeInTheDocument()
  })
})
