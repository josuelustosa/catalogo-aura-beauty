import { Link } from "react-router";

function NavBrand() {
  const logoTitle =
    "Logo Catálogo Aura Beauty | Produtos à pronta-entrega em Manaus";

  return (
    <>
      <Link to="/">
        <img
          src="/logo-aura-beauty.svg"
          alt={logoTitle}
          className="m-auto h-18 w-auto lg:h-22"
          title={logoTitle}
        />
      </Link>
    </>
  );
}

export default NavBrand;
