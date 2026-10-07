import Container from "../components/Container";
import EmptyState from "../components/EmptyState";

function NotFound() {
  return (
    <Container>
      <div className="my-8 border-b border-divider pb-4">
        <h1 className="font-display text-xl font-normal text-text-brand sm:text-2xl">
          Página não encontrada
        </h1>
      </div>

      <EmptyState
        message="O endereço que você abriu não existe ou mudou."
        action={{ label: "Ir para o início", to: "/" }}
      />
    </Container>
  );
}

export default NotFound;
