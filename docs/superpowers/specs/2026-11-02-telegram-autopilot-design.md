# Piloto automático com Telegram — especificação e espera de integração

Data: 02/11/2026. Pedido autorizado: implementar o fluxo descrito pelo usuário, isolado das duas frentes em andamento, aguardando biblioteca/seletor de cards e correção do logotipo.

## Estado desta preparação

- Worktree exclusiva: `C:\Users\Admin2\Documents\pacto-app-telegram`.
- Branch: `codex/telegram-autopilot`.
- Base estável: `v0.7.1`, commit `2987ba7`.
- Nenhuma funcionalidade do piloto foi implementada nesta preparação.
- Nenhuma conta conectada, geração, mensagem de Telegram ou publicação real foi executada.
- Não incrementar a versão ou preparar release antes da consolidação das outras mudanças.

## Dependências observadas e condição para começar

A leitura local de 02/11 encontrou:

1. `release/0.7.2`, worktree `C:\Users\Admin2\Documents\pacto-app-0.7.2`, commit `6a61ce8`: correção do anexo de imagem/logotipo. Árvore limpa e tag local `v0.7.2` nesse commit. Isso não comprova distribuição pública.
2. `feat/carrossell-reference-templates`, worktree `C:\Users\Admin2\Documents\Claude Code Editor\cutroom\worktrees\carrossell-templates`, HEAD `24c84d0`: biblioteca, alterações de quantidade de cards e provas específicas. `package-lock.json` ainda modificado na conferência. Não copiar arquivos nem tratar essa branch como concluída por inferência.

Esperar as duas frentes serem concluídas e consolidadas. Reconsultar Git, notas e resultados antes de retomar; não usar os hashes acima como estado permanente. Atualizar somente esta worktree para o commit final que contenha ambos os trabalhos; não fazer merge na main, alterar branches dos agentes ou publicar. Reexecutar testes de base nesse commit antes de implementar. O nome da próxima versão será definido depois; não assumir 0.7.3.

Comandos de diagnóstico sem alterar as outras worktrees:

```powershell
git -C 'C:\Users\Admin2\Documents\pacto-app' worktree list
git -C 'C:\Users\Admin2\Documents\pacto-app-0.7.2' status --short
git -C 'C:\Users\Admin2\Documents\Claude Code Editor\cutroom\worktrees\carrossell-templates' status --short
git -C 'C:\Users\Admin2\Documents\pacto-app' log --all --oneline -15
```

## Produto solicitado

Em Marca > Conexões, configurar o bot e o piloto por perfil: ativar/pausar, horário local, dias/frequência, contas do Instagram, estilo e quantidade de cards. Reutilizar o seletor e as validações consolidados pelo trabalho paralelo. Mostrar próxima execução, estado da conexão, trabalho em andamento e último erro.

O app gera a partir da próxima pauta disponível do Radar, respeita Contexto da Marca, Design Kit e regras de voz, escolhe a primeira capa e produz os cards, legenda e stories. A aprovação intermediária do texto e da capa passa a ser executada pelo piloto somente nesse fluxo explicitamente habilitado. O fluxo manual mantém suas próprias aprovações.

A pessoa recebe os cards e a legenda no Telegram e escolhe Postar agora, Agendar, Refazer ou Descartar. Nenhum carrossel é publicado antes do clique explícito em Postar agora ou da confirmação de um agendamento com data e contas claras. Stories são preparados e apresentados para uso manual; não acrescentar publicação automática de stories a este escopo.

## Arquitetura proposta para o fluxo autorizado

### Conexão do Telegram

Criar cliente HTTP pequeno em `core/telegram.mjs`, usando fetch/FormData nativos e dependências injetáveis para testes. Validar token com getMe; verificar getWebhookInfo e informar conflito caso o bot já esteja ocupado por webhook. Não remover configuração externa silenciosamente. Receber updates por getUpdates com long polling, cancelamento, um único consumidor por instalação e espera progressiva em falhas. Obedecer retry_after em 429. Proteger mensagens de erro contra URLs que contenham o token.

