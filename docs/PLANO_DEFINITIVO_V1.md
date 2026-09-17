# Plano Definitivo V1 — Aura Beauty

Catálogo de beleza à pronta-entrega em Manaus. Este documento é o plano de execução do V1: define a arquitetura alvo, o contrato da Planilha Google, o roteiro em semanas flexíveis e as issues a abrir no GitHub.

Complementa [CONTEXTO_IA.md](./CONTEXTO_IA.md), que guarda o estado consolidado da arquitetura. **Substitui o antigo `PLANO_IA.md`**, removido junto com a abertura deste plano: seus itens abertos (6, 7, 8, 10 e 11) foram absorvidos nas issues abaixo, e os "porquês" que ainda não tinham migrado foram para o `CONTEXTO_IA.md`.

---

## 1. Onde estamos

O site funciona como SPA: cinco catálogos numa rota dinâmica, busca com debounce, estados vazios padronizados e CTA de WhatsApp por produto. O que falta é tudo que transforma isso num site publicável.

| Frente                             | Situação                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| Renderização                       | SPA pura — o crawler recebe `<div id="root"></div>` vazio                     |
| Dados                              | 30 produtos hardcoded em `src/data/products.mock.ts`                          |
| Imagens                            | Nenhuma. Todo card renderiza um bloco bege vazio                              |
| Home                               | `<h1>Página Inicial</h1>`                                                     |
| Footer / botão flutuante / banners | Não existem                                                                   |
| Identidade                         | "Consultora Acsa"; o favicon ainda é o roxo do template Vite                  |
| SEO                                | Um `<title>` global. Sem description, canonical, OG, sitemap, robots, JSON-LD |
| Deploy                             | Sem `vercel.json`, sem CI, sem domínio                                        |
| Testes                             | Sem runner                                                                    |

---

## 2. Decisões de arquitetura

### 2.1 Renderização: Vite + SSG próprio (nem Astro, nem Next)

O problema real não é "o Google não executa JavaScript" — ele executa. São duas outras coisas:

1. **Core Web Vitals são sinal de ranqueamento.** Numa SPA, o LCP espera baixar o bundle, hidratar e só então pintar o produto. Com HTML pronto, o LCP é o tempo de baixar o HTML e a imagem.
2. **Cada rota precisa de `<title>`, `description`, canonical e OG próprios no HTML servido.** Hoje as seis rotas compartilham um `<title>` só — inclusive o 404.

Para **8 rotas conhecidas em build** (`/`, `/catalogo`, 5 slugs e o 404), um script de pré-renderização resolve os dois pontos **sem nenhuma dependência nova**:

| O que o Next/Astro entregaria | Equivalente aqui                                          | Custo   |
| ----------------------------- | --------------------------------------------------------- | ------- |
| SSG por rota                  | `createStaticHandler` + `react-dom/static`, já instalados | Baixo   |
| Metadata API                  | Objeto tipado por rota, injetado no `<head>` pelo script  | Trivial |
| `next/image` / `astro:assets` | `sharp` no build sobre as URLs da planilha (§4)           | Médio   |
| Sitemap oficial               | Gerado do mesmo `NAV_ITEMS` que monta o menu              | Trivial |
| ISR / revalidação             | Deploy Hook disparado pela planilha (§3.5)                | Baixo   |

**Verificado antes de escrever este plano**, lendo `node_modules`:

- `react-router@7.18.1` exporta `createStaticHandler`, `createStaticRouter` e `StaticRouterProvider` na entrada raiz, com JSDoc marcada `@mode data` — ou seja, são as APIs de SSR do **library mode**, não exclusivas do framework mode.
- `react-dom@19.2.8` expõe `react-dom/static` (`prerender`, `prerenderToNodeStream`).
- `vite@8.1.5` mantém `vite build --ssr <entry> --outDir <dir>`.
- `tsconfig.app.json` já tem `erasableSyntaxOnly` e `allowImportingTsExtensions`, então os scripts de build rodam sob o _type stripping_ nativo do Node 24 e podem importar `src/mocks/nav-item.mock.ts` diretamente — sem duplicar a lista de marcas.
- `use-debounced-value.ts` inicializa com `useState(value)`, devolvendo `""` de forma síncrona no primeiro render — não é fonte de mismatch.

O que **não** ganhamos, e é honesto registrar: o conteúdo só atualiza com um novo build. Para um catálogo editado algumas vezes por semana isso é aceitável, e é o trade-off explícito desta escolha. Se um dia a operação exigir preço mudando de minuto a minuto, o caminho de saída é SSR — e `catalog.service.ts` já está isolado o bastante para isso não ser uma reescrita.

**Descartados:** Astro (reescrever shell, layout e roteamento para ganhar um pipeline de imagens que o `sharp` cobre); Next.js (framework inteiro para 8 rotas, com runtime maior no cliente); `vite-react-ssg` (0.x, mantenedor único); e a API `builder` do Vite, que ainda está tipada como `@experimental` — `dependency-management.md` é explicitamente conservador.

### 2.2 A regra que não muda

O menu continua sendo a fonte da verdade do agrupamento, e o serviço continua **síncrono**:

```
Planilha ──(build)──► scripts/build-data.ts ──► src/data/products.generated.ts
                                                          │
NAV_ITEMS[].brands ───────────────────────────────────┐   │
                                                      ▼   ▼
                                     services/catalog.service.ts  (síncrono, API intacta)
                                                      │
                              ┌───────────────────────┴────────────────────┐
                              ▼                                            ▼
                 scripts/prerender.js (HTML)                  bundle do cliente (busca)
```

O item 7 do antigo `PLANO_IA.md` temia o assincronismo, os estados de carregando e de erro. **Isso só valeria para um fetch em runtime.** Com a rede acontecendo no build, `getCatalogBySlug` continua síncrono e `pages/Catalog/index.tsx` não ganha nenhum estado novo — o contrato que o próprio item 7 pedia ("`catalog.service.ts` só muda a origem dos dados") é cumprido literalmente, em **uma linha de import**.

### 2.3 Segurança de dados

A credencial da planilha fica em variável **sem prefixo `VITE_`**, lida só pelo Node no build. O Vite só inlina variáveis prefixadas, então é estruturalmente impossível que ela vaze para o bundle.

Em contrapartida, uma API key do Google só alcança documentos **compartilhados publicamente** — ela é credencial de cota e identidade, não de controle de acesso. A planilha precisa estar como "qualquer pessoa com o link pode ver". Portanto: **nunca coloque preço de custo, fornecedor ou dado pessoal nessa planilha.** Esses dados vão para outra, separada.

