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

A fonte de dados é uma **Planilha Google**, que devolve uma lista plana com os
produtos de todas as marcas. `scripts/build-data.ts` a lê **em tempo de build**
(não em runtime — ver Histórico) e gera `src/data/products.generated.ts`; sem
credencial, gera a partir de `products.mock.ts`. As fotos vêm do Cloudinary
(ou de um link do Drive na coluna `imagem_url`): `scripts/build-images.ts` as
baixa, recorta em quadrado e emite AVIF/WebP em `public/img/`, com o manifesto
`src/data/images.generated.ts`. A publicação é disparada da própria planilha
por um Deploy Hook (`apps-script/Code.gs`), e o guia da consultora fica em
`consultora/GUIA_DA_PLANILHA.md`.

Cada rota é **pré-renderizada em HTML** no build (SSG próprio, sem framework):
`scripts/prerender.ts` grava um arquivo por rota em `dist/`, com `<head>`,
JSON-LD, `sitemap.xml` e `robots.txt` gerados, e o cliente hidrata esse HTML.

## Stack

| Item         | Versão | Observação                                       |
| ------------ | ------ | ------------------------------------------------ |
| React        | 19.2.8 |                                                  |
| TypeScript   | 6.0.3  | `tsc -b` no build                                |
| Vite         | 8.1.5  |                                                  |
| React Router | 7.18.1 | import de `react-router`, não `react-router-dom` |
| Tailwind CSS | 4.3.3  | via `@tailwindcss/vite`, sem `tailwind.config`   |
| Prettier     | 3.6.2  | opções default, sem `.prettierrc`                |
| Vitest       | 4.1.10 | imports explícitos de `"vitest"`, sem globals    |
| sharp        | 0.35.5 | só no build; binário pré-compilado com AVIF      |

Dependências usam **versão exata**, sem `^` ou `~`. Ver
[dependency-management.md](./dependency-management.md).

Scripts: `npm run dev`, `npm run build`, `npm test`,
`npm run lint`, `npm run format` e `npm run format:check`. `predev`, `prebuild`
e `pretest` rodam `scripts/build-data.ts`, que também roda o pipeline de
imagens (o `pretest` força o fallback do mock, sem imagens, para os testes do
serviço serem determinísticos). O cache das imagens fica em
`node_modules/.cache/catalogo-imagens/`; apagar a pasta só força um build frio.

`npm run build` encadeia `tsc -b` → `build:client` (`vite build`, que gera o
template com os assets hasheados) → `build:ssr` (`vite build --ssr
src/entry-server.tsx`, saída em `dist-ssr/`) → `prerender`. O `prebuild` gera os
`.generated.ts` antes de tudo, então o `tsc -b` também typecheca a saída do
gerador. O `prerender` **reprova o build** se o HTML de alguma rota sair com
fallback de `<Suspense>`, sem `<h1>`, sem o link do WhatsApp ou com foto
inexistente (`scripts/validate-html.ts`).

---

## Estrutura

```
apps-script/
└── Code.gs                    # menu de publicação da planilha (Deploy Hook)
consultora/
└── GUIA_DA_PLANILHA.md        # guia não técnico de uso da planilha
public/
└── img/                       # fotos emitidas pelo build; gitignorado
scripts/
├── atomic-write.ts            # grava por temporário + rename
├── build-data.ts              # orquestra: planilha → imagens → gerados
├── build-images.ts            # download, cache, sharp e emissão em public/img
├── catalog-data.ts            # parsing e validação da planilha; puro
├── catalog-images.ts          # origens, larguras e disjuntor de imagens; puro
├── prerender.ts               # grava um HTML por rota a partir do dist-ssr
├── site-files.ts              # sitemap.xml e robots.txt; puro
└── validate-html.ts           # regras que reprovam o HTML gerado; puro
src/
├── entry-server.tsx           # renderiza uma rota em HTML no Node (prerender)
├── main.tsx                   # hidrata ou renderiza, conforme a guarda de rota
├── components/                # UI compartilhada entre páginas
│   ├── Container.tsx          # larguras "default" (80rem) e "narrow" (48rem)
│   ├── EmptyState.tsx         # mensagem + saída para qualquer estado vazio
│   ├── Header/
│   └── Picture.tsx            # <picture> AVIF/WebP lendo o manifesto
├── data/
│   ├── images.generated.ts    # manifesto de fotos; gerado, gitignorado
│   ├── products.generated.ts  # gerado no build; gitignorado, não edite
│   └── products.mock.ts       # fixture de fallback e de teste
├── hooks/
│   ├── use-debounced-value.ts
│   └── use-route-meta.ts      # título/description/canonical na navegação SPA
├── mocks/
│   └── nav-item.mock.ts       # itens do menu + helpers de catálogo
├── pages/
│   ├── Home.tsx
│   ├── CatalogHome.tsx        # /catalogo sem slug: seletor de catálogos
│   ├── NotFound.tsx           # rota "*"
│   └── Catalog/               # página + componentes exclusivos dela
├── router/
│   ├── index.tsx              # createBrowserRouter (toca window)
│   └── tree.tsx               # árvore única de rotas, do cliente e do SSG
├── seo/                       # metadados, <head> e JSON-LD por rota
├── services/
│   └── catalog.service.ts
├── ssg/                       # contrato do dist-ssr e o esperado de cada HTML
├── types/
└── utils/
```

