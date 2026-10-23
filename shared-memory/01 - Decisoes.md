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
