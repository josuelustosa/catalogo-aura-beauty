# Contexto do Projeto

Documento de referência para agentes de IA e novos desenvolvedores. Descreve o
estado atual do código, as decisões de arquitetura já tomadas e as convenções a
seguir em novas implementações.

> Mantenha este arquivo atualizado sempre que uma decisão de arquitetura ou um
> fluxo de dados mudar. Ele é a fonte de contexto, não um changelog — o
> histórico de commits cumpre esse papel.

O roteiro de trabalho, com as issues e os critérios de aceite, fica em
[PLANO_DEFINITIVO_V1.md](./PLANO_DEFINITIVO_V1.md).

---

## Visão geral

Catálogo de produtos de revenda, sob a marca **Aura Beauty**, com pronta-entrega
em Manaus. O site expõe grupos de catálogos (Boticário/Eudora/OUI, Natura/Avon,
Romance/Favorita, Moda Íntima, Joias e Acessórios) e cada produto leva a uma
conversa no WhatsApp com mensagem pré-preenchida. Não há carrinho, checkout,
autenticação ou back-end próprio.

> O código ainda diz "Consultora Acsa" em alguns pontos. A troca de identidade é
> a primeira etapa do plano — ver `PLANO_DEFINITIVO_V1.md` §5.

A fonte de dados prevista é uma **Planilha Google**, que devolve uma lista plana
com os produtos de todas as marcas. Hoje esse retorno é simulado por um mock, e
a leitura real acontecerá **em tempo de build**, não em runtime — ver Histórico.

## Stack

| Item         | Versão | Observação                                       |
| ------------ | ------ | ------------------------------------------------ |
| React        | 19.2.8 |                                                  |
| TypeScript   | 6.0.3  | `tsc -b` no build                                |
| Vite         | 8.1.5  |                                                  |
| React Router | 7.18.1 | import de `react-router`, não `react-router-dom` |
| Tailwind CSS | 4.3.3  | via `@tailwindcss/vite`, sem `tailwind.config`   |
| Prettier     | 3.6.2  | opções default, sem `.prettierrc`                |

Dependências usam **versão exata**, sem `^` ou `~`. Ver
[dependency-management.md](./dependency-management.md).

Scripts: `npm run dev`, `npm run build` (`tsc -b && vite build`),
`npm run lint`, `npm run format` e `npm run format:check`.

---

## Estrutura

```
src/
├── components/          # UI compartilhada entre páginas
│   ├── Container.tsx    # larguras "default" (80rem) e "narrow" (48rem)
│   ├── EmptyState.tsx   # mensagem + saída para qualquer estado vazio
│   └── Header/
├── data/
│   └── products.mock.ts # retorno bruto simulado da planilha
├── hooks/
│   └── use-debounced-value.ts
├── mocks/
│   └── nav-item.mock.ts # itens do menu + helpers de catálogo
├── pages/
│   ├── Home.tsx
│   ├── CatalogHome.tsx  # /catalogo sem slug: seletor de catálogos
│   ├── NotFound.tsx     # rota "*"
│   └── Catalog/         # página + componentes exclusivos dela
├── router/
├── services/
│   └── catalog.service.ts
├── types/
└── utils/
```

Convenção de pastas: componente usado por mais de uma página vai em
`components/`; componente exclusivo de uma página vive na pasta daquela página
(`pages/Catalog/CatalogCard.tsx`). Página com subcomponentes vira pasta com
`index.tsx`.

---

## Fluxo de dados do catálogo

Este é o eixo central do projeto. Uma rota dinâmica atende todos os catálogos:

```
/catalogo/:slug
      │
      ▼
pages/Catalog/index.tsx        useParams() → slug
      │
      ▼
services/catalog.service.ts    getCatalogBySlug(slug)
      │
      ├─ getCatalogNavItemBySlug(slug)   → item do menu (mocks/nav-item.mock)
      │      └─ item.brands              → ["Boticário", "Eudora", "OUI"]
      │
      └─ getProductsByBrands(brands)     → filtra data/products.mock
             │
             ▼
        CatalogView { slug, title, brands, products }
                     │
                     ▼
        searchProducts(products, termo)   recorte de busca, na página
```

