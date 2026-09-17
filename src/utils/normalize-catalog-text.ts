/** Normaliza texto para comparações que devem ignorar maiúsculas e acentos. */
export function normalizeCatalogText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
