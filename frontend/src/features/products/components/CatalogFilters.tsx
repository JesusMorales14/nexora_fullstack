import type { SubmitEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useGetBrandsQuery, useGetCategoriesQuery } from '@/features/products/api/productsApi'
import { useProductFilters } from '@/features/products/hooks/useProductFilters'
import { getFormText } from '@/lib/utils/formData'

// Native <select> on purpose: best keyboard, screen reader and touch support with zero JS.
const SELECT_CLASS_NAME =
  'h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export function CatalogFilters() {
  const { filters, setFilters, clearFilters, hasActiveFilters } = useProductFilters()
  const { data: categories = [] } = useGetCategoriesQuery()
  const { data: brands = [] } = useGetBrandsQuery()

  const topLevelCategories = categories.filter((category) => category.parentSlug === null)

  function handlePriceSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setFilters({
      minPrice: getFormText(formData, 'minPrice'),
      maxPrice: getFormText(formData, 'maxPrice'),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="filter-category">Categoría</Label>
        <select
          id="filter-category"
          className={SELECT_CLASS_NAME}
          value={filters.category ?? ''}
          onChange={(event) => {
            setFilters({ category: event.target.value })
          }}
        >
          <option value="">Todas</option>
          {topLevelCategories.map((parent) => (
            <optgroup key={parent.id} label={parent.name}>
              <option value={parent.slug}>Todo en {parent.name}</option>
              {categories
                .filter((category) => category.parentSlug === parent.slug)
                .map((child) => (
                  <option key={child.id} value={child.slug}>
                    {child.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="filter-brand">Marca</Label>
        <select
          id="filter-brand"
          className={SELECT_CLASS_NAME}
          value={filters.brand ?? ''}
          onChange={(event) => {
            setFilters({ brand: event.target.value })
          }}
        >
          <option value="">Todas</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.slug}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>

      <form
        // Remount when the URL changes (e.g. "clear filters") so the inputs show the real values.
        key={`${String(filters.minPrice)}-${String(filters.maxPrice)}`}
        onSubmit={handlePriceSubmit}
        className="flex flex-col gap-2"
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Precio (S/)</legend>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="filter-min-price" className="text-xs text-muted-foreground">
                Mínimo
              </Label>
              <Input
                id="filter-min-price"
                name="minPrice"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                defaultValue={filters.minPrice}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="filter-max-price" className="text-xs text-muted-foreground">
                Máximo
              </Label>
              <Input
                id="filter-max-price"
                name="maxPrice"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                defaultValue={filters.maxPrice}
              />
            </div>
          </div>
        </fieldset>
        <Button type="submit" variant="outline">
          Aplicar precio
        </Button>
      </form>

      <div className="flex items-center gap-2">
        <input
          id="filter-in-stock"
          type="checkbox"
          className="size-4 accent-primary"
          checked={filters.inStock ?? false}
          onChange={(event) => {
            setFilters({ inStock: event.target.checked ? 'true' : undefined })
          }}
        />
        <Label htmlFor="filter-in-stock">Solo productos disponibles</Label>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" onClick={clearFilters}>
          Limpiar filtros
        </Button>
      )}
    </div>
  )
}
