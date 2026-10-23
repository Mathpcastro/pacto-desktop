import { appendFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Quatro nichos reais, ponta a ponta pela interface e com a conta ChatGPT deste
// computador: onboarding → Radar → pauta → texto (4 cards) → 1 capa → 3 cards →
// CTA/DM → stories em texto → tela de publicar. Grava vídeo da janela para o motion.
// Os negócios são fictícios; as respostas não trazem provas nem números inventados.
// Usage: node scripts/niche-proof.mjs <out> [slug]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "niche-proof"));
const only = process.argv[3];
const niches = [
  {
    slug: "advogada", preset: /^Editorial/, architecture: /^Tutorial/, goal: "Comentários",
    brand: [
      "Sou a Helena Prado, advogada trabalhista há 9 anos em Belo Horizonte. Meu escritório se chama Prado Advocacia Trabalhista. Atendo trabalhadores CLT que foram demitidos ou estão saindo da empresa e querem conferir se receberam tudo certo. A oferta principal é uma consulta de revisão de rescisão por R$ 250, online ou presencial.",
      "Meu público são trabalhadores de 25 a 50 anos, sem conhecimento jurídico, com medo de entrar na Justiça e de 'ficar marcado'. Dores: não entendem o termo de rescisão, não sabem o prazo para reclamar, acham que advogado é caro. Desejam saber se têm direito a algo sem compromisso. Diferencial: explico em linguagem simples e a consulta já sai com um relatório do que conferir.",
      "Posso entregar grátis um checklist de 12 itens para conferir a rescisão e um modelo de mensagem para pedir documentos ao RH. Tom: claro, firme e acolhedor, sem juridiquês. Limites: não posso prometer ganho de causa nem valores, preciso seguir as regras da OAB sobre publicidade (nada de mercantilizar), e não falo de política.",
    ],
    design: [
      "Cores do escritório: azul-marinho profundo (#1F2A44), off-white (#F6F3EE) e um dourado discreto (#B08D57). Quero um visual editorial, de revista séria, com títulos grandes em serifada elegante e ilustrações em traço fino de documentos, carteira de trabalho e balança. Nada de fotos de banco nem martelo de juiz.",
      "Evitar: vermelho, emojis, aparência de propaganda, excesso de texto. Capa com título forte em cima e uma ilustração de documento em destaque. Cards internos com muito respiro e numeração grande. Sensação de confiança e clareza.",
    ],
  },
  {
    slug: "saas", preset: /^Clean SaaS/, architecture: /^Framework/, goal: "Levar para uma oferta",
    brand: [
      "Somos o Agendei, um software de agendamento online para clínicas pequenas de estética e fisioterapia, com lembrete automático por WhatsApp e página de agendamento. Plano a partir de R$ 89 por mês, com 14 dias grátis. O produto já existe e tem clientes, mas não tenho números públicos para divulgar.",
      "Público: donas e donos de clínicas com 1 a 5 profissionais, nível iniciante em tecnologia. Dores: faltas de pacientes, agenda no caderno ou no WhatsApp pessoal, horas respondendo mensagem para marcar horário. Desejam agenda cheia e menos trabalho manual. Diferencial: configuração em 10 minutos e lembrete automático no WhatsApp.",
      "Posso entregar grátis uma planilha de controle de faltas e um roteiro de mensagem de confirmação de consulta. Tom: prático, direto, leve, sem tecniquês. Limites: não prometer zerar faltas nem aumento de faturamento, não falar mal de concorrentes pelo nome.",
    ],
    design: [
      "Cores do produto: verde-menta (#3CC8A0), grafite (#1E2328) e branco. Visual clean SaaS: fundo claro, cards de interface, ícones simples, gráficos leves e muito espaço. Pode ter uma mascote simples: um calendário sorridente.",
      "Evitar: neon, gradiente roxo, aparência genérica de startup, prints poluídos. Tipografia sem serifa moderna. Capa com o título grande e um mockup de agenda desenhado, sem celular.",
    ],
  },
  {
    slug: "confeiteira", preset: /^Ilustrado/, architecture: /^História → Método → Oferta/, goal: "Salvamentos",
    brand: [
      "Sou a Ana Ribeiro, confeiteira, da Doce Ofício. Comecei vendendo bolo de pote na faculdade em 2019 e hoje faço bolos de festa por encomenda em Curitiba. Lancei o curso online 'Bolos que Vendem', com 20 aulas sobre receitas base, precificação e fotos com celular, por R$ 197.",
      "Público: mulheres de 25 a 45 anos que fazem bolo em casa e querem começar a vender, iniciantes. Dores: não sabem cobrar, têm medo de errar a massa na encomenda, acham que precisam de equipamento caro. Desejam renda extra fazendo o que gostam. Transformação: sair do 'faço para a família' para a primeira encomenda bem cobrada. Minha história: errei o preço das primeiras encomendas e trabalhava de graça sem perceber.",
      "Posso entregar grátis uma planilha de precificação de bolo e uma lista de 10 utensílios básicos. Tom: amigo, animado, de quem já passou por isso, com humor leve. Limites: não prometer renda nem valores de faturamento, não falar mal de confeitarias concorrentes.",
    ],
    design: [
      "Cores da marca: rosa queimado (#D98E8E), creme (#FFF4E6) e chocolate (#5A3825). Quero carrosséis bem ilustrados, desenho estilo aquarela com textura de papel, bolos, colheres e uma mascote: um cupcake simpático. Clima acolhedor e caseiro.",
      "Evitar: fotos de banco, visual infantil demais, excesso de texto. Títulos grandes em letra redonda e calorosa. Capa com cena ilustrada forte e o título em cima.",
    ],
  },
  {
    slug: "moda-fitness", preset: /^Creator/, architecture: /^Lista Útil/, goal: "Alcance",
    brand: [
      "Somos a Vibra Fit, loja online de roupas fitness femininas: leggings, tops e conjuntos com tecido que não fica transparente no agachamento. Vendemos pelo site e pelo Instagram, peças de R$ 89 a R$ 189, frete grátis acima de R$ 250.",
      "Público: mulheres de 20 a 40 anos que treinam em academia ou correm, nível intermediário. Dores: legging que fica transparente, cós que desce no treino, tecido que esquenta. Desejam se sentir confiantes e confortáveis treinando. Diferencial: teste de agachamento em todas as peças e tabela de medidas detalhada.",
      "Posso entregar grátis um guia de medidas para acertar o tamanho e um checklist de como lavar roupa fitness sem estragar. Tom: próximo, energético, de amiga que treina junto. Limites: não falar de emagrecimento, corpo ideal ou antes e depois de corpo, e não prometer resultado de treino.",
    ],
    design: [
      "Cores da marca: preto, off-white e um laranja vibrante (#FF6A2B). Visual creator/pessoal: fotos de peças e de treino misturadas com rabiscos, setas, anotações à mão e marcações, como se fosse o feed de uma amiga. Pode usar ilustração de peças em estilo fashion sketch.",
      "Evitar: corpos idealizados, foco em emagrecimento, visual de catálogo frio. Títulos em sans-serif condensada forte, mas sempre na horizontal. Capa com uma peça em destaque e anotações em volta.",
    ],
  },
];

const server = await createServer({ root, server: { host: "127.0.0.1", port: 0, strictPort: false } });
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}`;
async function until(page, predicate, arg, timeout) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    // A single evaluate must not hang the whole wait.
    const ok = await Promise.race([page.evaluate(predicate, arg).catch(() => false), new Promise((r) => setTimeout(() => r(false), 20000))]);
    if (ok) return;
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Tempo esgotado aguardando o aplicativo.");
}
// Progress goes straight to disk so a hang still shows where it stopped.
const trace = (m) => appendFileSync(join(out, "progresso.log"), `${new Date().toISOString()} ${m}
`);
await mkdir(out, { recursive: true });
const summary = [];
for (const niche of niches.filter((n) => !only || n.slug === only)) {
  const dir = join(out, niche.slug);
  await mkdir(dir, { recursive: true });
  const userData = await mkdtemp(join(tmpdir(), `pacto-niche-${niche.slug}-`));
  await mkdir(join(userData, "codex"), { recursive: true });
  await copyFile(join(process.env.CODEX_HOME || join(homedir(), ".codex"), "auth.json"), join(userData, "codex", "auth.json"));
  const log = [];
  const step = (name, data = {}) => { trace(`${niche.slug} ${name} ${JSON.stringify(data)}`); log.push({ name, at: new Date().toISOString(), ...data }); console.log(JSON.stringify({ niche: niche.slug, name, ...data })); };
  let app, recorder;
  let n = 0;
  const shot = async (page, name) => page.screenshot({ path: join(dir, `${String(++n).padStart(2, "0")}-${name}.png`) });
  try {
    app = await _electron.launch({ args: ["."], cwd: root, env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: url } });
    trace(`${niche.slug} launched`);
    const page = await app.firstWindow();
    trace(`${niche.slug} window`);
    // Playwright's recordVideo stalls page.evaluate in Electron and GDI capture sees a black
    // GPU window, so frames come from the window itself and are encoded at the end.
    const framesDir = join(dir, "frames");
    await mkdir(framesDir, { recursive: true });
    recorder = { running: true, frames: 0, started: Date.now() };
    recorder.loop = (async () => {
      while (recorder.running) {
        const jpeg = await app.evaluate(async ({ BrowserWindow }) => {
          const win = BrowserWindow.getAllWindows()[0];
          return win ? (await win.webContents.capturePage()).toJPEG(82).toString("base64") : null;
        }).catch(() => null);
        if (jpeg) await writeFile(join(framesDir, `${String(recorder.frames++).padStart(6, "0")}.jpg`), Buffer.from(jpeg, "base64"));
        await new Promise((r) => setTimeout(r, 180));
      }
    })();
    await until(page, async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);
    trace(`${niche.slug} connected`);
    const state = () => page.evaluate(() => window.pacto.request("bootstrap"));
    if (await page.getByRole("button", { name: "Continuar" }).isVisible().catch(() => false)) await page.getByRole("button", { name: "Continuar" }).click();
    for (const kind of ["brand", "design"]) {
      await page.getByRole("heading", { name: kind === "brand" ? "Contexto Oficial da Marca" : "Design Kit Oficial" }).waitFor({ timeout: 30000 });
      if (kind === "design") await page.getByRole("button", { name: niche.preset }).click();
      await page.getByRole("button", { name: /Começar entrevista/ }).click();
      const turn = (count) => until(page, async ({ kind, count }) => { const s = await window.pacto.request("bootstrap"); return !s.interviewing && (s.onboarding[kind].messages.filter((m) => m.role === "assistant").length >= count || s.onboarding[kind].document); }, { kind, count }, 600000);
      await turn(1);
      await shot(page, `entrevista-${kind}`);
      for (const [i, text] of niche[kind].entries()) {
        if ((await state()).onboarding[kind].document) break;
        await page.getByLabel("Sua resposta").fill(text);
        await page.getByRole("button", { name: "Enviar resposta" }).click();
        await turn(i + 2);
      }
      if (!(await state()).onboarding[kind].document) {
        await page.getByRole("button", { name: "Gerar o documento agora" }).click();
        await until(page, async (kind) => (await window.pacto.request("bootstrap")).onboarding[kind].document, kind, 600000);
      }
      const doc = (await state()).onboarding[kind].document;
      await writeFile(join(dir, `${kind === "brand" ? "contexto-da-marca" : "design-kit"}.md`), doc);
      step(`${kind}-doc`, { chars: doc.length });
      await page.locator(".document-text").waitFor();
      await shot(page, `documento-${kind}`);
      await page.getByRole("button", { name: "Aprovar e continuar" }).click();
    }
    await page.getByRole("heading", { name: "Seu projeto está instalado." }).waitFor();
    await shot(page, "instalado");
    await page.getByRole("button", { name: "Entrar no estúdio" }).click();
    // The Radar runs by itself after onboarding: the library opens with opportunities.
    await until(page, async () => { const s = await window.pacto.request("bootstrap"); return !s.working && s.ideas.some((b) => b.source === "radar"); }, null, 600000);
    await page.getByRole("heading", { name: "Comece por uma destas pautas." }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(800);
    await shot(page, "oportunidades");
    const radar = (await state()).ideas.find((b) => b.source === "radar");
    await writeFile(join(dir, "radar.json"), JSON.stringify(radar, null, 2));
    step("radar", { ideas: radar.ideas.length, top: radar.ideas.filter((i) => i.top).length });
    await page.locator(".opportunities .idea-card").first().getByRole("button", { name: /Criar carrossel/ }).click();
    await page.getByRole("radio", { name: niche.architecture }).click();
    await page.getByRole("radio", { name: "4 cards" }).click();
    await page.getByRole("radio", { name: niche.goal }).click();
    await shot(page, "novo-carrossel");
    await page.getByRole("button", { name: "Abrir no estúdio" }).click();
    const id = (await state()).projects[0].id;
    const project = () => page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((p) => p.id === id), id);
    const idle = () => until(page, async (id) => { const p = (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id); return !["planning", "generating"].includes(p.status); }, id, 1500000);
    await page.getByRole("button", { name: "Gerar o texto do carrossel" }).click();
    await idle();
    let p = await project();
    if (p.slides.length < 2) throw new Error(`O texto não foi gerado: ${p.error || p.messages.at(-1)?.text || ""}`);
    await page.locator(".copy-board").waitFor();
    await shot(page, "texto");
    for (const box of await page.locator(".review-checklist input").all()) await box.check();
    await page.getByRole("button", { name: /Aprovar texto e criar a capa/ }).click();
    await page.getByRole("heading", { name: "Escolha a capa que faria você parar." }).waitFor();
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByRole("button", { name: "Gerar opções de capa" }).click();
    await idle();
    await shot(page, "capa");
    await page.getByRole("button", { name: "Usar esta capa" }).first().click();
    await page.getByRole("button", { name: /Gerar restantes|Gerar imagens/ }).click();
    await idle();
    p = await project();
    if (!p.slides.every((s) => s.image)) throw new Error(`Cards sem arte: ${p.error || ""}`);
    await page.getByText(/Pronto. Publique hoje.|Você fez. Agora publique hoje./).waitFor({ timeout: 30000 });
    await page.waitForTimeout(1200);
    await shot(page, "publicar");
    await page.getByRole("button", { name: /Gerar CTA, DM e oferta/ }).click();
    await page.getByRole("button", { name: "Gerar estratégia" }).click();
    await until(page, async (id) => Boolean((await window.pacto.request("bootstrap")).projects.find((p) => p.id === id).ctaKit), id, 600000);
    await page.waitForTimeout(800);
    await shot(page, "cta-dm");
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    await page.getByRole("button", { name: /Stories de perguntas/ }).click();
    await page.getByRole("button", { name: "Criar stories" }).click();
    await until(page, async (id) => ((await window.pacto.request("bootstrap")).projects.find((p) => p.id === id).stories || []).length > 0, id, 600000);
    await page.waitForTimeout(800);
    await shot(page, "stories");
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    p = await project();
    for (const [i, s] of p.slides.entries()) await writeFile(join(dir, `card-${String(i + 1).padStart(2, "0")}.png`), Buffer.from(s.image.split(",")[1], "base64"));
    await writeFile(join(dir, "carrossel.json"), JSON.stringify({ title: p.title, architecture: p.architecture, editorialLine: p.editorialLine, visualConcept: p.visualConcept, caption: p.caption, coverHooks: p.coverHooks, review: p.messages.at(-1)?.text, slides: p.slides.map(({ role, title, body, emphasis, visual }) => ({ role, title, body, emphasis, visual })), ctaKit: p.ctaKit, stories: p.stories }, null, 2));
    step("done", { title: p.title, cards: p.slides.length });
    summary.push({ niche: niche.slug, ok: true, title: p.title });
  } catch (error) {
    step("failed", { error: error.message.split("\n")[0] });
    summary.push({ niche: niche.slug, ok: false, error: error.message.split("\n")[0] });
    process.exitCode = 1;
  } finally {
    await writeFile(join(dir, "log.json"), JSON.stringify(log, null, 2));
    if (recorder) {
      recorder.running = false;
      await recorder.loop;
      const rate = Math.max(1, recorder.frames / ((Date.now() - recorder.started) / 1000)).toFixed(3);
      await new Promise((r) => {
        const ff = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-framerate", rate, "-i", join(dir, "frames", "%06d.jpg"), "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2,fps=30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", join(dir, "fluxo.mp4")], { stdio: "ignore" });
        ff.once("exit", r);
      });
      await rm(join(dir, "frames"), { recursive: true, force: true });
      trace(`${niche.slug} video ${recorder.frames} frames at ${rate} fps`);
    }
    await app?.close().catch(() => {});
    await rm(userData, { recursive: true, force: true }).catch(() => {});
  }
}
await writeFile(join(out, "resumo.json"), JSON.stringify(summary, null, 2));
await server.close();