Guardar o token exclusivamente pelo cofre do Electron em `electron/secrets.mjs`, com funções específicas para Telegram; preservar o Composio e serializar gravações para evitar perda entre integrações. Não incluir token em bootstrap, eventos, CLI, prompts, links públicos, logs ou arquivos de projeto.

Vincular a conversa privada com código aleatório temporário/deep link gerado no app. Consumir o código uma única vez e exigir a combinação de chat e usuário vinculados em todas as ações. Uma conversa pode atender vários perfis, identificando a marca em cada mensagem; o trabalho e a revisão determinam o perfil, nunca o perfil atualmente aberto na janela.

### Persistência e execução

Criar unidades focadas em `core/autopilot-store.mjs`, `core/autopilot.mjs` e `core/autopilot-schedule.mjs`. Persistir configuração e fila por perfil, offset global do Telegram, pauta reservada, etapa, versão da revisão, IDs de mensagens e resultado por conta. Usar escrita atômica/serializada. Nunca armazenar token nessas estruturas.

Estados: aguardando horário, aguardando executor, gerando, enviando prévia, aguardando decisão, agendado, publicando, publicado, descartado, erro e resultado incerto. Permitir um trabalho ativo por vez no executor compartilhado e adiar o piloto quando houver criação manual, entrevista ou outro perfil em geração. Não interromper a pessoa e não trocar o perfil visível.

A integração deve aguardar o término real das tarefas do Runtime; algumas actions iniciam trabalho e devolvem antes da conclusão. Não encadear só pelos valores retornados. Conferir cancelamento, erro, aprovação e imagens efetivamente válidas antes da próxima etapa. Retomar pelo último checkpoint, sem gerar outro projeto ou reaproveitar pauta já reservada a cada reinício.

Se o Radar não tiver pauta disponível, executar uma única reposição pelo método atual e persistir os IDs usados. Manter a fila normal acessível na interface. Falhas de login ou limite de conta pausam a execução e exibem o motivo; não repetir indefinidamente chamadas de geração.

### Prévia e decisões

Enviar álbuns em grupos de até dez itens, mantendo a ordem. Um item isolado usa sendPhoto. Legendas longas vão em mensagens de texto para preservar o conteúdo integral. Enviar stories em bloco separado, claramente identificado como material de apoio.

Só disponibilizar os botões de aprovação após todos os cards e a legenda serem enviados. O callback contém identificador curto de revisão e ação, dentro do limite da API; perfil, projeto, contas e permissões ficam no estado local. Validar mensagem, chat, usuário, revisão atual e estado do trabalho. Responder rapidamente ao callback e executar a ação pela fila persistida.

- Postar agora: utilizar `Social.publish` e os destinos congelados na revisão; atualizar os resultados por conta e o Telegram somente após resposta real.
- Agendar: pedir data/hora no horário do computador, reaproveitar `parseWhen`, mostrar resumo com marca/contas e confirmar antes de chamar `Social.schedule`. Cancelar a interação não publica.
- Refazer: invalidar os botões anteriores, preservar o rascunho para auditoria local e gerar uma nova revisão. Nenhuma aprovação anterior se transfere.
- Descartar: retirar da fila sem apagar silenciosamente os arquivos do usuário.

Persistir a intenção antes de efeitos externos. Clique repetido ou update reenviado não pode disparar uma segunda publicação. Se a rede cair após uma possível publicação e não for possível confirmar o resultado, marcar resultado incerto e pedir conferência; não reenviar automaticamente. Em múltiplas contas, preservar os sucessos e oferecer nova tentativa somente para falhas confirmadas.

### Segundo plano e agendamento do sistema

Reutilizar o executor de tarefas do sistema, com identidade e argumentos próprios para o piloto; não reaproveitar IDs `Carrossell\post-*` dos posts agendados. Registrar a próxima execução por perfil, rearmar após processamento e remover somente as tarefas do piloto ao pausar/desativar. Respeitar o horário local e testar virada de dia, suspensão e retomada. Não executar uma sequência de gerações acumuladas após dias offline: oferecer uma execução de recuperação e reagendar a próxima.

