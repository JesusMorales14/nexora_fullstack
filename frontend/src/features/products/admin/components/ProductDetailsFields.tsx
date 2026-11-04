import { useFormContext, useWatch } from 'react-hook-form'

import { FormField } from '@/components/shared/FormField'
import { SelectField } from '@/components/shared/SelectField'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { AdminBrand, AdminCategory } from '@/features/categories/adminCategoriesApi'
import type { ProductDetailsValues } from '@/features/products/admin/schemas'
import { slugify } from '@/lib/utils/slugify'

interface ProductDetailsFieldsProps {
  categories: AdminCategory[]
  brands: AdminBrand[]
  /** On create, the slug follows the name until the admin edits the slug by hand. */
  isSlugAutomatic: boolean
}

/**
 * Shared by the create and edit forms through FormProvider: both keep these fields under
 * `details`, so one component (and one schema) serves both.
 */
export function ProductDetailsFields({
  categories,
  brands,
  isSlugAutomatic,
}: ProductDetailsFieldsProps) {
  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<{ details: ProductDetailsValues }>()
  const detailsErrors = errors.details
  const parentNames = new Map(categories.map((category) => [category.id, category.name]))
  const isPublished = useWatch({ control, name: 'details.isPublished' })

  const nameField = register('details.name', {
    onChange: (event: { target: { value: string } }) => {
      if (isSlugAutomatic) {
        setValue('details.slug', slugify(event.target.value), { shouldValidate: false })
      }
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Nombre" error={detailsErrors?.name?.message} {...nameField} />
        <FormField
          label="Slug (URL)"
          hint="Aparece en la dirección del producto: /products/slug"
          error={detailsErrors?.slug?.message}
          {...register('details.slug')}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-description">Descripción</Label>
        <Textarea
          id="product-description"
          rows={4}
          aria-invalid={detailsErrors?.description ? true : undefined}
          aria-describedby={detailsErrors?.description ? 'product-description-error' : undefined}
          {...register('details.description')}
        />
        {detailsErrors?.description && (
          <p id="product-description-error" className="text-sm text-destructive">
            {detailsErrors.description.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Categoría"
          error={detailsErrors?.categoryId?.message}
          {...register('details.categoryId')}
        >
          <option value="">Selecciona…</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.parentId
                ? `${parentNames.get(category.parentId) ?? ''} › ${category.name}`
                : category.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Marca"
          error={detailsErrors?.brandId?.message}
          {...register('details.brandId')}
        >
          <option value="">Selecciona…</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </SelectField>
      </div>

      <fieldset className="flex flex-wrap gap-6">
        <legend className="sr-only">Visibilidad</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            {...register('details.isPublished')}
          />
          Publicado en la tienda
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            {...register('details.isFeatured')}
          />
          Destacado en la portada
        </label>
      </fieldset>
      {!isPublished && (
        <p className="text-sm text-muted-foreground">
          Mientras sea borrador, el producto no aparece en la tienda.
        </p>
      )}
    </div>
  )
}
