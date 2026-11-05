# Release Carrossell 0.8.0

04/11/2026 (05/11 UTC). Publicação autorizada pelo usuário ("Publique"): release sem artefatos de GitHub Actions.

## Problema

O Começo rápido montava o Contexto da Marca só com a página do produto, com a regra "o que faltar é HIPÓTESE". O contexto saía como descrição do produto, não como plano de venda:
- o público era o genérico da página;
- os territórios eram recursos do produto;
- não havia estratégia nem CTA;
- quase tudo vinha como HIPÓTESE.

Isso acontecia com todos os usuários. O perfil Carrossell do dono mostrou o efeito: a copy era boa, mas falava com o público errado.

## Conteúdo (`4bfbb11`)

- **Estratégia de venda** (`core/brand-strategy.mjs`): adaptada de coreyhaines31/marketingskills (MIT), das skills product-marketing, content-strategy, social e customer-research. Mantém as 7 seções da Aula 02 e pede:
  - cliente ideal com momento de compra e anti-persona;
  - dores nas palavras do cliente, com as quatro forças;
  - territórios sobre o problema, com no máximo 2 sobre o produto;
  - ativos que já existem antes dos "a preparar";
  - mistura 70/20/10, produto no último card e CTA com palavra-chave;
  - HIPÓTESE só para fatos.
- **Onde vale:** no Começo rápido, no documento final da entrevista e no prompt para colar no ChatGPT (`core/setup.mjs`).
- **Perfis existentes:** a ação `improveBrandStrategy` reescreve o contexto salvo, preserva os fatos e devolve uma proposta sem salvar. Marca › Contexto ganhou o bloco "Melhorar a estratégia de venda", com "Usar esta versão" e "Manter a atual".
- **Avisos:** veja [[44 - Avisos para usuarios]].
  - `core/notices.mjs` lê `notices.json` do repositório público de releases ao abrir (cerca de 20 s) e a cada hora;
  - o sino, a faixa para avisos importantes e a notificação do sistema uma vez por aviso;
  - as ações são só lugares do app ou links https.

## Verificação

- Testes 219/219, com os novos `notices.test.mjs` e `setup.test.mjs`.
- **Prova real com a conta ChatGPT do usuário** na página https://carrosseisquevendem.com.br/app/:
  - **Começo rápido novo:** público com momento de compra e anti-persona; territórios sobre o problema do comprador, com o app em 1 de 9; 70/20/10; produto no último card; CTA "Comente APP"; 1 HIPÓTESE, contra 8 no contexto antigo.
  - **Melhorar estratégia no contexto antigo:** fatos mantidos e a estratégia acrescentada.
  - **Limite:** os documentos saem com cerca de 10 mil caracteres mesmo com a regra de texto enxuto.
- `scripts/notices-proof.mjs`: Electron real. Passou:
  - o sino com a contagem e a faixa;
  - o botão do aviso abrindo Marca › Contexto e marcando como lido;
  - a leitura salva depois de reabrir;
  - sem rolagem lateral a 390 px e sem erros de página.
  Na prova, fechar o app no meio da inicialização deixava o processo aberto; com 4 s de espera ele fecha normalmente.

## Publicação verificada

- Workflow `41942265513`: preparar, Windows, os dois Macs e publicar com sucesso. Zero artefatos.
- Latest: https://github.com/Mathpcastro/pacto-releases/releases/tag/v0.8.0 (05/11/2026 00:39:38 UTC), 11 arquivos.
- `latest.yml` aponta para 0.8.0. O instalador público completo (224.837.216 bytes) foi baixado e o SHA-512 `arT8I647…AETOIw==` confere com o feed. Os dois Macs e o alias PACTO-Windows respondem 200.
- **Primeiro aviso publicado** em `pacto-releases/notices.json` (commit `001f850`): "Seu Contexto da Marca agora vira um plano de venda", importante, com o botão Melhorar estratégia → `brand:contexto` e `minVersion` 0.8.0. Lido pelo `parseNotices` do app a partir do endereço público: a 0.8.0 vê o aviso e a 0.7.9 não vê nenhum.
