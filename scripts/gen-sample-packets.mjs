/**
 * 为每个设备生成可下载的样本数据包。
 *
 * 运行：node scripts/gen-sample-packets.mjs
 * 输出：public/samples/<slug>/ 目录下的三种格式
 *       - <slug>.bin  原始字节，可直接喂给串口/TCP 采集程序
 *       - <slug>.hex  十六进制文本，空格分隔，便于贴进日志或代码
 *       - <slug>.txt  人类可读说明，含字节长度、逐段解码与字段含义
 *       以及 src/data/sample-packets.ts 的元信息索引
 *
 * 设计原则
 * --------
 * 1. 数据来源唯一：协议页的 sampleHex 与 decode 字段。
 *    协议正文改了就重跑本脚本，样本包与协议页永远一致。
 * 2. 每个样本包只含一个协议页已验证过校验的报文，
 *    不拼接多条报文，避免用户拿到手后无法判断帧边界。
 * 3. 文本类协议（HL7、NMEA、关键字-值等）额外补上结束符，
 *    使其成为一条可直接解析的完整消息。
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "public/samples");

/** 协议 slug -> 文本协议需要补的结束符 */
const TEXT_TERMINATORS = {
  "drager-perseus-hl7": [0x1c],
  "mindray-benevision-n22": [0x1c],
};

/**
 * 以字符串形式展示报文的协议。
 *
 * HL7 的报文本身就是可读的字符序列，用十六进制展示既难读也不便于直接使用，
 * 因此这类协议除二进制样本外额外提供一个原始报文文本文件。
 */
const STRING_PROTOCOLS = new Set([
  "drager-perseus-hl7",
  "mindray-benevision-n22",
]);

const parseHex = (s) =>
  s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((b) => {
      if (!/^[0-9A-Fa-f]{2}$/.test(b)) throw new Error(`非法字节: "${b}"`);
      return parseInt(b, 16);
    });

/** 按每行 16 字节格式化十六进制输出，与常见的 hexdump 工具对齐 */
const hexLine = (bytes, indent = "") => {
  const lines = [];
  for (let i = 0; i < bytes.length; i += 16) {
    lines.push(
      indent +
      bytes
        .slice(i, i + 16)
        .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
        .join(" "),
    );
  }
  return lines.join("\n");
};

/** 从协议页的 decode 字段重建逐段说明 */
function readProtocols() {
  const protocols = [];

  for (const file of [
    "src/data/protocols-monitor.ts",
    "src/data/protocols-anesthesia.ts",
  ]) {
    const src = readFileSync(resolve(ROOT, file), "utf8");

    // 按协议对象切块：每个协议以 `const xxx: Protocol = {` 开始
    const blocks = src.split(/const \w+: Protocol = \{/).slice(1);

    for (const block of blocks) {
      const slug = block.match(/slug:\s*"([^"]+)"/)?.[1];
      if (!slug) continue;

      const sampleHex = block.match(/sampleHex:\s*"([^"]+)"/)?.[1];
      if (!sampleHex) continue;

      // 文本协议的报文原文，页面与样本包据此按字符串展示
      const sampleTextMatch = block.match(
        /sampleText:\s*("(?:[^"\\]|\\.)*")/,
      );
      const sampleText = sampleTextMatch
        ? JSON.parse(sampleTextMatch[1])
        : undefined;

      const decode = [];
      const decodeBlock = block.match(/decode:\s*\[([\s\S]*?)\n  \],/)?.[1] ?? "";
      const itemRe =
        /\{\s*hex:\s*"([^"]+)",\s*desc:\s*("(?:[^"\\]|\\.)*")(?:\s*,\s*text:\s*("(?:[^"\\]|\\.)*"))?\s*\}/g;
      let m;
      while ((m = itemRe.exec(decodeBlock))) {
        decode.push({
          hex: m[1],
          desc: JSON.parse(m[2]),
          text: m[3] === undefined ? undefined : JSON.parse(m[3]),
        });
      }

      const title = block.match(/title:\s*"([^"]+)"/)?.[1] ?? slug;
      const brand = block.match(/brand:\s*"([^"]+)"/)?.[1] ?? "";
      const brandSlug = block.match(/brandSlug:\s*"([^"]+)"/)?.[1] ?? "";
      const category = block.match(/category:\s*"([^"]+)"/)?.[1] ?? "";
      const models = block.match(/models:\s*\[([^\]]*)\]/)?.[1] ?? "";
      const interfaces = block.match(/interfaces:\s*\[([^\]]*)\]/)?.[1] ?? "";
      const baud = block.match(/baud:\s*"([^"]+)"/)?.[1] ?? "";
      const summary = block.match(/summary:\s*\n?\s*"([^"]+)"/)?.[1] ?? "";
      const updatedAt = block.match(/updatedAt:\s*"([^"]+)"/)?.[1] ?? "";

      protocols.push({
        slug,
        title,
        brand,
        brandSlug,
        category,
        models: models
          .split(",")
          .map((m) => m.trim().replace(/^"|"$/g, ""))
          .filter(Boolean),
        interfaces: interfaces
          .split(",")
          .map((m) => m.trim().replace(/^"|"$/g, ""))
          .filter(Boolean),
        baud,
        summary,
        updatedAt,
        sampleHex,
        sampleText,
        decode,
      });
    }
  }

  return protocols;
}

