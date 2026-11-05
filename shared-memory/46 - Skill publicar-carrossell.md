# Skill publicar-carrossell

05/11/2026. Skill do Claude Code para publicar o app Carrossell do jeito de sempre e avisar os usuários a cada novidade.

- **Onde ela vive** (é a que o Claude usa): `C:\Users\Admin2\.claude\skills\publicar-carrossell\`. Vale para qualquer pasta e sessão.
- **Cópia aqui no Obsidian:** [[Skills/publicar-carrossell/SKILL|SKILL.md]], `verificar-release.sh` e `publicar-aviso.mjs`, na pasta `Skills/publicar-carrossell/`.
- **Como usar:** peça "publique", "publique a 0.8.1" ou "faz a release". O Claude carrega a skill sozinho, ou você chama `/publicar-carrossell`.

## O que ela faz

1. Confere o checkout do app (`Mathpcastro/pacto-desktop`), em dia com a `main`.
2. Roda os testes, o build e a prova da área mudada.
3. Commita, sobe a versão (patch para correção, minor para recurso novo), envia para a `main` e cria a tag `vX.Y.Z`.
4. Acompanha o workflow "Build and publish releases" até os 5 jobs passarem.
5. Roda `verificar-release.sh X.Y.Z <run>`. O script confere:
   - que a release é a Latest e não é rascunho;
   - os 11 arquivos e zero artefatos de Actions;
   - que o `latest.yml` aponta para X.Y.Z;
   - que os downloads dos Macs respondem 200;
   - que o SHA-512 do instalador público bate com o feed.
6. Publica um **aviso curto de novidades** com `publicar-aviso.mjs`:
   - título de até 60 caracteres e texto de 1 ou 2 frases;
   - versão mínima igual à nova, para quem ainda não atualizou não ver;
   - um botão opcional para o lugar do app;
   - `--importante` só quando o usuário precisa agir;
   - correção invisível não ganha aviso.
7. Escreve a nota da release no `shared-memory`, acrescenta o estado do projeto e copia a nota para o Obsidian.

## Testes da skill

- `verificar-release.sh 0.8.0 41942265513`: tudo OK contra a release real.
- `publicar-aviso.mjs --simular`: monta o arquivo sem publicar. Recusou travessão, um lugar inválido do app e um id repetido.

Veja também [[44 - Avisos para usuarios]] e [[45 - Release Carrossell 0.8.0]].