---

## 3. Contrato da Planilha Google

### 3.1 Estrutura

Uma planilha, "Aura Beauty — Catálogo", com três abas:

| Aba                | Papel                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| `produtos`         | Base de **produção**                                                        |
| `produtos_preview` | Base de **preview** — mesma estrutura, para ensaiar sem afetar o site no ar |
| `_marcas`          | Oculta. Coluna A com as marcas válidas; alimenta a validação de dados       |

### 3.2 Colunas de `produtos`

Linha 1 são os cabeçalhos, congelada e protegida.

| Col | Cabeçalho           | Tipo     | Validação de dados                             | Obr. | Regra                                                               |
| --- | ------------------- | -------- | ---------------------------------------------- | ---- | ------------------------------------------------------------------- |
| A   | `id`                | texto    | —                                              | ✅   | Único e estável (`BOT-001`). Vira `key` no React — nunca reutilizar |
| B   | `marca`             | texto    | **Lista de `_marcas!A:A`, "Rejeitar entrada"** | ✅   | Chave de junção com `brands` do menu                                |
| C   | `titulo`            | texto    | —                                              | ✅   | Nome completo com tamanho/quantidade                                |
| D   | `preco`             | número   | número > 0                                     | ✅   | Formatar a célula como **Número**, não Moeda                        |
| E   | `preco_promocional` | número   | fórmula `= E2 < D2`                            | —    | Vazio = sem promoção                                                |
| F   | `imagem_url`        | texto    | —                                              | —    | Link do Drive ou Cloudinary (§4)                                    |
| G   | `ativo`             | booleano | caixa de seleção                               | ✅   | `FALSE` remove o produto do site                                    |
| H   | `ordem`             | inteiro  | —                                              | —    | Ordena dentro da marca; vazio vai para o fim                        |
| I   | `destaque`          | booleano | caixa de seleção                               | —    | Alimenta a seção de destaques da Home                               |
| J   | `atualizado_em`     | data     | —                                              | —    | Operacional; não entra no bundle                                    |

O tipo `Product` muda em dois pontos: ganha `featured?: boolean` (coluna I) e troca `imageUrl?: string` por **`imageKey?: string`** (§4). Trocar o campo é deliberado — torna _impossível por tipo_ renderizar uma origem remota, que é justamente o que o pipeline de imagens existe para evitar. `ativo`, `ordem` e `atualizado_em` são consumidos pelo script e não chegam ao tipo.

### 3.3 A marca é a peça crítica

A marca é a chave de junção com o menu: digitar "Boticario" à mão cria um produto invisível no site, sem erro em lugar nenhum. Três camadas contra isso:

1. **Aba `_marcas` + validação com "Rejeitar entrada"** — só as dez strings exatas são digitáveis.
2. **O build compara `_marcas!A:A` com `CATALOG_NAV_ITEMS.flatMap((i) => i.brands)`** e falha se divergirem. O código continua sendo a fonte da verdade; a planilha só espelha para alimentar a lista suspensa.
3. **O build ainda valida cada linha** — porque colar num campo validado contorna a lista. Se `normalize()` casar, o script **reescreve o valor para a string canônica do menu** e avisa; se nem normalizado casar, pula a linha.

A camada 3 move a canonicalização do render para o build. `normalize()` continua existindo em `catalog.service.ts`, porque `searchProducts` ainda precisa dele para a entrada do usuário.

### 3.4 Leitura no build

**Sheets API v4**, com `fetch` puro (~10 linhas, sem o SDK `googleapis`):

```
GET https://sheets.googleapis.com/v4/spreadsheets/{ID}/values/{ABA}!A:J
    ?key={KEY}&valueRenderOption=UNFORMATTED_VALUE
```

O argumento decisivo é `valueRenderOption=UNFORMATTED_VALUE`: **os preços chegam como números JavaScript.** Com CSV publicado você recebe `"R$ 189,50"` ou `"189,50"` conforme a formatação da célula, e acaba escrevendo um parser de decimal com vírgula que uma hora vai errar. O resto reforça a escolha: usa o **nome** da aba em vez de um `gid` opaco, devolve status HTTP de verdade e não tem cache de publicação. Cota é irrelevante (300 leituras/min contra uma por build).

O CSV publicado / `gviz` fica documentado como plano B e não se constrói nada sobre ele, por um motivo específico: **falha de permissão volta como página HTML de login com HTTP 200**, e o parser produz lixo em silêncio. Falha silenciosa é a pior forma de falha.

### 3.5 Validação — o que quebra o build e o que só avisa

**Estrutural → `exit 1`, nada é escrito, o deploy falha:**

- variáveis de ambiente ausentes;
- resposta não-2xx ou corpo não-JSON da API;
- **cabeçalho fora do esperado** (nome ou ordem) — pega "alguém inseriu uma coluna", a quebra mais provável de todas;
- **zero linhas de dados** num 200 — catálogo vazio é possível, planilha vazia quase nunca; é o detector de aba errada;
- **`id` duplicado** — `CatalogGrid.tsx:12` usa `key={product.id}`; duplicata corrompe a reconciliação do React;
- `_marcas!A:A` divergindo da lista do código;
- **disjuntor: mais de 20% das linhas rejeitadas.** Muitas falhas pequenas são uma falha grande. É isso que pega "a coluna de preço virou texto", que sem o disjuntor derrubaria os 30 produtos e publicaria um catálogo vazio com build verde.

**Linha a linha → pula ou degrada, com aviso e o número da linha:**

| Situação                             | Ação                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `titulo` vazio                       | **Pula** — sem título não há card nem mensagem de WhatsApp                                         |
| `preco` ausente, não numérico ou ≤ 0 | **Pula** — `formatPrice(NaN)` devolve `"R$ NaN"` e o card não tem guarda                           |
| `preco_promocional` ≥ `preco`        | **Mantém, descarta a promoção** — riscar um valor menor que a "oferta" é pior que não ter promoção |
| `marca` desconhecida                 | Canonicaliza se `normalize()` casar; senão **pula**                                                |
| `ativo = FALSE`                      | **Pula em silêncio** — é ação intencional, não erro                                                |
| `imagem_url` vazia                   | **Mantém sem foto** — o card já trata a ausência                                                   |

Avisos saem **agrupados no fim**, com uma linha final greppável — avisos espalhados são invisíveis num log de build da Vercel:

```
[catalogo] produtos=28 ignorados=2 imagens_ok=26 imagens_falha=2
```

### 3.6 Onde o dado cai

**`src/data/products.generated.ts`**, exportando `export const PRODUCTS: Product[]`.

