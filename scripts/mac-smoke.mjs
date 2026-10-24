import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "playwright";

// Teste do app empacotado para Mac (roda no GitHub Actions): abre o Carrossell.app, confere
// que a interface carrega, que o Codex do Mac está dentro do pacote e salva um print.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const release = join(root, "release");
const folder = (await readdir(release)).find((name) => /^mac(-arm64|-universal)?$/.test(name));
if (!folder) throw new Error("Nenhum Carrossell.app em release/.");
const appPath = join(release, folder, "Carrossell.app");
const executable = join(appPath, "Contents", "MacOS", "Carrossell");
const codexTarget = process.arch === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
const codex = join(appPath, "Contents", "Resources", "app.asar.unpacked", "node_modules", "@openai", `codex-darwin-${process.arch}`, "vendor", codexTarget, "bin", "codex");
if (!existsSync(codex)) throw new Error(`Codex do Mac ausente no pacote: ${codex}`);
let signature = "sem assinatura";
try { signature = execFileSync("codesign", ["-dv", appPath], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); } catch (error) { signature = String(error.stderr || error.message); }
const app = await _electron.launch({ executablePath: executable, env: { ...process.env, PACTO_USER_DATA: await mkdtemp(join(tmpdir(), "pacto-mac-smoke-")) } });
try {
  const page = await app.firstWindow();
  await page.locator(".app-header, .onboarding, main").first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(8000);
  const text = await page.locator("body").innerText();
  if (/componente Codex não foi encontrado/i.test(text)) throw new Error("O app não encontrou o Codex.");
  await page.screenshot({ path: join(release, "mac-smoke.png") });
  console.log(JSON.stringify({ app: folder, arch: process.arch, codex: true, title: await page.title(), signature: signature.split("\n").filter((l) => /Authority|Signature|TeamIdentifier/.test(l)).join(" | ") || signature.trim().slice(0, 160) }));
} finally {
  await app.close().catch(() => {});
}
