type SectionHeadingProps = {
  /** Vai no `aria-labelledby` da seção. */
  id: string;
  title: string;
  subtitle?: string;
  /** Sem linha quando o conteúdo já começa com uma (o FAQ). */
  divider?: boolean;
};

function SectionHeading({
  id,
  title,
  subtitle,
  divider = true,
}: SectionHeadingProps) {
  return (
    <div className={divider ? "mb-6 border-b border-divider pb-4" : "mb-4"}>
      <h2
        id={id}
        className="font-display text-[clamp(28px,1.25rem+1vw,36px)] leading-[1.15] font-normal text-text-brand"
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-1.5 text-[15px] leading-[22px] text-text-secondary">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export default SectionHeading;