**`.ts` e não `.json`**, por três motivos concretos: `resolveJsonModule` não está no `tsconfig.app.json` e teria de ser adicionado; um `.ts` é **typechecado de graça pelo `tsc -b` que já existe no build**, então saída malformada do gerador quebra o build sozinha; e JSON não representa `promoPrice?: number` ausente (não existe `undefined` em JSON).

O arquivo é **gitignorado**, e o gerador roda tanto em `prebuild` quanto em `predev` — então um clone novo faz `npm install && npm run dev` e funciona. Sem credencial, o script gera o arquivo a partir de `products.mock.ts` com aviso; **com `process.env.VERCEL` definido, a ausência de credencial falha o build**. O dev roda offline, a Vercel nunca publica dado falso.

> Considerada e recusada por ora: versionar o arquivo gerado para ter um histórico de mudanças de preço no `git log`. O histórico só seria fiel se algo commitasse o resultado de cada build — o que exige uma Action agendada. Sem ela, o arquivo versionado envelhece parecendo autoritativo. Fica anotado como melhoria futura, junto da Action.

Guardas: banner `// GERADO POR scripts/build-data.ts — NÃO EDITE À MÃO`, entrada em `.prettierignore` e em `globalIgnores` do ESLint, e **saída determinística** (ordem de chaves e ordenação estáveis).

### 3.7 Publicar sem redeploy manual

Um Deploy Hook da Vercel mais um menu no Apps Script da planilha: `Aura Beauty ▸ Publicar alterações` → `UrlFetchApp.fetch(hookUrl, { method: "post" })`. Menu explícito em vez de gatilho `onEdit` — senão cada célula editada dispara um build.

---

## 4. Pipeline de imagens

A consultora cola uma URL na coluna `imagem_url`. O build faz o resto, e **a origem remota nunca é acessada pelo usuário final** — o que tira do caminho crítico a lentidão e os limites do Google Drive.

### 4.1 Etapas

1. **Normalizar.** Extrai o id de qualquer formato de link do Drive e monta `https://drive.google.com/thumbnail?id=<ID>&sz=w2000`, que devolve bytes de imagem direto, sem interstício. URLs do Cloudinary e diretas passam intactas.
2. **Baixar** para `node_modules/.cache/catalogo-imagens/`, com `If-None-Match`/`If-Modified-Since` quando a origem suporta ETag.
3. **Otimizar** com `sharp`: quadrado com `fit: "cover", position: "attention"`, nas larguras **320, 480, 640 e 960**, em **AVIF** (q50) e **WebP** (q78) — sem JPEG, porque todo navegador que executa este bundle suporta WebP e `<picture>` já degrada sozinho.
4. **Emitir** em `public/img/<slug>-<largura>.<hash>.<ext>` (gitignorado). O Vite copia `public/` para `dist/` sem tocar nos nomes — e, de quebra, **`npm run dev` passa a mostrar as imagens reais**, o que não aconteceria se o script escrevesse direto em `dist/`.
5. **Manifesto** `src/data/images.generated.ts`, indexado pelo `id` do produto.

As larguras vêm da medida real do layout, não de chute: `CatalogGrid` é `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` dentro de `max-w-page` (80rem) com `px-4 sm:px-6 lg:px-8` e `gap-4` — o maior card fica em ~292 px CSS, ou ~584 em 2× e ~876 em 3×.

Recortar o quadrado no build significa que a proporção intrínseca **é** a caixa do CSS: o CLS fica zero por construção, não por ajuste.

### 4.2 O componente `<Picture>`

Emite `<picture>` com `<source>` AVIF, `<source>` WebP e um `<img>` com `width`/`height` intrínsecos, `alt`, `loading`, `decoding` e `fetchPriority`.

Dois detalhes que decidem se isso é otimização ou regressão:

- **`sizes` precisa descrever a grade real**, não `100vw`: `sizes="(min-width: 1024px) 292px, (min-width: 768px) 45vw, 92vw"`. Um `sizes` errado é a forma mais comum de um pipeline "responsivo" acabar entregando o arquivo de 960 px para celular.
- **`<link rel="preload" as="image" imagesrcset imagesizes>` para a imagem do LCP**, injetado no `<head>` pelo prerender — que é quem sabe qual produto renderiza primeiro. É a alavanca mais forte de LCP disponível, e **só a etapa de SSG consegue fazer isso**.

`CatalogGrid` passa `priority={index < 4}`; os quatro primeiros ficam `eager` + `fetchPriority="high"`, o resto `lazy`. Sem entrada no manifesto, cai no bloco `aspect-square` vazio que o card já renderiza hoje.

### 4.3 Quando a imagem falha

**Avisa e segue; o produto é publicado sem foto.** Isso vale para não-2xx, para 2xx com `content-type` que não seja `image/*` (é assim que se pega a página de "você precisa de permissão" do Drive, que vem com status 200) e para erro de decodificação do `sharp`.

Falhar o deploy por um link quebrado significaria que **mover um arquivo para a lixeira derruba o site**. Se existir original em cache, ele é usado com aviso — o que dá uma janela de tolerância para alguém perceber. **Disjuntor: mais de 50% das imagens falhando é estrutural** e aí sim quebra o build; é o que separa "um link apodreceu" de "a pasta do Drive foi despublicada".

### 4.4 Cache entre builds

A Vercel **sempre** preserva `node_modules/**` entre builds e **não permite configurar quais diretórios cachear** — por isso o cache fica sob `node_modules/.cache/`, que é o único mecanismo suportado, não uma gambiarra. Build frio (30 produtos × 4 larguras × 2 formatos = 240 codificações) fica em ~30–60 s; quente, em poucos segundos.

> **Armadilha a registrar em `dependency-management.md`:** a chave do cache da Vercel inclui a versão do Node e o gerenciador de pacotes, e o install padrão é `npm install`, que preserva `node_modules/.cache/`. **`npm ci` apaga `node_modules` inteiro** — se alguém trocar o install command "para endurecer", o cache de imagens evapora a cada build e ninguém liga uma coisa à outra.

### 4.5 Drive funciona; Cloudinary é o que continua funcionando

Todo caminho de download direto do Drive é indocumentado, sensível ao compartilhamento **de cada arquivo** e falha como HTTP 200 + HTML em vez de erro. Reorganizar o Drive quebra o pipeline em silêncio. O plano normaliza links do Drive para a consultora poder colar o que já tem, mas **o destino pretendido é o Cloudinary**, que dá URL estável, ETag de verdade e semântica HTTP correta.

A migração não muda uma linha do pipeline — só as URLs na planilha.

