import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Estima o minuto de cada etapa nas aulas. As transcrições do Pauta não têm
// timestamps: usamos a posição do trecho-âncora no texto × a duração do vídeo.
// O resultado é aproximado e marcado assim na interface.
const root = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "resources",
  "pacto",
);
const manifest = JSON.parse(
  await readFile(join(root, "manifest.json"), "utf8"),
);
const steps = [
  [
    "brand",
    "73OpTuUsCH8",
    "official brand context",
    "Contexto Oficial da Marca",
    "A entrevista que ensina o ChatGPT o que você vende, para quem e por quê.",
  ],
  [
    "radar",
    "73OpTuUsCH8",
    "four main sources",
    "Radar de Pautas",
    "As quatro fontes de pauta e como transformar temas em ideias que valem um teste.",
  ],
  [
    "modelador",
    "73OpTuUsCH8",
    "model",
    "Modelador de Referências",
    "Copie o motivo pelo qual uma referência funcionou, nunca o conteúdo.",
  ],
  [
    "architecture",
    "-o3AEfDjBsQ",
    "architecture",
    "As 5 Arquiteturas",
    "Escolha a sequência dos cards antes de escrever a copy.",
  ],
  [
    "copy",
    "plr8iGMRnRo",
    "copy the main prompt",
    "Copy Engine",
    "Texto curto, humano e específico, e a revisão antes de virar imagem.",
  ],
  [
    "design",
    "LWIanBtCUHg",
    "design kit",
    "Design Kit e Efeito Continuidade",
    "A identidade visual que a IA repete em todos os cards.",
  ],
  [
    "correction",
    "LWIanBtCUHg",
    "visual correction",
    "Correção Visual Rápida",
    "Corrija só o card que saiu errado, preservando o resto.",
  ],
  [
    "cover",
    "32aNnLBXBrA",
    "generate the whole carousel",
    "Criando do zero: capa e cards",
    "Da copy aprovada à capa e aos cards em 4:5.",
  ],
  [
    "cta",
    "QRwxq7bqWwo",
    "keyword",
    "Comentário → DM → Oferta",
    "O CTA de palavra-chave, a entrega na DM e a ponte para a oferta.",
  ],
  [
    "stories",
    "bvDw6TPoU8I",
    "stories",
    "Stories: perguntas e oferta",
    "Use os stories para caixa de perguntas e oferta, alternando.",
  ],
  [
    "replicator",
    "bvDw6TPoU8I",
    "replicat",
    "Replicador de Vencedores",
    "Volume → Sinal → Repetição: replique o motivo do vencedor.",
  ],
];
const moments = [];
for (const [step, lessonId, anchor, label, summary] of steps) {
  const lesson = manifest.lessons.find((l) => l.id === lessonId);
  const text =
    (await readFile(join(root, lesson.file), "utf8")).split(
      "## Texto retornado pelo provedor",
    )[1] || "";
  const at = text.toLowerCase().indexOf(anchor);
  if (at < 0) throw new Error(`Âncora não encontrada: ${step} (${anchor})`);
  const duration = lesson.durationSeconds;
  // Recua alguns segundos para o vídeo abrir um pouco antes do trecho.
  const seconds = Math.max(0, Math.round((at / text.length) * duration) - 10);
  moments.push({
    step,
    lessonId,
    lesson: lesson.title,
    seconds,
    label,
    summary,
    approximate: true,
  });
}
await writeFile(
  join(root, "course-moments.json"),
  JSON.stringify(
    {
      method: "posição do trecho na transcrição × duração do vídeo; aproximado",
      moments,
    },
    null,
    2,
  ) + "\n",
);
for (const m of moments)
  console.log(
    `${m.step.padEnd(12)} ${m.lesson.slice(0, 32).padEnd(33)} ~${Math.floor(m.seconds / 60)}:${String(m.seconds % 60).padStart(2, "0")}`,
  );
