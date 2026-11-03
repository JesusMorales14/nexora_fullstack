/** Reads a text field from a FormData. File entries and missing fields become an empty string. */
export function getFormText(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}