### 4.6 Cloudinary no plano gratuito

**O ponto que muda tudo neste escopo:** aqui o Cloudinary é usado como **armazenamento e origem**, não como CDN de transformação. Quem redimensiona e converte é o `sharp`, no build. O visitante do site **nunca** faz uma requisição ao Cloudinary — ele recebe arquivos de `public/img/` servidos pela Vercel.

Isso reposiciona completamente o consumo do plano gratuito, que é medido em **créditos mensais** (na prática: 1 crédito ≈ 1.000 transformações, ou 1 GB armazenado, ou 1 GB de banda de entrega):

| Recurso              | Como este projeto consome                                        | Ordem de grandeza                    |
| -------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| **Transformações**   | Nenhuma — pedimos o arquivo original, sem `f_auto`/`q_auto`/`w_` | **zero**                             |
| **Banda de entrega** | Só o build, e só quando o cache de §4.4 dá miss                  | ~15 MB num build frio de 30 produtos |
| **Armazenamento**    | Uma imagem original por produto                                  | ~15 MB a 30 produtos; ~150 MB a 300  |

O consumo **não cresce com o tráfego do site**, e é isso que torna o plano gratuito sustentável de verdade aqui: dobrar as visitas não consome nem um byte do Cloudinary. Um catálogo de 300 produtos ainda fica em uma fração de um crédito por mês.

> Os números do plano gratuito mudam de tempos em tempos. Confirme os limites vigentes no painel da conta antes de assumir folga — o que este plano garante é o **formato** do consumo (quase todo em armazenamento, quase nada em banda, nada em transformação), não o valor exato do limite.

**Como a consultora usa, na prática:**

1. Conta gratuita no Cloudinary (não pede cartão). Anotar o **`cloud_name`**, que aparece no painel.
2. Criar a pasta `aura-beauty/produtos` na Media Library.
3. Subir as fotos arrastando na Media Library (web ou celular). **Nomear cada arquivo com o `id` do produto** da planilha — `BOT-001.jpg`, `NAT-014.jpg`.
4. Copiar a URL pública do arquivo e colar na coluna `imagem_url`:
   ```
   https://res.cloudinary.com/<cloud_name>/image/upload/aura-beauty/produtos/BOT-001.jpg
   ```
5. Trocar a foto de um produto = subir por cima com o mesmo nome. O ETag muda, o build rebaixa e recodifica sozinho (§4.4); nada na planilha precisa ser editado.

**Por que o passo 3 importa:** se o `public_id` for igual ao `id` da planilha, a URL vira previsível. Com `CLOUDINARY_CLOUD_NAME` configurado, o `scripts/build-data.ts` pode **montar a URL sozinho** quando `imagem_url` estiver vazia, e a coluna passa a existir só para exceções (uma imagem hospedada em outro lugar). Menos um campo para errar — e a coluna continua tendo precedência quando preenchida, então a convenção nunca vira uma amarra.

**Detalhes que evitam surpresa:**

- **Usar a URL sem o `v<versão>`.** A versão fixa a entrega numa revisão específica, o que é exatamente o oposto do que se quer quando a foto é substituída.
- **Não usar `f_auto,q_auto` nem parâmetros `w_`.** Não fazem falta (o `sharp` já faz melhor, e localmente), e cada URL derivada nova consome transformação.
- **Nada de upload preset não assinado** enquanto não houver painel admin. Um preset aberto permite que qualquer pessoa suba arquivos para a conta. Se o painel entrar no futuro (§12), aí sim, com pasta e formato restritos no preset.
- **Não subir nada além de foto de produto.** A conta gratuita é a mesma para tudo; logo e banners são assets do repositório, não da Media Library.

---

## 5. Identidade — Aura Beauty

A troca de nome tem superfície pequena no código: 7 ocorrências em 6 arquivos, e só **duas** visíveis ao usuário — `index.html:7` (aba do navegador) e `NavBrand.tsx:5` (alt/title do logo). As menções a "consultora" em `whatsapp.ts` e `.env.example` são o substantivo comum, não a marca: **não renomear**.

**Assets a produzir** (entrada do usuário, não do código):

| Asset               | Formato                          | Uso                       |
| ------------------- | -------------------------------- | ------------------------- |
| Logo principal      | SVG otimizado (SVGO, < 10 KB)    | Header e footer           |
| Favicon             | SVG + `favicon.ico` 32×32        | Aba do navegador          |
| Apple touch icon    | PNG 180×180                      | iOS                       |
| Imagem de OG        | PNG/JPG 1200×630                 | Compartilhamento em redes |
| Banners do catálogo | 2× 480×160 (WhatsApp, Instagram) | Seção fixa (§6)           |

> O PNG atual do logo tem 40 KB e o SVG órfão tem 54 KB — ambos saem. Um SVG limpo fica entre 3 e 8 KB e serve as duas aplicações.

**O logo precisa sair de `src/assets/`.** Hoje ele é importado como módulo, o que faz o bundler gerar a URL com hash — e o SSG roda duas passagens de build separadas, onde `ssrEmitAssets` é `false` por padrão. É exatamente o tipo de divergência entre passagens que só aparece quando já quebrou. Movendo para `public/` (ou para o manifesto de imagens, já que ele está no caminho do LCP no header), as duas passagens leem uma string literal.

O repositório é renomeado para `catalogo-aura-beauty` com `gh repo rename`; o GitHub mantém redirect do nome antigo, então nada quebra. Renomear também o diretório local e conferir `git remote -v`.

**Paleta:** os tokens atuais (`#5c312d`, `#854742`, `#ffe1df`) já são exatamente o marrom/blush do Figma — não mudam. Falta apenas tipografia: hoje o projeto roda na pilha de fontes do sistema, sem nenhum `--font-*` no `@theme`.

---

## 6. Escopo de UI

| #   | Entrega                         | Detalhe                                                                                                                                                              |
| --- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Home**                        | Hero com `<h1>` local · busca global sobre todos os produtos · os 5 catálogos · destaques (coluna `destaque`) · como funciona · área de entrega · FAQ em `<details>` |
| 2   | **Footer**                      | Barra marrom, logo centralizado, copyright e crédito de desenvolvimento, em todas as rotas — hoje ausente do `App.tsx`                                               |
| 3   | **Botão flutuante de WhatsApp** | `position: fixed`, sem impacto em CLS, com `aria-label` descritivo                                                                                                   |
| 4   | **Banners fixos no catálogo**   | Dois blocos 480×160 no rodapé de cada catálogo: contato e Instagram. Os links vêm de env — por isso depende de §7                                                    |
| 5   | **Busca em `?q=`**              | O termo passa a viver na URL: torna a busca compartilhável e habilita o `SearchAction` do JSON-LD                                                                    |

