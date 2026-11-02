# Carrossell 0.7.0 — biblioteca leve de Referências

Data: 02/11/2026. Base: `526b7ff` (`package.json` 0.7.0). Branch: `feat/carrossell-reference-templates`.

## Objetivo

Adicionar **Referências** à navegação existente com 36 receitas editoriais selecionadas do acervo de 500 carrosséis virais. A pessoa poderá pesquisar, filtrar, examinar uma miniatura e usar a referência no composer atual do Início. A referência entra como anexo visual e orientação para criação, sem copiar a copy original e sem gerar um projeto automaticamente.

## Limites

- Preservar o design system, os textos, as opções e os fluxos existentes da 0.7.0.
- Não alterar `core/templates.mjs`, Store, runtime, IPC, preload, projetos persistidos ou prompts.
- Não preencher nem apagar o tema que a pessoa estiver digitando.
- Não mudar objetivo, arquitetura, quantidade de cards, Design Kit ou anexos manuais ao escolher uma referência.
- Não empacotar o acervo completo, slides adicionais, prints de engajamento, OCR ou pranchas.
- Não adicionar dependência de runtime, checkout, licença, importador ou order bump nesta branch.
- Não consumir inferência para navegar, pesquisar ou anexar uma referência.
- Trabalhar somente na worktree isolada; não modificar `C:\Users\Admin2\Documents\pacto-app`.

## Navegação e preservação do rascunho

O item **Referências** entra entre **Início** e **Marca**, com `LayoutTemplate` do Lucide e os mesmos estilos `.topnav`. O estado ativo usa `aria-current="page"`; Início não fica ativo simultaneamente.

`Home` continua montado quando a biblioteca está aberta. Em vez de desmontar o composer, `Home` recebe a view atual e renderiza a página lazy de Referências. Assim, texto, tema, anexos e demais estados locais sobrevivem à ida e volta sem alterar a navegação de Marca ou Estúdio.

## Página

1. Título **Referências que valem estudar** e explicação curta: a copy e a arte continuam sendo criadas para a marca da pessoa.
2. Busca por tema, hook, entrega, motivo, nicho e autor.
3. Filtros por nicho e objetivo usando `.seg`, `.search-box`, `.chip` e botões existentes.
4. Grade de 36 cards com miniatura 4:5, hook genérico, arquitetura, objetivo, autor, métricas observadas e botão **Usar referência**.
5. Um bloco discreto “Por que funcionou” usa a receita original em PT-BR; não reproduz texto dos slides.
6. Estado vazio com ação **Limpar filtros**.

As métricas são apresentadas como observações do acervo, não promessa de resultado. A miniatura é referência visual estática, não um template pronto para exportar.

## Uso no composer

**Usar referência**:

- volta ao Início e mantém o texto atual;
- seleciona formato `carrossel` e estilo `ia`, necessários para o fluxo de referência visual;
- adiciona a mesma WebP da miniatura como data URL no contrato `attachments` já aceito;
- substitui somente uma referência anterior da biblioteca;
- preserva anexos manuais e o limite de seis imagens;
- se seis anexos manuais já ocuparem o limite, não descarta nenhum: avisa e deixa a pessoa revisar no composer;
- não cria projeto, não chama IA e não altera os demais campos.

O runtime já valida e persiste `{ name, dataUrl }` e instrui o modelo a se inspirar sem copiar. O marcador local `referenceId` serve apenas para substituir a escolha anterior e é naturalmente removido pela validação existente ao salvar.

## Arquitetura

- `src/data/references.js`: 36 registros estáticos e metadados compactos, sem imports de imagem.
- `src/data/referenceImages.js`: imports WebP com `?inline`, separados no chunk lazy; o mesmo data URL serve à miniatura e ao anexo, inclusive em `file://`.
- `src/assets/references/CAR-*.webp`: 36 imagens 360 × 450.
- `src/referenceLibrary.js`: funções puras de filtro e substituição de anexo, testáveis em Node.
- `src/components/References.jsx`: interface local, carregada com `React.lazy` somente ao abrir a view.
- `src/components/Home.jsx`: integração pontual com o composer existente.
- `src/App.jsx`: navegação e passagem da view.
- `src/studio.css`: somente novas classes escopadas `reference-*`, usando tokens existentes.

Não há catálogo no bootstrap nem no estado persistido. O chunk inicial não importa as imagens.

## Seleção

36 referências com sequência multipágina e print direto da plataforma no acervo de origem:

- 15 IA, 8 marketing digital, 8 direct response e 5 SaaS;
- 25 inglês, 6 PT-BR e 5 espanhol;
- 33 autores;
- todas as cinco arquiteturas P.A.C.T.O. como classificação editorial;
- 36 WebP de 360 × 450; orçamento de catálogo + imagens de no máximo 2 MiB.

IDs: CAR-0004, CAR-0007, CAR-0010, CAR-0012, CAR-0019, CAR-0034, CAR-0002, CAR-0008, CAR-0015, CAR-0043, CAR-0023, CAR-0001, CAR-0006, CAR-0020, CAR-0047, CAR-0285, CAR-0286, CAR-0299, CAR-0324, CAR-0336, CAR-0338, CAR-0347, CAR-0364, CAR-0436, CAR-0448, CAR-0469, CAR-0476, CAR-0492, CAR-0493, CAR-0509, CAR-0528, CAR-0241, CAR-0242, CAR-0264, CAR-0276 e CAR-0277.

## Verificação

- Testes Node de quantidade, IDs, metadados, arquiteturas, objetivos, imagens, orçamento, busca, filtros e substituição de anexos.
- Teste Electron real: abrir Referências sem conta, verificar 36 cards, filtrar, pesquisar, limpar, preservar texto e anexos, trocar referência e criar projeto sem IA.
- Regressões antigas, com o limite da barra ajustado de sete para oito controles por causa do novo item explícito.
- Claro/escuro e 1000/1440 px, sem overflow horizontal, rolagem aninhada ou texto abaixo de 13 px.
- Build de produção e abertura pelo `dist`, conferindo imagens inline e carregamento lazy.
- Peso real do catálogo e das imagens; nenhum arquivo extra do acervo no build.

## Futuro fora do escopo

O pacote de 500 referências como order bump de R$ 37, importado por arrastar e soltar, será somente planejado no Obsidian. O acervo contém 500 referências, não 500 sequências completas: 107 têm sequência multipágina, 393 são parciais, 333 têm print de engajamento e 167 somente métrica textual. Nenhuma implementação desse produto entra nesta branch.
