import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  adminBrandsFixture,
  adminCategoriesFixture,
  adminProductFixture,
  BRAND_ID,
  CATEGORY_ID,
  PRODUCT_ID,
} from '@/test/msw/adminFixtures'
import { adminFixture, problem, signedInAs } from '@/test/msw/authFixtures'
import { apiUrl, server } from '@/test/msw/server'
import { renderRoute } from '@/test/renderRoute'

beforeEach(() => {
  server.use(
    signedInAs(adminFixture),
    http.get(apiUrl('admin/categories'), () => HttpResponse.json(adminCategoriesFixture)),
    http.get(apiUrl('admin/brands'), () => HttpResponse.json(adminBrandsFixture)),
  )
})

describe('AdminProductEditorPage', () => {
  it('creates a product with an automatic slug and opens it for editing', async () => {
    let body: unknown
    server.use(
      http.post(apiUrl('admin/products'), async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(adminProductFixture(), { status: 201 })
      }),
      http.get(apiUrl(`admin/products/${PRODUCT_ID}`), () =>
        HttpResponse.json(adminProductFixture()),
      ),
    )
    const user = userEvent.setup()
    const { router } = renderRoute('/admin/products/new')

    await user.type(await screen.findByLabelText('Nombre'), 'Laptop Pro 14" Edición Perú')
    expect(screen.getByLabelText('Slug (URL)')).toHaveValue('laptop-pro-14-edicion-peru')
    await user.type(screen.getByLabelText('Descripción'), 'Laptop de prueba.')
    await user.selectOptions(screen.getByLabelText('Categoría'), CATEGORY_ID)
    await user.selectOptions(screen.getByLabelText('Marca'), BRAND_ID)
    await user.type(screen.getByLabelText('SKU'), 'LAP-PRO-14')
    await user.type(screen.getByLabelText('Nombre de la variante'), '16 GB')
    await user.type(screen.getByLabelText('Precio (S/, con IGV)'), '3999.90')
    await user.clear(screen.getByLabelText('Stock inicial'))
    await user.type(screen.getByLabelText('Stock inicial'), '5')
    await user.type(screen.getByLabelText('Texto alternativo'), 'Laptop vista de frente')
    await user.click(screen.getByRole('button', { name: 'Crear producto' }))

    await screen.findByRole('heading', { level: 2, name: 'Variantes' })
    expect(router.state.location.pathname).toBe(`/admin/products/${PRODUCT_ID}`)
    expect(body).toMatchObject({
      slug: 'laptop-pro-14-edicion-peru',
      isPublished: false,
      variant: { sku: 'LAP-PRO-14', price: 3999.9, compareAtPrice: null, initialStock: 5 },
      image: { altText: 'Laptop vista de frente' },
    })
  })

  it('explains a stale-version conflict and offers to reload', async () => {
    server.use(
      http.get(apiUrl(`admin/products/${PRODUCT_ID}`), () =>
        HttpResponse.json(adminProductFixture()),
      ),
      http.put(apiUrl(`admin/products/${PRODUCT_ID}`), () =>
        problem(409, {
          title: 'Conflict',
          detail:
            'Otro administrador modificó este producto. Recarga la página para ver los cambios.',
        }),
      ),
    )
    const user = userEvent.setup()
    renderRoute(`/admin/products/${PRODUCT_ID}`)

    await user.click(await screen.findByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Otro administrador modificó')
    expect(screen.getByRole('button', { name: 'Recargar datos' })).toBeInTheDocument()
  })

  it('shows variants with their stock breakdown', async () => {
    server.use(
      http.get(apiUrl(`admin/products/${PRODUCT_ID}`), () =>
        HttpResponse.json(adminProductFixture()),
      ),
    )

    renderRoute(`/admin/products/${PRODUCT_ID}`)

    expect(await screen.findByText('5 en almacén · 1 reservadas')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Editar la variante LAP-PRO-14' }),
    ).toBeInTheDocument()
  })
})
