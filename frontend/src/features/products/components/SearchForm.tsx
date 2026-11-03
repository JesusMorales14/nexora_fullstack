import { Search } from 'lucide-react'
import type { SubmitEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getFormText } from '@/lib/utils/formData'

const SEARCH_INPUT_ID = 'site-search'
const SEARCH_MAX_LENGTH = 100

export function SearchForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const currentQuery = searchParams.get('q') ?? ''

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = getFormText(new FormData(event.currentTarget), 'q')
    void navigate(query ? `/products?${new URLSearchParams({ q: query }).toString()}` : '/products')
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="flex gap-2">
      <label htmlFor={SEARCH_INPUT_ID} className="sr-only">
        Buscar productos
      </label>
      <Input
        // Remount when the URL query changes so the field reflects back/forward navigation.
        key={currentQuery}
        id={SEARCH_INPUT_ID}
        name="q"
        type="search"
        defaultValue={currentQuery}
        maxLength={SEARCH_MAX_LENGTH}
        placeholder="Buscar laptops, monitores, audio…"
        autoComplete="off"
        className="h-9"
      />
      <Button type="submit" size="icon-lg" aria-label="Buscar">
        <Search aria-hidden="true" />
      </Button>
    </form>
  )
}