/** 生成单个协议的样本包，返回落盘信息 */
function writeSamplePacket(p) {
  const bytes = parseHex(p.sampleHex);
  const terminator = TEXT_TERMINATORS[p.slug] ?? [];
  const full = [...bytes, ...terminator];

  const dir = resolve(OUT_DIR, p.slug);
  mkdirSync(dir, { recursive: true });

  // 1) 原始字节
  writeFileSync(resolve(dir, `${p.slug}.bin`), Buffer.from(full));

  // 2) 十六进制文本
  writeFileSync(
    resolve(dir, `${p.slug}.hex`),
    `${hexLine(full)}\n`,
    "utf8",
  );

  // 2b) 报文原文：文本协议的可读形式，直接就是可用的字符序列
  const isStringProtocol = STRING_PROTOCOLS.has(p.slug) && p.sampleText !== undefined;
  if (isStringProtocol) {
    writeFileSync(resolve(dir, `${p.slug}.txt.raw`), p.sampleText, "utf8");
  }

  // 3) 人类可读说明
  const lines = [];
  lines.push(`# ${p.title}`);
  lines.push("");
  lines.push(`- 协议标识：${p.slug}`);
  lines.push(`- 品牌：${p.brand}`);
  lines.push(`- 覆盖型号：${p.models.join("、")}`);
  lines.push(`- 接口：${p.interfaces.join(" / ")}`);
  lines.push(`- 通讯参数：${p.baud}`);
  lines.push(`- 报文长度：${full.length} 字节`);
  lines.push(`- 最后更新：${p.updatedAt}`);
  lines.push("");
  lines.push("## 说明");
  lines.push("");
  lines.push(p.summary);
  lines.push("");
  if (isStringProtocol) {
    lines.push("## 报文原文");
    lines.push("");
    lines.push("本协议为文本协议，报文本身就是可读的字符序列，无需按十六进制解读：");
    lines.push("");
    lines.push("```hl7");
    lines.push(p.sampleText.replace(/\r/g, "\n").replace(/\n$/, ""));
    lines.push("```");
    lines.push("");
    lines.push(
      "段与段之间以回车 0x0D 分隔，消息以 0x1C 结束，两者在下面的片段表里分别标为 ␍ 与 FS。",
    );
    lines.push("");
  }
  lines.push("## 字节流");
  lines.push("");
  lines.push(hexLine(full));
  lines.push("");
  lines.push("## 逐段解读");
  lines.push("");
  lines.push(isStringProtocol ? "| 片段 | 含义 |" : "| 字节 | 含义 |");
  lines.push("| --- | --- |");
  for (const d of p.decode) {
    const key = isStringProtocol ? (d.text ?? d.hex) : d.hex;
    lines.push(`| \`${key}\` | ${d.desc.replace(/\|/g, "\\|")} |`);
  }
  if (terminator.length) {
    lines.push(
      `| \`${terminator.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ")}\` | 消息结束符 ${
        terminator
          .map((b) => `0x${b.toString(16).toUpperCase().padStart(2, "0")}`)
          .join(" ")
      }，部分设备会省略，采集端需兼容。 |`,
    );
  }
  lines.push("");
  lines.push("## 使用方式");
  lines.push("");
  lines.push("```bash");
  lines.push("# 直接把原始字节写入串口或 TCP 连接");
  lines.push(`cat ${p.slug}.bin > /dev/ttyUSB0`);
  lines.push("");
  lines.push("# 或者查看十六进制内容");
  lines.push(`xxd ${p.slug}.bin`);
  lines.push("```");
  lines.push("");
  if (isStringProtocol) {
    lines.push(
      `也可以直接取用报文原文：\`${p.slug}.txt.raw\` 就是这条报文的字符串形式，` +
        "段之间以回车分隔，可直接贴进调试工具或代码里的样例数据。",
    );
    lines.push("");
  }
  lines.push(
    "> 本样本由协议页的示例报文生成，用于联调前的自检。正式接入请以对应型号的原厂通讯协议手册为准。",
  );
  lines.push("");

  writeFileSync(resolve(dir, `${p.slug}.txt`), lines.join("\n"), "utf8");

  return {
    slug: p.slug,
    title: p.title,
    brand: p.brand,
    brandSlug: p.brandSlug,
    category: p.category,
    models: p.models,
    interfaces: p.interfaces,
    baud: p.baud,
    summary: p.summary,
    updatedAt: p.updatedAt,
    byteLength: full.length,
    hasTextTerminator: terminator.length > 0,
    /** 报文以字符串形式展示（文本协议） */
    isStringProtocol,
    /** 样本包所在目录（相对 public/） */
    dir: `samples/${p.slug}`,
    /** 各格式文件名（相对样本包目录） */
    files: {
      bin: `${p.slug}.bin`,
      hex: `${p.slug}.hex`,
      txt: `${p.slug}.txt`,
      /** 报文原文，仅文本协议提供 */
      raw: isStringProtocol ? `${p.slug}.txt.raw` : null,
    },
  };
}

