# Release Carrossell 0.7.6

04/11/2026. Publicação autorizada pelo usuário ("Sim, publique 0.7.6"): release sem artefatos de GitHub Actions.

## Conteúdo

- **Copy falada e com fio condutor** (`bffe36a`). Motivo: carrossel do perfil Carrossell com cards soltos e capa com três ideias, enquanto os stories saíam bons. Regras novas em `core/copy.mjs`: voz falada (humanizer, MIT) e persuasão (copywriting, copy-editing, marketing-psychology e social de coreyhaines31/marketingskills, MIT). `flowRules` traz a continuidade de cada arquitetura (Lista Útil, Tutorial, Framework, Estudo de Caso, História → Método → Oferta), cruzando a Aula 03 com os carousel frameworks. O editor-chefe revisa em passadas. Valem para o app, a CLI/modo agente e o MCP. O CTA curto na capa continua permitido, como manda o curso, mas só como convite de 2 a 4 palavras.
- **Reagendar e ver agendados** (`283326d`). A ação `reschedulePost` mantém as contas e a aprovação do piloto e move a tarefa do sistema. A lista `ScheduledPosts` com "Trocar data" e "Cancelar" aparece no Piloto automático, em Marca › Instagram, no Calendário e na etapa Publicar. No Telegram, `/agendados` (`core/telegram-schedule.mjs`) lista, troca a data ou cancela, sempre com botão de confirmação. Os botões valem só na mensagem mais recente, e o comando recusa se o agendamento mudou no app depois da lista. Na CLI: `reagendar <id> --em`.

## Verificação antes de publicar

- Testes 212/212 com as duas mudanças juntas (merge `eb30c76`, tag `v0.7.6`).
- Copy: três gerações reais com a conta ChatGPT do usuário, numa cópia temporária do perfil Carrossell (pauta original, Lista Útil e Framework). A continuidade melhorou. Ficaram pendentes o tom de manual, frases-modelo repetidas entre cards e o CTA "salve" (a conta não tem material gratuito confirmado).
- Reagendar: prova Playwright no app com Composio falso local. A data foi trocada de 07/11 18:00 para 08/11 09:30, com a tarefa do Windows movida; depois de cancelar não sobrou tarefa. O `/agendados` foi testado só com o Telegram simulado.
- `npm run dist` local e `scripts/packaged-smoke.mjs` no executável: ZIP 1080×1350, modelo, PDF e curso, sem erros de página.

## Publicação verificada

- Workflow `41901767335` com sucesso em preparar, Windows, Mac arm64, Mac x64 e publicar. Zero artefatos de Actions.
- Latest público: https://github.com/Mathpcastro/pacto-releases/releases/tag/v0.7.6 (04/11/2026 20:03:24 UTC), 11 arquivos.
- `latest.yml` aponta para 0.7.6. O instalador público completo (224.829.485 bytes) foi baixado e o SHA-512 confere com o feed. Os aliases Windows Carrossell/PACTO, Mac Apple Silicon e Mac Intel respondem.

Windows instalado: fechar e reabrir para buscar a versão e usar **Reiniciar e atualizar**. Mac continua com instalação manual e sem teste em Mac físico.