O `slug` vazio (`/catalogo`) não entra nesse fluxo: tem rota própria
(`pages/CatalogHome.tsx`), que apenas lista `CATALOG_NAV_ITEMS` como links.

Pontos que precisam ser preservados em qualquer alteração:

- **O menu é a fonte da verdade do agrupamento.** `NAV_ITEMS` define quais
  marcas cada catálogo reúne, via o campo `brands`. Adicionar um catálogo novo
  é adicionar um item ao mock com `kind: "catalog"`, `slug` e `brands` — a rota,
  o link e a filtragem passam a funcionar sem tocar em roteador ou serviço.
- **A planilha devolve tudo, o recorte é da camada de serviço.**
  `data/products.mock.ts` não sabe de catálogos; nenhum arquivo por catálogo
  deve voltar a existir (essa abordagem foi removida — ver Histórico).
- **Comparação de texto é normalizada.** `normalize()` aplica trim, lowercase e
  remoção de acentos, porque a planilha é editada à mão e `"boticário "` e
  `"Boticario"` precisam casar. Toda comparação de marca deve passar por ela, e
  a busca também usa — o usuário digita sem acento.
- **`getCatalogBySlug` devolve `null` para slug desconhecido.** A página trata
  esse caso, o de catálogo sem produtos e o de busca sem resultado com
  mensagens distintas — todos via `<EmptyState>`, ver Design system.

### Busca

`searchProducts` casa substring em título **ou** marca, sem operadores nem
múltiplos termos — o catálogo tem dezenas de itens, não milhares. O debounce de
250ms fica em `hooks/use-debounced-value.ts`: o input responde na hora, só a
filtragem espera.

**Trocar de catálogo limpa a busca via `key={slug}`, não via `useEffect`.** O
reset precisa ser síncrono; com efeito, o valor já debounced do termo antigo
ainda seria propagado contra a lista nova e a tela piscaria "nenhum produto
encontrado". Não troque por `useEffect`.

O corte de duas colunas do grid é `md` (768px), não `sm` (640px): em portrait de
tablet o card ainda respira, e a 640px dois cards deixariam título e preço
apertados.

### Tipos

- `Product` (`types/product.type.ts`): linha da planilha. `price` é o preço
  cheio; `promoPrice` é opcional e, quando presente, é o valor em destaque no
  card, com `price` riscado ao lado.
- `NavItem` (`types/nav-item.type.ts`): união discriminada por `kind`
  (`"home" | "catalog"`). `CatalogNavItem` exige `brands`.
- `CatalogView` / `CatalogBrandGroup` (`services/catalog.service.ts`).

`NAV_ITEMS` usa `as const satisfies readonly NavItem[]`, o que preserva os
literais — `CatalogSlug` é derivado daí. Não troque por anotação de tipo
explícita, isso apagaria os literais.

---

## Integração com WhatsApp

`utils/whatsapp.ts` monta `https://wa.me/<numero>?text=<mensagem>` com o título
do produto na mensagem. O número vem de `VITE_WHATSAPP_NUMBER`, em formato
internacional só com dígitos (`5511999999999`).

Sem a variável, o link ainda abre o WhatsApp com a mensagem pronta, deixando o
contato a ser escolhido — degradação intencional, não trate como erro.

Copie `.env.example` para `.env` no setup local. `.env` e variantes estão no
`.gitignore`; `.env.example` é a exceção versionada.

---

## Design system

Tokens semânticos ficam em `src/index.css`, no bloco `@theme` do Tailwind 4.
Não há `tailwind.config.js`.

Use sempre o token semântico, nunca a cor crua: `text-text-secondary` e não
`text-gray-700`; `bg-primary` e não `bg-brown-500`. As camadas são:

- **paleta** (`--color-brown-500`, `--color-bege`, …) → só referenciada pelos
  tokens semânticos;
