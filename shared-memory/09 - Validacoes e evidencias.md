# Validações e evidências

Checkpoint: 23/10/2026. Resultados abaixo foram observados nesta implementação; as provas de inferência usam uma conta existente e não representam um benchmark de todos os planos/estilos.

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| Baseline original | 27 testes passaram | Antes de implementar o novo app |
| Novo pacote | 22 testes passaram | `npm test` em `desktop/` |
| MCP real | Inicialização,23 recursos,7 ferramentas,leitura e erros corretos | Cliente SDK stdio em `tests/mcp.test.mjs` |
| Fontes | 8 transcrições,13 páginas,19 prompts literalmente idênticos às fontes | Manifests + asserção de igualdade |
| Renderer | Build passou; avaliação visual PASS | Build Vite + revisão independente |
| Interface Electron | Fluxo básico e tamanho mínimo1000×720 passaram | Smoke real, sem simular API |
| Regressões editor | 7 verificações passaram | `node scripts/renderer-regression.mjs` |
| Conta Codex | Conta existente conectou; modelos disponíveis | Prova privada temporária, autenticação removida depois |
| Imagem nativa/revisão | PNG real + edição por referência + ZIP | `.cache/runtime-proof/report.json`, nativeGeneration=true |
| Runtime completo | 2 slides reais,1122×1402 cada,ZIP e reabertura | `.cache/app-proof/report.json`, completed=true |
| Exportação canônica | PNG1080×1350; proporção errada recusada; originais preservados | Prova real de nativeImage |
| Executável empacotado | Reabertura de arte real + exportação1080×1350,zero page errors | `.cache/packaged-proof/report.json`, completed=true |
| Código | 3 achados corrigidos; re-revisão sem pendências materiais | Cancelamento e rascunhos cobertos por regressões |
| Obsidian e Claude | MCP conectado, notas e anexos gravados/lidos | `claude mcp get` e HTTP MCP |
| Print | Cópia idêntica | SHA-256 em [[04 - Biblioteca oficial]] |
| Instalador | NSIS gerado; assinatura `NotSigned` | Hash e caminho em [[15 - Entrega e provas reais]] |

## Limites da validação

Primeiro login de um comprador novo, instalação em outro Windows limpo e outros planos ainda precisam de teste. A prova de inferência foi feita com autenticação existente copiada apenas para pasta temporária privada e removida ao final, sem alterar o login global. O executável empacotado foi executado e testado; não foi feita instalação silenciosa no sistema do usuário.

Nada foi publicado no Instagram, enviado por DM, implantado na internet ou enviado ao Git remoto.


## Onboarding guiado — 23/10/2026

| Verificação | Resultado | Evidência |
|---|---|---|
| Testes | 25 passaram (3 novos: entrevista de marca, Design Kit + arquitetura no plano, estado após entrevista) | `npm test` |
| Regressões do editor | 7 de 7 | `node scripts/renderer-regression.mjs` |
| Prova real no Electron | Entrevista de marca (3 respostas → documento de 4,4 mil caracteres), Design Kit com preset Ilustrado (2 respostas → 8,1 mil caracteres), perfil salvo, carrossel Lista Útil/Salvamentos com 9 cards e capa ilustrada gerada nativamente | `Evidencias/onboarding/` (telas, documentos, plano, log) |
| Executável empacotado | Instalador reconstruído; smoke: 8 aulas, PNG 1080×1350, zero erros de página | `node scripts/packaged-smoke.mjs` |

Negócio fictício de teste (Ateliê Barro Vivo). Login existente copiado só para pasta temporária, removida ao final. Bug encontrado e corrigido durante a prova: a resposta da entrevista era calculada antes de liberar o job e deixava a tela presa em "preparando"; agora há teste de regressão.


## Fluxo do curso no editor — 23/10/2026

| Verificação | Resultado | Evidência |
|---|---|---|
| Testes | 30 passaram (5 novos em `tests/flow.test.mjs`: travas texto → capa → restante, correção visual, fontes oficiais e reescrita de card-instrução, Radar/Modelador/Replicador/CTA no ZIP, migração) | `npm test` |
| Regressões do editor | 7 de 7, agora com o texto aprovado antes do painel de slide | `node scripts/renderer-regression.mjs` |
| Telas no Electron com dados locais (sem IA) | Pautas, criação pré-preenchida, quadro de texto (aprovar desabilitado até marcar o checklist), seletor de capas, carrossel e diálogo de CTA | `node scripts/flow-screens.mjs` |
| Prova real com IA | **Não concluída:** o Radar recebeu "limite da conta atingido" | Repetir `scripts/flow-proof.mjs` |

Os dados das telas são fixtures escritas à mão. A arte usada nelas é a capa real da prova anterior, ainda com o título empilhado; ela não comprova a nova tipografia.


## Prova real do fluxo do curso — 23/10/2026

| Etapa | Resultado real |
|---|---|
| Radar | 30 pautas, 10 marcadas como Top 10 |
| Modelador | 10 pautas e análise do motivo da referência |
| Texto | 7 cards de copy final, sem nenhum card-instrução; linha editorial e conceito visual sugeridos |
| Capa | 3 opções geradas; na segunda rodada, com três composições distintas |
| Carrossel | 7 de 7 cards; títulos horizontais em 2–3 linhas, acentos corretos |
| Correção visual | card 2 corrigido (versão 2) |
| CTA/DM | palavras-chave ARGILA, LISTA, GUIA… e duas DMs |
| Testes | 30 passaram; 7 regressões do editor; smoke do executável empacotado |

Evidências: `Evidencias/fluxo-curso-real/` (cards, capas, texto, radar, modelador, CTA e log) e a subpasta `segunda-rodada/`, com a revisão de editor-chefe e as capas variadas.

Limite observado: o negócio fictício de teste tem um contexto cheio de ressalvas de segurança, o que deixa a copy prudente. A avaliação final de voz precisa ser feita com um negócio real.
