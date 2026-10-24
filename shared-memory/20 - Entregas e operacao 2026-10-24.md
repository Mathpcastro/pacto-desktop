# Entregas e operação — 24/10/2026

Consolidação desta conversa. Fontes: ações já verificadas na sessão, arquivos de comprovação copiados para `Evidencias/operacao-2026-10-24/`, notas anteriores e informações de distribuição fornecidas pelo usuário. Estados de agendamento e aulas são os da conferência da sessão; não representam monitoramento contínuo.

## Nome e escopo

- Projeto no Obsidian: **Funil CQV**, anteriormente PACTO Desktop.
- Abrange aquisição para SaaS/apps/infosaas, site, curso Carrosséis Que Vendem, app PACTO, divulgação e mentoria.
- App/código: `C:\Users\Admin2\Documents\pacto-app`, repositório privado `Mathpcastro/pacto-desktop`.
- Site estático/Hostinger: `C:\Users\Admin2\Documents\Método Pacto`.
- Repositório original do funil: `C:\Users\Admin2\Documents\carrosseis que vendem`.
- A renomeação é do projeto documental. Não houve mudança de nome do app, dos repositórios ou dos links comerciais.

## Site e Hostinger

- Página do app: https://carrosseisquevendem.com.br/app/
- Mentoria: https://carrosseisquevendem.com.br/mentoria/
- A página `/app/` é distinta da home; entrar na raiz não significa abrir a landing nova. O build inclui a pasta `app` e o servidor local reconhece a rota `/app`.
- Nesta consolidação, as duas URLs responderam HTTP 200 e o conteúdo da oferta do app foi encontrado em `/app/`. Não se atribui uma causa ou correção de deploy que não tenha sido demonstrada.
- ZIP para Hostinger: `C:\Users\Admin2\Documents\Método Pacto\hostinger-cqv-app-2026-10-24.zip`, 6.758.805 bytes, aproximadamente 7 MB. Estrutura do pacote conferida: `public/app/index.html`, `public/mentoria/index.html`; nenhum instalador em `/download/`.
- O pacote antigo de aproximadamente 785 MB e a pasta `/download/` foram retirados, conforme relato de distribuição já registrado. Binários ficam no GitHub.
- Oferta usada na divulgação: **de R$97 por R$47 por tempo limitado**. Não foi configurada uma data automática de encerramento.

## Instaladores e novas versões

Repositório público só de instaladores: https://github.com/Mathpcastro/pacto-releases . Código-fonte permanece privado.

| Sistema | Link fixo |
| --- | --- |
| Windows 10/11 | https://github.com/Mathpcastro/pacto-releases/releases/latest/download/PACTO-Windows.exe |
| Mac Apple Silicon | https://github.com/Mathpcastro/pacto-releases/releases/latest/download/PACTO-Mac-AppleSilicon.dmg |
| Mac Intel | https://github.com/Mathpcastro/pacto-releases/releases/latest/download/PACTO-Mac-Intel.dmg |

Versão de referência: **0.2.0**. Conforme os testes de distribuição informados no início da conversa, os três links baixaram sem login; Windows instalado consultou a release e indicou que já estava atualizado. O download de atualização havia sido provado de 0.1.0 para 0.1.1.

Fluxo para próxima versão: subir `version` no `package.json` → `npm run dist` para Windows → executar workflow **Build macOS** no GitHub → publicar com `node scripts/publicar-github.mjs`. Detalhes dos argumentos Mac estão no histórico em [[02 - Estado e proximos passos]]. Os links da área de membros permanecem iguais.

Mac ainda sem assinatura Apple: liberar na primeira abertura e baixar manualmente a cada versão. Build preparado para assinatura/notarização quando houver conta e configuração Apple Developer. App empacotado testado nos Macs do GitHub; instalação `.dmg` em Mac físico continua pendente. Instruções para compradores em [[19 - Instalacao para compradores]].

## Área de membros — Cakto

Editor: https://aluno.cakto.com.br/app/admin/courses/cmt239i6o0006jo04o5zkok5e/edit?step=1

### Módulo do app

Nome: **Aprenda a usar o APP pra criar Carrosseis Que Vendem**. Oito vídeos foram inseridos com título, descrição, objetivos/ação e duração. Fontes: `Evidencias/minicurso/` e [[17 - Minicurso roteiros]].

| Ordem | Aula | Vídeo |
| --- | --- | --- |
| 00 | Comece aqui: baixe, instale e abra o PACTO | Apenas texto |
| 01 | Do zero ao carrossel | 2min14s |
| 02 | Fundação: contexto e Design Kit | 3min11s |
| 03 | P de Pauta: Radar e Modelador | 2min09s |
| 04 | A + C: Arquitetura e Copy | 3min |
| 05 | T de Tratamento visual: da capa aos cards | 1min53s |
| 06 | O de Oferta e a rotina que vende | 2min27s |
| 07 | Quando algo sai errado: como continuar | 3min16s |
| 08 | O curso é opcional, e vale a pena | 1min20s |
| Final | Mentoria P.A.C.T.O.: vamos aplicar o funil ao seu SaaS | Apenas texto; rascunho |

A aula 00 ficou antes dos vídeos e inclui escolha do sistema/chip, os três downloads fixos, instalação e avisos Windows/Mac, conexão da própria conta ChatGPT e diferenças de atualização por sistema. O módulo tem **dez aulas** após acrescentar a mentoria.

### Módulo normal do método

**Faça sua primeira assinatura em 8 etapas**: as oito aulas existentes foram preservadas. Acrescentada no final a mesma aula textual de mentoria; total **nove aulas**. Os bônus de Codex (20 aulas) e oferta (4 aulas) foram preservados.

As duas aulas de mentoria foram reabertas após salvar, conferidas no Preview e verificadas sem vídeo e com CTA correto. Ambas estão como **rascunho, não visíveis aos alunos**. Não alegar publicação concluída. Texto integral em [[22 - Mentoria e aulas na Cakto]].

## Divulgação

Dez mensagens curtas por canal, com benefícios reais e foco em aquisição/primeira venda de SaaS, oferta R$97 → R$47 e link `/app/`. WhatsApp via agendamento nativo Uazapi; Telegram via conta do usuário, só Chat Geral. Horários e textos integrais em [[21 - Campanha WhatsApp e Telegram]].

## Evidências preservadas

- [[Evidencias/operacao-2026-10-24/cakto-minicurso-2026-10-24.jpg|Minicurso na Cakto]]
- [[Evidencias/operacao-2026-10-24/cakto-aula-00-instalacao-2026-10-24.jpg|Aula de instalação]]
- [[Evidencias/operacao-2026-10-24/mentoria/aula-mentoria-app.jpg|Prévia da mentoria]]
- [[Evidencias/operacao-2026-10-24/telegram/fila-agendada.jpg|Fila nativa do Telegram]]
- `Evidencias/operacao-2026-10-24/whatsapp/verification.json`: dez campanhas com status e conferências.
- `Evidencias/operacao-2026-10-24/telegram/verification.json`: dez mensagens, somente tópico 1, persistência conferida após recarregar.
- `Evidencias/operacao-2026-10-24/mentoria/conteudo.html`: HTML usado nas duas aulas.

Tokens, sessões de autenticação e scripts operacionais não foram copiados para o vault.
