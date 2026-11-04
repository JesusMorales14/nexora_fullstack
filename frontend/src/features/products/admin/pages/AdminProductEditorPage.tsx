import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'

import { ErrorState } from '@/components/shared/ErrorState'
import { FormAlert } from '@/components/shared/FormAlert'
import { FormField } from '@/components/shared/FormField'
import { NotFoundPage } from '@/components/shared/NotFoundPage'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/PageLoader'
import { Button } from '@/components/ui/button'
import {
  type AdminBrand,
  type AdminCategory,
  useGetAdminBrandsQuery,
  useGetAdminCategoriesQuery,
} from '@/features/categories/adminCategoriesApi'
import {
  useCreateProductMutation,
  useGetAdminProductQuery,
  useUpdateProductMutation,
} from '@/features/products/admin/adminProductsApi'
import { ImagesSection } from '@/features/products/admin/components/ImagesSection'
import { ProductDetailsFields } from '@/features/products/admin/components/ProductDetailsFields'
import { VariantsSection } from '@/features/products/admin/components/VariantsSection'
import {
  type CreateProductValues,
  createProductSchema,
  type EditProductValues,
  editProductSchema,
  toCompareAtPrice,
} from '@/features/products/admin/schemas'
import type { AdminProductDetails } from '@/features/products/admin/types'
import { type ApiError, getErrorMessage, getHttpStatus } from '@/lib/api/apiErrors'
import { applyServerErrors } from '@/lib/api/formErrors'

const HTTP_NOT_FOUND = 404
const DEFAULT_IMAGE_SIZE = 800

const DETAILS_FIELD_MAP = {
  name: 'details.name',
  slug: 'details.slug',
  description: 'details.description',
  categoryId: 'details.categoryId',
  brandId: 'details.brandId',
} as const

export function AdminProductEditorPage() {
  const { productId } = useParams()
  const categoriesQuery = useGetAdminCategoriesQuery()
  const brandsQuery = useGetAdminBrandsQuery()

  if (categoriesQuery.isLoading || brandsQuery.isLoading) return <PageLoader />
  if (categoriesQuery.isError || brandsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(categoriesQuery.error ?? brandsQuery.error)}
        onRetry={() => {
          void categoriesQuery.refetch()
          void brandsQuery.refetch()
        }}
      />
    )
  }

  const categories = categoriesQuery.data ?? []
  const brands = brandsQuery.data ?? []

  return productId ? (
    <EditProduct productId={productId} categories={categories} brands={brands} />
  ) : (
    <CreateProduct categories={categories} brands={brands} />
  )
}

interface LookupProps {
  categories: AdminCategory[]
  brands: AdminBrand[]
}