O `CatalogCard` atual já bate com o Figma (marca em eyebrow, título em negrito, preço riscado + promocional, CTA em pílula). Os ajustes são o fundo `surface-soft` na área de texto, as imagens reais e o contador ("Exibindo **12** produtos de **12**").

---

## 7. Ambientes e deploy

Preset **Vite** na Vercel (não Next), output `dist`. Nenhuma variável de dados leva prefixo `VITE_`.

| Variável                | Escopo       | Production                  | Preview               |
| ----------------------- | ------------ | --------------------------- | --------------------- |
| `GOOGLE_SHEETS_ID`      | Build (Node) | id da planilha              | mesmo id              |
| `GOOGLE_SHEETS_API_KEY` | Build (Node) | chave restrita à Sheets API | mesma chave           |
| `CATALOG_SHEET_TAB`     | Build (Node) | `produtos`                  | `produtos_preview`    |
| `CLOUDINARY_CLOUD_NAME` | Build (Node) | mesmo valor                 | mesmo valor           |
| `ALLOW_STALE_CATALOG`   | Build (Node) | —                           | `1`                   |
| `VITE_SITE_URL`         | Cliente      | domínio final               | `https://$VERCEL_URL` |
| `VITE_WHATSAPP_NUMBER`  | Cliente      | número real                 | número de teste       |
| `VITE_INSTAGRAM_URL`    | Cliente      | perfil real                 | perfil real           |

Uma planilha só, duas abas — exatamente a ideia do briefing, sem duplicar cadastro. Na prática isso dá à consultora um espaço de ensaio: edita `produtos_preview`, abre a URL de preview, e só então copia para `produtos`.

**Preview não pode ser indexado.** `robots` é derivado de `VERCEL_ENV === "production" ? "index" : "noindex"`, e o `robots.txt` gerado emite `Disallow: /` fora de produção. É um esquecimento comum e caro: sem isso o Google indexa `catalogo-abc123.vercel.app` competindo com o domínio real.

**Sem rewrite de SPA.** Com cada rota virando um HTML de verdade, o layout de saída fica:

```
dist/index.html                    → /
dist/catalogo.html                 → /catalogo
dist/catalogo/moda-intima.html     → /catalogo/moda-intima   (×5)
dist/404.html                      → caminhos desconhecidos
```

A Vercel dá precedência ao sistema de arquivos antes das rewrites, e serve um `404.html` na raiz **com status 404 real**. Um catch-all em `rewrites` devolveria 200 — um _soft 404_, que o Google trata como problema de qualidade. A mudança de comportamento é intencional e correta: link profundo inexistente agora é 404 de verdade, e não boot de SPA.

`vercel.json` cobre `cleanUrls`, `trailingSlash: false`, `immutable` em `/assets/*` e `/img/*` e os headers de segurança (HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).

---

## 8. SEO

**Técnico, gerado no build:** `<title>`, `description` e canonical por rota · Open Graph + Twitter Card · `sitemap.xml` e `robots.txt` · `lang="pt-br"` · uma `<h1>` por página.

A lista de rotas a pré-renderizar é **derivada, nunca hardcoded**: `["/", "/catalogo", ...CATALOG_NAV_ITEMS.map((i) => i.path), "/404"]`. Isso estende ao SEO o invariante que o projeto já tem — _o menu é a fonte da verdade_ — de modo que adicionar um sexto catálogo em `nav-item.mock.ts` produz sozinho uma página pré-renderizada, indexada e no sitemap.

> **Escapar HTML é obrigatório, não opcional.** Três dos cinco rótulos de catálogo contêm `&` cru: `"o Boticário, Eudora & OUI"`, `"Natura & Avon"` e `"Joias & Acessórios"`. O JSON-LD precisa de `JSON.stringify(x).replace(/</g, "\\u003c")` para que um título de produto não consiga escapar da tag `<script>`.

**Dados estruturados:** `LocalBusiness` + `WebSite`/`SearchAction` na Home; `CollectionPage` + `ItemList` de `Product`/`Offer` nos catálogos; `BreadcrumbList` nas rotas internas.

> Ressalva honesta: rich results de produto no Google normalmente exigem Merchant Center e não são garantidos por schema. O JSON-LD continua valendo — clareza semântica e consumo por motores de resposta com IA — mas não deve ser vendido como ganho certo de CTR.

**Título durante navegação SPA:** mutar `document.title` e os nós de `description`/canonical num `useEffect`, **não** usar o hoisting de `<title>` do React 19 — o head já vem renderizado do servidor e o React acabaria anexando um segundo. Efeitos não rodam no SSR, então não existe superfície de mismatch.

**SEO local é o pilar** para pronta-entrega em Manaus: consistência de nome, telefone e área de atendimento entre site e Google Business Profile, e "produto + Manaus" nos títulos. _Criar e trabalhar o Google Business Profile está fora do código e provavelmente rende mais que qualquer otimização técnica desta lista._

---

## 9. Performance

**Antes de qualquer otimização: os 54 pontos foram medidos em `npm run dev`.** O servidor de desenvolvimento serve módulos não minificados, sem compressão e com o build de desenvolvimento do React — aquela nota não mede o site publicado. A primeira ação é **remedir com `npm run build && npm run preview`** e registrar a linha de base real. É provável que boa parte dos 46 pontos desapareça sem uma linha de código.

O que sobra, e que este plano resolve de fato: HTML vazio até hidratar (§2.1), imagens sem dimensão declarada causando CLS (§4), logo PNG de 40 KB (§5) e ausência de headers de cache (§7).

**Metas no build publicado:** Performance ≥ 95 · SEO 100 · Acessibilidade ≥ 95 · Boas práticas ≥ 95 · LCP ≤ 2,0 s · CLS ≤ 0,05 · JS inicial ≤ 120 KB comprimido.

---

## 10. Roteiro — semanas flexíveis

Semanas são **ordem, não calendário**: cada bloco fecha quando seus critérios passam.

A ordem é deliberada e diferente do óbvio: **dados e imagens vêm antes do SSG.** Os dois carregam a maior parte do valor e o menor risco, e são publicáveis de forma independente com o site ainda em CSR. O SSG é onde mora o risco de hidratação — então ele entra depois de já existir um site real em produção para comparar.