// ---------------------------------------------------------------- 主流程

const protocols = readProtocols();
if (!protocols.length) throw new Error("没有读取到任何协议");

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const entries = [];
for (const p of protocols) {
  const meta = writeSamplePacket(p);
  entries.push(meta);
  console.log(
    `[样本包] ${meta.slug.padEnd(36)} ${String(meta.byteLength).padStart(4)} 字节`,
  );
}

entries.sort((a, b) => a.title.localeCompare(b.title, "zh-Hans-CN"));

const out = `import type { SamplePacket } from "./types";

/**
 * 各设备样本数据包的元信息。
 *
 * 本文件由 scripts/gen-sample-packets.mjs 生成，请勿手工修改：
 *   node scripts/gen-sample-packets.mjs
 *
 * 每个协议对应一个样本包目录，目录内含三种格式：
 *   .bin  原始字节，可直接写入串口或 TCP 连接
 *   .hex  十六进制文本，便于贴进日志或调试代码
 *   .txt  人类可读说明，含逐段解读与使用方式
 *
 * 文本协议（如 HL7）额外提供 .txt.raw，即报文的原始字符串形式。
 */
export const samplePackets: SamplePacket[] = [
${entries
  .map(
    (e) =>
      `  {
    slug: ${JSON.stringify(e.slug)},
    title: ${JSON.stringify(e.title)},
    brand: ${JSON.stringify(e.brand)},
    brandSlug: ${JSON.stringify(e.brandSlug)},
    category: ${JSON.stringify(e.category)},
    models: ${JSON.stringify(e.models)},
    interfaces: ${JSON.stringify(e.interfaces)},
    baud: ${JSON.stringify(e.baud)},
    summary: ${JSON.stringify(e.summary)},
    updatedAt: ${JSON.stringify(e.updatedAt)},
    byteLength: ${e.byteLength},
    hasTextTerminator: ${e.hasTextTerminator},
    isStringProtocol: ${e.isStringProtocol},
    dir: ${JSON.stringify(e.dir)},
    files: {
      bin: ${JSON.stringify(e.files.bin)},
      hex: ${JSON.stringify(e.files.hex)},
      txt: ${JSON.stringify(e.files.txt)},
      raw: ${e.files.raw === null ? "null" : JSON.stringify(e.files.raw)},
    },
  },`,
  )
  .join("\n")}
];

/** 按协议 slug 索引 */
export const samplePacketBySlug: Record<string, SamplePacket> = Object.fromEntries(
  samplePackets.map((s) => [s.slug, s]),
);
`;

writeFileSync(resolve(ROOT, "src/data/sample-packets.ts"), out, "utf8");
console.log(
  `\n共生成 ${entries.length} 个样本包，已写入 src/data/sample-packets.ts`,
);
