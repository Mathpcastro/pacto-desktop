# Validação da implementação — Carrossell

Entrega local de 24/10/2026, na branch `codex/carrossell-branding`, repositório `C:\Users\Admin2\Documents\pacto-app`.

## Entregue

- Direção 02 produzida como vetor: símbolo, logos em contornos, versões transparentes, ícones, avatares e prancha final.
- Pacote ZIP: [[Projetos/Carrosseis Que Vendem/branding/carrossell-brand-kit.zip]] (429.239 bytes).
- Perfil/bio em [[Projetos/Carrosseis Que Vendem/branding/05 - Instagram]].
- Carrossell aplicado na interface, janela, notificações, nome do produto e ícones do pacote.
- Paleta clara e escura atualizadas. Controle de tema e chave `pacto-theme` preservados.
- **Fontes, layout e navegação preservados**, conforme correção expressa do usuário. Não houve redesign, nova barra lateral ou seletor de tema.
- Pasta histórica `pacto-desktop` fixada antes de trocar o nome de exibição; appId, package name, IPC, feed e aliases públicos anteriores mantidos.

## Evidência executada

| Verificação | Resultado |
|---|---|
| npm test | 45 testes, 45 aprovados |
| Regressão do renderer | 7 verificações aprovadas |
| Comparação antes/depois | 8 telas: onboarding/biblioteca/editor, claro/escuro e biblioteca em largura reduzida; nenhuma mudança geométrica nos controles medidos |
| Tipografia do cabeçalho e navegação | Mesmas famílias e tamanhos |
| Preferência de tema após recarregar | Preservada |
| Revisão visual independente | PASS após corrigir sobreposição interna de nome/símbolo |
| Legibilidade do cabeçalho | Separação de aproximadamente 9,94 px no desktop e 6,19 px na largura reduzida |
| PNG | Nove tamanhos de ícone, 16 a 1024 px; avatares 1080×1080 |
| ICO | Sete resoluções, PNGs válidos e transparência |
| ICNS | Sete blocos e tamanho/estrutura válidos |
| Ícone no EXE | Extraído do executável e inspecionado visualmente; Carrossell no recurso e metadados |
| npm run dist | Instalador Windows gerado localmente, sem publicação |
| Smoke do executável empacotado | Nome/título Carrossell, recursos incluídos, tema persistente e nenhum erro de página |
| Preservação de dados | Teste reabre projeto/perfil anteriores e o mesmo diretório Codex após mudar nome; override temporário respeitado |

Os dados do smoke e da prova de interface são fixtures manuais isoladas, sem nova geração de IA. Não foram alterados projetos ou autenticação do comprador para esses testes.

## Instalador local

`C:\Users\Admin2\Documents\pacto-app\release\Carrossell-Setup-0.2.1.exe`

- 224.894.376 bytes.
- SHA-256: `BD6B50FD68A2989C8F259964D259A81810F5D629BDC53A09B0A1606FAE87D406`.
- Continua versão 0.2.1 nesta entrega local. Para distribuir como atualização, será necessária uma versão superior e uma publicação separada.
- Não houve upload de release, atualização do site ou alteração no Instagram.
- Instalador gerado e executável empacotado testado; não equivale a uma instalação limpa via assistente NSIS.
- ICNS preparado e validado estruturalmente; novo pacote/instalação Mac não executado neste Windows.

## Evidências preservadas

![[Projetos/Carrosseis Que Vendem/branding/evidencias/library-1440-light.png]]

![[Projetos/Carrosseis Que Vendem/branding/evidencias/library-1440-dark.png]]

- `evidencias/comparacao-interface.json`.
- `evidencias/executavel-empacotado.json`.
- `evidencias/executavel-onboarding-dark.png`.

## Regenerar e testar

- Vetores: `python tools/build-brand-sources.py` (o contorno pronto já está no repositório).
- Rasters/ícones: `node_modules/.bin/electron scripts/render-brand-assets.cjs`.
- Prova visual: `node scripts/brand-proof.mjs before` antes da alteração; `node scripts/brand-proof.mjs after` depois.
- Smoke local: `node scripts/brand-packaged-proof.mjs`.
