/** Perfil do Instagram (opcional). Vazio: o banner some e o JSON-LD não cita. */
export const INSTAGRAM_URL: string = import.meta.env.VITE_INSTAGRAM_URL ?? "";

/** "https://www.instagram.com/aura/?hl=pt" vira "@aura"; fora do Instagram, "". */
export function instagramHandle(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    if (!/(^|\.)instagram\.com$/.test(hostname)) {
      return "";
    }

    const user = pathname.split("/").find(Boolean);
    return user ? `@${user}` : "";
  } catch {
    return "";
  }
}
