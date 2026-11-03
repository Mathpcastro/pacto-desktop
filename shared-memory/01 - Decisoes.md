# Decisões aprovadas

- Produto principal: aplicativo Windows em Electron, preço informado pelo usuário R$47.
- Inferência pela conta ChatGPT do comprador; uso sujeito à disponibilidade e aos limites da conta.
- MCP P.A.C.T.O. reutilizável por quem preferir conectar diretamente ao Codex.
- Conhecimento deriva de todas as oito aulas enviadas pelo usuário. Não inventar conteúdo ausente dos materiais.
- Cada usuário escolhe cores, referências e identidade. O estilo pessoal do professor não é obrigatório.
- Onboarding alimenta perfil reutilizável; projetos e slides ficam organizados na biblioteca local.
- Exportar imagens reais para postagem manual. Não há autorização para publicar ou enviar DMs automaticamente.
- Preservar CutRoom, funil e alterações anteriores; desenvolvimento em worktree isolada.

## Constatações técnicas

- CutRoom inspecionado: versão declarada 0.6.0 e pacote Codex 0.163.0.
- Transporte existente: `codex app-server --listen stdio://`.
- CutRoom desativa geração de imagens; novo app precisa habilitar e validar a capacidade.
- CLI global 0.128.0 não interpreta `service_tier=default` da configuração atual. Configuração do MCP do Obsidian foi concluída com o Codex 0.163.0 já instalado no CutRoom, sem mudar a configuração de tier.
- Token do Obsidian armazenado em variável de ambiente local `OBSIDIAN_MCP_TOKEN`; nunca copiar seu valor para notas.
- Ferramentas `setup-agent` não estão expostas nesta sessão; nenhuma consulta ao catálogo é alegada como concluída.

## Referências oficiais

- https://learn.chatgpt.com/docs/app-server
- https://learn.chatgpt.com/docs/image-generation


## Decisão 23/10/2026 — fluxo de criação (usuário)

- A IA desenha o card inteiro, com texto, como no curso. O app não diagrama texto por conta própria.
- Ordem obrigatória: 1) pauta escolhida no Radar, no Modelador ou no Replicador; 2) texto gerado, editável e aprovado pela pessoa, com linha editorial e mascote, desenho ou efeito, definidos por ela ou sugeridos pelo app; 3) capa com 2 ou 3 opções para escolher; 4) restante do carrossel só depois do texto e da capa aprovados.
- Identidade visual do app (ícone e paleta): ainda sem resposta do usuário.

## 24/10/2026 — Funil CQV, distribuição e divulgação

- Projeto documental renomeado para **Funil CQV**, ampliando o registro para site, app, cursos, campanhas e mentoria. Marca PACTO do app preservada.
- Binários públicos em `Mathpcastro/pacto-releases`, código privado; Hostinger hospeda só o site.
- Divulgação expressamente autorizada no grupo WhatsApp identificado e no **Chat Geral (1)** do grupo Telegram indicado. Essa autorização específica de campanha não altera a regra de publicação manual de carrosséis do app.
- Mensagens curtas às 10h/20h, benefícios reais, case do Setup identificado como case, oferta R$97 → R$47 e link `/app/`. Foram agendadas dez por canal, em sequência finita.
- Mentoria: aplicação personalizada do funil com Matheus e possíveis ajustes no SaaS conforme diagnóstico/escopo; contratação à parte. Uma aula textual em cada módulo principal; ambas rascunho.
- Detalhes em [[20 - Entregas e operacao 2026-10-24]], [[21 - Campanha WhatsApp e Telegram]] e [[22 - Mentoria e aulas na Cakto]].

## 24/10/2026 — Carrossell: nome comercial aprovado

O usuário aprovou **Carrossell** como nome do aplicativo. P.A.C.T.O. permanece como método. O nome substitui a decisão histórica de preservar PACTO como marca do app. Símbolo, paleta, tipografia e assinatura ainda são propostas; três conceitos estão em [[23 - Carrossell branding]]. A versão 0.2.1 ainda usa PACTO no código e nos instaladores; nenhuma migração técnica foi realizada nesta etapa.
## Carrossell — branding aplicado, 24/10/2026

Direção 02 em produção: SVG/PNG/ICO/ICNS, avatares 1080×1080, bio e kit ZIP. App renomeado comercialmente; cores e tema escuro refinados. **Fontes, layout, navegação e botão de tema preservados**, para manter o tutorial gravado válido. 45 testes, 7 regressões, comparação visual e smoke empacotado aprovados; revisão visual PASS. Biblioteca e home Codex históricos preservados em pacto-desktop; appId, package name, IPC, feed e aliases mantidos.

Instalador local: release/Carrossell-Setup-0.2.1.exe (sem publicação). Não houve alteração de Instagram/site. Assets: resources/branding/; guia e validação: docs/branding/. Fonte de verdade no Obsidian: Projetos/Carrosseis Que Vendem/branding/. Código na branch codex/carrossell-branding.

## Carrossell 0.2.2 publicado — 24/10/2026

Código em `Mathpcastro/pacto-desktop` foi enviado à `main`, commit `d46a9ac`; tag `v0.2.2`. Release pública latest: https://github.com/Mathpcastro/pacto-releases/releases/tag/v0.2.2. Windows, Mac Apple Silicon e Mac Intel publicados e verificados; aliases Carrossell novos e aliases PACTO legados preservados. Instaladores sem assinatura de código; Mac sem notarização e com atualizações manuais. Ver [[Projetos/Carrosseis Que Vendem/branding/06 - Validacao da implementacao]].

## 26/10/2026 — Preferências da interface

O padrão atual deve permanecer igual ao tutorial; o usuário pediu personalizações opcionais de aparência e leitura depois de uma reclamação de texto pequeno. Preferências locais do comprador não mudam as imagens exportadas.


## 30/10/2026 — Painel de Analytics

Pedido do usuário: implementar o painel do anexo mantendo a estrutura visual atual. Analytics foi integrado a Marca › Conexões, com filtro por conta e 7/30 dias, ranking e referências para o Replicador. Ausência de métricas não vira zero, alcance é total único do período, e o histórico de seguidores usa somente coletas reais. Ver [[31 - Analytics do Instagram]].


## 03/11/2026 — Hierarquia do piloto aprovada

HTML aprovado aplicado ao app: Telegram destacado, blocos separados e configuração em diálogos. Mantidas ações e regras de aprovação. Ver [[38 - Hierarquia do piloto automatico]].
