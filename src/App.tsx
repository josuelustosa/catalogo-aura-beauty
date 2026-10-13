import { Outlet } from "react-router";
import Footer from "./components/Footer";
import Header from "./components/Header";
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
    </>
  );
}

export default App;
