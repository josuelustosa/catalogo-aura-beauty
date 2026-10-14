import { instagramHandle } from "../../utils/instagram";
import BannerRose from "./BannerRose";

type InstagramBannerProps = {
  url: string;
};

function InstagramBanner({ url }: InstagramBannerProps) {
  const handle = instagramHandle(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="@container relative flex min-h-40 w-full items-center overflow-hidden rounded-lg border border-border bg-accent px-6 py-4.5 text-text shadow-sm transition-all hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <BannerRose tone="bg-primary opacity-18" />

      <span className="relative flex max-w-80 flex-col items-start gap-1">
        <span className="text-xs font-semibold tracking-[0.08em] text-text-brand uppercase">
          Instagram
        </span>
        <span className="font-display text-[26px] leading-[1.15] text-primary-hover">
          Acompanhe as novidades
        </span>
        <span className="text-sm text-text-secondary">
          Lançamentos e promoções{" "}
          {handle ? (
            <>
              em <span className="font-semibold text-text-brand">{handle}</span>
            </>
          ) : (
            "no nosso perfil"
          )}
        </span>
        <span className="mt-2.5 inline-flex min-h-9 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-text-inverse">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0"
          >
            <rect x="3" y="3" width="18" height="18" rx="4.5" />
            <circle cx="12" cy="12" r="4" />
            <path d="M17.2 6.8h.01" />
          </svg>
          Seguir no Instagram
        </span>
      </span>
    </a>
  );
}

export default InstagramBanner;
