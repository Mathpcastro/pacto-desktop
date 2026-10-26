---
project: carrossell
status: candidata-a-release-0.2.3
tags: [carrossell, acessibilidade, preferencias, interface]
---
# Preferências da interface

## Pedido

Em 26/10/2026, após um comprador relatar que a interface estava muito pequena, o usuário pediu um menu no app para personalizar temas, fontes e tamanho do texto.

## Decisões

- O padrão continua igual ao app que aparece no tutorial; a personalização só se aplica quando escolhida pela pessoa.
- Os ajustes afetam a interface do app. As imagens exportadas permanecem no tamanho e estilo gerados para o projeto.
- Preferências persistem no dispositivo do comprador.

## Opções implementadas no checkout local

- Modo: claro e escuro.
- Paletas: Carrossell, Oceano, Floresta e Ametista, cada uma combinada com os dois modos.
- Fonte da interface: original do Carrossell, Arial, Verdana ou Georgia.
- Escala: 100% a 125%, em passos de 5%, com controle deslizante e botões de ajuste.
- Ação para restaurar as preferências originais.

## Implementação

- `C:\Users\Admin2\Documents\pacto-app\src\components\PreferencesDialog.jsx`
- `C:\Users\Admin2\Documents\pacto-app\src\App.jsx`
- `C:\Users\Admin2\Documents\pacto-app\src\styles.css`
- A preferência atual é armazenada em `carrossell-preferences`; a chave existente `pacto-theme` continua sincronizada para compatibilidade.

## Estado e pendências

## Validação local — 26/10/2026

- `npm test`: 45/45 aprovados.
- `node scripts/renderer-regression.mjs`: 7/7 aprovados.
- Smoke do pacote Windows: app abriu, método e biblioteca carregaram, exportou PNGs 1080×1350 e não registrou erros de página.
- Preferências no app empacotado: tema escuro, Oceano, Verdana e escala 125% foram aplicados e persistiram após reinício.
- `npm run dist`: build 0.2.3 do Windows concluído; release pública e build Mac ainda pendentes.

O pacote mantém o padrão visual do tutorial até o comprador escolher outra configuração. A preferência só altera a interface, não as imagens exportadas. O commit deve incluir esta nota, os componentes de preferência e a atualização de versão, sem incluir alterações não relacionadas já presentes no checkout.