- **semânticos**: `primary`, `primary-hover`, `accent`, `background`, `surface`,
  `surface-soft`, `surface-highlight`, `text`, `text-secondary`, `text-inverse`,
  `text-brand`, `border`, `divider`, `focus-ring`, `hover-overlay`,
  `active-overlay`;
- **layout**: `max-w-page` (80rem, grid de 4 cards) e `max-w-narrow` (48rem,
  páginas de leitura), aplicados via `<Container>`.

Padrões visuais em uso: foco com `focus-visible:ring-2 ring-focus-ring`,
feedback de clique com `active:scale-95`, cards em `rounded-lg border-border
bg-surface shadow-sm`, imagens `aspect-square` com `loading="lazy"`.

### Tipografia

As fontes do Google Fonts são entregues localmente pelos pacotes Fontsource,
sem requisições a serviços externos no navegador:

- `--font-sans`: **Inter Variable**, somente Latin e eixo de peso normal
  100–900; fonte estrutural da interface, do texto e dos controles;
- `--font-display`: **DM Serif Display**, somente Latin e peso 400 normal;
  fonte editorial aplicada explicitamente aos títulos dos catálogos e,
  futuramente, aos títulos de seção da Home.

Não aplique a fonte display globalmente aos elementos `h1`–`h3`: títulos de
produto e demais conteúdos funcionais continuam em Inter. As duas fontes usam
`font-display: swap`, têm fallback local e são pré-carregadas em `index.html`
porque aparecem acima da dobra.

**Estados vazios passam por `<EmptyState>`.** Nada de `<p>` centralizado solto:
o componente padroniza mensagem e saída (um `to`, que vira `Link`, **ou** um
`onClick`, que vira `button` — nunca os dois). Novos estados vazios devem
consumi-lo em vez de repetir o layout.

Acessibilidade: SVGs decorativos levam `aria-hidden="true"`; inputs sem label
visível levam `aria-label`.

---

## Estado atual e pendências conhecidas

Implementado e verificado (`tsc -b` e `vite build` passam):

- rota dinâmica `/catalogo/:slug` cobrindo os 5 catálogos;
- rota `/catalogo` sem slug com seletor de catálogos, em vez da rota `*`;
- listagem em grid responsivo (1 coluna, 2 em `md`, 4 em `lg`);
- card com marca, título, preço com/sem promoção e CTA de WhatsApp;
- busca por título ou marca, com debounce de 250ms e estado vazio próprio;
- slug inválido, catálogo vazio, busca sem resultado e rota `*` com
  `<EmptyState>`.

O que está aberto — com critérios de aceite — está em
[PLANO_DEFINITIVO_V1.md](./PLANO_DEFINITIVO_V1.md). Em resumo: identidade visual
ainda como "Consultora Acsa", troca do mock pela Planilha Google, imagens dos
produtos, ausência de SSG e de metadados por rota, `Home.tsx` ainda placeholder,
sem footer nem botão flutuante, e ausência de testes.

`groupByBrand` continua sem consumidor: a listagem seccionada por marca foi
movida para fora do escopo do V1 por falta de decisão de UX — ela convive mal
com a busca (`PLANO_DEFINITIVO_V1.md` §12).

---

## Convenções de trabalho

- **Idioma:** código e identificadores em inglês; comentários, textos de UI e
  mensagens de commit em pt-BR. Comentário só onde explica um _porquê_ não
  óbvio (ver os comentários de `normalize` e de `whatsapp.ts` como referência de
  tom).
- **Formatação:** Prettier com as opções default — 2 espaços, 80 colunas, aspas
  duplas, ponto e vírgula, vírgula final. Não há `.prettierrc`: o padrão do
  Prettier já é o do projeto, e um arquivo de config só criaria divergência a
  manter. `npm run format` aplica, `npm run format:check` verifica. O Prettier 3
  respeita o `.gitignore`, então `.prettierignore` só lista o que o git versiona
  e ele não deve tocar. `.editorconfig` cobre recuo, EOL e newline final para
  quem não usa a extensão do editor; `.vscode/extensions.json` recomenda as
  extensões.
