# Integrações e ambiente

## Obsidian

- Servidor: `obsidian_obsidian_vault`.
- Transporte: HTTP local, configurado tanto no Codex quanto no Claude Code.
- Token guardado apenas na variável de ambiente de usuário Windows `OBSIDIAN_MCP_TOKEN`.
- Não colocar o valor do token nesta nota, no Git, em screenshots de configuração ou em logs.
- O token enviado inicialmente no chat deve ser substituído pelo usuário quando conveniente; nenhum valor foi copiado ao vault.
- Vault do projeto: `C:\Users\Admin2\Documents\Obsidian Vault\Projetos\Funil CQV`.
- O endpoint fornecido é do vault pai; mantê-lo disponível para o mesmo MCP funcionar.
- Script de sincronização: `C:\Users\Admin2\Documents\pacto-app\tools\pacto-obsidian.ps1 -Sync`, lê a variável local e grava apenas notas do projeto com precondição de conteúdo.

## Claude Code

MCP adicionado em escopo de usuário. `claude mcp get obsidian_obsidian_vault` confirmou `Connected`. Cabeçalho usa referência literal à variável, não token no arquivo de configuração. `CLAUDE.md` e `AGENTS.md` apontam à memória compartilhada.

As notas não mesclam historicamente as duas conversas de modo automático. Cada agente deve lê-las antes de trabalhar e atualizá-las com decisões/resultados verificados. Novos processos precisam herdar a variável de ambiente salva.

## Codex

- CLI global observado: 0.128.0, incompatível com `service_tier=default` da configuração atual.
- Comando de registro do MCP executado com o Codex 0.163.0 já instalado no CutRoom, sem reescrever o tier global.
- Novo app também fixa 0.163.0.
- Autenticação no app será própria via navegador; teste real usa ambiente privado temporário, sem alterar login global nem registrar credenciais no repositório.

## Pauta

- Job inicial: `9b68e7b3-a10d-4b76-bd7f-ddacf29c0a77`.
- Nova tentativa da aula05: `536cca42-312b-4431-85bf-05166f920968`.
- Oito transcrições recuperadas. Idioma retornado `asr-en`; sem timestamps.
- Análises automáticas de tendência do Pauta não são usadas como fatos do curso; priorizar texto e materiais oficiais.

## Notion

Biblioteca oficial fornecida pelo usuário e lida pelo conector Notion. Treze páginas salvas localmente, com seus IDs/URLs. Não houve alteração ou publicação no Notion.

## O Setup

Servidor `setup-agent` não exposto nesta sessão. A indisponibilidade foi registrada; não afirmar que o catálogo foi consultado nem atribuir a ele material encontrado em outra fonte.
