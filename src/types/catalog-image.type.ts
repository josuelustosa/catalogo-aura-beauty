/** Uma foto de produto emitida pelo build, sempre em quadrados. */
export type CatalogImage = {
  /** Base do nome dos arquivos em public/img, derivada do id. */
  slug: string;
  /** Hash do original e dos parâmetros de codificação; muda com a foto. */
  hash: string;
  /** Larguras emitidas, crescentes. A maior é a dimensão intrínseca. */
  widths: readonly number[];
};

/** `Partial` obriga quem lê a tratar o produto sem foto. */
export type CatalogImages = Readonly<Partial<Record<string, CatalogImage>>>;
