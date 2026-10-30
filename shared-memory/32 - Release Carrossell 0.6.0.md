# Release Carrossell 0.6.0 — 30/10/2026

## Resultado verificado

- Publicada e Latest: https://github.com/Mathpcastro/pacto-releases/releases/tag/v0.6.0
- Código/tag fonte `v0.6.0`: `50abde791295d0dcde8c20702ab21cd22b6c5ce4`, enviado à main de `Mathpcastro/pacto-desktop`.
- Workflow https://github.com/Mathpcastro/pacto-desktop/actions/runs/41130871324 concluído com sucesso: preparar, Windows, Mac arm64, Mac x64 e publicar.
- Testes automatizados passaram nas três plataformas; os dois Macs passaram no smoke do aplicativo empacotado. Antes de publicar, a suíte local passou em 105/105.
- **Zero artefatos temporários de GitHub Actions**, verificado na execução e no repositório. Instaladores enviados diretamente ao rascunho; publicação somente após conferir os 11 arquivos.
- Seis aliases Carrossell/PACTO responderam HTTP 200 após publicar; tamanhos conferem. Hashes dos aliases são iguais aos instaladores correspondentes.
- `latest.yml` público: versão 0.6.0, caminho Carrossell-Setup-0.6.0.exe, tamanho 224202836 bytes. Atualização automática do Windows preservada.

## Autorização e escopo

O usuário autorizou publicar Windows e Mac sem artefatos de Actions e informou ter publicado um carrossel real pelo app com sucesso. Essa publicação real é evidência relatada pelo usuário; as leituras reais dos Analytics e as provas de multiperfis/CLI foram conferidas anteriormente (ver [[31 - Analytics do Instagram]]). Não houve nova postagem ou DM pelo agente.

## Novidades

Instagram por Composio, escolha de várias contas, publicação/agendamento, métricas por post e painel Analytics em Marca › Conexões com períodos 7/30 dias, ranking e referências para o Replicador. Marca em seções e configuração para agentes. Perfis e CLI das versões anteriores preservados.

## Espaço e arquivos

Três instaladores principais: 781137734 bytes (~781 MB). Incluindo aliases de compatibilidade e feed/blockmap: 2343649479 bytes (~2,34 GB) nos anexos da release. Os aliases preservam os links dos compradores. Nenhum ZIP de build ou captura foi publicado. Releases anteriores foram preservadas. Limites de release são separados dos artefatos Actions: https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases#storage-and-bandwidth-quotas

| Arquivo | Bytes | Digest do GitHub |
|---|---:|---|
| Carrossell-0.6.0-mac-arm64.dmg | 270948317 | sha256:7792278e709ead84ad0f91f6a7f6371a7c86cb1d5d5eaf9fb00997fb39eb4297 |
| Carrossell-0.6.0-mac-x64.dmg | 285986581 | sha256:ad6e054018cdd40dcf2e2846b994007dbec6baa6d62e9d5e771d77321eb2dd50 |
| Carrossell-Mac-AppleSilicon.dmg | 270948317 | sha256:7792278e709ead84ad0f91f6a7f6371a7c86cb1d5d5eaf9fb00997fb39eb4297 |
| Carrossell-Mac-Intel.dmg | 285986581 | sha256:ad6e054018cdd40dcf2e2846b994007dbec6baa6d62e9d5e771d77321eb2dd50 |
| Carrossell-Setup-0.6.0.exe | 224202836 | sha256:2027442abe4dc4e9f460fdd0f7fab5beac33db8f81286c2a906e6f4542b3b84d |
| Carrossell-Setup-0.6.0.exe.blockmap | 235928 | sha256:19c6502fa4f80d3aeae25fd373aa6b1e44524a95c9bb0b56e0d860a054c248a2 |
| Carrossell-Windows.exe | 224202836 | sha256:2027442abe4dc4e9f460fdd0f7fab5beac33db8f81286c2a906e6f4542b3b84d |
| latest.yml | 349 | sha256:53306ab718f90d52e25cc90d8ef8caabfdd4426d9cea52b88a712a5fd18a7f40 |
| PACTO-Mac-AppleSilicon.dmg | 270948317 | sha256:7792278e709ead84ad0f91f6a7f6371a7c86cb1d5d5eaf9fb00997fb39eb4297 |
| PACTO-Mac-Intel.dmg | 285986581 | sha256:ad6e054018cdd40dcf2e2846b994007dbec6baa6d62e9d5e771d77321eb2dd50 |
| PACTO-Windows.exe | 224202836 | sha256:2027442abe4dc4e9f460fdd0f7fab5beac33db8f81286c2a906e6f4542b3b84d |

## Limites que permanecem

Mac continua com DMG por arquitetura e atualização manual, sem assinatura/notarização Apple. Teste em Mac físico e agendamento real com o app fechado não foram confirmados. Ranking limitado aos 50 posts mais recentes do período; histórico de seguidores começa nas coletas do aplicativo.

## Downloads

- Windows: https://github.com/Mathpcastro/pacto-releases/releases/latest/download/Carrossell-Windows.exe
- Mac Apple Silicon: https://github.com/Mathpcastro/pacto-releases/releases/latest/download/Carrossell-Mac-AppleSilicon.dmg
- Mac Intel: https://github.com/Mathpcastro/pacto-releases/releases/latest/download/Carrossell-Mac-Intel.dmg
