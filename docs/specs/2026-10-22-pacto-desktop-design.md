# P.A.C.T.O. Desktop — proposta para revisão

Data: 22/10/2026. Estado: proposta; aplicativo e MCP ainda não implementados.

## Produto solicitado

Aplicativo Electron para Windows, vendido por R$ 47, no qual a pessoa cadastra seu negócio e cria, revisa, organiza e exporta carrosséis aplicando as oito aulas do P.A.C.T.O. O curso continua disponível como consulta opcional. O uso diário acontece na interface do aplicativo, sem digitar comandos ou abrir o Codex separadamente.

## Abordagens e recomendação

1. **Recomendada: Electron com Codex local e conta do próprio usuário.** Empacotar o runtime e controlar `codex app-server` por stdio, com login pelo navegador iniciado no aplicativo. Aproveita o padrão já utilizado pelo CutRoom e mantém projetos no computador. Consome os limites da conta conectada; geração de imagens precisa ser comprovada nesta integração.
2. **Electron com inferência paga pelo vendedor.** Evita exigir conta de IA do comprador, mas requer backend, autenticação, cotas e orçamento por uso. Um pagamento único de R$ 47 não define nem garante capacidade ilimitada.
3. **MCP primeiro, aplicativo depois.** Valida a fidelidade do método no Codex do usuário antes de construir a interface. É uma etapa técnica útil, porém o produto final continua sendo o aplicativo solicitado.

A proposta adota a opção 1, começando pela ingestão do curso e pelo MCP reutilizável da opção 3. A decisão sobre usar a conta do comprador ainda precisa ser confirmada.

## Fontes e limites da ingestão

Job Pauta: `9b68e7b3-a10d-4b76-bd7f-ddacf29c0a77`. Oito vídeos aceitos e enfileirados em 22/10/2026 no horário de São Paulo.

| Ordem | Aula | Vídeo |
| --- | --- | --- |
| 01 | A prova + Método PACTO | https://youtu.be/SkJWJMKwy6I |
| 02 | P — Radar de Pautas | https://youtu.be/73OpTuUsCH8 |
| 03 | A — As 5 Arquiteturas | https://youtu.be/-o3AEfDjBsQ |
| 04 | C — Copy Engine | https://youtu.be/plr8iGMRnRo |
| 05 | T — Design Kit + Efeito Continuidade | https://youtu.be/LWIanBtCUHg |
| 06 | Criando um Carrossel que Vende do Zero | https://youtu.be/32aNnLBXBrA |
| 07 | O — Comentário → DM → Oferta | https://youtu.be/QRwxq7bqWwo |
| 08 | Sistema Completo + Desafio de 30 Minutos | https://youtu.be/bvDw6TPoU8I |

Preservar a resposta bruta do provedor, texto original recebido, idioma e URL de cada aula. Material retornado em inglês é tradução/transcrição fornecida pelo Pauta, não transcrição literal em português. Não inventar timestamps quando o provedor entregar apenas texto corrido.

Extrair separadamente: princípios, entradas necessárias, passos, estruturas, exemplos, restrições e critérios de revisão. Vincular cada regra à aula de origem. Distinguir os exemplos pessoais do professor dos dados reais do comprador. Documentos, prompts ou demonstrações apenas exibidos na tela precisam de consulta visual ou dos materiais originais; áudio sozinho não comprova esses conteúdos.

O MCP deve conter conhecimento estruturado e ferramentas que apliquem esse conhecimento. Não basta expor um texto longo como se fosse um sistema completo.

## Estrutura proposta

- Base versionada do curso: fontes brutas, transcrições por aula e regras com proveniência.
- Núcleo P.A.C.T.O.: contratos de entrada, seleção de contexto e validação dos resultados por etapa.
- Servidor MCP local por stdio: distribui o método e pode ser conectado diretamente ao Codex de quem preferir esse caminho.
- Aplicativo Electron: onboarding, projetos, conversa contextual, prévia dos slides, biblioteca e exportação.
- Processo Codex: recebe o briefing e o contexto adequado do método; executa tarefas com progresso, cancelamento e retomada.
- Armazenamento local: perfis, design kits, projetos, revisões e arquivos gerados separados de dados internos de autenticação.

