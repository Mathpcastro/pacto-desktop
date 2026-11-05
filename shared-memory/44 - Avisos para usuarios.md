# Avisos para os usuários do Carrossell

A partir da 0.8.0, o app lê `notices.json` na raiz do repositório público `Mathpcastro/pacto-releases` (branch `main`).
- **Endereço:** https://raw.githubusercontent.com/Mathpcastro/pacto-releases/main/notices.json
- **Quando lê:** cerca de 20 s depois de abrir e depois a cada hora, mesmo com a janela fechada e o piloto ligado.
- **Código:** `core/notices.mjs`, `src/components/Notices.jsx` e `electron/main.mjs`.

## O que a pessoa vê

- **Sino no topo**, com o número de avisos não lidos. Abre a lista com "Marcar como lido" e "Marcar todos como lidos".
- **Faixa no topo** para o aviso marcado `"important": true` mais novo ainda não lido, com o botão do aviso e "Dispensar".
- **Notificação do Windows ou do Mac** uma vez para cada aviso novo. O clique abre o app.

## Como publicar um aviso

Edite `notices.json` no GitHub (Add file › Create new file na primeira vez; depois, o lápis) e faça commit na `main`. Em até 1 hora todos os apps abertos recebem. O cache do GitHub pode levar até 5 minutos.

```json
{
  "notices": [
    {
      "id": "estrategia-contexto",
      "date": "2026-11-05",
      "important": true,
      "title": "Seu Contexto da Marca agora vira um plano de venda",
      "body": "Texto curto, até 700 caracteres.",
      "action": { "label": "Melhorar estratégia", "view": "brand:contexto" },
      "minVersion": "0.8.0"
    }
  ]
}
```

## Campos

**Obrigatórios**
- `id`: minúsculas, números e hífen. É por ele que o app sabe o que já foi lido, então nunca reaproveite um id.
- `date`: data de publicação, que serve também para ordenar. Um aviso com data futura só aparece a partir dela.
- `title`: até 90 caracteres.
- `body`: até 700 caracteres, só texto. HTML aparece como texto e não é interpretado.

**Opcionais**
- `important`: `true` mostra a faixa no topo.
- `until`: data em que o aviso some.
- `minVersion` / `maxVersion`: em quais versões o aviso aparece. Exemplo: um aviso "atualize" com `maxVersion: "0.8.0"`.
- `action`: um botão. Use `{label, view}` para abrir um lugar do app ou `{label, url}` para um link `https://`, aberto no navegador.
  - Lugares aceitos em `view`: `home`, `library`, `pilot`, `brand`, `brand:contexto`, `brand:design`, `brand:fotos`, `instagram`.
  - Qualquer outro valor e links que não são `https` são ignorados.

**Limites:** até 20 avisos aparecem, do mais novo ao mais antigo. Um arquivo inválido ou sem internet mantém os avisos já guardados.

## Prova

- `tests/notices.test.mjs`: validação, versão, links e leitura.
- `scripts/notices-proof.mjs`: Electron real com um arquivo local (`PACTO_NOTICES_URL`, só em desenvolvimento). Passou:
  - o sino com a contagem e a faixa;
  - o botão do aviso abrindo Marca › Contexto e marcando como lido;
  - a leitura salva depois de reabrir;
  - sem rolagem lateral a 390 px.
