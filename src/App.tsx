import { Outlet } from "react-router";
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
    </>
  );
}

export default App;