Hoje `electron/main.mjs` encerra quando a última janela fecha e não há job/CLI, também possui timeout ocioso de dez minutos e encerra após publishDue em modo agendado. Essas três condições devem considerar o serviço de Telegram ativo. Manter polling enquanto o piloto estiver habilitado e oferecer pausa/saída explícitas. Fechar a janela permite operação em segundo plano; Sair encerra de fato. Testes e provas usam diretório de dados temporário, sem acessar a biblioteca e o cofre reais.

### Interface e contratos

Criar `src/components/Autopilot.jsx`, com integração pontual na seção Conexões de `src/components/Brand.jsx`; seguir tokens/componentes existentes. Adicionar somente as actions necessárias em `core/runtime.mjs` e `electron/preload.cjs`, status público sem segredos e tratamento em `src/usePacto.js` se necessário. Reavaliar esses pontos após incorporar biblioteca/seletor e correção do logotipo. Evitar refatorações fora do recurso.

## Critérios de aceitação e validação posterior

- Testes com servidor HTTP local/injeção de transporte para API Telegram; nenhuma mensagem real nos testes automáticos.
- Pairing expira, não aceita grupo e rejeita usuário/chat errado.
- Token não aparece em estado/evento/log/erro, incluindo falha HTTP que contenha URL.
- Ordenação de 4/6/8/10/12 cards, último lote com um item, legenda longa e falha parcial de envio.
- Estado e decisões persistem após reinício; botões de revisões antigas e cliques duplicados não publicam.
- Perfil do trabalho continua correto ao alternar a marca na janela.
- Trabalho manual tem prioridade; cancelamento, falta de login/limite e falhas de geração não provocam continuação indevida.
- Agendamento usa o executor existente, exige confirmação e não interfere nos posts manuais.
- Falha parcial por conta e resposta incerta não causam republicação automática.
- Prova Electron com dados temporários: configuração, pausa, reconexão, fechamento da janela, polling em segundo plano e retorno à interface.
- Regressões após a base consolidada: `npm test`, `npm run build`, `node scripts/renderer-regression.mjs`, `node scripts/ui-phases.mjs`, provas da biblioteca e do anexo de logotipo, mais prova dedicada do piloto.
- Geração pela conta real, envio a um bot real e postagem real são validações separadas; não descrever testes locais como comprovação dessas operações. Só usar uma conexão de teste autorizada pelo usuário; não pedir tokens pelo chat.

## Limites e fontes

Computador ligado, sessão de usuário disponível e conexão de rede são necessários. Suspensão/desligamento interrompem o polling; updates do Telegram ficam retidos no máximo 24 horas, portanto não prometer recuperação indefinida. Usar apenas API padrão sem mensagens pagas. A duração da arte por IA varia e não deve ser prometida como prazo fixo por card.

Documentação oficial consultada em 02/11/2026:

- https://core.telegram.org/bots/api#getupdates
- https://core.telegram.org/bots/api#sendmediagroup
- https://core.telegram.org/bots/api#inlinekeyboardbutton
- https://core.telegram.org/bots/api#answercallbackquery

O catálogo setup-agent foi tentado pelo endpoint configurado e retornou HTTP 401 nesta sessão. Não foi possível verificar um recurso pronto no acervo; isso não significa que ele não exista. Não instalar ferramenta nem criar credencial para contornar o acesso.

## Verificação da preparação

Em 02/11/2026, na worktree isolada baseada em 0.7.1:

- `npm ci --no-audit --no-fund`: concluído, 398 pacotes instalados, sem alteração de package-lock.json.
- `npm test`: 113 testes aprovados, zero falhas.
- `npm run build`: concluído, Vite gerou o bundle de produção.
- `git fetch origin`: concluído. `origin/main` em `6a61ce8`; correção de logotipo presente; HEAD observado da biblioteca ainda não é ancestral de origin/main.
- Não executadas provas de UI do piloto, integração Telegram ou publicação: o recurso ainda aguarda suas dependências e não foi implementado.
