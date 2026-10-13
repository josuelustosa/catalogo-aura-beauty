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
        width={99}
        height={80}
        className="h-18 w-auto lg:h-20"
      />
    </Link>
  );
}

export default NavBrand;
