---
project: funil-cqv
status: em-operacao
tags: [pacto, projeto, memoria-compartilhada]
---
# Funil CQV

Memória compartilhada entre Codex e Claude. Leia [[01 - Decisoes]] e [[02 - Estado e proximos passos]] antes de trabalhar. Confirme fatos mutáveis no código e nos resultados; estas notas não comprovam entregas por si mesmas.

Projeto renomeado de PACTO Desktop para **Funil CQV** em 24/10/2026, a pedido do usuário. Abrange o funil Carrosséis Que Vendem: site, app PACTO, cursos, divulgação e mentoria. O app e os repositórios mantêm seus nomes.

**Última consolidação:** [[20 - Entregas e operacao 2026-10-24]]. Campanhas em [[21 - Campanha WhatsApp e Telegram]]; mentoria em [[22 - Mentoria e aulas na Cakto]].

## Mapa do projeto

- [[01 - Decisoes]] — autorização, escolhas de produto e limites de escopo.
- [[02 - Estado e proximos passos]] — checkpoint atual e tarefas abertas.
- [[03 - Fontes do curso]] — oito vídeos, procedência e qualidade das transcrições.
- [[04 - Biblioteca oficial]] — link do Notion e print original enviado pelo usuário.
- [[05 - Metodo e biblioteca]] — como a base do P.A.C.T.O. foi organizada.
- [[06 - Arquitetura do aplicativo]] — componentes, fluxo e arquivos.
- [[07 - Plano de implementacao]] — plano executável e contrato renderer/runtime.
- [[08 - Integracoes e ambiente]] — Codex, Claude, Obsidian e Pauta, sem segredos.
- [[09 - Validacoes e evidencias]] — testes executados e o que ainda não foi comprovado.
- [[10 - Como continuar no Claude]] — leitura inicial, colaboração e instrução pronta.
- [[11 - Diario de desenvolvimento]] — sequência de pedidos, decisões e descobertas.
- [[12 - Pendencias tecnicas]] — pontos que precisam de resolução e seus impactos.
- [[13 - Metodo operacional]] — consolidação completa do método e fontes.
- [[14 - Prompts originais]] — índice dos 19 prompts preservados.
- [[15 - Entrega e provas reais]] — instalador, hashes, telas e resultados de ponta a ponta.
- [[16 - Roteiro de fidelidade ao curso]] — diagnóstico de copy/tipografia, recursos faltantes e prioridades.
- [[17 - Minicurso roteiros]] — roteiros das oito aulas do app.
- [[18 - Landing do app (copy v2)]] — texto e decisões da landing; histórico.
- [[19 - Instalacao para compradores]] — links fixos e primeira abertura.
- [[20 - Entregas e operacao 2026-10-24]] — operação, área de membros e pendências atuais.
- [[21 - Campanha WhatsApp e Telegram]] — textos, horários e evidências dos 20 agendamentos.
- [[22 - Mentoria e aulas na Cakto]] — escopo, copy e estado das duas aulas.
- `Materiais/` — 13 páginas originais da Biblioteca Oficial do Notion.
- `Transcricoes/` — oito retornos textuais do Pauta, com idioma e origem.
- `Anexos/` — print original da biblioteca, preservado sem alteração.
- `Prompts/` — 19 prompts originais, separados por função e com fonte.
- `Evidencias/` — telas reais do app, exemplos técnicos e ZIP exportado.

## Objetivo autorizado

Criar um aplicativo Electron para Windows, vendido por R$47, que gera e gerencia carrosséis pelo método das oito aulas P.A.C.T.O. Curso opcional. O comprador conecta a própria conta do ChatGPT uma vez; Codex roda por trás, sem terminal na experiência diária. O usuário aprovou explicitamente essa estrutura nesta conversa.

## Caminhos

- **Repositório atual (desde 23/10/2026):** `C:\Users\Admin2\Documents\pacto-app`, GitHub privado `Mathpcastro/pacto-desktop`, branch `main`. O app fica na raiz; as notas, em `shared-memory/`; o plano e a proposta, em `docs/plans/` e `docs/specs/`; o script de sincronização com o Obsidian, em `tools/pacto-obsidian.ps1`.
- Histórico: o app começou em `desktop/` na worktree `C:\Users\Admin2\Documents\pacto-desktop` (branch `codex/pacto-desktop` do repositório do funil). Essa cópia não recebe mais trabalho novo.
- Projeto original do funil: `C:\Users\Admin2\Documents\carrosseis que vendem`; possui alterações anteriores que devem ser preservadas.
- Referência CutRoom: `C:\Users\Admin2\Documents\Claude Code Editor\cutroom`.
- Proposta: `docs/specs/2026-10-22-pacto-desktop-design.md`.

## Acordo de colaboração

Antes de editar, ler estado e decisões. Ao terminar uma etapa, atualizar notas com arquivos alterados, validações realmente executadas e pendências. Não substituir trabalho de outro agente sem ler o estado atual. Não registrar tokens, senhas, chaves ou respostas brutas de autenticação.

As notas são arquivos Markdown compartilhados, não sincronização automática de histórico de chat. O MCP já foi configurado tanto no Codex quanto no Claude Code; uma consulta do Claude confirmou `Connected`. O MCP configurado aponta ao vault pai `Obsidian Vault`; os caminhos destas notas começam por `Projetos/Funil CQV/`. Este diretório também foi registrado no Obsidian como vault próprio, com configuração `.obsidian` separada. A conexão HTTP continua sendo a do vault pai, que deve permanecer acessível para usar o mesmo endpoint.


## Marca do aplicativo — decisão mais recente

Nome do app: **Carrossell**, direção visual 02. O método continua P.A.C.T.O. A versão 0.2.2 está publicada para Windows, Mac Apple Silicon e Mac Intel. Release e limitações em `docs/branding/validation.md` e no vault `Projetos/Carrosseis Que Vendem/branding/06 - Validacao da implementacao`.

## Preferências da interface

- [[25 - Preferências da interface]] — paletas, fontes e escala de leitura do Carrossell.


## Analytics — 30/10/2026

- [[31 - Analytics do Instagram]] — painel em Marca › Conexões, consultas reais de 7/30 dias, ranking e referências para o Replicador, build de teste atualizado e provas.


## Release 0.6.0 publicada — 30/10/2026

[[32 - Release Carrossell 0.6.0]]: Latest com Windows e os dois Macs, workflow aprovado, links HTTP 200, feed Windows 0.6.0 e zero artefatos de Actions. Usuário confirmou publicação real de carrossel pelo app. Agendamento real e Mac físico seguem sem confirmação.


## Roteiro — 02/11/2026

- [[33 - Roteiro comentarios stories anuncios e provedores]] — stories preto/branco e copy anti-IA implementados localmente; pesquisa de comentários (Composio/ManyChat), login Claude/Gemini e plano de anúncios.


## Release 0.7.0 publicada — 02/11/2026

[[34 - Release Carrossell 0.7.0]]: Latest com Windows e os dois Macs, zero artefatos de Actions, links HTTP 200 e feed Windows 0.7.0. Stories de texto, copy anti-IA e modo agente (Claude/Gemini pela CLI) incluídos.
