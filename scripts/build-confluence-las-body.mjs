import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mdPath = path.join(root, "docs", "mvp_cashflow_spec.md");
const spec = fs.readFileSync(mdPath, "utf8");

const fenceOuter = "`".repeat(4);
const footer = `\n---\n\n## Aktuálne znenie (LAS snapshot)\n\n${fenceOuter}txt\n`;
const closer = `\n${fenceOuter}\n`;

const preamble = `# LAS — Omega Cashflow MVP

**Canon:**
* [blob na \`main\`](https://github.com/shopentum/cashflow/blob/main/docs/mvp_cashflow_spec.md)
* [raw čitateľný text](https://raw.githubusercontent.com/shopentum/cashflow/main/docs/mvp_cashflow_spec.md)

**Rozhodovacie pravidlo:** pri konflikte víťazí súbor \`docs/mvp_cashflow_spec.md\` na vetve \`main\`.

**Nasadenie:** https://cashflow.aifreelancer.sk`;

const body = `${preamble}${footer}${spec}${closer}`;

const outFile = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, "artifacts", "confluence-las-body.md");
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, body, "utf8");
console.log(outFile);
console.log(Buffer.byteLength(body, "utf8"));
