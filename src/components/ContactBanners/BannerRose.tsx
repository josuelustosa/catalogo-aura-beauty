type BannerRoseProps = {
  /** Classe de fundo: a cor vem do token, a forma vem da máscara. */
  tone: string;
};

/**
 * A rosa do logo como decoração: um só PNG, tingido por máscara. Em banner
 * mais estreito que ~470 px ela passa sob o texto pequeno, e a opacidade cai
 * para o contraste continuar AA (4,66:1 no pior par). A medida é a da área de
 * conteúdo do banner, sem o padding.
 */
function BannerRose({ tone }: BannerRoseProps) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute -right-5 -bottom-11 h-50 w-61 mask-[url(/rosa-aura-beauty.png)] mask-contain mask-bottom-right mask-no-repeat @max-[26.5rem]:opacity-8 ${tone}`}
    />
  );
}

export default BannerRose;
