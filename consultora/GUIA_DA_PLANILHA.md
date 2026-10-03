# Guia da planilha do catálogo

Este guia é para quem cuida dos produtos do site Aura Beauty. Tudo acontece na
planilha "Aura Beauty - Catálogo", na aba **produtos**. Não é preciso instalar
nada nem entender de site: você edita a planilha e manda publicar.

## Antes de começar

- **Entre pelo convite.** Você recebeu um e-mail do Google com o convite para
  editar a planilha. Abra por ele, usando **a mesma conta Google que recebeu o
  convite**. No celular, use o app **Planilhas Google**.
- **Apareceu "Somente visualização"?** Você entrou com outra conta. Troque de
  conta clicando na sua foto, no canto superior direito.
- **Os produtos que já estão na planilha são exemplos de teste.** No primeiro
  cadastro, apague as linhas deles (selecione os números das linhas, clique com
  o botão direito e escolha **Excluir linhas**) e cadastre os produtos reais.
  Só nessa primeira vez apagar linhas é o certo, e os códigos dos exemplos podem
  ser reaproveitados.
- **Escolha os códigos com calma.** O código de cada produto também vai ser o
  nome da foto dele no site. Depois de publicado, não mude mais.

## Como o site é atualizado

O site **não muda sozinho** quando você edita a planilha. Depois de terminar as
mudanças, mande publicar:

- **No computador:** menu **Aura Beauty → Publicar alterações** (aparece na
  barra de menus da planilha, ao lado de "Ajuda", alguns segundos depois de a
  planilha abrir). Ele mostra um resumo do que vai ao ar e pede confirmação.
- **No celular (ou no computador):** abra a aba **publicar** (embaixo, ao lado
  de "produtos") e marque a caixa. Ela se desmarca sozinha e o resultado aparece
  logo abaixo, em "Último resultado".

Em **cerca de 3 minutos** o site estará atualizado. Publique quando terminar
tudo, não a cada mudança.

**Na primeira vez que usar o menu no computador**, o Google pede permissão (pela
aba **publicar** isso não acontece):

1. Clique em **Continuar** (ou **Revisar permissões**) e escolha a sua conta.
2. Na tela "O Google não verificou este app", clique em **Avançado** e depois
   em **Acessar … (não seguro)**. Pode seguir: o app é o da própria planilha.
3. Se aparecer uma lista de permissões com caixinhas, marque **Selecionar
   tudo** e clique em **Continuar**.
4. Use o menu de novo para publicar. Isso só é preciso uma vez.

## As colunas da aba "produtos"

| Coluna              | O que é                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `id`                | Código único do produto, ex.: `BOT-001`. **Nunca reutilize um código**, nem para produto novo parecido.                 |
| `marca`             | Escolha na lista que aparece na célula. Não digite por cima.                                                            |
| `titulo`            | Nome completo, com tamanho ou quantidade. Ex.: "Malbec Desodorante Colônia 100ml".                                      |
| `preco`             | Só o número, com vírgula. Ex.: `189,90` (sem "R$").                                                                     |
| `preco_promocional` | Preencha só quando houver promoção, com valor **menor** que o preço. Se não for menor, o site mostra só o preço normal. |
| `imagem_url`        | **Deixe em branco por enquanto.** As fotos entram numa próxima etapa do site.                                           |
| `ativo`             | A caixinha que põe o produto no site. Marcada = aparece. Desmarcada = não aparece.                                      |
| `ordem`             | Opcional. Número inteiro para ordenar dentro da marca (1 vem primeiro). Vazio vai para o fim.                           |
| `destaque`          | Marque para o produto aparecer na seção de destaques (quando a página inicial estiver pronta).                          |
| `atualizado_em`     | Opcional, só para o seu controle. O site não usa.                                                                       |

Sugestão para os códigos: use o começo da marca + número, sempre com três
dígitos.

| Marca     | Exemplo   | Marca       | Exemplo   |
| --------- | --------- | ----------- | --------- |
| Boticário | `BOT-001` | Romance     | `ROM-001` |
| Eudora    | `EUD-001` | Favorita    | `FAV-001` |
| OUI       | `OUI-001` | Moda Íntima | `MOD-001` |
| Natura    | `NAT-001` | Joias       | `JOI-001` |
| Avon      | `AVO-001` | Acessórios  | `ACE-001` |

## Boas práticas que evitam dor de cabeça

- **Para tirar um produto do site, desmarque a caixa "ativo".** Não apague a
  linha: assim o cadastro fica guardado para quando o produto voltar.
- **Acabou uma promoção?** Apague só o `preco_promocional`.
- **Ao colar dados de outro lugar,** cole com **Ctrl+Shift+V** (no Mac,
  **Cmd+Shift+V**), que cola só os valores. O colar normal apaga as listas e as
  caixinhas da planilha.
- **Sumiu uma caixinha de "ativo"?** Clique na célula e use o menu
  **Inserir → Caixa de seleção**.
- **Não renomeie as abas, não insira nem mude a ordem das colunas** e não mexa
  na aba `produtos_preview`: ela é de testes do desenvolvedor.
- **Não mude o compartilhamento da planilha.**

## O que NUNCA colocar nesta planilha

Qualquer pessoa com o link consegue **ver** esta planilha (é assim que o site
lê os dados). Então nunca coloque aqui:

- preço de custo ou margem;
- nome ou contato de fornecedor;
- dados de clientes.

Se precisar controlar essas informações, use outra planilha, separada.

## Se algo der errado

- **Publicou e o site não mudou?** Espere 5 minutos e recarregue a página. Se
  continuar igual, algum dado pode ter sido recusado (por exemplo, um preço
  escrito com letras). **O site nunca quebra por isso**: ele continua na
  versão anterior. Confira as linhas que mudou e publique de novo.
- **A publicação avisou de linhas ignoradas, de código repetido ou apareceu
  "Bloqueado"?** Corrija o que o aviso apontar e publique de novo.
- **O menu "Aura Beauty" não aparece?** Espere alguns segundos ou recarregue a
  planilha. No celular ele não existe: use a aba **publicar**.
- **Apagou algo sem querer?** Ctrl+Z desfaz. No celular, use a setinha de
  desfazer.
- Qualquer outra dúvida, fale com o desenvolvedor.
