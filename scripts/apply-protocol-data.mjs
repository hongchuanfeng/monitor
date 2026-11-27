/**
 * 把 scripts/.protocol-samples.txt 中生成的报文与解码分段写回 src/data/*.ts。
 *
 * 运行：node scripts/apply-protocol-data.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(ROOT, "scripts/.protocol-samples.txt");

const text = readFileSync(SRC, "utf8");

// 解析生成的文件：### slug (brand title) / sampleHex / decode 行
const blocks = text.split(/^### /m).filter(Boolean);
const updates = new Map();

for (const block of blocks) {
  const lines = block.split("\n");
  const head = lines[0].trim();
  const slug = head.split(/\s+/)[0];
  const hexMatch = block.match(/sampleHex:\s*"([^"]+)"/);
  if (!hexMatch) throw new Error(`缺少 sampleHex: ${slug}`);

  const decodes = [];
  for (const line of lines) {
    const m = line.match(/^\s*\{ hex: "([^"]+)", desc: (".*") \},?\s*$/);
    if (m) decodes.push({ hex: m[1], desc: JSON.parse(m[2]) });
  }
  if (!decodes.length) throw new Error(`缺少 decode: ${slug}`);

  updates.set(slug, { sampleHex: hexMatch[1], decode: decodes });
}

// ---- 写回源文件 ----------------------------------------------------------

const targets = [
  { file: "src/data/protocols-monitor.ts", slugs: [] },
  { file: "src/data/protocols-anesthesia.ts", slugs: [] },
];

for (const t of targets) {
  const path = resolve(ROOT, t.file);
  let src = readFileSync(path, "utf8");
  let changed = 0;

  for (const [slug, upd] of updates) {
    // 定位该协议的 slug
    const slugIdx = src.indexOf(`slug: "${slug}"`);
    if (slugIdx < 0) continue;

    // 定位 sampleHex 字段（可能跨多行）
    const hexIdx = src.indexOf("sampleHex:", slugIdx);
    if (hexIdx < 0) throw new Error(`${slug}: 找不到 sampleHex`);
    const hexLineEnd = src.indexOf("\n", hexIdx);
    const hexLine = src.slice(hexIdx, hexLineEnd);
    const hexPrefix = hexLine.match(/^\s*sampleHex:\s*/)[0];

    // sampleHex 之后可能跟着续行（同一次赋值的多行字符串），一并吃掉
    let hexTail = hexLineEnd;
    let probe = hexLineEnd + 1;
    while (probe < src.length) {
      const nextLineEnd = src.indexOf("\n", probe);
      const nextLine = src.slice(probe, nextLineEnd < 0 ? src.length : nextLineEnd);
      if (/^\s*"/.test(nextLine)) {
        hexTail = nextLineEnd < 0 ? src.length : nextLineEnd;
        probe = hexTail + 1;
        continue;
      }
      break;
    }

    // 定位 decode 数组
    const decIdx = src.indexOf("decode: [", hexIdx);
    if (decIdx < 0) throw new Error(`${slug}: 找不到 decode`);
    const decEnd = src.indexOf("\n  ],", decIdx);
    if (decEnd < 0) throw new Error(`${slug}: decode 数组未闭合`);

    const decBody = upd.decode
      .map((d) => `    { hex: "${d.hex}", desc: ${JSON.stringify(d.desc)} },`)
      .join("\n");

    src =
      src.slice(0, hexIdx) +
      `${hexPrefix}"${upd.sampleHex}",` +
      src.slice(hexTail, decIdx) +
      "decode: [\n" +
      decBody +
      "\n  ]," +
      src.slice(decEnd + "\n  ],".length);
    changed++;
  }

  writeFileSync(path, src, "utf8");
  console.log(`${t.file}: 更新 ${changed} 个协议`);
}

console.log(`共处理 ${updates.size} 个协议。`);