| Bloco                      | Objetivo                     | Pronto quando                                                                             |
| -------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------- |
| **S0 · Fundação**          | Marca, assets e deploy base  | O site diz "Aura Beauty" em toda superfície visível e existe uma URL de preview na Vercel |
| **S1 · Planilha**          | Dado real no lugar do mock   | Editar a planilha e publicar altera o site; o serviço segue síncrono                      |
| **S2 · Imagens**           | Card com imagem otimizada    | Imagens locais em AVIF/WebP com dimensão declarada; CLS ≤ 0,05                            |
| **S3 · SSG e SEO técnico** | HTML real por rota           | `dist/` tem 8 HTMLs com `<title>`/canonical próprios; sitemap e robots gerados            |
| **S4 · Páginas e UI**      | Home, footer, botão, banners | As entregas de §6 no ar                                                                   |
| **S5 · Fechamento**        | Domínio, Lighthouse, docs    | Domínio no ar, metas de §9 batidas, README reescrito                                      |

S4 pode andar em paralelo com S1–S3: mexe em outros arquivos.

### 10.1 Estrutura de Pull Request

A descrição da PR deve explicar **o resultado e como validá-lo**, sem repetir o
diff arquivo por arquivo. Use a estrutura abaixo, adaptando os tópicos ao escopo
da branch:

```md
## Resumo

Explique em um ou dois parágrafos o que a PR entrega e por que a mudança é
necessária.

## Principais alterações

- Agrupe as mudanças por comportamento ou área do projeto.
- Destaque decisões técnicas relevantes e efeitos visíveis para o usuário.

## Como validar

- [ ] Liste os comandos executados (`npm run build`, `npm run lint`, etc.).
- [ ] Descreva somente as verificações manuais necessárias para revisar a PR.

## Pendências conhecidas

- Registre limitações ou itens deliberadamente deixados para outra issue.
- Se não houver, escreva `Nenhuma`.

Closes #<issue>
```

O título segue **Conventional Commits**. Quando uma PR contemplar várias issues,
adicione uma linha `Closes #<issue>` para cada uma; o GitHub as fecha somente
quando a PR é integrada à branch principal.

---

## 11. Issues

Os números `#01`–`#37` são **referências internas deste plano** — o GitHub atribuirá os seus. Crie antes os milestones `S0`–`S5` e as labels.

**Labels a criar:** `branding` · `ssg` · `seo` · `perf` · `data` · `infra` · `ui` · `test` (as padrão `documentation` e `enhancement` já existem).

### S0 · Fundação

