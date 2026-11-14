# Revisão do Estúdio com conversa longa

14/11/2026. Correção em `fix/studio-revisao-chat`, sobre a release pública 1.13.4 (`a631720`). Build local para Windows.

## Reprodução

O print do suporte mostra uma instrução longa com cinco cards no histórico, após a correção do roteiro. A cliente relatou que a revisão não avançava mesmo depois de fechar ou duplicar o projeto. O anexo disponível é o print do WhatsApp. A versão e o log da máquina da cliente não foram fornecidos.

Na 1.13.4, a conversa ficava no rodapé do painel lateral com altura determinada por todo o conteúdo. Com uma mensagem longa, o rodapé tomava o espaço do checklist. Em 1093×580 a primeira caixa permanecia no DOM mas não recebia cliques. O roteiro revisado estava salvo. Reabrir ou duplicar o projeto mantém o histórico que provoca o problema.

## Correção e testes

- Histórico rolável com altura limitada pela janela. Ao enviar ou receber uma nova mensagem na visualização resumida, a última fica à vista. “Ver conversa inteira” abre no início, com acesso por teclado.
- O campo de pedido tem altura máxima. O checklist continua no corpo do painel e os seis itens ainda são exigidos para aprovar.
- `scripts/studio-review-chat-proof.mjs` falha na versão original e passa com a correção. Conferiu o checklist clicável em 1093×580, o histórico completo, teclado, revisão a 125%, aprovação, três opções de capa em modelo local e a preservação dos cinco cards e da legenda.
- 269 testes passaram, 1 pulado. Build aprovado. As provas antigas do renderer (9) e da interface por fases (46) passaram em cópias locais com estado de licença válido na pasta de teste.
- Evidências em `C:/Users/Admin2/Documents/pacto-app-revisao/.cache/studio-review-chat-proof/`.
- A mesma prova passou no executável empacotado `release/revisao/win-unpacked/Carrossell.exe`, com perfil isolado. Nenhuma release nova foi publicada.
