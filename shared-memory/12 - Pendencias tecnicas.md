# Pendências técnicas e limites

## Resolvido: geração nativa

O bloqueio inicial era a configuração `features.code_mode_host=false`. A ferramenta nativa estava disponível e precisava do executor de orquestração. Com `features.code_mode_host=true`, imagem real, edição por referência, dois slides pelo método e exportação passaram. Shell continua desabilitado. Não foi usada identidade de outro produto nem API alternativa.

## Resolvido: rascunhos e cancelamento

Revisão encontrou campos antigos após revisão do assistente, perda de rascunho ao esconder painel e uma geração iniciada após cancelamento durante persistência. Todos foram corrigidos e cobertos por regressões. Re-revisão independente não encontrou problemas materiais restantes.

## Distribuição ainda a validar

- Primeiro login dentro do app com uma conta nova; a prova técnica usou autenticação existente em ambiente privado.
- Instalação em outro Windows limpo e diferentes planos/limites de conta.
- Assinatura digital Windows; build atual `NotSigned`.
- Ícone definitivo; build usa padrão Electron.
- Distribuição paga, checkout, licenciamento e suporte. Nenhum checkout foi modificado.
- Variedade maior de nichos/estilos e carrosséis longos; a prova integrada usa dois slides para reduzir consumo de teste.

## Fontes e garantias

Pauta retornou inglês, sem timestamps. Notion original em português é fonte dos prompts completos. Não inventar precisão temporal nem tratar métricas/preços/alegações históricas do professor como fatos atuais ou promessa ao comprador.

## Conta e memória

R$47 é o preço do aplicativo, não cota de IA ilimitada. Os limites/recursos são os da conta conectada. Vault não sincroniza histórico de chat automaticamente; agentes leem e atualizam notas. A conexão Obsidian depende do vault pai e da variável local no processo cliente. O script de sincronização recusa sobrescrever nota mais nova que o snapshot local sem reconciliação.
