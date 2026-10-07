// Gera public/manual-matrizpro.pdf a partir de src/content/manual.json
// (o mesmo conteúdo exibido na aba Suporte do app).
//
// Uso:  npm run manual
// Requer Microsoft Edge ou Google Chrome instalado (usa o modo "headless" para imprimir em PDF).

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manual = JSON.parse(readFileSync(path.join(raiz, "src/content/manual.json"), "utf8"));
const destino = path.join(raiz, "public/manual-matrizpro.pdf");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const data = new Date().toLocaleDateString("pt-BR");

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(manual.titulo)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1f2a24; font-size: 11.5pt; line-height: 1.5; margin: 0; }
  .capa { background: linear-gradient(180deg, #21523b, #173b2a); color: #eef3ef; padding: 28px 30px; border-radius: 10px; margin-bottom: 22px; }
  .capa .marca { font-size: 13pt; font-weight: 700; letter-spacing: .3px; opacity: .9; }
  .capa h1 { margin: 10px 0 4px; font-size: 24pt; }
  .capa p { margin: 0; opacity: .85; }
  h2 { color: #21523b; font-size: 14pt; border-bottom: 2px solid #d6e2da; padding-bottom: 4px; margin: 22px 0 8px; break-after: avoid; }
  ul { margin: 0; padding-left: 20px; }
  li { margin: 5px 0; break-inside: avoid; }
  .faq { margin-top: 26px; }
  .faq dt { font-weight: 700; margin-top: 10px; }
  .faq dd { margin: 2px 0 0 0; }
  .rodape { margin-top: 28px; font-size: 9pt; color: #6b7a71; border-top: 1px solid #d6e2da; padding-top: 8px; }
</style></head>
<body>
  <div class="capa">
    <div class="marca">MatrizPro</div>
    <h1>${esc(manual.titulo)}</h1>
    <p>${esc(manual.subtitulo)}</p>
  </div>
  ${manual.secoes
    .map((s) => `<h2>${esc(s.titulo)}</h2><ul>${s.itens.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`)
    .join("\n")}
  <div class="faq">
    <h2>Perguntas frequentes</h2>
    <dl>${manual.perguntas.map((p) => `<dt>${esc(p.pergunta)}</dt><dd>${esc(p.resposta)}</dd>`).join("")}</dl>
  </div>
  <p class="rodape">MatrizPro · versão do manual de ${data}</p>
</body></html>`;

const pasta = mkdtempSync(path.join(tmpdir(), "manual-"));
const arquivoHtml = path.join(pasta, "manual.html");
writeFileSync(arquivoHtml, html, "utf8");

const navegadores = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];
const navegador = navegadores.find((n) => existsSync(n));
if (!navegador) {
  console.error("Edge/Chrome não encontrado. HTML gerado em:", arquivoHtml);
  process.exit(1);
}

execFileSync(navegador, [
  "--headless",
  "--disable-gpu",
  "--no-pdf-header-footer",
  `--user-data-dir=${path.join(pasta, "perfil")}`,
  `--print-to-pdf=${destino}`,
  pathToFileURL(arquivoHtml).href,
]);
console.log("Manual gerado em", destino);
