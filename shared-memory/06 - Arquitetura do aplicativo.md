# Arquitetura do aplicativo

## Experiência aprovada

Instalar aplicativo Windows → conectar própria conta ChatGPT → cadastrar negócio e identidade → escolher pauta → gerar/revisar roteiro → gerar imagens → editar um slide se necessário → salvar na biblioteca → exportar e postar manualmente.

O curso é consulta opcional. O usuário final não precisa digitar comandos ou abrir o Codex separadamente. A conta e seus limites continuam necessários. R$47 é o preço do aplicativo informado pelo usuário, não uma definição de IA ilimitada.

## Componentes

- React/Vite: onboarding, biblioteca, perfil/Design Kit, editor, conversa, curso e temas claro/escuro.
- Preload Electron: API pequena `window.pacto.request` e eventos; sem expor filesystem ou terminal ao renderer.
- Processo principal: valida ações, coordena armazenamento, diálogos nativos, exportação e subprocesso.
- Codex: pacote nativo fixado em 0.163.0, `app-server --listen stdio://`, login pelo navegador, streaming, cancelamento e resultados reais.
- Base P.A.C.T.O.: mesma fonte versionada para app e MCP independente.
- Armazenamento local: perfis, projetos, mensagens, slides, revisões e arquivos gerados. Credenciais separadas de exportações e memória.
- MCP do curso: expõe método, aulas, materiais originais e ferramentas de briefing/contexto/revisão.

## Contrato de ações

`bootstrap`, `saveProfile`, `connect`, `disconnect`, `createProject`, `saveProject`, `generatePlan`, `generateSlides`, `sendMessage`, `cancel`, `export`, `duplicate`, `delete`, `openCourse`, `importReference`.

Eventos: estado completo, projeto atualizado e atividade em andamento. O contrato completo está no plano de implementação.

## Interface em construção

Direção editorial compacta: warm-white/grafite e terracota na interface, tipografia de sistema, ações secundárias em menus. As cores da interface são independentes das cores que o comprador escolhe para seus carrosséis. Prévia só mostra imagem existente; sem fingir carrosséis gerados.

## Distribuição

Pacote isolado em `desktop/`, versão inicial 0.1.0. Electron Builder/NSIS gerou o instalador, e o executável empacotado passou na prova de reabertura/exportação de dois slides reais. Instalador sem assinatura digital; instalação em outro Windows limpo ainda é validação de distribuição pendente. Exportação converte cópias para1080×1350, preservando originais e histórico.

## Ajustes comprovados durante a integração

- `features.code_mode_host=true` é necessário para a ferramenta nativa de imagem; shell permanece desativado.
- Contexto do plano usa o método consolidado, sem repetir todas as páginas a cada chamada.
- Imagens usam perfil/direção e regras visuais relevantes, reduzindo consumo desnecessário da conta.
- Gerar restantes preserva slides já aprovados; gerar um slide específico refaz apenas aquele.
- Mudança na copy sinaliza arte desatualizada e bloqueia exportação até atualizar.
- Cancelamento verifica o token depois de salvar o estado e antes de iniciar inferência.
- Respostas de conversa e Radar podem ter zero slides, preservando o plano e a arte existentes.
- Campos editados acompanham atualização externa sem sobrescrever rascunhos locais; esconder painel preserva edição.
