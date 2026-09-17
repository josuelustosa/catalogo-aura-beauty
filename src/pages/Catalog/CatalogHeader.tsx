type CatalogHeaderProps = {
  title: string;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
};

function CatalogHeader({
  title,
  searchTerm,
  onSearchTermChange,
}: CatalogHeaderProps) {
  return (
    <div className="my-8 flex flex-col gap-4 border-b border-divider pb-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="font-display text-xl font-normal text-text-brand sm:text-2xl">
        {title}
      </h1>

      <div className="relative w-full sm:max-w-xs">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>

        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          aria-label="Pesquisar produto por nome ou marca"
          placeholder="Pesquisar produto..."
          className="w-full rounded-full border border-border bg-surface py-2 pl-11 pr-4 text-sm text-text placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        />
      </div>
    </div>
  );
}

export default CatalogHeader;
