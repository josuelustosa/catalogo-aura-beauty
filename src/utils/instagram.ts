const HANDLE = /^[A-Za-z0-9._]{1,30}$/;

function userFromUrl(value: string): string {
  try {
    const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const { hostname, pathname } = new URL(withScheme);
    if (!/(^|\.)instagram\.com$/i.test(hostname)) {
      return "";
    }

    const user = pathname.split("/").find(Boolean) ?? "";
    return HANDLE.test(user) ? user : "";
  } catch {
    return "";
  }
}

/**
 * Aceita "perfil", "@perfil" ou a URL do perfil (com ou sem https://) e
 * devolve "https://www.instagram.com/perfil/". Fora disso, "".
 */
export function instagramProfileUrl(raw: string | undefined): string {
  const value = raw?.trim().replace(/^@/, "") ?? "";
  const user = HANDLE.test(value) ? value : userFromUrl(value);
  return user ? `https://www.instagram.com/${user}/` : "";
}

/** Perfil do Instagram (opcional). Vazio: o banner some e o JSON-LD não cita. */
export const INSTAGRAM_URL: string = instagramProfileUrl(
  import.meta.env.VITE_INSTAGRAM_URL,
);

/** "https://www.instagram.com/aura/?hl=pt" vira "@aura"; fora do Instagram, "". */
export function instagramHandle(url: string): string {
  const user = userFromUrl(url);
  return user ? `@${user}` : "";
}
