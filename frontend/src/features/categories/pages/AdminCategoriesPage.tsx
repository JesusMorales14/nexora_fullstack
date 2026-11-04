import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from '@/lib/validation/z'

import { ErrorState } from '@/components/shared/ErrorState'
import { FormAlert } from '@/components/shared/FormAlert'
import { FormField } from '@/components/shared/FormField'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/PageLoader'
import { SelectField } from '@/components/shared/SelectField'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  type AdminCategory,
  useCreateBrandMutation,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetAdminBrandsQuery,
  useGetAdminCategoriesQuery,
  useUpdateCategoryMutation,
} from '@/features/categories/adminCategoriesApi'
import { type ApiError, getErrorMessage, getProblemDetail } from '@/lib/api/apiErrors'
import { applyServerErrors } from '@/lib/api/formErrors'
import { slugify } from '@/lib/utils/slugify'

const nameAndSlugSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa el nombre.').max(80),
  slug: z
    .string()
    .trim()
    .min(1, 'Ingresa un slug.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Usa solo minúsculas, números y guiones.'),
})
const categorySchema = nameAndSlugSchema.extend({ parentId: z.string() })

type CategoryValues = z.infer<typeof categorySchema>
type BrandValues = z.infer<typeof nameAndSlugSchema>

export function AdminCategoriesPage() {
  const categoriesQuery = useGetAdminCategoriesQuery()
  const [editing, setEditing] = useState<AdminCategory | null>(null)
  const [deleteCategory] = useDeleteCategoryMutation()
  const [listError, setListError] = useState<string | null>(null)

  if (categoriesQuery.isLoading) return <PageLoader />
  if (categoriesQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(categoriesQuery.error)}
        onRetry={() => void categoriesQuery.refetch()}
      />
    )
  }

  const categories = categoriesQuery.data ?? []
  const topLevel = categories.filter((category) => category.parentId === null)

  async function handleDelete(category: AdminCategory) {
    setListError(null)
    try {
      await deleteCategory(category.id).unwrap()
      if (editing?.id === category.id) setEditing(null)
    } catch (error: unknown) {
      const apiError = error as ApiError
      setListError(getProblemDetail(apiError) ?? getErrorMessage(apiError))
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <title>Categorías y marcas | Nexora Admin</title>
      <PageHeader title="Categorías y marcas" description="Hasta dos niveles de categorías." />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section aria-labelledby="categories-list-heading" className="flex flex-col gap-3">
          <h2 id="categories-list-heading" className="font-semibold">
            Categorías
          </h2>
          {listError && <FormAlert message={listError} />}
          <ul className="divide-y rounded-xl border bg-card">
            {topLevel.map((parent) => (
              <li key={parent.id}>
                <CategoryRow
                  category={parent}
                  onEdit={setEditing}
                  onDelete={(category) => void handleDelete(category)}
                />
                <ul className="divide-y border-t bg-muted/30">
                  {categories
                    .filter((child) => child.parentId === parent.id)
                    .map((child) => (
                      <li key={child.id} className="pl-6">
                        <CategoryRow
                          category={child}
                          onEdit={setEditing}
                          onDelete={(category) => void handleDelete(category)}
                        />
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-6">
          <CategoryForm
            key={editing?.id ?? 'new'}
            category={editing}
            parents={topLevel.filter((parent) => parent.id !== editing?.id)}
            onDone={() => {
              setEditing(null)
            }}
          />
          <BrandsPanel />
        </div>
      </div>
    </div>
  )
}

interface CategoryRowProps {
  category: AdminCategory
  onEdit: (category: AdminCategory) => void
  onDelete: (category: AdminCategory) => void
}

function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{category.name}</p>
        <p className="text-xs text-muted-foreground">
          /{category.slug} · {category.productCount}{' '}
          {category.productCount === 1 ? 'producto' : 'productos'}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Editar ${category.name}`}
        onClick={() => {
          onEdit(category)
        }}
      >
        <Pencil aria-hidden="true" />
        Editar
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" aria-label={`Eliminar ${category.name}`}>
            <Trash2 aria-hidden="true" />
            Eliminar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar «{category.name}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Solo se puede eliminar si no tiene productos ni subcategorías.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(category)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface CategoryFormProps {
  category: AdminCategory | null
  parents: AdminCategory[]
  onDone: () => void
}

function CategoryForm({ category, parents, onDone }: CategoryFormProps) {
  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation()
  const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      parentId: category?.parentId ?? '',
    },
  })

  async function handleValidSubmit(values: CategoryValues) {
    setFormError(null)
    const body = { ...values, parentId: values.parentId || null }
    try {
      if (category) await updateCategory({ id: category.id, body }).unwrap()
      else await createCategory(body).unwrap()
      reset({ name: '', slug: '', parentId: '' })
      onDone()
    } catch (error: unknown) {
      setFormError(applyServerErrors(error as ApiError, setError, { name: 'name', slug: 'slug' }))
    }
  }

  return (
    <section
      aria-labelledby="category-form-heading"
      className="flex flex-col gap-3 rounded-xl border bg-card p-5"
    >
      <h2 id="category-form-heading" className="font-semibold">
        {category ? `Editar «${category.name}»` : 'Nueva categoría'}
      </h2>
      {formError && <FormAlert message={formError} />}
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}
        className="flex flex-col gap-3"
      >
        <FormField
          label="Nombre"
          error={errors.name?.message}
          {...register('name', {
            onChange: (event: { target: { value: string } }) => {
              if (!category) setValue('slug', slugify(event.target.value))
            },
          })}
        />
        <FormField label="Slug" error={errors.slug?.message} {...register('slug')} />
        <SelectField label="Categoría padre" {...register('parentId')}>
          <option value="">Ninguna (principal)</option>
          {parents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.name}
            </option>
          ))}
        </SelectField>
        <div className="flex gap-2">
          <Button type="submit" disabled={isCreating || isUpdating}>
            {category ? 'Guardar' : 'Crear categoría'}
          </Button>
          {category && (
            <Button type="button" variant="ghost" onClick={onDone}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </section>
  )
}

function BrandsPanel() {
  const { data: brands = [] } = useGetAdminBrandsQuery()
  const [createBrand, { isLoading }] = useCreateBrandMutation()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BrandValues>({
    resolver: zodResolver(nameAndSlugSchema),
    defaultValues: { name: '', slug: '' },
  })

  async function handleValidSubmit(values: BrandValues) {
    setFormError(null)
    try {
      await createBrand(values).unwrap()
      reset()
    } catch (error: unknown) {
      setFormError(applyServerErrors(error as ApiError, setError, { name: 'name', slug: 'slug' }))
    }
  }

  return (
    <section
      aria-labelledby="brands-heading"
      className="flex flex-col gap-3 rounded-xl border bg-card p-5"
    >
      <h2 id="brands-heading" className="font-semibold">
        Marcas
      </h2>
      <ul className="flex flex-wrap gap-2">
        {brands.map((brand) => (
          <li key={brand.id} className="rounded-full border px-3 py-1 text-sm">
            {brand.name} <span className="text-muted-foreground">({brand.productCount})</span>
          </li>
        ))}
      </ul>
      {formError && <FormAlert message={formError} />}
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}
        className="flex flex-col gap-3"
      >
        <FormField
          label="Nueva marca"
          error={errors.name?.message}
          {...register('name', {
            onChange: (event: { target: { value: string } }) => {
              setValue('slug', slugify(event.target.value))
            },
          })}
        />
        <FormField label="Slug de la marca" error={errors.slug?.message} {...register('slug')} />
        <Button type="submit" variant="outline" disabled={isLoading}>
          Crear marca
        </Button>
      </form>
    </section>
  )
}