O app e o MCP devem usar o mesmo núcleo para evitar versões diferentes do método. O aplicativo não depende da instalação do Pauta pelo comprador; a transcrição é uma etapa de produção da base do curso.

## Onboarding proposto, sujeito ao conteúdo integral das aulas

Negócio e produto; público; problema e resultado; diferenciais; oferta e destino; provas disponíveis; tom de voz; identidade visual e referências. Os campos exatos serão ajustados ao curso, sem impor a identidade do professor a todos os usuários.

Ao concluir, salvar um perfil reutilizável e permitir edição. Pedir informações ausentes quando necessárias em vez de inventar promessas, provas ou resultados.

## Fluxo principal

1. Conectar a conta e cadastrar o perfil.
2. Criar projeto com tema próprio ou solicitar pautas adequadas ao perfil.
3. Aplicar Pauta, Arquitetura, Copy, Tratamento visual e Oferta conforme o curso.
4. Revisar roteiro e direção visual; produzir capa e um slide interno para validar a consistência antes do restante.
5. Gerar os demais slides com a mesma direção. Refazer um slide sem sobrescrever os aprovados.
6. Salvar automaticamente, reabrir, duplicar e editar carrosséis na biblioteca.
7. Exportar PNGs numerados e ZIP com os arquivos reais, acompanhados da legenda quando gerada.

A primeira versão prepara CTA, material e proposta de DM conforme o método. Não envia mensagens nem publica no Instagram automaticamente; o pedido atual termina na exportação e publicação pelo usuário.

## Interface proposta

Navegação compacta: Carrosséis, Perfil e Design Kit, com curso e configurações em ações secundárias. Na criação: sequência de slides e prévia central; conversa contextual em painel lateral. Tema claro/escuro persistido, ações secundárias em menus. As cores da interface do produto e as cores escolhidas para cada carrossel são independentes.

## Integração e erros

O CutRoom inspecionado usa Electron/React/TypeScript e `codex app-server --listen stdio://`; sua configuração atualmente desativa `image_generation`. Reutilizar o padrão de transporte, sem copiar essa restrição para a geração dos carrosséis. Preservar o CutRoom e o funil existentes.

Empacotar versão fixa do binário e validar eventos do protocolo. A documentação oficial descreve login próprio pelo navegador, threads e streaming. A rota Sign in with ChatGPT com token de plano em `/v1/responses` tem restrições próprias e não deve ser confundida com a disponibilidade nativa de imagens do Codex CLI.

Tratar login ausente, expiração, limites, modelo indisponível, geração interrompida e arquivos inválidos com ações de recuperação. Somente marcar geração/exportação como concluída depois de verificar os arquivos. Credenciais não entram em projetos exportados nem em logs visíveis.

## Critérios de conclusão

- Oito fontes salvas e cobertura de transcrição explicitamente verificada; lacunas e traduções identificadas.
- Regras do método rastreáveis às aulas, sem nomes ou critérios inventados para completar o conteúdo.
- MCP conecta por stdio, lista recursos/ferramentas e entrega contexto do curso testado com um cliente real.
- Fluxo Windows comprovado: instalação → login → onboarding → geração real de imagens → reabertura → alteração de slide → exportação.
- Saída com arquivos numerados, dimensão uniforme, texto legível e consistência visual verificada em amostras representativas.
- Falha ou cancelamento não destrói os slides anteriores e permite nova tentativa.

## Ordem de execução

1. Concluir transcrições e registrar qualidade/limites.
2. Consolidar a base e conferir materiais mencionados nas aulas.
3. Aprovar esta estrutura e detalhar o plano de implementação.
4. Construir/testar MCP e prova real de imagem com o Codex embarcado.
5. Construir app, testar fluxo completo e produzir instalador Windows.

## Evidências consultadas

- Código local do CutRoom: `electron/core/codex.ts` e `package.json`, inspecionados nesta sessão.
- Codex app-server: https://learn.chatgpt.com/docs/app-server
- Imagens no Codex: https://learn.chatgpt.com/docs/image-generation
- Limites da rota de token compartilhado: https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations
- O Setup: o servidor `setup-agent` não está exposto nas ferramentas desta sessão; não foi possível consultar o acervo. Nenhum recurso do acervo é alegado como validado.

Este documento é uma proposta técnica para revisão. Não representa um MCP funcional, um aplicativo entregue nem uma validação de imagens já executada.
