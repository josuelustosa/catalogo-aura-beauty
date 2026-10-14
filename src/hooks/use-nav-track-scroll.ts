import { type FocusEvent, type RefObject, useEffect, useRef } from "react";
import { useLocation } from "react-router";

type Box = { left: number; right: number; width: number };
type Align = "center" | "nearest";
/** Quadro pendente da animação do trilho. */
type Animation = { id: number };

/** Respiro na borda do trilho: cabe o gutter e o contorno do foco. */
const EDGE = 20;

const GLIDE_MS = 300;

/**
 * Quanto rolar o trilho: "center" põe o item no meio; "nearest" só o traz
 * para dentro, a EDGE da borda.
 */
export function trackScrollDelta(track: Box, item: Box, align: Align): number {
  if (align === "center") {
    return item.left + item.width / 2 - (track.left + track.width / 2);
  }
  if (item.left < track.left + EDGE) {
    return item.left - track.left - EDGE;
  }
  if (item.right > track.right - EDGE) {
    return item.right - track.right + EDGE;
  }
  return 0;
}

/**
 * Rola o trilho até o item. A animação é feita aqui, quadro a quadro, e não
 * com behavior "smooth": a do navegador roda à frente do JS e não para no
 * quadro do toque. scrollLeft mexe só no trilho, nunca na página.
 */
function glide(
  nav: HTMLElement,
  item: Element,
  align: Align,
  animate: boolean,
  animation: Animation,
): void {
  cancelAnimationFrame(animation.id);
  const from = nav.scrollLeft;
  const delta = trackScrollDelta(
    nav.getBoundingClientRect(),
    item.getBoundingClientRect(),
    align,
  );
  const to = Math.min(
    Math.max(from + delta, 0),
    nav.scrollWidth - nav.clientWidth,
  );

  if (to === from) {
    return;
  }
  if (!animate || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    nav.scrollLeft = to;
    return;
  }

  const start = performance.now();
  const step = (now: number) => {
    // O carimbo do rAF pode vir antes do performance.now() do agendamento.
    const t = Math.min(Math.max((now - start) / GLIDE_MS, 0), 1);
    nav.scrollLeft = from + (to - from) * (1 - (1 - t) ** 3);
    if (t < 1) {
      animation.id = requestAnimationFrame(step);
    }
  };
  animation.id = requestAnimationFrame(step);
}

/**
 * Faz o trilho do menu acompanhar a página atual e o foco do teclado.
 * Devolve o onFocus do <nav>.
 */
export function useNavTrackScroll(
  navRef: RefObject<HTMLElement | null>,
): (event: FocusEvent<HTMLElement>) => void {
  const { pathname } = useLocation();
  const mounted = useRef(false);
  // Guardado na chegada do foco: o Chrome passa a marcar :focus-visible num
  // link clicado assim que a pessoa aperta qualquer tecla.
  const keyboardFocus = useRef(false);
  const animationRef = useRef<Animation>({ id: 0 });

  useEffect(() => {
    const nav = navRef.current;
    const animation = animationRef.current;
    if (!nav) {
      return;
    }

    // Rolou o trilho antes do JS (rede lenta): mantém a posição escolhida.
    let stopped = !mounted.current && nav.scrollLeft !== 0;
    mounted.current = true;
    const startLeft = nav.scrollLeft;

    const place = (animate: boolean) => {
      // Foco do teclado no trilho (ex.: voltar no histórico) tem prioridade.
      const focused = keyboardFocus.current && nav.querySelector(":focus");
      const active = nav.querySelector('[aria-current="page"]');
      if (focused) {
        glide(nav, focused, "nearest", animate, animation);
      } else if (active) {
        glide(nav, active, "center", animate, animation);
      } else {
        // Rota fora do menu (/catalogo, 404): o trilho volta ao início.
        cancelAnimationFrame(animation.id);
        nav.scrollLeft = 0;
      }
    };

    // Espera a fonte: com a de fallback, as pílulas têm outra largura. Se a
    // pessoa rolou o trilho nesse meio-tempo, a posição dela vence.
    void document.fonts.ready.then(() => {
      if (!stopped && nav.scrollLeft === startLeft) {
        place(true);
      }
    });

    // Toque no meio da animação: o trilho para onde está e o toque acerta.
    const onPointerDown = () => {
      keyboardFocus.current = false;
      cancelAnimationFrame(animation.id);
    };
    nav.addEventListener("pointerdown", onPointerDown, { passive: true });

    // Girar o celular muda a largura do trilho: reposiciona sem animação.
    let width = nav.clientWidth;
    const observer = new ResizeObserver(() => {
      if (nav.clientWidth !== width) {
        width = nav.clientWidth;
        place(false);
      }
    });
    observer.observe(nav);

    return () => {
      stopped = true;
      cancelAnimationFrame(animation.id);
      observer.disconnect();
      nav.removeEventListener("pointerdown", onPointerDown);
    };
  }, [navRef, pathname]);

  // Tab numa pílula meio escondida: traz ela inteira, com o contorno do foco.
  return (event) => {
    const nav = navRef.current;
    keyboardFocus.current = event.target.matches(":focus-visible");
    if (nav && keyboardFocus.current && event.target !== nav) {
      glide(nav, event.target, "nearest", true, animationRef.current);
    }
  };
}
