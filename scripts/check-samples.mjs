/**
 * 校验各协议的示例报文（sampleHex）与逐段解读（decode）是否一致。
 * 运行：node scripts/check-samples.mjs
 *
 * 校验项：
 *  1. sampleHex 可被解析为字节序列
 *  2. decode 各段的字节拼接后与 sampleHex 完全一致
 *  3. decode 段总字节数与 sampleHex 字节数一致
 *
 * 实现说明：先��� tsc 把 src/data 下的协议定义编译到临时目录，再加载校验，
 * 避免运行时依赖 TS loader。
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { rmSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, ".tmp-sample-check");

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "tsc",
    "src/data/protocols-monitor.ts",
    "src/data/protocols-anesthesia.ts",
    "--outDir",
    ".tmp-sample-check",
    "--module",
    "commonjs",
    "--target",
    "es2022",
    "--moduleResolution",
    "node",
    "--skipLibCheck",
  ],
  { cwd: ROOT, stdio: "inherit", shell: true },
);

const require = createRequire(import.meta.url);
const { monitorProtocols } = require(resolve(OUT, "protocols-monitor.js"));
const { anesthesiaProtocols } = require(resolve(OUT, "protocols-anesthesia.js"));
const all = [...monitorProtocols, ...anesthesiaProtocols];

const parseHex = (s) =>
  s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((b) => {
      if (!/^[0-9A-Fa-f]{2}$/.test(b)) throw new Error(`非法字节: "${b}"`);
      return parseInt(b, 16);
    });

const hex = (b) => `0x${b.toString(16).padStart(2, "0").toUpperCase()}`;

let problems = 0;

for (const p of all) {
  const issues = [];

  let sampleBytes;
  try {
    sampleBytes = parseHex(p.sampleHex);
  } catch (e) {
    issues.push(`sampleHex 解析失败: ${e.message}`);
  }

  const decoded = [];
  for (const d of p.decode) {
    try {
      decoded.push(...parseHex(d.hex));
    } catch (e) {
      issues.push(`decode 段 "${d.hex}" 解析失败: ${e.message}`);
    }
  }

  if (sampleBytes && decoded.length) {
    if (decoded.length !== sampleBytes.length) {
      issues.push(
        `字节数不一致: sampleHex ${sampleBytes.length} 字节, decode 合计 ${decoded.length} 字节`,
      );
    } else {
      for (let i = 0; i < sampleBytes.length; i++) {
        if (sampleBytes[i] !== decoded[i]) {
          issues.push(
            `第 ${i + 1} 字节不一致: sampleHex=${hex(sampleBytes[i])}, decode=${hex(decoded[i])}`,
          );
          break;
        }
      }
    }
  }

  if (issues.length) {
    problems++;
    console.log(`\n[问题] ${p.slug}  (${p.brand})`);
    for (const i of issues) console.log(`   - ${i}`);
  } else {
    console.log(
      `[通过] ${p.slug.padEnd(36)} ${sampleBytes.length} 字节 / ${p.decode.length} 段`,
    );
  }
}

rmSync(OUT, { recursive: true, force: true });

console.log(`\n共 ${all.length} 个协议，发现 ${problems} 个存在问题。`);
process.exit(problems ? 1 : 0);
