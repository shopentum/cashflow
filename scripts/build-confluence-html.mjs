import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mdPath = path.join(root, "docs", "mvp_cashflow_spec.md");
let d = fs.readFileSync(mdPath, "utf8");
d = d.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const panel = `<div data-type="panel-info"><p>LAS — plné znenie skopírované zo <code>docs/mvp_cashflow_spec.md</code>. Blob: <a href="https://github.com/shopentum/cashflow/blob/main/docs/mvp_cashflow_spec.md">GitHub</a> · RAW: <a href="https://raw.githubusercontent.com/shopentum/cashflow/main/docs/mvp_cashflow_spec.md">raw</a>.</p></div>`;

const html = `${panel}<pre><code>${d}</code></pre>`;

const outFile = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, "artifacts", "confluence-las.html");
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, html, "utf8");
console.log(outFile);
console.log("html chars", html.length);