| #   | Título                                                | Labels            | Depende | Critérios de aceite                                                                                                                                                                                                                       |
| --- | ----------------------------------------------------- | ----------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | `feat(branding): renomeia projeto para Aura Beauty`   | `branding`        | —       | `package.json.name` = `catalogo-aura-beauty`; novo `<title>` no `index.html`; novo alt/title no `NavBrand`; `gh repo rename`; remote local atualizado. Comentários com "consultora" em `whatsapp.ts` e `.env.example` **não** mudam       |
| 02  | `feat(branding): substitui logo e assets de marca`    | `branding` `perf` | 01      | Logo SVG < 10 KB **em `public/`, não em `src/assets/`** (§5); PNG de 40 KB e SVG órfão removidos; favicon do template removido; `favicon.ico`, apple-touch-icon 180×180 e OG 1200×630 em `public/`; tags no `index.html`                  |
| 03  | `feat(design): adiciona token de tipografia da marca` | `branding` `perf` | 02      | `--font-sans` no `@theme` com fonte auto-hospedada (`@fontsource-variable/inter@5.3.0`), `font-display: swap`, `preload` do woff2 acima da dobra. Se a medição não justificar os bytes, documentar a decisão de manter a pilha do sistema |
| 04  | `feat(infra): cria o projeto na Vercel`               | `infra`           | 01      | Projeto com preset Vite; deploy de preview funcionando na `main`; `VITE_WHATSAPP_NUMBER` e `VITE_INSTAGRAM_URL` configurados por ambiente                                                                                                 |
| 05  | `chore(git): remove a branch feat/ui-catalogo`        | —                 | —       | Branch local e remota apagadas (já mergeada em `main` via PR #3)                                                                                                                                                                          |

### S1 · Planilha Google

| #   | Título                                                | Labels                 | Depende | Critérios de aceite                                                                                                                                                                                                                                                                                  |
| --- | ----------------------------------------------------- | ---------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 06  | `docs(data): define e cria a planilha do catálogo`    | `data` `documentation` | —       | Abas `produtos`, `produtos_preview` e `_marcas` com as colunas de §3.2; validação "Rejeitar entrada" na coluna `marca`; linha de cabeçalho protegida; compartilhamento por link; API key restrita à Sheets API                                                                                       |
| 07  | `feat(build): lê a planilha em tempo de build`        | `data` `infra`         | 06      | `scripts/build-data.ts` roda em `prebuild` **e `predev`**, gera `src/data/products.generated.ts` (gitignorado, determinístico, com banner de arquivo gerado); usa `UNFORMATTED_VALUE`; importa `nav-item.mock.ts` via type stripping do Node; classificação de erros de §3.5; linha-resumo greppável |
| 08  | `refactor(catalog): consome os dados gerados`         | `data`                 | 07      | `catalog.service.ts` muda **só o import**; API pública e sincronia intactas; `Product` ganha `featured?: boolean`; ordenação por `ordem`; `products.mock.ts` vira fixture de fallback                                                                                                                |
| 09  | `feat(infra): separa as bases de preview e produção`  | `infra` `data`         | 07, 04  | `CATALOG_SHEET_TAB` com valor por ambiente (§7); preview servindo `produtos_preview`; default derivado de `VERCEL_ENV` quando a variável falta                                                                                                                                                       |
| 10  | `test: adiciona vitest e cobre a validação de linhas` | `test`                 | 08      | Vitest 4.1.10; `catalog.service` (normalização com acento, filtro por marca, busca, `groupByBrand`, slug inexistente) e `parseRow` (preço ruim, marca desconhecida, promo ≥ preço, inativo); `npm test` no fluxo de verificação                                                                      |
| 11  | `feat(infra): publica alterações via Deploy Hook`     | `infra` `data`         | 09      | Deploy Hook criado; Apps Script com menu `Aura Beauty ▸ Publicar alterações`; editar e publicar reflete no site; documentado para a consultora em linguagem não técnica                                                                                                                              |

### S2 · Imagens

| #   | Título                                                     | Labels        | Depende | Critérios de aceite                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------- | ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12  | `feat(build): baixa e otimiza as imagens no build`         | `perf` `data` | 07      | `sharp@0.35.3` fixo; normalização das 4 formas de link do Drive; **URL do Cloudinary derivada de `CLOUDINARY_CLOUD_NAME` + `id` quando `imagem_url` estiver vazia** (§4.6), com a coluna sempre tendo precedência; cache em `node_modules/.cache/catalogo-imagens`; AVIF q50 + WebP q78 em 320/480/640/960; saída hasheada em `public/img/` (gitignorado); manifesto `images.generated.ts` determinístico; concorrência 4 |
| 13  | `feat(ui): renderiza imagens responsivas no card`          | `ui` `perf`   | 12      | `<Picture>` com `srcset` e `sizes` **descrevendo a grade real** (§4.2); `width`/`height` intrínsecos; `priority={index < 4}`; `Product.imageUrl` → `imageKey`; placeholder preservado; **CLS ≤ 0,05**                                                                                                                                                                                                                     |
| 14  | `feat(build): tolera falha de imagem sem quebrar o deploy` | `perf`        | 12      | Não-2xx, `content-type` fora de `image/*` ou erro do sharp → aviso + produto sem foto; original em cache usado com aviso; **> 50% de falhas** quebra o build com mensagem apontando a permissão do Drive                                                                                                                                                                                                                  |

### S3 · SSG e SEO técnico

| #   | Título                                                           | Labels       | Depende | Critérios de aceite                                                                                                                                                                                                                                                            |
| --- | ---------------------------------------------------------------- | ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 15  | `refactor(router): extrai a árvore de rotas`                     | `ssg`        | —       | `src/router/tree.tsx` exporta `createAppRoutes(): RouteObject[]` com o `<Suspense>` de hoje; `router/index.tsx` só faz `createBrowserRouter(createAppRoutes())`. Necessário porque `createBrowserRouter` toca `window` no escopo do módulo e quebraria a importação pelo Node  |
| 16  | `refactor(ui): torna a renderização determinística entre passes` | `ssg`        | 15      | `formatPrice` normaliza NBSP/U+202F para espaço comum (skew de ICU entre Node e navegador é mismatch de texto); logo fora do pipeline de assets do bundler (feito em #02)                                                                                                      |
| 17  | `feat(ssg): adiciona a entrada de servidor`                      | `ssg`        | 16      | `src/entry-server.tsx` com `createStaticHandler` + `createStaticRouter` + `StaticRouterProvider hydrate={false}` + `prerender` de `react-dom/static`; `build:ssr` = `vite build --ssr src/entry-server.tsx --outDir dist-ssr`                                                  |
| 18  | `feat(ssg): hidrata com guarda de rota`                          | `ssg`        | 17      | `main.tsx` usa `hydrateRoot` **apenas** quando `document.documentElement.dataset.prerenderPath === location.pathname`; senão `createRoot().render()`. Cobre o `404.html` servido em qualquer caminho, que é o caso que normalmente sai quebrado                                |
| 19  | `feat(ssg): pré-renderiza todas as rotas`                        | `ssg` `perf` | 18      | `index.html` vira template (`<!--app-head-->`, `<!--app-html-->`, **sem `<title>`**); `scripts/prerender.js` gera `dist/index.html`, `dist/catalogo.html`, os 5 `dist/catalogo/<slug>.html` e `dist/404.html`, com `NODE_ENV=production`; `dist/index.html` escrito por último |
| 20  | `feat(ssg): valida o HTML gerado no próprio build`               | `ssg` `test` | 19      | O script confere em cada HTML: a `<h1>` da rota, `wa.me/<número>` (nunca `wa.me/?text=`) e ao menos uma URL `/img/`. Falta de qualquer um falha o build — é o que separa _ter_ SSG de _achar_ que tem                                                                          |
| 21  | `feat(seo): define metadados tipados por rota`                   | `seo`        | 19      | `src/seo/route-meta.ts` com `title`, `description`, canonical, OG e `robots`; `PRERENDER_PATHS` **derivado de `CATALOG_NAV_ITEMS`**; escape de HTML obrigatório (§8); `robots: noindex` fora de produção                                                                       |
| 22  | `feat(seo): gera sitemap.xml e robots.txt`                       | `seo`        | 21      | Gerados de `PRERENDER_PATHS`, sem lista paralela; `Disallow: /` fora de produção                                                                                                                                                                                               |
| 23  | `feat(seo): adiciona JSON-LD`                                    | `seo`        | 21      | `LocalBusiness` + `WebSite`/`SearchAction` na Home; `CollectionPage` + `ItemList` nos catálogos; `BreadcrumbList` nas rotas internas; `<` escapado; validado no Rich Results Test                                                                                              |
| 24  | `feat(seo): pré-carrega a imagem do LCP`                         | `perf`       | 19, 13  | `<link rel="preload" as="image" imagesrcset imagesizes>` do primeiro card, injetado pelo prerender; ganho medido antes e depois                                                                                                                                                |
| 25  | `feat(seo): atualiza o título na navegação SPA`                  | `seo`        | 21      | `useRouteMeta()` muta `document.title`, `description` e canonical em `useEffect`; **não** usa hoisting de `<title>` do React 19                                                                                                                                                |

### S4 · Páginas e UI

| #   | Título                                                | Labels     | Depende | Critérios de aceite                                                                                                                                              |
| --- | ----------------------------------------------------- | ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 26  | `feat(ui): adiciona footer global`                    | `ui`       | 02      | `components/Footer` no `App.tsx` abaixo do `<Outlet/>`; logo, copyright e crédito conforme o Figma; só tokens semânticos                                         |
| 27  | `feat(ui): adiciona botão flutuante de WhatsApp`      | `ui`       | —       | `position: fixed` em todas as rotas, `aria-label` descritivo, sem deslocar layout, reaproveitando `buildWhatsAppLink`                                            |
| 28  | `feat(home): implementa a página inicial`             | `ui` `seo` | 08, 21  | Hero com `<h1>` local, busca global sobre todos os produtos, os 5 catálogos, destaques da coluna `destaque`, como funciona, área de entrega e FAQ em `<details>` |
| 29  | `feat(catalog): move o termo de busca para `?q=``     | `ui` `seo` | 15      | Busca lê e escreve `?q=`; recarregar mantém o filtro; o reset por `key={slug}` continua funcionando; habilita o `SearchAction` de #23                            |
| 30  | `feat(catalog): adiciona os banners fixos`            | `ui`       | 26, 28  | Dois banners 480×160 no rodapé de cada catálogo; imagens em `public/banners/`; links de `VITE_WHATSAPP_NUMBER` e `VITE_INSTAGRAM_URL`; `alt` descritivo          |
| 31  | `feat(catalog): ajusta o catálogo ao layout do Figma` | `ui`       | 13      | Área de texto do card em `surface-soft`; divisores; contador "Exibindo **12** produtos de **12**"; busca alinhada ao título no desktop                           |
| 32  | `feat(router): adiciona error boundary de rota`       | `ui`       | 15      | `RouteErrorBoundary` implementado e ligado ao `errorElement` (hoje comentado em `router/index.tsx:6,22`), reaproveitando `EmptyState`                            |

### S5 · Fechamento

| #   | Título                                                     | Labels          | Depende | Critérios de aceite                                                                                                                                                                                                                                                                           |
| --- | ---------------------------------------------------------- | --------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 33  | `feat(infra): adiciona vercel.json`                        | `infra` `perf`  | 19      | `cleanUrls`, `trailingSlash: false`, `immutable` em `/assets/*` e `/img/*`, headers HSTS/nosniff/Referrer-Policy/Permissions-Policy; link profundo inexistente responde **404 real**                                                                                                          |
| 34  | `feat(infra): configura o domínio e o canonical`           | `infra` `seo`   | 33      | Domínio apontado; apex ou www escolhido como canônico com 301 do outro; `VITE_SITE_URL` de produção; canonical e sitemap com o domínio final                                                                                                                                                  |
| 35  | `perf: audita o Lighthouse no build publicado`             | `perf` `seo`    | 34      | Linha de base **remedida em `npm run preview`** e registrada; metas de §9 atingidas na URL de produção; o que sobrar vira issue própria                                                                                                                                                       |
| 36  | `docs: reescreve o README`                                 | `documentation` | 34      | Substitui o template do Vite: o que é, stack, setup, variáveis, como a planilha alimenta o site, scripts e fluxo de deploy                                                                                                                                                                    |
| 37  | `docs: consolida o CONTEXTO_IA com a arquitetura entregue` | `documentation` | 36      | `CONTEXTO_IA.md` descreve SSG, planilha e imagens **como implementados** (a substituição do `PLANO_IA.md` e o registro das decisões já foram feitos na abertura deste plano); armadilha do `npm ci` (§4.4) em `dependency-management.md`; fluxo de dados do §2.2 no lugar do diagrama do mock |

### Backlog técnico (sem milestone)

| Item                                                       | Nota                                                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Ligar `strict` no `tsconfig.app.json`                      | Hoje ausente. Vale ligar, mas provavelmente acende vários erros de uma vez — merece uma issue própria, não um efeito colateral |
| Action agendada que rebuilda e abre issue em falha         | Transforma "a consultora descobre que o site não atualizou" em "o repositório avisa"                                           |
| Versionar `products.generated.ts` como trilha de auditoria | Só faz sentido junto da Action acima (§3.6)                                                                                    |

---

## 12. Fora do escopo do V1

| Item                                           | Por quê                                                                                                                                                         |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Painel admin (POST na planilha)                | A planilha **é** o painel — a consultora edita pelo app do Sheets no celular. Só vale construir quando houver dor real                                          |
| Página de detalhe do produto                   | O fluxo termina no WhatsApp; uma rota por produto multiplicaria o build sem destino de conversão novo                                                           |
| Listagem seccionada por marca (`groupByBrand`) | Backlog antigo sem decisão de UX; convive mal com a busca. Fica para depois do site no ar                                                                       |
| Analytics / pixel                              | Decidir depois do domínio; envolve consentimento e custo de performance                                                                                         |
| Carrinho, checkout, autenticação               | Não faz parte do modelo de negócio                                                                                                                              |
| Code splitting / `route.lazy`                  | **Proibido enquanto houver SSG**: `lazy` força `initialized = false` no cliente e renderiza o fallback, causando mismatch. Com 30 produtos não há o que dividir |

---

## 13. Riscos

| Risco                                                         | Mitigação                                                                                                                                                                                                                                           |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Google Drive como origem das imagens** — o elo mais fraco   | Todo caminho é indocumentado, sensível ao ACL de cada arquivo e falha como HTTP 200 + HTML. Mitigação: checar `content-type`, tolerância via cache, disjuntor de 50% — e migrar para Cloudinary (§4.5)                                              |
| **Uma pessoa não técnica agora quebra o build de produção**   | A separação estrutural × linha a linha (§3.5) é calibrada para só falhar no que corromperia o site; proteção de intervalo no Sheets; aba de ensaio; Action agendada como próximo passo                                                              |
| **As duas passagens divergirem → mismatch → volta a ser CSR** | O React 19 se recupera renderizando no cliente, então **o site continua funcionando e o ganho de SEO some sem sintoma visível**. Mitigação: guarda `data-prerender-path` (#18), NBSP em `formatPrice`, logo fora do bundler, e o smoke test do #20  |
| **Zero testes justo quando as peças móveis triplicam**        | O item 10 do antigo `PLANO_IA.md` já sinalizava. #10 entra em S1, antes do SSG                                                                                                                                                                      |
| **`sharp` é a primeira dependência nativa do projeto**        | Acopla o build à plataforma e ao ABI do Node, e a chave de cache da Vercel inclui a versão do Node. Versão fixa, política de major do `dependency-management.md`, concorrência em 4. Acima de ~300 produtos, tirar a codificação do build de deploy |
| Marca digitada errado sumindo do site em silêncio             | Três camadas de §3.3                                                                                                                                                                                                                                |
| Dado só atualizar com redeploy                                | Trade-off aceito e explícito (§2.1); o Deploy Hook reduz o atrito a um clique                                                                                                                                                                       |
| Planilha pública expondo mais do que devia                    | Nunca colocar custo, fornecedor ou dado pessoal nela (§2.3)                                                                                                                                                                                         |
| Preview indexado gerando conteúdo duplicado                   | `noindex` + `Disallow: /` fora de produção (§7)                                                                                                                                                                                                     |

---

## 14. Pré-requisitos do usuário

Bloqueiam issues específicas e não dependem de código:

- [ ] Logo definitivo do Aura Beauty em vetor → #02
- [ ] Domínio escolhido e comprado → #34
- [ ] Número de WhatsApp de produção e URL do Instagram → #04, #30
- [ ] Conta gratuita no Cloudinary criada, `cloud_name` anotado e pasta `aura-beauty/produtos` criada (§4.6) → #12
- [ ] Fotos dos produtos subidas, **nomeadas com o `id` do produto** → #12
- [ ] Artes dos dois banners 480×160 → #30
- [ ] Área de entrega em Manaus e prazos, para a Home e o JSON-LD → #28
- [ ] Google Business Profile criado e verificado — fora do código, e a maior alavanca de SEO local → §8