function CreateProduct({ categories, brands }: LookupProps) {
  const navigate = useNavigate()
  const [createProduct, { isLoading }] = useCreateProductMutation()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<CreateProductValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      details: {
        name: '',
        slug: '',
        description: '',
        categoryId: '',
        brandId: '',
        isPublished: false,
        isFeatured: false,
      },
      variant: {
        sku: '',
        name: '',
        compareAtPrice: '',
        initialStock: 0,
        lowStockThreshold: 5,
      },
      image: {
        url: '/images/products/laptop.svg',
        altText: '',
        width: DEFAULT_IMAGE_SIZE,
        height: DEFAULT_IMAGE_SIZE,
      },
    },
  })
  const { errors } = form.formState

  async function handleValidSubmit({ details, variant, image }: CreateProductValues) {
    setFormError(null)
    try {
      const created = await createProduct({
        ...details,
        variant: { ...variant, compareAtPrice: toCompareAtPrice(variant.compareAtPrice) },
        image,
      }).unwrap()
      void navigate(`/admin/products/${created.id}`, { replace: true })
    } catch (error: unknown) {
      setFormError(
        applyServerErrors(error as ApiError, form.setError, {
          ...DETAILS_FIELD_MAP,
          'variant.sku': 'variant.sku',
          'variant.name': 'variant.name',
          'variant.price': 'variant.price',
          'variant.compareAtPrice': 'variant.compareAtPrice',
          'image.url': 'image.url',
          'image.altText': 'image.altText',
        }),
      )
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <title>Nuevo producto | Nexora Admin</title>
      <PageHeader title="Nuevo producto" description="Se crea con su primera variante." />
      {formError && <FormAlert message={formError} />}

      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={(event) => void form.handleSubmit(handleValidSubmit)(event)}
          className="flex flex-col gap-6"
        >
          <section
            className="flex flex-col gap-4 rounded-xl border bg-card p-5"
            aria-labelledby="details-heading"
          >
            <h2 id="details-heading" className="font-semibold">
              Datos generales
            </h2>
            <ProductDetailsFields categories={categories} brands={brands} isSlugAutomatic />
          </section>

          <section
            className="flex flex-col gap-4 rounded-xl border bg-card p-5"
            aria-labelledby="variant-heading"
          >
            <h2 id="variant-heading" className="font-semibold">
              Primera variante
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                label="SKU"
                error={errors.variant?.sku?.message}
                {...form.register('variant.sku')}
              />
              <FormField
                label="Nombre de la variante"
                placeholder="Ej. 16 GB / 512 GB"
                error={errors.variant?.name?.message}
                {...form.register('variant.name')}
              />
              <FormField
                label="Precio (S/, con IGV)"
                type="number"
                step="0.01"
                min={0}
                inputMode="decimal"
                error={errors.variant?.price?.message}
                {...form.register('variant.price', { valueAsNumber: true })}
              />
              <FormField
                label="Precio anterior (opcional)"
                type="number"
                step="0.01"
                min={0}
                inputMode="decimal"
                error={errors.variant?.compareAtPrice?.message}
                {...form.register('variant.compareAtPrice')}
              />
              <FormField
                label="Stock inicial"
                type="number"
                min={0}
                inputMode="numeric"
                error={errors.variant?.initialStock?.message}
                {...form.register('variant.initialStock', { valueAsNumber: true })}
              />
              <FormField
                label="Alerta de stock bajo"
                type="number"
                min={0}
                inputMode="numeric"
                hint="Avisa cuando queden estas unidades o menos."
                error={errors.variant?.lowStockThreshold?.message}
                {...form.register('variant.lowStockThreshold', { valueAsNumber: true })}
              />
            </div>
          </section>

          <section
            className="flex flex-col gap-4 rounded-xl border bg-card p-5"
            aria-labelledby="image-heading"
          >
            <h2 id="image-heading" className="font-semibold">
              Imagen principal
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="URL"
                error={errors.image?.url?.message}
                {...form.register('image.url')}
              />
              <FormField
                label="Texto alternativo"
                hint="Describe la imagen para personas que usan lector de pantalla."
                error={errors.image?.altText?.message}
                {...form.register('image.altText')}
              />
            </div>
          </section>

          <div className="flex gap-3">
            <Button type="submit" size="lg" disabled={isLoading}>
              {isLoading ? 'Creando…' : 'Crear producto'}
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/admin/products">Cancelar</Link>
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}

function EditProduct({ productId, categories, brands }: LookupProps & { productId: string }) {
  const { data: product, error, isLoading, isError, refetch } = useGetAdminProductQuery(productId)
  // Lives here because the details form remounts (new version) after every successful save.
  const [savedNotice, setSavedNotice] = useState<string | null>(null)

  if (isLoading) return <PageLoader />
  if (isError) {
    if (getHttpStatus(error) === HTTP_NOT_FOUND) return <NotFoundPage />
    return <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
  }
  if (!product) return null

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <title>{`${product.name} | Nexora Admin`}</title>
      <PageHeader
        title={product.name}
        actions={
          product.isPublished && (
            <Button asChild variant="outline">
              <Link to={`/products/${product.slug}`}>Ver en la tienda</Link>
            </Button>
          )
        }
      />
      {savedNotice && <FormAlert variant="success" message={savedNotice} />}
      {/* Re-keyed by version: after a save (or a refetch) the form shows the server's state. */}
      <EditDetailsForm
        key={product.version}
        product={product}
        categories={categories}
        brands={brands}
        onReload={() => void refetch()}
        onSaved={setSavedNotice}
      />
      <VariantsSection product={product} />
      <ImagesSection product={product} />
    </div>
  )
}

interface EditDetailsFormProps extends LookupProps {
  product: AdminProductDetails
  onReload: () => void
  onSaved: (notice: string | null) => void
}

function EditDetailsForm({ product, categories, brands, onReload, onSaved }: EditDetailsFormProps) {
  const [updateProduct, { isLoading }] = useUpdateProductMutation()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<EditProductValues>({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      details: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        categoryId: product.categoryId,
        brandId: product.brandId,
        isPublished: product.isPublished,
        isFeatured: product.isFeatured,
      },
    },
  })

  async function handleValidSubmit({ details }: EditProductValues) {
    setFormError(null)
    onSaved(null)
    try {
      await updateProduct({
        id: product.id,
        body: { ...details, version: product.version },
      }).unwrap()
      onSaved('Cambios guardados.')
    } catch (error: unknown) {
      setFormError(applyServerErrors(error as ApiError, form.setError, DETAILS_FIELD_MAP))
    }
  }

  return (
    <section
      className="flex flex-col gap-4 rounded-xl border bg-card p-5"
      aria-labelledby="edit-details-heading"
    >
      <h2 id="edit-details-heading" className="font-semibold">
        Datos generales
      </h2>
      {formError && (
        <div className="flex flex-col items-start gap-2">
          <FormAlert message={formError} />
          <Button variant="outline" size="sm" onClick={onReload}>
            Recargar datos
          </Button>
        </div>
      )}
      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={(event) => void form.handleSubmit(handleValidSubmit)(event)}
          className="flex flex-col gap-4"
        >
          <ProductDetailsFields categories={categories} brands={brands} isSlugAutomatic={false} />
          <Button type="submit" className="self-start" disabled={isLoading}>
            {isLoading ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </form>
      </FormProvider>
    </section>
  )
}