- **Commits:** Conventional Commits, em pt-BR, objetivos e técnicos, com
  bullet-points no corpo quando houver mais de um ponto. Escopo entre
  parênteses (`feat(catalog):`, `refactor(router):`).
- **Atomicidade:** um commit por unidade lógica, e **cada commit deve compilar
  isoladamente**. Ao mover ou remover módulos, remova o consumidor no mesmo
  commit em que a referência deixa de existir — código morto pode sair num
  commit `chore` posterior, referência quebrada não.
- **Antes de commitar,** confira `git status`: alterações pré-staged de outra
  sessão entram no commit se você usar `git commit` sem paths.
- **Verificação:** `npm run build` cobre typecheck e build. Para validar uma
  série de commits, um worktree descartável evita mexer no diretório de
  trabalho.

---

## Histórico de decisões

**Abandonado — um arquivo de dados por catálogo.** O modelo anterior tinha
`src/data/catalogs/<slug>.ts`, um tipo `CatalogData`, uma página `CatalogPage`
recebendo dados por prop e rotas filhas geradas por catálogo em `routes.tsx`.
Trocado por rota dinâmica + filtro por marca porque a planilha real não devolve
dados particionados por catálogo: manter a partição no código duplicaria o
agrupamento que já existe no menu e obrigaria a criar um arquivo a cada catálogo
novo. Não reintroduza esse modelo.

**Mantido — mocks separados por responsabilidade.** `mocks/nav-item.mock.ts`
descreve navegação (estrutura do site); `data/products.mock.ts` simula a origem
externa de dados. Quando a planilha entrar, o segundo deixa de ser a origem e
passa a ser o fixture de fallback para build sem credencial e para os testes.

**Decidido — a planilha é lida em tempo de build, não em runtime.** O plano
anterior previa que a leitura real traria assincronismo, e que `getCatalogBySlug`
viraria assíncrona com estados de carregando e erro na página. **Isso vale para
um fetch no navegador, e não é o caminho escolhido.** Um script de build gera
`src/data/products.generated.ts` e `catalog.service.ts` muda só a linha de
import: a API pública e a sincronia ficam intactas, e nenhuma página ganha estado
novo. A contrapartida aceita é que o conteúdo só atualiza com um novo build,
disparado por um Deploy Hook a partir da própria planilha.

Consequência para segurança: a credencial da planilha fica em variável **sem
prefixo `VITE_`**, lida só pelo Node. O Vite só inlina variáveis prefixadas, então
ela não tem como vazar para o bundle. Em troca, a planilha precisa ser pública
por link — **nunca coloque preço de custo, fornecedor ou dado pessoal nela**.

**Decidido — SSG próprio, sem trocar de framework.** As rotas passam a ser
pré-renderizadas em HTML por um script no build, usando `createStaticHandler` /
`createStaticRouter` / `StaticRouterProvider` (já exportados pelo `react-router`
7.18 na entrada raiz, marcados `@mode data`) e `react-dom/static`. Astro e
Next.js foram avaliados e descartados: resolveriam com reescrita problemas que um
site de 8 rotas não tem. **Enquanto houver SSG, não use `route.lazy` nem code
splitting** — `lazy` força `initialized = false` no cliente, o que renderiza o
fallback do `<Suspense>` e causa mismatch de hidratação.

**Decidido — imagens otimizadas no build, nunca servidas da origem remota.** A
planilha guarda a URL (Cloudinary como destino, Google Drive tolerado); o build
baixa, recorta em quadrado e emite AVIF/WebP locais em `public/img/`. Por isso o
campo do tipo `Product` passa a ser `imageKey`, e não `imageUrl`: torna
impossível, por tipo, renderizar uma origem remota por engano.

O raciocínio completo de cada uma dessas decisões está em
[PLANO_DEFINITIVO_V1.md](./PLANO_DEFINITIVO_V1.md) §2 a §4.
