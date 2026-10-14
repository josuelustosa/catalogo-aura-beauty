# Aura Beauty — catálogo

Catálogo on-line da **Aura Beauty**, revenda de perfumaria, beleza, moda íntima
e acessórios com pronta-entrega em Manaus. Cada produto leva a uma conversa no
WhatsApp com a mensagem pronta: não há carrinho, checkout, login nem back-end.

Os produtos vêm de uma Planilha Google lida no build, e cada rota sai
pré-renderizada em HTML (SSG próprio, sem framework) e publicada na Vercel.
Produção: <https://catalogo-aura-beauty.vercel.app>.

## Stack

| Item                | Versão |
| ------------------- | ------ |
| Node                | 24.x   |
| React / React DOM   | 19.2.8 |
| React Router (data) | 7.18.1 |
| Vite                | 8.1.5  |
| TypeScript          | 6.0.3  |
| Tailwind CSS        | 4.3.3  |
| sharp (só no build) | 0.35.5 |
| Vitest              | 4.1.10 |
| ESLint              | 9.39.5 |
| Prettier            | 3.6.2  |

As dependências usam versão exata (`save-exact` no `.npmrc`). A política de
atualização está em
[docs/dependency-management.md](docs/dependency-management.md).

## Rodando localmente

```bash
git clone https://github.com/josuelustosa/catalogo-aura-beauty.git
cd catalogo-aura-beauty
npm install
cp .env.example .env
npm run dev
```

Com o `.env` do exemplo, sem as credenciais da planilha, o build usa os
produtos de teste de `src/data/products.mock.ts`. Para ler a planilha de
verdade, preencha `GOOGLE_SHEETS_ID` e `GOOGLE_SHEETS_API_KEY`, sempre juntas.

