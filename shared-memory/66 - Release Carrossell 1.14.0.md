# Release Carrossell 1.14.0

Publicada em 16/11/2026 às 11:07:47 de Brasília. Implementação em `40ed218`, tag `v1.14.0` no commit `791bafd`.

- **Biblioteca:** entrada no menu principal, importação do ZIP do Swipe File, 24 referências por página e busca em todo o catálogo. O ZIP com 500 referências foi gerado a partir do acervo do Kimi e fica separado dos instaladores públicos. Ver [[65 - Biblioteca 500 e recuperacao de artes]].
- **Artes:** correções na gravação concorrente e recuperação pelo arquivo de versão. O app pode recuperar um índice corrompido a partir de uma cópia local válida. O caso da Amanda continua pendente e a causa na máquina dela ainda não foi confirmada.
- **Provas:** 273 testes passaram, 1 pulado. Build e prova no Electron Windows empacotado passaram. A importação das 500 referências levou 5,6 s neste computador.
- **Publicação:** os seis jobs do [workflow 43881086147](https://github.com/Mathpcastro/pacto-desktop/actions/runs/43881086147) passaram. A [release pública](https://github.com/Mathpcastro/pacto-releases/releases/tag/v1.14.0) é a Latest, com 17 arquivos, zero artefatos de Actions e downloads Windows, Mac Apple Silicon, Mac Intel e Linux .deb. Os três feeds apontam para 1.14.0. SHA-512 conferiu para o instalador Windows, Linux .deb e os dois ZIPs de atualização do Mac. Os Macs abriram nos runners do GitHub; importação do Swipe File verificada no Windows.
- **Aviso no app:** “A Biblioteca voltou ao menu principal”, ID `v1-14-0`, commit `88e7d8b`. Texto: “Agora você pode abrir a Biblioteca pelo menu. Se você tem o Swipe File do Carrossell, arraste o ZIP para pesquisar as 500 referências no app.”
