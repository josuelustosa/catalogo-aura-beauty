const priceFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const NBSP = String.fromCharCode(0xa0);
const CURRENCY_SPACE = new RegExp(
  `[ ${NBSP}${String.fromCharCode(0x202f)}]`,
  "g",
);

/**
 * Versões de ICU divergem entre o Node do build e o navegador (NBSP × U+202F
 * depois do "R$"); um caractere diferente vira mismatch de hidratação. Fica
 * sempre o NBSP, que também não deixa o "R$" quebrar de linha.
 */
export function normalizeCurrencySpacing(formatted: string): string {
  return formatted.replace(CURRENCY_SPACE, NBSP);
}

export function formatPrice(value: number): string {
  return normalizeCurrencySpacing(priceFormatter.format(value));
}
