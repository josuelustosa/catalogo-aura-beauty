import NavBar from "./NavBar";
import NavBrand from "./NavBrand";

function Header() {
  return (
    <header className="w-full bg-primary py-4">
      {/* Sem o padding do Container: a faixa do menu rola até a borda da tela. */}
      <div className="mx-auto flex w-full max-w-page flex-col items-center gap-3">
        <NavBrand />
        <NavBar />
      </div>
    </header>
  );
}

export default Header;
