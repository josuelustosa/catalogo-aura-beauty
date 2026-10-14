import { isRouteErrorResponse, useRouteError } from "react-router";

import Container from "../components/Container";
import EmptyState from "../components/EmptyState";

/** Nunca mostra a mensagem nem o stack do erro: só o que fazer em seguida. */
function RouteErrorBoundary() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <Container>
      <div className="my-8 border-b border-divider pb-4">
        <h1 className="font-display text-xl font-normal text-text-brand sm:text-2xl">
          {notFound ? "Página não encontrada" : "Algo deu errado por aqui"}
        </h1>
      </div>

      <EmptyState
        message={
          notFound
            ? "O endereço que você abriu não existe ou mudou."
            : "Não conseguimos mostrar esta página agora. Tente de novo em instantes."
        }
        action={{ label: "Ir para o início", to: "/" }}
      />
    </Container>
  );
}

/**
 * Para erro no próprio layout (Header, Footer): sem ele, o react-router mostra
 * a página padrão, que imprime o stack trace mesmo em produção.
 */
export function RootErrorBoundary() {
  return (
    <>
      <div className="bg-primary py-4">
        <img
          src="/logo-aura-beauty.svg"
          alt="Aura Beauty"
          width={99}
          height={80}
          className="m-auto h-18 w-auto lg:h-20"
        />
      </div>
      <main>
        <RouteErrorBoundary />
      </main>
    </>
  );
}

export default RouteErrorBoundary;
