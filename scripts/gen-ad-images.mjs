/**
 * 生成广告位横幅图（纯背景色 + 文案）。
 * 源文件使用 \uXXXX 转义，保证在任何环境下写出均为合法 UTF-8。
 * 运行：node scripts/gen-ad-images.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../public/ads");

const BRAND = "\u76d1\u62a4\u4eea\u4e0e\u9ebb\u9189\u673a\u901a\u8baf\u534f\u8bae\u6587\u6863\u5e93"; // 监护仪与麻醉机通讯协议文档库
const SUB = "\u5e27\u683c\u5f0f \u00b7 \u6570\u636e\u5b57\u5178 \u00b7 \u62a5\u6587\u793a\u4f8b \u00b7 C# / Java \u8fde\u63a5\u793a\u4f8b"; // 帧格式 · 数据字典 · 报文示例 · C# / Java 连接示例
const SUB_SHORT = "\u5e27\u683c\u5f0f \u00b7 \u6570\u636e\u5b57\u5178 \u00b7 \u62a5\u6587\u793a\u4f8b"; // 帧格式 · 数据字典 · 报文示例
const SUB_CODE = "C# / Java \u8fde\u63a5\u793a\u4f8b"; // C# / Java 连接示例
const CTA = "\u514d\u8d39\u67e5\u9605"; // 免费查阅
const BRANDS = [
  "\u8fc8\u745e BeneVision",
  "Philips IntelliVue",
  "GE CARESCAPE",
  "Dr\u00e4ger Perseus",
  "Masimo / Nihon Kohden",
];

const PRIMARY = "#0F62FE";
const PRIMARY_DARK = "#0043CE";
const SOFT = "#CFE2FF";
const FONT = "'PingFang SC','Microsoft YaHei',-apple-system,'Segoe UI',sans-serif";

const esc = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const text = (x, y, size, weight, fill, content, anchor) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}"${
    anchor ? ` text-anchor="${anchor}"` : ""
  } font-family="${FONT}">${esc(content)}</text>`;

const svg = (w, h, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(
    BRAND,
  )}">\n${inner}\n</svg>\n`;

const cta = (x, y, w = 104, h = 36, labelSize = 14) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#FFFFFF"/>\n` +
  text(x + w / 2, y + h / 2 + labelSize * 0.36, labelSize, 600, PRIMARY, CTA, "middle");

/** 顶部横幅 / 内嵌横幅：全幅 1100x92，随容器等比缩放 */
const banner = svg(
  1100,
  92,
  `<rect width="1100" height="92" fill="${PRIMARY}"/>\n` +
    `<rect x="0" y="0" width="1100" height="4" fill="${PRIMARY_DARK}"/>\n` +
    text(36, 42, 26, 700, "#FFFFFF", BRAND) +
    "\n" +
    text(36, 68, 14, 400, SOFT, SUB) +
    "\n" +
    cta(940, 28, 124, 38),
);

/** 移动端横幅 320x50 */
const mobile = svg(
  320,
  50,
  `<rect width="320" height="50" fill="${PRIMARY}"/>\n` +
    `<rect x="0" y="0" width="320" height="3" fill="${PRIMARY_DARK}"/>\n` +
    text(16, 32, 18, 700, "#FFFFFF", BRAND),
);

/** 侧栏矩形 300x250 */
const rectangle = svg(
  300,
  250,
  `<rect width="300" height="250" fill="${PRIMARY}"/>\n` +
    `<rect x="0" y="0" width="300" height="3" fill="${PRIMARY_DARK}"/>\n` +
    text(24, 72, 22, 700, "#FFFFFF", BRAND.slice(0, 6)) +
    "\n" +
    text(24, 102, 22, 700, "#FFFFFF", BRAND.slice(6)) +
    "\n" +
    text(24, 134, 13, 400, SOFT, SUB_SHORT) +
    "\n" +
    text(24, 156, 13, 400, SOFT, SUB_CODE) +
    "\n" +
    cta(24, 178),
);

/** 侧栏半高 300x600 */
const half = svg(
  300,
  600,
  `<rect width="300" height="600" fill="${PRIMARY}"/>\n` +
    `<rect x="0" y="0" width="300" height="3" fill="${PRIMARY_DARK}"/>\n` +
    text(24, 80, 24, 700, "#FFFFFF", BRAND.slice(0, 6)) +
    "\n" +
    text(24, 114, 24, 700, "#FFFFFF", BRAND.slice(6)) +
    "\n" +
    text(24, 150, 13, 400, SOFT, SUB_SHORT) +
    "\n" +
    text(24, 172, 13, 400, SOFT, SUB_CODE) +
    "\n" +
    BRANDS.map((b, i) => text(24, 230 + i * 32, 14, 400, "#FFFFFF", `\u00b7 ${b}`)).join("\n") +
    "\n" +
    cta(24, 404),
);

const files = { banner, inline: banner, mobile, rectangle, half };

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, content] of Object.entries(files)) {
  writeFileSync(resolve(OUT_DIR, `${name}.svg`), content, "utf8");
  console.log(`wrote public/ads/${name}.svg`);
}
