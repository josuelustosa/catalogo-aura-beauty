import { Outlet, ScrollRestoration } from "react-router";
import Footer from "./components/Footer";
import Header from "./components/Header";
import WhatsAppFab from "./components/WhatsAppFab";
import { useRouteMeta } from "./hooks/use-route-meta";

function App() {
  useRouteMeta();

  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFab />
      {/* Página nova abre no topo; voltar e avançar devolvem a posição. */}
      <ScrollRestoration />
    </>
  );
}

export default App;
