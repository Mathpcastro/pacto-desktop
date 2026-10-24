# PACTO Desktop

Aplicativo Electron para Windows que usa a conta ChatGPT do próprio comprador para criar e organizar carrosséis com o método P.A.C.T.O. O curso é opcional durante o uso.

## Uso

1. Execute o instalador `release/PACTO Setup 0.1.0.exe`.
2. Conecte sua conta ChatGPT. Os recursos e limites são os da conta conectada.
3. Faça o onboarding guiado: entrevista do Contexto Oficial da Marca (Aula 02) e do Design Kit Oficial (Aula 05). O Prompt Mestre (Aula 08) é aplicado automaticamente.
4. Na aba Pautas, gere ideias com o Radar ou modele uma referência e clique em "Criar carrossel". Escolha objetivo e arquitetura.
5. Etapa Texto: o PACTO escreve com o Copy Engine e revisa como editor-chefe. Edite os cards, a linha editorial e o mascote ou efeito, faça a revisão humana e aprove.
6. Etapa Capa: escolha entre 2 ou 3 opções. Ela vira a referência de estilo do restante.
7. Etapa Carrossel: gere os demais cards, use a Correção Visual Rápida quando precisar e monte o kit CTA → DM → Oferta.
8. Exporte os PNGs numerados em um ZIP, com `legenda.txt` e `cta-e-dm.txt`. A postagem no Instagram é manual. Depois, registre o resultado para replicar vencedores.

Nenhum terminal é necessário no uso do aplicativo. A primeira versão não publica nem envia DMs automaticamente. O instalador inicial não possui assinatura digital Windows.

## Desenvolvimento

```powershell
npm install
npm run build
npm start
npm test
npm run dist
```

O build usa a distribuição Electron já instalada em `node_modules/electron/dist`; isso evita uma falha de rename do extrator do Electron Builder observada neste Windows. `npm run dev` inicia o Vite; para usá-lo no Electron, defina `PACTO_DEV_URL=http://127.0.0.1:5187` no processo de desenvolvimento. Sem essa variável o Electron carrega `dist/`.

Dados ficam no diretório de usuário do PACTO. `PACTO_USER_DATA` define outro diretório para testes. Os testes devem usar diretório próprio para não misturar rascunhos técnicos com a biblioteca do comprador.

## MCP reutilizável

```powershell
codex mcp add pacto -- node C:\caminho\pacto-desktop\desktop\mcp\server.mjs
```

O servidor usa stdio e requer Node.js e as dependências deste pacote quando executado separadamente. Ele expõe 23 recursos e sete ferramentas: método, oito aulas, 13 materiais oficiais, busca, briefing, preparação de contexto e revisão textual. O MCP fornece conhecimento; quem gera texto/imagem é o modelo do cliente. O aplicativo instalado inclui seu próprio runtime e não precisa instalar Node à parte.

O MCP já foi registrado no Codex e no Claude Code desta máquina, apontando ao código desta worktree. Não remover a pasta sem atualizar essa configuração.

## Fontes

- Oito vídeos fornecidos pelo usuário; transcrições do Pauta preservadas em `resources/pacto/transcripts/`.
- O Pauta retornou inglês `asr-en`, sem timestamps; esses arquivos não são transcrição literal portuguesa.
- Biblioteca oficial do Notion: 13 páginas originais em português, em `resources/pacto/notion/`.
- `method.md` e `method.json`: método operacional com fontes e ambiguidades registradas.
- `extracted-prompts.json`: 19 prompts originais, conferidos literalmente com as páginas fornecidas.

## Verificação

`npm test` exercita fontes, um cliente MCP stdio real, persistência, validação, revisões, preservação e cancelamento. Os scripts abaixo usam inferência real e consomem os limites da conta quando explicitamente executados:

```powershell
node scripts/runtime-proof.mjs --generate
node scripts/app-proof.mjs
node scripts/renderer-regression.mjs
node scripts/packaged-smoke.mjs
```

As duas provas de inferência usam autenticação existente apenas em uma pasta temporária privada e a removem ao terminar. Nunca copiar autenticação para código, artifacts ou vault. Relatórios de teste ficam em `.cache/` e não são versionados. O script empacotado reutiliza a biblioteca real produzida pela prova do app; não simula imagens ou inferência.

## Provas e verificações

- `scripts/flow-screens.mjs`, `scripts/player-check.mjs` e `scripts/robustness-proof.mjs` usam dados locais (a robustez também usa o login existente, numa pasta temporária).
- `scripts/niche-proof.mjs` roda 4 nichos reais pela interface, com a conta ChatGPT deste computador.
- `scripts/packaged-smoke.mjs` precisa de `.cache/app-proof`, gerado por `scripts/app-proof.mjs`.

## Memória compartilhada

Contexto e decisões ficam em `shared-memory/` e no vault Obsidian `Projetos/Funil CQV`. Antes de continuar, ler `00 - Comece aqui.md`, decisões e estado. Atualizar notas com resultados verificados e pendências reais. Credenciais ficam fora dessas notas.