O site sai em <http://localhost:5173>. Para ver o HTML pré-renderizado, como em
produção: `npm run build && npm run preview` (<http://localhost:4173>).

## Variáveis de ambiente

O Vite embute no JavaScript do navegador **toda** variável com prefixo
`VITE_`, e só elas. Por isso a separação é de segurança, não de estilo:
credencial nunca leva o prefixo, e o que leva `VITE_` é público.

**Build (Node):** lidas por `scripts/`, nunca chegam ao navegador.

| Variável                | Para quê                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `GOOGLE_SHEETS_ID`      | Id da planilha do catálogo.                                                                               |
| `GOOGLE_SHEETS_API_KEY` | Chave do Google restrita à Sheets API. Sem ela e sem o id, o build local usa o mock; na Vercel, falha.    |
| `CATALOG_SHEET_TAB`     | Aba lida. Vazia: `produtos` em produção e `produtos_preview` no resto.                                    |
| `ALLOW_STALE_CATALOG`   | `1` só nos previews: planilha inválida cai no mock e o disjuntor de imagens vira aviso, em vez de falhar. |
| `CLOUDINARY_CLOUD_NAME` | Conta do Cloudinary. Produto sem `imagem_url` busca a foto em `.../image/upload/<id>.jpg`.                |
| `SITE_URL`              | Origem canônica. Vazia: o domínio de produção da Vercel. Só é preciso com o `www` como canônico.          |

**Cliente (`VITE_`):** vão para o bundle e são públicas.

| Variável               | Para quê                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `VITE_WHATSAPP_NUMBER` | Número que recebe os pedidos, só dígitos (`5592999999999`). Sem ele, o WhatsApp pede o contato. |
| `VITE_INSTAGRAM_URL`   | Perfil do Instagram (`perfil`, `@perfil` ou a URL). Liga o banner e o `sameAs` do JSON-LD.      |

**Preenchidas pela Vercel:** `VERCEL`, `VERCEL_ENV` (só `production` sai
indexável) e `VERCEL_PROJECT_PRODUCTION_URL` (origem padrão do canonical).

**Fora do repositório:** a URL do Deploy Hook fica só nas propriedades do
Apps Script da planilha (`VERCEL_DEPLOY_HOOK_URL`). Ela é um segredo: quem a
tiver dispara deploys. Se vazar, recrie o hook na Vercel.

## Como a planilha alimenta o site

```
Planilha Google ──(build)──► scripts/build-data.ts ──► src/data/products.generated.ts
                                   │
                                   └─► scripts/build-images.ts ──► public/img/ (AVIF/WebP)
```

- A planilha é lida **no build**, nunca no navegador: editar a planilha não
  muda o site até o próximo deploy.
- Para publicar, a consultora usa o menu **Aura Beauty → Publicar alterações**
  da planilha, ou marca a caixa da aba `publicar` no celular. O Apps Script
  ([apps-script/Code.gs](apps-script/Code.gs)) confere a planilha e chama o
  Deploy Hook, que reconstrói a produção a partir da `main` em cerca de 3
  minutos.
- Problema estrutural (coluna inserida, `id` duplicado, mais de 20% das
  linhas rejeitadas) reprova o build, e o site continua na versão anterior.
  Linha com preço ou marca inválidos só fica de fora, e foto que falha só sai
  do card, ambas com aviso no log. As regras completas estão no §3.5 do plano.
- A planilha é **pública por link**, porque a chave de API só lê planilhas
  públicas. Nunca coloque nela preço de custo, fornecedor ou dado pessoal.
- O passo a passo para quem cadastra os produtos está em
  [consultora/GUIA_DA_PLANILHA.md](consultora/GUIA_DA_PLANILHA.md).

## Scripts

| Script                 | O que faz                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run dev`          | Servidor de desenvolvimento do Vite. O `predev` gera os dados e as imagens antes.                |
| `npm run build`        | Build completo: `tsc -b`, `build:client`, `build:ssr` e `prerender`. O `prebuild` gera os dados. |
| `npm run build:client` | `vite build`: bundle do navegador e o template HTML com os assets hasheados.                     |
| `npm run build:ssr`    | Compila `src/entry-server.tsx` para o Node, em `dist-ssr/`.                                      |
| `npm run prerender`    | Grava um HTML por rota em `dist/`, mais `sitemap.xml` e `robots.txt`, e reprova HTML inválido.   |
| `npm run preview`      | Serve o `dist/` do último build em <http://localhost:4173>.                                      |
| `npm test`             | Vitest. O `pretest` gera os dados do mock, para os testes não dependerem da planilha.            |
| `npm run lint`         | ESLint.                                                                                          |
| `npm run format`       | Prettier, aplicando a formatação.                                                                |
| `npm run format:check` | Prettier, só conferindo.                                                                         |

`predev`, `prebuild` e `pretest` rodam `scripts/build-data.ts` sozinhos. Os
`.generated.ts` são gerados e ficam fora do git: não os edite.

## Deploy

| Gatilho                                  | Ambiente | Aba lida           | Indexável                      |
| ---------------------------------------- | -------- | ------------------ | ------------------------------ |
| Push num PR                              | Preview  | `produtos_preview` | Não: `noindex` e `Disallow: /` |
| Merge na `main` ou "Publicar alterações" | Produção | `produtos`         | Sim                            |

- As URLs de preview exigem login na Vercel.
- O preset da Vercel é Vite, com saída em `dist`. O install command fica no
  padrão (`npm install`): `npm ci` apaga `node_modules` e, com ele, o cache
  das imagens entre builds.
- O `vercel.json` cuida das URLs limpas, do cache `immutable` dos assets, dos
  headers de segurança e do 404 real para caminho desconhecido. Não há rewrite
  de SPA.

## Domínio próprio

O site está no `.vercel.app` até o domínio ser comprado. A troca não muda
código: canonical, sitemap, Open Graph e `robots.txt` seguem a origem que o
build recebe.

1. Compre o domínio (por exemplo, no Registro.br).
2. Na Vercel, em **Settings → Domains**, adicione o apex (`exemplo.com.br`) e o
   `www`. Escolha um como principal e faça o outro redirecionar
   permanentemente (301 ou 308) para ele.
3. No registrador, crie os registros DNS que a Vercel mostrar e espere o
   HTTPS ficar ativo.
4. **Apex como principal:** nada a configurar. A Vercel passa a preencher
   `VERCEL_PROJECT_PRODUCTION_URL` com ele, porque é o domínio mais curto.
   **`www` como principal:** defina `SITE_URL=https://www.exemplo.com.br` em
   Production.
5. Faça um novo deploy de produção (Redeploy na Vercel ou "Publicar
   alterações"), porque a origem é lida no build.
6. Confira o `<link rel="canonical">` de uma página, o `/sitemap.xml` e o
   `/robots.txt`: todos devem usar o domínio novo.
7. Cadastre o domínio no Google Search Console e envie o
   `https://<domínio>/sitemap.xml`.
8. Use o mesmo nome, telefone e área de atendimento no Google Business
   Profile.

## Documentação

- [docs/CONTEXTO_IA.md](docs/CONTEXTO_IA.md): arquitetura, fluxo de dados,
  SSG, imagens, convenções e histórico de decisões. Comece por aqui antes de
  mudar código.
- [docs/PLANO_DEFINITIVO_V1.md](docs/PLANO_DEFINITIVO_V1.md): o plano do V1,
  com o contrato da planilha, os ambientes, as metas e as issues.
- [docs/dependency-management.md](docs/dependency-management.md): política de
  versões e as armadilhas do cache de imagens e do `sharp`.
- [consultora/GUIA_DA_PLANILHA.md](consultora/GUIA_DA_PLANILHA.md): guia da
  planilha para quem cadastra os produtos.
