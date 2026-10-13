import { Link } from "react-router";

function NavBrand() {
  return (
    <Link
      to="/"
      className="block rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <img
        src="/logo-aura-beauty.svg"
        alt="Aura Beauty, ir para o início"
        width={85}
        height={68}
        className="h-[clamp(60px,4.6vw,68px)] w-auto"
      />
    </Link>
  );
}

export default NavBrand;