Os testes vivem ao lado do código (`*.test.ts` em `scripts/` e `src/`).

Convenção de pastas: componente usado por mais de uma página vai em
`components/`; componente exclusivo de uma página vive na pasta daquela página
(`pages/Catalog/CatalogCard.tsx`). Página com subcomponentes vira pasta com
`index.tsx`.

---

## Fluxo de dados do catálogo

Este é o eixo central do projeto. No build, a planilha vira um módulo estático:

```
Planilha ──(build)──► scripts/build-data.ts ──► src/data/products.generated.ts
                              │
   imagem_url ou id ──────────┴─► scripts/build-images.ts ──► public/img/
                                                            src/data/images.generated.ts
```

Em runtime, uma rota dinâmica atende todos os catálogos, com o serviço síncrono:

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
      └─ getProductsByBrands(brands)     → filtra data/products.generated
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
  `data/products.generated.ts` não sabe de catálogos; nenhum arquivo por
  catálogo deve voltar a existir (essa abordagem foi removida — ver Histórico).
- **Comparação de texto é normalizada.** `normalizeCatalogText()`
  (`utils/normalize-catalog-text.ts`) aplica trim, lowercase e remoção de
  acentos, porque a planilha é editada à mão e `"boticário "` e `"Boticario"`
  precisam casar. Toda comparação de marca deve passar por ela — o build a usa
  para canonicalizar a marca digitada, e a busca também, porque o usuário
  digita sem acento.
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

### Imagens

`build-images.ts` resolve a origem de cada produto — `imagem_url` normalizada
(qualquer link de arquivo do Drive vira o endpoint de thumbnail) ou, sem
coluna, `https://res.cloudinary.com/<cloud>/image/upload/<id>.jpg` —, baixa
com `If-None-Match`, recorta em quadrado uma vez (`position: "attention"`) e
emite AVIF q50 e WebP q78 em 320/480/640/960, sem ampliar o original. O
manifesto guarda só `{ slug, hash, widths }` por id; `utils/catalog-image.ts`
monta os nomes (`<slug>-<largura>.<hash>.<ext>`) para o build e para o
`<Picture>`.

Falha de imagem nunca derruba o deploy sozinha: o produto sai sem foto, com
aviso de linha, id e título, e o original em cache segura a foto quando a
origem falha. O disjuntor (`shouldTripBreaker`) só dispara com mais da metade
quebrada **e** pelo menos 3 — o piso evita que o primeiro link ruim derrube o
build. 404 em URL derivada sem cache é "sem foto", não falha: é o estado
normal enquanto as fotos não sobem. Em preview com `ALLOW_STALE_CATALOG=1`, o
disjuntor vira aviso.

O resumo do log termina em `imagens_ok=N imagens_cache=K imagens_falha=M
imagens_sem_foto=S`; `imagens_cache` são fotos servidas do cache com a origem
falhando, e contam no disjuntor.

### Pré-renderização (SSG)

```
src/entry-server.tsx ──(vite build --ssr)──► dist-ssr/entry-server.js
                                                    │
dist/index.html (template do build:client) ─────────┤
                                                    ▼
                                   scripts/prerender.ts ──► dist/index.html
                                                            dist/catalogo.html
                                                            dist/catalogo/<slug>.html
                                                            dist/404.html
                                                            dist/sitemap.xml
                                                            dist/robots.txt
```

- **Uma árvore de rotas só** (`router/tree.tsx`), usada pelo
  `createBrowserRouter` e pelo `createStaticHandler`: duas listas divergiriam.
- **`PRERENDER_PATHS` sai do menu** (`seo/route-meta.ts`): um catálogo novo em
  `nav-item.mock.ts` vira página, sitemap e metadados sem tocar em mais nada.
- **A guarda de hidratação** (`main.tsx`): `hydrateRoot` só quando
  `<html data-prerender-path>` é igual a `location.pathname`. O `404.html` é
  servido em qualquer caminho desconhecido; hidratá-lo noutra URL daria
  mismatch. Não "simplifique" para sempre hidratar.
- **`scripts/` não importa `src/**`em runtime** (os imports de`src`não têm
extensão): o`prerender.ts`consome só o`dist-ssr`, pelo contrato
`ssg/entry-contract.ts`.
- **A origem do site** vem de `SITE_URL` ou de `VERCEL_PROJECT_PRODUCTION_URL`,
  resolvida no Node e carimbada em `<html data-site-url>`; só
  `VERCEL_ENV=production` sai indexável.
- **O `<head>` na navegação SPA** é mutado por `useRouteMeta()` num efeito,
  nunca pelo hoisting de `<title>` do React 19 (anexaria um segundo).
