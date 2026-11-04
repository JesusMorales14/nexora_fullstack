import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { FormAlert } from '@/components/shared/FormAlert'
import { FormField } from '@/components/shared/FormField'
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
  useAddImageMutation,
  useRemoveImageMutation,
} from '@/features/products/admin/adminProductsApi'
import { type ImageValues, imageSchema } from '@/features/products/admin/schemas'
import type { AdminProductDetails } from '@/features/products/admin/types'
import { type ApiError, getErrorMessage } from '@/lib/api/apiErrors'
import { applyServerErrors } from '@/lib/api/formErrors'

const DEFAULT_IMAGE_SIZE = 800

export function ImagesSection({ product }: { product: AdminProductDetails }) {
  const [addImage, { isLoading: isAdding }] = useAddImageMutation()
  const [removeImage] = useRemoveImageMutation()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ImageValues>({
    resolver: zodResolver(imageSchema),
    defaultValues: { url: '', altText: '', width: DEFAULT_IMAGE_SIZE, height: DEFAULT_IMAGE_SIZE },
  })

  async function handleValidSubmit(values: ImageValues) {
    setFormError(null)
    try {
      await addImage({ productId: product.id, body: values }).unwrap()
      reset()
    } catch (error: unknown) {
      setFormError(
        applyServerErrors(error as ApiError, setError, { url: 'url', altText: 'altText' }),
      )
    }
  }

  async function handleRemove(imageId: string) {
    setFormError(null)
    try {
      await removeImage({ productId: product.id, imageId }).unwrap()
    } catch (error: unknown) {
      setFormError(getErrorMessage(error as ApiError))
    }
  }

  return (
    <section
      className="flex flex-col gap-4 rounded-xl border bg-card p-5"
      aria-labelledby="images-heading"
    >
      <h2 id="images-heading" className="font-semibold">
        Imágenes
      </h2>
      {formError && <FormAlert message={formError} />}

      {product.images.length === 0 ? (
        <p className="text-sm text-muted-foreground">Este producto aún no tiene imágenes.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {product.images.map((image, index) => (
            <li key={image.id} className="flex flex-col gap-2 rounded-lg border p-2">
              <img
                src={image.url}
                alt={image.altText}
                width={image.width}
                height={image.height}
                loading="lazy"
                className="aspect-square w-full rounded-md bg-muted object-cover"
              />
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {index === 0 && <strong className="text-foreground">Principal · </strong>}
                {image.altText}
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Eliminar imagen: ${image.altText}`}
                  >
                    <Trash2 aria-hidden="true" />
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar esta imagen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Dejará de mostrarse en la tienda. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void handleRemove(image.id)}>
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      )}

      <form
        noValidate
        onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}
        className="grid gap-3 border-t pt-4 md:grid-cols-[2fr_2fr_auto] md:items-end"
      >
        <FormField label="URL de la imagen" error={errors.url?.message} {...register('url')} />
        <FormField
          label="Texto alternativo"
          error={errors.altText?.message}
          {...register('altText')}
        />
        <Button type="submit" variant="outline" disabled={isAdding}>
          {isAdding ? 'Agregando…' : 'Agregar imagen'}
        </Button>
      </form>
    </section>
  )
}
