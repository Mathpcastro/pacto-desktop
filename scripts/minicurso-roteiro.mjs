import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Conta os caracteres de narração (o que gasta crédito no ElevenLabs) e gera a
// versão de leitura dos roteiros do minicurso. Falha se passar do orçamento.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "docs", "minicurso", "roteiros.json"), "utf8"));
const CHARS_PER_SECOND = 16; // medido na videoaula aprovada (177 caracteres em 11 s)
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
let total = 0;
const out = [`# ${data.title} — roteiros para revisão`, "", `Voz: ${data.voice} · modelo ${data.model}. Orçamento: ${data.budgetChars.toLocaleString("pt-BR")} caracteres.`, ""];
const rows = [];
for (const lesson of data.lessons) {
  const chars = lesson.beats.reduce((sum, b) => sum + b.narration.length, 0);
  total += chars;
  rows.push(`| ${lesson.number} | ${lesson.title} | ${lesson.niche} | ${chars.toLocaleString("pt-BR")} | ~${fmt(chars / CHARS_PER_SECOND)} | ${fmt(lesson.targetSeconds)} |`);
  out.push(`## Aula ${lesson.number} — ${lesson.title}`, "", `Nicho: ${lesson.niche}. Base: ${lesson.sources.join(", ")}. ${chars.toLocaleString("pt-BR")} caracteres, cerca de ${fmt(chars / CHARS_PER_SECOND)} de fala, para ${fmt(lesson.targetSeconds)} de aula.`, "");
  lesson.beats.forEach((b, i) => out.push(`**${i + 1}. ${b.id}** · _Tela: ${b.screen}_`, "", `> ${b.narration}`, ""));
}
out.splice(4, 0, "| Aula | Tema | Nicho | Caracteres | Fala | Aula |", "|---|---|---|---|---|---|", ...rows, `| | **Total** | | **${total.toLocaleString("pt-BR")}** | **~${fmt(total / CHARS_PER_SECOND)}** | **${fmt(data.lessons.reduce((s, l) => s + l.targetSeconds, 0))}** |`, "");
writeFileSync(join(root, "docs", "minicurso", "roteiros.md"), out.join("\n"));
console.log(`total ${total} caracteres (~${fmt(total / CHARS_PER_SECOND)} de fala), orçamento ${data.budgetChars}`);
for (const r of rows) console.log(r);
if (total > data.budgetChars) { console.error("Acima do orçamento de caracteres."); process.exit(1); }
