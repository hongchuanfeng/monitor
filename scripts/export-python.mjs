/**
 * 把 src/data/python-sources.ts 中的 Python 源码导出到 .tmp-py/ 目录，
 * 便于用本机 Python 逐个运行自检。
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, ".tmp-py");

mkdirSync(OUT, { recursive: true });
// 逐个覆盖写入，避免目录被占用时整体删除失败
for (const name of readdirSync(OUT)) {
  try {
    rmSync(resolve(OUT, name), { force: true });
  } catch {
    /* 文件被占用时跳过 */
  }
}

const src = readFileSync(resolve(ROOT, "src/data/python-sources.ts"), "utf8");

const re =
  /"([a-z0-9-]+)": \{\s*filename: "([^"]+)",\s*code: ("(?:[^"\\]|\\.)*")/g;
let m;
let count = 0;
while ((m = re.exec(src))) {
  writeFileSync(resolve(OUT, m[2]), JSON.parse(m[3]), "utf8");
  count++;
}

console.log(`导出 ${count} 个 Python 文件到 ${OUT}`);