- O primeiro card com foto ganha `<link rel="preload">` no `<head>`, com o
  mesmo `imagesrcset`/`imagesizes` do `<Picture>` (`IMAGE_SIZES`).

Armadilhas já resolvidas, que não devem voltar:

- texto em branco dentro de `#root` impede a hidratação da página inteira: o
  template mantém `<div id="root"><!--app-html--></div>` colado;
- erro de componente dentro de `<Suspense>` não rejeita o `prerender` — o
  `entry-server` coleta os erros e falha;
- sem `progressiveChunkSize` no máximo, o React tira a grade de produtos do
  lugar e a revela com `<script>` inline;
- `formatPrice` normaliza o espaço depois do "R$" para NBSP: o ICU do Node e o
  do navegador divergem.

### Tipos

- `Product` (`types/product.type.ts`): linha da planilha. `price` é o preço
  cheio; `promoPrice` é opcional e, quando presente, é o valor em destaque no
  card, com `price` riscado ao lado. `imageKey` só existe quando o build emitiu
  a foto.
- `CatalogImage` / `CatalogImages` (`types/catalog-image.type.ts`): entrada do
  manifesto de fotos. `CatalogImages` é `Partial`, então o card é obrigado a
  tratar o produto sem foto.
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
- foto do produto em `<picture>` AVIF/WebP responsivo, com placeholder quando
  não há foto (CLS medido: 0);
- busca por título ou marca, com debounce de 250ms e estado vazio próprio;
- slug inválido, catálogo vazio, busca sem resultado e rota `*` com
  `<EmptyState>`;
- HTML pré-renderizado por rota, hidratado no cliente (conferido no Chrome em
  todas as rotas), com `<head>`, JSON-LD, sitemap e robots por ambiente; rota
  desconhecida responde 404 de verdade.

O que está aberto — com critérios de aceite — está em
[PLANO_DEFINITIVO_V1.md](./PLANO_DEFINITIVO_V1.md). Em resumo: `Home.tsx` ainda
placeholder (a `<h1>` "Página Inicial" é indexada até o S4), sem footer nem
botão flutuante. A identidade Aura Beauty (S0), a Planilha Google com testes
(S1), o pipeline de imagens (S2) e o SSG com SEO técnico (S3) já foram
entregues; as fotos reais dependem da consultora subir os arquivos no
Cloudinary.

Ao levar a busca para `?q=` (S4), leia o `q` **depois** da hidratação: no
primeiro render o servidor não tem query string, e qualquer diferença vira
mismatch.

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
- **Verificação:** `npm run build` cobre typecheck, build e a validação do HTML
  pré-renderizado. Para validar uma
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
descreve navegação (estrutura do site); `data/products.mock.ts` é o fixture de
fallback para build sem credencial e para os testes — desde a entrada da
planilha, ele não é mais a origem dos dados.

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
fallback do `<Suspense>` e causa mismatch de hidratação. O mesmo vale para
**loaders**: sem eles o router do cliente nasce inicializado e o
`StaticRouterProvider` dispensa dados de hidratação (`hydrate={false}`); com
um loader, isso passa a ser obrigatório.

**Encerrado — fallback de SPA na Vercel.** Até o S3, o `vercel.json`
reescrevia toda rota para `index.html`, porque sem isso F5 em `/catalogo/...`
caía no 404 da Vercel. Com o prerender, cada rota é um arquivo: o
`vercel.json` usa `cleanUrls` e `trailingSlash: false`, **sem rewrite**, e
caminho desconhecido recebe o `404.html` com status 404. Não volte a pôr
catch-all: ele transformaria todo 404 em _soft 404_.

**Decidido — imagens otimizadas no build, nunca servidas da origem remota.** A
planilha guarda a URL (Cloudinary como destino, Google Drive tolerado); o build
baixa, recorta em quadrado e emite AVIF/WebP locais em `public/img/`. Por isso o
campo do tipo `Product` passa a ser `imageKey`, e não `imageUrl`: torna
impossível, por tipo, renderizar uma origem remota por engano.

**Decidido — URL do Cloudinary derivada sem pasta.** A conta usa pastas
dinâmicas: `aura-beauty/produtos` organiza a Media Library, mas não entra no
`public_id`. A URL derivada é `.../image/upload/<id>.jpg`, com `.jpg` fixo
porque o build não sabe a extensão subida e o Cloudinary converte na entrega
(uma transformação por versão da foto, inclusive HEIC do iPhone). Verificado
com a foto de teste `TST-001` em 2026-09-30. Um link do Cloudinary colado em
`imagem_url` passa pela mesma regra: o build tira a versão e troca a extensão
por `.jpg`, ou o HEIC chegaria cru ao `sharp` (verificado com `TST-005` em
2026-10-08).

O raciocínio completo de cada uma dessas decisões está em
[PLANO_DEFINITIVO_V1.md](./PLANO_DEFINITIVO_V1.md) §2 a §4.
