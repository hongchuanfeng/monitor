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

// 解析生成的文件：### slug (brand title) / sampleHex / sampleText / decode 行
const blocks = text.split(/^### /m).filter(Boolean);
const updates = new Map();

for (const block of blocks) {
  const lines = block.split("\n");
  const head = lines[0].trim();
  const slug = head.split(/\s+/)[0];
  const hexMatch = block.match(/sampleHex:\s*"([^"]+)"/);
  if (!hexMatch) throw new Error(`缺少 sampleHex: ${slug}`);

  // 文本协议额外给出报文原文与多行展示文本
  const textMatch = block.match(/sampleText:\s*("(?:[^"\\]|\\.)*")/);
  const displayMatch = block.match(/sampleDisplay:\s*("(?:[^"\\]|\\.)*")/);

  const decodes = [];
  for (const line of lines) {
    const m = line.match(/^\s*\{ hex: "([^"]+)", desc: (".*?)(?:, text: (".*?"))? \},?\s*$/);
    if (m) {
      decodes.push({
        hex: m[1],
        desc: JSON.parse(m[2]),
        text: m[3] === undefined ? undefined : JSON.parse(m[3]),
      });
    }
  }
  if (!decodes.length) throw new Error(`缺少 decode: ${slug}`);

  updates.set(slug, {
    sampleHex: hexMatch[1],
    sampleText: textMatch ? JSON.parse(textMatch[1]) : undefined,
    sampleDisplay: displayMatch ? JSON.parse(displayMatch[1]) : undefined,
    decode: decodes,
  });
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
      // 续行：同一次赋值的多行字符串
      if (/^\s*"/.test(nextLine)) {
        hexTail = nextLineEnd < 0 ? src.length : nextLineEnd;
        probe = hexTail + 1;
        continue;
      }
      // 文本协议的报文原文字段：重跑脚本时先吃掉旧值，避免重复写入
      if (/^\s*sample(Text|Display):/.test(nextLine)) {
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
      .map((d) => {
        const textField =
          d.text === undefined ? "" : `, text: ${JSON.stringify(d.text)}`;
        return `    { hex: "${d.hex}", desc: ${JSON.stringify(d.desc)}${textField} },`;
      })
      .join("\n");

    // 文本协议在 sampleHex 之后补写报文原文与多行展示文本
    const textFields =
      upd.sampleText === undefined
        ? ""
        : `\n${hexPrefix.replace("sampleHex:", "sampleText:")}${JSON.stringify(upd.sampleText)},` +
          `\n${hexPrefix.replace("sampleHex:", "sampleDisplay:")}${JSON.stringify(upd.sampleDisplay)},`;

    src =
      src.slice(0, hexIdx) +
      `${hexPrefix}"${upd.sampleHex}",` +
      textFields +
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
