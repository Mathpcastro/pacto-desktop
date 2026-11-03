# Hierarquia do piloto automático — 03/11/2026

O usuário aprovou o HTML e autorizou implementar. Mudança isolada em `codex/pilot-layout`, baseada em `93631ef` (0.7.4). Sem nova versão, push ou release nesta etapa.

## Interface

- Telegram em bloco próprio, com logo oficial e estado real da conexão.
- Rotina salva e pedidos para revisar em blocos separados. Configuração e conexão abrem em diálogos; token protegido, rascunhos e regras de ativação preservados.
- Exemplos de conversa e ajuda recolhível. Histórico mantém progresso, erros, retomar/descartar e aviso de publicação incerta.
- Prévia usa imagens reais do projeto; projeto excluído ou sem imagens apresenta aviso. Publicação do piloto continua exigindo aprovação no Telegram.
- Abrir Telegram funciona também depois do vínculo, usando somente o bot validado e vínculo ativo. Sem novo destino arbitrário ou ação de publicação.

## Validação observada

- Node: 209/209; build passou.
- Electron: fases da interface 46/46, renderer 9/9, descoberta 15/15, referências 16/16, piloto 14/14.
- Layout: quatro grupos passaram, incluindo temas claro/escuro, janela pequena/125%, telefone, teclado, Escape/foco, rascunho, token protegido e prévia persistida/projeto excluído.
- Revisão independente: PASS, sem P1/P2 restantes. Corrigidos botão Salvar cortado e ausência de margens nos diálogos; confirmação independente em 1093×580/125%, 390px e 375px.
- Evidências: `C:/Users/Admin2/Documents/Codex/2026-11-02/qual-o-jeito-mais-f-cil/outputs/piloto-implementado`.

Testes usaram Electron real, IPC/store de produção e fixtures locais explícitos. Não houve geração, envio real de mensagens ou publicação. O screenshot de prévia usa uma imagem manual de teste; não representa conteúdo de cliente.

Logo: SVG oficial do Telegram, obtido do pacote de imprensa em `https://telegram.org/tour/screenshots`.
