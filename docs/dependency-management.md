# Gerenciamento de Dependências

## Objetivo

Definir a política de atualização e manutenção das dependências deste projeto para garantir estabilidade, segurança e previsibilidade.

---

## Política de versionamento

- Todas as dependências diretas utilizam versões exatas (sem `^` ou `~`).
- O arquivo `package-lock.json` deve permanecer versionado no repositório.
- O projeto utiliza `.npmrc` com:

```ini
save-exact=true
```

---

## Fluxo de atualização

### 1. Verificar dependências disponíveis

```bash
npm outdated
```

### 2. Atualizar dependências

```bash
npm update
```

### 3. Verificar vulnerabilidades

```bash
npm audit
```

### 4. Validar o projeto

```bash
npm test
npm run build
npm run lint
npm run format:check
```

---

## Atualizações Major

Versões major (ex.: React Router 8, TypeScript 7, ESLint 10) **não devem ser adotadas automaticamente**.

Antes da atualização:

- Ler o changelog oficial;
- Verificar o guia de migração;
- Atualizar apenas um pacote por vez;
- Executar os testes do projeto.

---

## Frequência

- Verificar atualizações mensalmente ou antes de iniciar uma nova funcionalidade de maior impacto.
- Atualizações de segurança devem ser aplicadas assim que possível.

---

## Commits

Utilizar commits específicos para atualização de dependências.

Exemplo:

```
chore: atualizar as dependências do projeto
```

ou

```
chore: atualizar as dependências e recriar o arquivo de bloqueio.

```

---

## Objetivo da política

Esta estratégia prioriza:

- previsibilidade;
- estabilidade;
- facilidade de reprodução do ambiente;
- redução de regressões causadas por atualizações automáticas.
