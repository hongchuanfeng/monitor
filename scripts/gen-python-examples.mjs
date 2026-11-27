/**
 * 生成各协议的 Python 帧解析示例。
 *
 * 运行：node scripts/gen-python-examples.mjs
 * 输出：src/data/python-sources.ts
 *
 * 设计原则
 * --------
 * 1. 帧结构（起始符、长度字段、校验、结束符）来自 src/data/python-examples.ts
 *    的 FRAME_SPECS，按帧族定义；数据区的内部布局由各协议的 payloadLayout 描述。
 * 2. 所有偏移在运行时由长度字段推导，不硬编码具体帧的下标，
 *    因此同一份代码能处理不同长度的帧。
 * 3. 每个生成的文件都能直接运行：内置 demo 用本页的示例报文做自检，
 *    校验和不过就抛异常，避免示例代码本身是错的。
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const hex = (b) =>
  b.map((x) => `0x${x.toString(16).toUpperCase().padStart(2, "0")}`).join(", ");

// ---------------------------------------------------------------- 元信息读取

function loadMeta() {
  const src = readFileSync(resolve(ROOT, "src/data/python-examples.ts"), "utf8");

  // ---- FRAME_SPECS ----
  const specs = {};
  const specsBlock = src.slice(src.indexOf("export const FRAME_SPECS"));
  const kindRe = /^\s{2}"?([a-z0-9-]+)"?:\s*\{([\s\S]*?)\n  \},/gm;
  let m;
  while ((m = kindRe.exec(specsBlock))) {
    const kind = m[1];
    const body = m[2];
    const spec = { start: [], end: [], payloadOffset: 0 };

    const startM = body.match(/start:\s*\[([^\]]*)\]/);
    if (startM)
      spec.start = startM[1].trim()
        ? startM[1].split(",").map((x) => parseInt(x.trim(), 16))
        : [];
    const endM = body.match(/end:\s*\[([^\]]*)\]/);
    if (endM)
      spec.end = endM[1].trim()
        ? endM[1].split(",").map((x) => parseInt(x.trim(), 16))
        : [];

    for (const [key, re] of [
      ["lenOffset", /lenOffset:\s*(\d+)/],
      ["lenSize", /lenSize:\s*(\d+)/],
      ["payloadOffset", /payloadOffset:\s*(\d+)/],
      ["frameTotal", /frameTotal:\s*(\d+)/],
    ]) {
      const r = body.match(re);
      if (r) spec[key] = parseInt(r[1], 10);
    }
    const lenE = body.match(/lenEndian:\s*"(be|le)"/);
    if (lenE) spec.lenEndian = lenE[1];

    const csM = body.match(/checksum:\s*\{([^}]*)\}/);
    if (csM) {
      const cs = csM[1];
      const kindCs = cs.match(/kind:\s*"([a-z0-9-]+)"/);
      const offM = cs.match(/offset:\s*(\d+)/);
      const sizeM = cs.match(/size:\s*(\d+)/);
      const coverM = cs.match(/coverStart:\s*(\d+)/);
      const endM2 = cs.match(/endian:\s*"(be|le)"/);
      if (kindCs && sizeM && coverM) {
        spec.checksum = {
          kind: kindCs[1],
          size: parseInt(sizeM[1], 10),
          coverStart: parseInt(coverM[1], 10),
        };
        // 校验字段位置固定时才需要 offset，否则由解析器按负载区长度推导
        if (offM) spec.checksum.offset = parseInt(offM[1], 10);
        if (endM2) spec.checksum.endian = endM2[1];
      }
    }
    specs[kind] = spec;
  }

  // ---- pythonExamples ----
  const examples = [];
  const arrStart = src.indexOf("export const pythonExamples");
  const arrBody = src.slice(arrStart, src.indexOf("\n];", arrStart));

  const objRe =
    /\{\s*\n\s*slug:\s*"([^"]+)",\s*\n\s*kind:\s*"([^"]+)",\s*\n\s*filename:\s*"([^"]+)",([\s\S]*?)\n  \},/g;
  while ((m = objRe.exec(arrBody))) {
    const [, slug, kind, filename, rest] = m;
    const ex = {
      slug,
      kind,
      filename,
      params: [],
      keywords: [],
      commands: [],
      notes: [],
      payloadOffset: null,
      payloadLayout: null,
    };

    for (const [key, re] of [
      ["payloadOffset", /payloadOffset:\s*(\d+)/],
      ["payloadLayout", /payloadLayout:\s*"([^"]+)"/],
    ]) {
      const r = rest.match(re);
      if (r) ex[key] = key === "payloadOffset" ? parseInt(r[1], 10) : r[1];
    }

    const paramsM = rest.match(/params:\s*\[([\s\S]*?)\n    \],/);
    if (paramsM) {
      const pRe =
        /\{\s*id:\s*(0x[0-9a-fA-F]+|\d+),\s*name:\s*"([^"]+)",\s*unit:\s*"([^"]*)",\s*scale:\s*([\d.]+)(?:,\s*note:\s*"([^"]*)")?\s*\}/g;
      let pm;
      while ((pm = pRe.exec(paramsM[1]))) {
        ex.params.push({
          id: pm[1].startsWith("0x") ? parseInt(pm[1], 16) : parseInt(pm[1], 10),
          name: pm[2],
          unit: pm[3],
          scale: parseFloat(pm[4]),
          note: pm[5],
        });
      }
    }

    const kwM = rest.match(/keywords:\s*\[([\s\S]*?)\n    \],/);
    if (kwM) {
      const kRe =
        /\{\s*keyword:\s*"([^"]+)",\s*name:\s*"([^"]+)"(?:,\s*unit:\s*"([^"]*)")?,\s*desc:\s*"([^"]+)"\s*\}/g;
      let km;
      while ((km = kRe.exec(kwM[1]))) {
        ex.keywords.push({
          keyword: km[1],
          name: km[2],
          unit: km[3] ?? "",
          desc: km[4],
        });
      }
    }

    const cmdM = rest.match(/commands:\s*\[([\s\S]*?)\n    \],/);
    if (cmdM) {
      const cRe =
        /\{\s*code:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*desc:\s*"([^"]+)"\s*\}/g;
      let cm;
      while ((cm = cRe.exec(cmdM[1]))) {
        ex.commands.push({ code: cm[1], name: cm[2], desc: cm[3] });
      }
    }

    const notesM = rest.match(/notes:\s*\[([\s\S]*?)\n    \],/);
    if (notesM) {
      const nRe = /"((?:[^"\\]|\\.)*)"/g;
      let nm;
      while ((nm = nRe.exec(notesM[1]))) ex.notes.push(JSON.parse(`"${nm[1]}"`));
    }

    examples.push(ex);
  }

  return { specs, examples };
}

// ---------------------------------------------------------------- 代码片段

const CHECKSUM_HELPERS = `# ---- 校验算法 -----------------------------------------------------------

def sum8(data: bytes) -> int:
    """累加和校验，取低 8 位。"""
    return sum(data) & 0xFF


def xor8(data: bytes) -> int:
    """按位异或校验。"""
    result = 0
    for b in data:
        result ^= b
    return result


def crc16_ccitt(data: bytes) -> int:
    """CRC16/CCITT-FALSE：初值 0x0000，多项式 0x1021，不反转、不异或输出。"""
    crc = 0x0000
    for b in data:
        crc ^= b << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    return crc
`;

function docstring(notes = []) {
  const lines = notes.map((n) => `#   - ${n}`);
  return lines.length ? `${lines.join("\n")}\n#\n` : "";
}

function paramsTable(ex) {
  if (!ex.params?.length) return "";
  const lines = [
    "# 参数表：参数编号 -> (名称, 单位, 比例因子)",
    "# 工程值 = 原始整数 * 比例因子",
    "PARAM_TABLE: dict[int, tuple[str, str, float]] = {",
  ];
  for (const p of ex.params) {
    const idHex = `0x${p.id.toString(16).toUpperCase().padStart(4, "0")}`;
    lines.push(
      `    ${idHex}: (${JSON.stringify(p.name)}, ${JSON.stringify(p.unit)}, ${p.scale}),` +
        (p.note ? `  # ${p.note}` : ""),
    );
  }
  lines.push("}");
  lines.push("");
  return lines.join("\n");
}

function commandsTable(ex) {
  if (!ex.commands?.length) return "";
  const lines = ["# 命令码表", "COMMANDS: dict[str, str] = {"];
  for (const c of ex.commands) {
    lines.push(`    ${JSON.stringify(c.code)}: ${JSON.stringify(c.name)},  # ${c.desc}`);
  }
  lines.push("}");
  lines.push("");
  return lines.join("\n");
}

function keywordsTable(ex) {
  if (!ex.keywords?.length) return "";
  const lines = [
    "# 关键字表：报文关键字 -> (含义, 单位)",
    "KEYWORDS: dict[str, tuple[str, str]] = {",
  ];
  for (const k of ex.keywords) {
    lines.push(
      `    ${JSON.stringify(k.keyword)}: (${JSON.stringify(k.name)}, ${JSON.stringify(k.unit ?? "")}),` +
        `  # ${k.desc}`,
    );
  }
  lines.push("}");
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------- 负载区布局

/**
 * 各布局的描述：
 *   skip        数据区开头的固定字节数（控制字段、命令码、导联组等）
 *   idSize      参数编号宽度
 *   idEndian    参数编号字节序
 *   valueSize   数值宽度
 *   valueEndian 数值字节序
 *   countFirst  数据区是否以参数个数开头
 *
 * 注意：参数编号与数值的字节序按设备实际编码约定，与「报文示例」表逐段对应。
 */
const LAYOUTS = {
  // 负载区直接是 [参数ID(2) | 数值(2)] 重复
  intellivue: { skip: 0, idSize: 2, idEndian: "be", valueSize: 2, valueEndian: "be" },
  // 数据区 = Ctrl(1) | Cmd(1) | [参数ID(2) | 数值(2)] 重复
  // 参数编号与数值均为小端序
  "mindray-benevision": { skip: 2, idSize: 2, idEndian: "le", valueSize: 2, valueEndian: "le" },
  // 数据区 = Ctrl(1) | Cmd(1) | LeadGroup(1) | Lead(1) | PR(2) | QRS(2) | QT(2)
  // 该协议按位置给出分析结论，没有参数编号，用 fixedIds 按顺序对应
  "mindray-beneheart": {
    skip: 4,
    idSize: 0,
    idEndian: "be",
    valueSize: 2,
    valueEndian: "le",
    fixedIds: [0x0140, 0x0096, 0x008c],
  },
  // 数据区 = Ctrl(1) | Cmd(1) | Count(1) | [参数ID(2) | 数值(2)] 重复
  // skip 跳过 Ctrl 与 Cmd，countFirst 再跳过参数个数
  "mindray-wato": { skip: 2, idSize: 2, idEndian: "le", valueSize: 2, valueEndian: "le", countFirst: true },
  // 数据区 = Ctrl(1) | Cmd(1) | [参数ID(2) | 数值(2)] 重复
  "mindray-passport": { skip: 2, idSize: 2, idEndian: "le", valueSize: 2, valueEndian: "le" },
  // Passport i8 的参数编号与数值同样是小端序，但数据区结构略有不同
  "mindray-passport-be": { skip: 2, idSize: 2, idEndian: "be", valueSize: 2, valueEndian: "be" },
  // 数据区 = DevID(2) | [参数ID(2) | 数值(2)] 重复
  biolight: { skip: 2, idSize: 2, idEndian: "be", valueSize: 2, valueEndian: "be" },
  // 数据区是 ASCII 文本片段，无参数表
  comen: { skip: 0, idSize: 0, idEndian: "be", valueSize: 0, valueEndian: "be" },
  // 数据区 = [参数ID(2) | 数值(4)] 重复
  "drager-perseus": { skip: 0, idSize: 2, idEndian: "be", valueSize: 4, valueEndian: "be" },
  // 数据区 = SubType(1) | [参数ID(2) | 数值(2)] 重复
  // 命令标识 0x3300 位于长度字段之后、数据区之前
  hamilton: { skip: 3, idSize: 2, idEndian: "le", valueSize: 2, valueEndian: "le" },
  // 数据区 = Chan(1) | [参数ID(2) | 数值(2)] 重复
  bionet: { skip: 1, idSize: 2, idEndian: "be", valueSize: 2, valueEndian: "be" },
  // 数据区 = [参数ID(2) | 数值(4)] 重复
  tecno: { skip: 0, idSize: 2, idEndian: "be", valueSize: 4, valueEndian: "be" },
  // 数据区 = Count(1) | [参数ID(2) | 数值(4)] 重复
  edwards: { skip: 1, idSize: 2, idEndian: "le", valueSize: 4, valueEndian: "le" },
  // 数据区 = [参数ID(2) | 数值(2)] 重复（时间戳与设备 ID 已计入帧头）
  capsule: { skip: 0, idSize: 2, idEndian: "le", valueSize: 2, valueEndian: "le" },
  // 数据区 = BlockType(1) | Count(1) | [参数类型(1) | 数值(2)] 重复
  masimo: { skip: 2, idSize: 1, idEndian: "be", valueSize: 2, valueEndian: "be" },
  // 文本协议不走统一的二进制参数表
  text: { skip: 0, idSize: 0, idEndian: "be", valueSize: 0, valueEndian: "be" },
};

function decodeParamsFn(ex, layout) {
  if (!ex.params?.length) {
    if (layout.idSize === 0) {
      // 无参数表：原样返回负载区
      return `
def decode_params(payload: bytes) -> dict:
    """本协议的数据区不按参数表组织，原样返回。"""
    return {"payload": payload}
`;
    }
    return `
def decode_params(payload: bytes) -> dict:
    """本协议暂无公开参数表，原样返回负载区。"""
    return {"payload": payload}
`;
  }

  const rec = layout.idSize + layout.valueSize;
  const idOrder = layout.idEndian === "le" ? "little" : "big";
  const valOrder = layout.valueEndian === "le" ? "little" : "big";

  return `
def decode_params(payload: bytes) -> dict:
    """按参数表逐条解析数据区。

    每条记录为「参数编号 + 数值」，编号决定使用哪个比例因子换算。
    遇到表中没有的编号会跳过该记录，避免未知参数导致整帧解析失败。
    """
    values: dict = {}
    for offset in range(0, len(payload) - ${rec - 1}, ${rec}):
        param_id = int.from_bytes(
            payload[offset : offset + ${layout.idSize}],
            "${idOrder}",
        )
        raw = int.from_bytes(
            payload[offset + ${layout.idSize} : offset + ${rec}],
            "${valOrder}",
        )
        spec = PARAM_TABLE.get(param_id)
        if spec is None:
            continue
        name, unit, scale = spec
        values[name] = raw * scale
    return values
`;
}

// ---------------------------------------------------------------- 二进制协议

function genBinary(ex, spec, sampleHex) {
  const layout = LAYOUTS[ex.payloadLayout];
  if (!layout) throw new Error(`未知的数据区布局: ${ex.payloadLayout}`);

  const hasCs = Boolean(spec.checksum);
  const hasLen = spec.lenSize !== undefined;
  const csKind = hasCs
    ? { sum8: "sum8", xor8: "xor8", "crc16-ccitt": "crc16_ccitt" }[spec.checksum.kind]
    : null;

  const startRepr = spec.start.length ? `bytes([${hex(spec.start)}])` : `b""`;
  const endRepr = spec.end.length ? `bytes([${hex(spec.end)}])` : `b""`;

  // 长度字段之后、数据区之前可能还有若干固定字节（如普门的设备标识）
  const lenFieldEnd = hasLen ? spec.lenOffset + spec.lenSize : 0;
  const payloadOffset = ex.payloadOffset ?? spec.payloadOffset;
  const prefixLen = payloadOffset - lenFieldEnd;

  const classAttrs = [
    `    START = ${startRepr}`,
    `    END = ${endRepr}`,
    `    PAYLOAD_OFFSET = ${payloadOffset}`,
  ];
  if (hasLen) {
    classAttrs.push(`    LEN_OFFSET = ${spec.lenOffset}`);
    classAttrs.push(`    LEN_SIZE = ${spec.lenSize}`);
    classAttrs.push(`    LEN_ENDIAN = "${spec.lenEndian}"`);
    classAttrs.push(`    # 长度字段之后、数据区之前的固定字节数（控制字段、命令码、设备标识等）`);
    classAttrs.push(`    PREFIX_LEN = ${prefixLen}`);
  } else {
    classAttrs.push(`    FRAME_TOTAL = ${spec.frameTotal}`);
  }
  if (hasCs) {
    classAttrs.push(`    CS_SIZE = ${spec.checksum.size}`);
    classAttrs.push(`    CS_COVER_START = ${spec.checksum.coverStart}`);
    classAttrs.push(`    CS_ENDIAN = "${spec.checksum.endian ?? "le"}"`);
    // 校验字段位置固定时直接写死，否则在运行时按负载区长度推导
    if (!hasLen && spec.checksum.offset !== undefined) {
      classAttrs.push(`    CS_OFFSET = ${spec.checksum.offset}`);
    }
  }

  const lenRead = hasLen
    ? `
    def _read_length(self, buf: bytearray) -> int | None:
        """读取长度字段；数据不足时返回 None。"""
        end = self.LEN_OFFSET + self.LEN_SIZE
        if len(buf) < end:
            return None
        raw = bytes(buf[self.LEN_OFFSET : end])
        if self.LEN_SIZE == 1:
            return raw[0]
        return int.from_bytes(raw, "little" if self.LEN_ENDIAN == "le" else "big")
`
    : "";

  const totalCalc = hasLen
    ? `        length = self._read_length(buf)
        if length is None:
            return None
        payload_len = length - self.PREFIX_LEN
        if payload_len < 0:
            raise ValueError(f"长度字段异常: {length}")
        total = self._frame_total(payload_len)`
    : `        total = self.FRAME_TOTAL`;

  const totalFn = hasLen
    ? `
    def _frame_total(self, payload_len: int) -> int:
        """由数据区长度推算整帧长度。

        本协议的长度字段只计数数据区（可能含前置固定字节），不含长度字段本身、
        校验与帧尾定界符。
        """
        return self.PAYLOAD_OFFSET + payload_len + self.CS_SIZE + len(self.END)
`
    : "";

  const csVerify = hasCs
    ? `
        # 4) 校验和
        cs_offset = self.CS_OFFSET if self.FIXED_CS else self.PAYLOAD_OFFSET + payload_len
        covered = buf[self.CS_COVER_START : cs_offset]
        expected = ${csKind}(covered)
        actual = int.from_bytes(
            buf[cs_offset : cs_offset + self.CS_SIZE],
            "little" if self.CS_ENDIAN == "le" else "big",
        )
        if expected != actual:
            raise ValueError(
                f"校验失败: 期望 0x{expected:0{self.CS_SIZE * 2}X}, "
                f"实际 0x{actual:0{self.CS_SIZE * 2}X}"
            )
`
    : `
        # 4) 本协议无校验字段
        pass
`;
  const payloadSlice = hasCs
    ? `bytes(buf[self.PAYLOAD_OFFSET : total - self.CS_SIZE])`
    : `bytes(buf[self.PAYLOAD_OFFSET : total])`;

  const dataSlice = layout.skip
    ? `payload[self.SKIP :]` // 跳过控制字段、命令码等
    : "payload";

  const skipConst = layout.skip
    ? `\n# 数据区开头的固定字节数（控制字段 / 命令码 / 导联组等）\nSKIP = ${layout.skip}`
    : "";

  const decodeBody = layout.countFirst
    ? `        data = payload[self.SKIP + 1 :]  # 跳过参数个数`
    : `        data = payload[self.SKIP :]`;

  const decodeFnSrc = `
def decode_params(payload: bytes, skip: int = 0) -> dict:
    """按参数表逐条解析数据区。

    每条记录为「参数编号 + 数值」，编号决定使用哪个比例因子换算。
    遇到表中没有的编号会跳过该记录，避免未知参数导致整帧解析失败。

    skip 为数据区开头需要跳过的固定字节数（控制字段、命令码、导联组等）。
    """
    values: dict = {}
    data = payload[skip:]${layout.countFirst ? "[1:]" : ""}
    for offset in range(0, len(data) - ${layout.idSize + layout.valueSize - 1}, ${layout.idSize + layout.valueSize}):
        param_id = int.from_bytes(
            data[offset : offset + ${layout.idSize}],
            "${layout.idEndian === "le" ? "little" : "big"}",
        )
        raw = int.from_bytes(
            data[offset + ${layout.idSize} : offset + ${layout.idSize + layout.valueSize}],
            "${layout.valueEndian === "le" ? "little" : "big"}",
        )
        spec = PARAM_TABLE.get(param_id)
        if spec is None:
            continue
        name, unit, scale = spec
        values[name] = raw * scale
    return values
`;

  // 该协议按位置给出分析结论，没有参数编号：按固定顺序对应参数表
  const positionalDecodeSrc = `
# 该协议按位置给出分析结论，没有参数编号。
# 下表把数据区的数值位置与参数表一一对应。
POSITION_IDS = [
${(layout.fixedIds ?? []).map((id) => `    0x${id.toString(16).toUpperCase().padStart(4, "0")},`).join("\n")}
]


def decode_params(payload: bytes, skip: int = 0) -> dict:
    """按位置解析数据区中的各项测量值。

    该协议不携带参数编号，各项数值按固定顺序排列，
    因此用 POSITION_IDS 把位置映射回参数表。
    """
    values: dict = {}
    data = payload[skip:]
    step = ${layout.valueSize}
    for index, param_id in enumerate(POSITION_IDS):
        offset = index * step
        if offset + step > len(data):
            break
        raw = int.from_bytes(
            data[offset : offset + step],
            "${layout.valueEndian === "le" ? "little" : "big"}",
        )
        spec = PARAM_TABLE.get(param_id)
        if spec is None:
            continue
        name, unit, scale = spec
        values[name] = raw * scale
    return values
`;

  const noTableDecode = `
def decode_params(payload: bytes, skip: int = 0) -> dict:
    """本协议的数据区不按参数表组织，原样返回。"""
    return {"payload": payload[skip:]}
`;

  const decodeSrc =
    layout.fixedIds && ex.params?.length
      ? positionalDecodeSrc
      : layout.idSize > 0 && ex.params?.length
        ? decodeFnSrc
        : noTableDecode;

  // decode_params 是模块级函数，SKIP 从调用方传入
  const decodeCall = layout.skip
    ? `decode_params(frame.payload, SKIP)`
    : `decode_params(frame.payload)`;

  return `"""${ex.slug} 帧解析器（Python 3.10+）

${docstring(ex.notes)}本示例可直接解析协议页给出的示例报文：

    ${sampleHex}

运行：python ${ex.filename}
"""

from __future__ import annotations

from dataclasses import dataclass, field

${CHECKSUM_HELPERS}
${paramsTable(ex)}${commandsTable(ex)}${skipConst}

@dataclass
class Frame:
    """解析出的一帧。"""

    raw: bytes
    payload: bytes
    values: dict = field(default_factory=dict)


class FrameParser:
    """${ex.slug} 帧解析器。

    串口与 TCP 都是字节流，帧边界需要自己找。本实现用一个缓冲区缓存，
    每次 feed 追加新数据并尝试切出完整帧；数据不足时保留在缓冲区等待后续字节。
    """

${classAttrs.join("\n")}
    FIXED_CS = ${!hasLen ? "True" : "False"}

    def __init__(self) -> None:
        self._buf = bytearray()

    def feed(self, chunk: bytes) -> list[Frame]:
        """把新收到的字节喂入解析器，返回本次能切出的完整帧列表。"""
        self._buf.extend(chunk)
        frames: list[Frame] = []
        while True:
            frame = self._try_parse()
            if frame is None:
                return frames
            frames.append(frame)

    def _try_parse(self) -> Frame | None:
        buf = self._buf

        # 1) 定位帧起始符
        if self.START:
            idx = buf.find(self.START)
            if idx < 0:
                # 保留可能构成起始符前缀的末尾字节，避免误删半个起始符
                keep = len(self.START) - 1
                if len(buf) > keep:
                    del buf[: len(buf) - keep]
                return None
            if idx > 0:
                del buf[:idx]

        # 2) 判断整帧是否已到齐
${totalCalc}
        if len(buf) < total:
            return None

        # 3) 校验帧尾
        if self.END and buf[total - len(self.END) : total] != self.END:
            del buf[:1]
            return None
${csVerify}
        frame = Frame(
            raw=bytes(buf[:total]),
            payload=${payloadSlice},
        )
        frame.values = ${decodeCall}
        del buf[:total]
        return frame
${lenRead}${totalFn}
${decodeSrc}
if __name__ == "__main__":
    # 自检：用协议页的示例报文验证解析器
    SAMPLE = bytes.fromhex("${sampleHex.replace(/ /g, "")}")
    parser = FrameParser()
    frames = parser.feed(SAMPLE)
    assert len(frames) == 1, f"应解析出 1 帧，实际 {len(frames)} 帧"
    print(f"帧长度: {len(frames[0].raw)} 字节")
    print("解析结果:", frames[0].values)
`;
}

// ---------------------------------------------------------------- 文本协议

function genText(ex, sampleHex, kind) {
  if (kind === "hl7") return genHl7(ex, sampleHex);

  const isKeyValue = kind === "key-value";
  const isNmea = kind === "nmea";
  const isSpaced = kind === "spaced-text";
  const isGroup = kind === "group-text";
  const isCmd = kind === "cmd-text";

  const terminator = isNmea ? "\\r\\n" : "\\r";

  let classDoc;
  let parseBody;

  if (isKeyValue) {
    classDoc = `文本协议。每条记录形如「关键字:值」，多个值以逗号分隔，以回车结束。`;
    parseBody = `    def _parse_line(self, line: str) -> Record | None:
        if not line:
            return None
        keyword, _, rest = line.partition(":")
        if keyword not in KEYWORDS:
            return None
        name, unit = KEYWORDS[keyword]
        values: dict = {}
        for part in rest.split(","):
            part = part.strip()
            if not part:
                continue
            try:
                values[name] = float(part)
            except ValueError:
                values[name] = part
        return Record(keyword=keyword, name=name, unit=unit, values=values)
`;
  } else if (isNmea) {
    classDoc = `NMEA 0183 形态的 ASCII 输出。以 $ 起始，以 *加两位十六进制校验和结束，
    校验和为 $ 与 * 之间所有字符的异或。`;
    parseBody = `    def _parse_line(self, line: str) -> Record | None:
        if not line.startswith("$"):
            return None
        body, _, checksum = line[1:].partition("*")
        if not checksum:
            return None
        expected = self._xor(body)
        actual = int(checksum[:2], 16)
        if expected != actual:
            raise ValueError(
                f"校验失败: 期望 0x{expected:02X}, 实际 0x{actual:02X}"
            )
        parts = body.split(",")
        talker = parts[0]
        name, unit = KEYWORDS.get(talker, (talker, ""))
        values: dict = {}
        for index, part in enumerate(parts[1:], start=1):
            try:
                values[f"{name}.{index}"] = float(part)
            except ValueError:
                values[f"{name}.{index}"] = part
        return Record(keyword=talker, name=name, unit=unit, values=values)

    @staticmethod
    def _xor(text: str) -> int:
        result = 0
        for ch in text:
            result ^= ord(ch)
        return result
`;
  } else if (isSpaced) {
    classDoc = `定长文本记录。以行首两字符标识记录类型，后续为以空格分隔的定宽字段。`;
    parseBody = `    def _parse_line(self, line: str) -> Record | None:
        if not line:
            return None
        record_type = line[:2]
        fields = line[2:].split()
        name, unit = KEYWORDS.get(record_type, (record_type, ""))
        values: dict = {}
        for index, part in enumerate(fields, start=1):
            if part == "-":
                # 占位符表示该字段当前无有效值，不要当成数值 0
                values[f"{name}.{index}"] = None
                continue
            try:
                values[f"{name}.{index}"] = float(part)
            except ValueError:
                values[f"{name}.{index}"] = part
        return Record(keyword=record_type, name=name, unit=unit, values=values)
`;
  } else if (isGroup) {
    classDoc = `分组文本协议。每个分组以 GRP0 开头，以 END 结束，组内字段以逗号分隔。`;
    parseBody = `    def _parse_line(self, line: str) -> Record | None:
        if not line:
            return None
        if line.startswith("GRP"):
            self._group = line
            return None
        if line == "END":
            group = self._group
            self._group = ""
            return Record(keyword=group, name=group, unit="", values={})
        keyword, _, rest = line.partition(":")
        if keyword not in KEYWORDS:
            return None
        name, unit = KEYWORDS[keyword]
        values: dict = {}
        for part in rest.split(","):
            part = part.strip()
            if not part:
                continue
            try:
                values[name] = float(part)
            except ValueError:
                values[name] = part
        return Record(keyword=keyword, name=name, unit=unit, values=values)
`;
  } else {
    classDoc = `「一问一答」文本协议。请求与响应都以关键字开头的文本行交互，以回车结束。`;
    parseBody = `    def _parse_line(self, line: str) -> Record | None:
        if not line:
            return None
        keyword, _, rest = line.partition(" ")
        if keyword not in KEYWORDS:
            return None
        name, unit = KEYWORDS[keyword]
        rest = rest.strip()
        values: dict = {}
        if rest:
            try:
                values[name] = float(rest)
            except ValueError:
                values[name] = rest
        return Record(keyword=keyword, name=name, unit=unit, values=values)
`;
  }

  const selfInit = isGroup ? '        self._group = ""\n' : "";
  // 示例报文在页面上以十六进制展示，运行时还原成 ASCII 文本
  const sampleExpr = `bytes.fromhex("${sampleHex.replace(/ /g, "")}").decode("ascii")`;

  return `"""${ex.slug} 记录解析器（Python 3.10+)

${docstring(ex.notes)}${classDoc}

本示例可直接解析协议页给出的示例报文：

    ${sampleHex}

运行：python ${ex.filename}
"""

from __future__ import annotations

from dataclasses import dataclass, field

${keywordsTable(ex)}
@dataclass
class Record:
    """解析出的一条记录。"""

    keyword: str
    name: str = ""
    unit: str = ""
    values: dict = field(default_factory=dict)


class RecordParser:
    """${ex.slug} 记录解析器。

    文本协议没有显式的帧长度，通常以回车作为一条记录的结束。
    这里按行归并，遇到不完整的行会保留在缓冲区里等待后续数据。
    """

    TERMINATOR = "${terminator}"

    def __init__(self) -> None:
        self._buf = ""
${selfInit}
    def feed(self, chunk: bytes | str) -> list[Record]:
        """喂入新数据，返回本次解析出的记录列表。"""
        if isinstance(chunk, (bytes, bytearray)):
            chunk = chunk.decode("ascii", errors="replace")
        self._buf += chunk

        records: list[Record] = []
        while True:
            idx = self._buf.find(self.TERMINATOR)
            if idx < 0:
                break
            line = self._buf[:idx]
            self._buf = self._buf[idx + len(self.TERMINATOR) :]
            record = self._parse_line(line)
            if record is not None:
                records.append(record)
        return records

${parseBody}
if __name__ == "__main__":
    # 自检：用协议页的示例报文验证解析器
    SAMPLE = ${sampleExpr}
    parser = RecordParser()
    records = parser.feed(SAMPLE)
    for record in records:
        print(f"{record.keyword}: {record.values}")
`;
}

/** HL7 v2 解析器 */
function genHl7(ex, sampleHex) {
  return `"""HL7 v2 通用解析器（Python 3.10+）

${docstring(ex.notes)}HL7 v2 的两个标志性控制字节：0x0D 作为段分隔符，0x1C 作为消息分隔符。
最常用的消息类型是 ORU^R01（观察结果），测量值承载在 OBX 段中。

本示例可直接解析协议页给出的示例报文：

    ${sampleHex}

运行：python ${ex.filename}
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Segment:
    """一个 HL7 段。"""

    name: str
    fields: list[str] = field(default_factory=list)

    def get(self, index: int) -> str:
        """按 1 起算的段内序号取字段，越界返回空串。"""
        if index < 1 or index > len(self.fields):
            return ""
        return self.fields[index - 1]


@dataclass
class Message:
    """一条 HL7 消息。"""

    segments: list[Segment] = field(default_factory=list)

    @property
    def observations(self) -> list[tuple[str, str, str, str]]:
        """提取所有 OBX 观察结果，返回 (标识, 值, 单位, 状态)。"""
        result = []
        for segment in self.segments:
            if segment.name != "OBX":
                continue
            result.append(
                (segment.get(3), segment.get(5), segment.get(6), segment.get(11))
            )
        return result


class Hl7Parser:
    """HL7 v2 消息解析器。

    段以 0x0D 分隔，收到 0x1C（消息结束符）时整条消息才完整。
    """

    def __init__(self, field_sep: str = "|") -> None:
        self._buf = ""
        self._field_sep = field_sep
        self._segments: list[Segment] = []

    def feed(self, chunk: bytes | str) -> list[Message]:
        """喂入新数据，返回本次解析出的完整消息列表。"""
        if isinstance(chunk, (bytes, bytearray)):
            chunk = chunk.decode("utf-8", errors="replace")
        self._buf += chunk

        messages: list[Message] = []
        while True:
            # 优先按消息分隔符 0x1C 切分
            end = self._buf.find("\\x1c")
            if end >= 0:
                block, self._buf = self._buf[:end], self._buf[end + 1 :]
                message = self._parse_message(block)
                if message is not None:
                    messages.append(message)
                continue

            # 否则按段分隔符 0x0D 切分，段到齐就立即解析
            cr = self._buf.find("\\r")
            if cr < 0:
                break
            line, self._buf = self._buf[:cr], self._buf[cr + 1 :]
            segment = self._parse_segment(line)
            if segment is not None:
                self._segments.append(segment)

        return messages

    def _parse_message(self, block: str) -> Message | None:
        segments = list(self._segments)
        self._segments = []
        for line in block.split("\\r"):
            segment = self._parse_segment(line)
            if segment is not None:
                segments.append(segment)
        if not segments:
            return None
        return Message(segments=segments)

    def _parse_segment(self, line: str) -> Segment | None:
        if not line:
            return None
        parts = line.split(self._field_sep)
        name = parts[0]
        if not name or not name[0].isalpha():
            return None
        return Segment(name=name, fields=parts[1:])


if __name__ == "__main__":
    # 自检：用协议页的示例报文验证解析器
    # HL7 用 0x0D 分隔段、0x1C 分隔消息。示例报文只含段分隔符，
    # 采集端通常在收到消息结束符后才认为一条消息完整，
    # 因此这里在样例后补上 0x1C 来模拟完整的消息边界。
    SAMPLE = bytes.fromhex("${sampleHex.replace(/ /g, "")}").decode("utf-8") + "\\x1c"
    parser = Hl7Parser()
    messages = parser.feed(SAMPLE)
    assert len(messages) == 1, f"应解析出 1 条消息，实际 {len(messages)} 条"
    for message in messages:
        for segment in message.segments:
            print(f"{segment.name}: {segment.fields}")
        for name, value, unit, status in message.observations:
            print(f"观察结果 {name} = {value} {unit} (状态 {status})")
`;
}

// ---------------------------------------------------------------- 主流程

const { specs, examples } = loadMeta();

// 读取每个协议的示例报文
const sampleMap = new Map();
for (const file of ["src/data/protocols-monitor.ts", "src/data/protocols-anesthesia.ts"]) {
  const src = readFileSync(resolve(ROOT, file), "utf8");
  const re = /slug:\s*"([^"]+)"[\s\S]*?sampleHex:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) sampleMap.set(m[1], m[2]);
}

// ---- 自检：在 JS 里复算一遍解析结果，与参数表对照 -------------------------
//
// 目的：保证协议页「报文示例」表的逐段解读、Python 示例的参数表、
// 以及示例报文的实际字节三者一致。任何一处对不上，生成过程就会失败。

const parseHex = (s) =>
  s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((b) => parseInt(b, 16));

const intFromBytes = (buf, endian = "be") =>
  endian === "le"
    ? buf.reduce((acc, b, i) => acc + b * 2 ** (8 * i), 0)
    : buf.reduce((acc, b, i) => acc + b * 2 ** (8 * (buf.length - 1 - i)), 0);

/** 按布局解析数据区，返回 { 参数名: 工程值 } */
function decodeInJs(ex, layout, payload) {
  const values = {};
  if (!ex.params?.length) return values;

  let data = payload.slice(layout.skip);
  if (layout.countFirst) data = data.slice(1);

  const step = layout.idSize + layout.valueSize;
  const readInt = (buf, size, endian) => {
    if (size === 0) return 0;
    const bytes = buf.slice(0, size);
    return endian === "le"
      ? bytes.reduce((acc, b, i) => acc + b * 2 ** (8 * i), 0)
      : bytes.reduce((acc, b, i) => acc + b * 2 ** (8 * (size - 1 - i)), 0);
  };

  if (layout.fixedIds) {
    layout.fixedIds.forEach((paramId, index) => {
      const offset = index * layout.valueSize;
      if (offset + layout.valueSize > data.length) return;
      const raw = readInt(data.slice(offset), layout.valueSize, layout.valueEndian);
      const spec = ex.params.find((p) => p.id === paramId);
      if (spec) values[spec.name] = raw * spec.scale;
    });
    return values;
  }

  for (let offset = 0; offset + step <= data.length; offset += step) {
    const paramId = readInt(data.slice(offset), layout.idSize, layout.idEndian);
    const raw = readInt(data.slice(offset + layout.idSize), layout.valueSize, layout.valueEndian);
    const spec = ex.params.find((p) => p.id === paramId);
    if (spec) values[spec.name] = raw * spec.scale;
  }
  return values;
}

const problems = [];

for (const ex of examples) {
  const sampleHex = sampleMap.get(ex.slug);
  if (!sampleHex) {
    problems.push(`${ex.slug}: 找不到示例报文`);
    continue;
  }

  const layout = LAYOUTS[ex.payloadLayout];
  if (!layout) {
    problems.push(`${ex.slug}: 未知的数据区布局 ${ex.payloadLayout}`);
    continue;
  }

  if (!ex.params?.length) continue;

  const spec = specs[ex.kind];
  const bytes = parseHex(sampleHex);

  // 数据区起点与终点：与生成的解析器保持一致
  //   有长度字段时，长度字段计数的是「长度字段之后」的全部内容，
  //   因此负载区起点为长度字段末尾，skip 是相对该起点的偏移。
  let payloadStart = spec.payloadOffset;
  let payloadEnd;
  if (spec.lenSize !== undefined) {
    const lenEnd = spec.lenOffset + spec.lenSize;
    const raw = bytes.slice(spec.lenOffset, lenEnd);
    const length = spec.lenSize === 1 ? raw[0] : intFromBytes(raw, spec.lenEndian);
    payloadStart = lenEnd;
    payloadEnd = lenEnd + length;
  } else if (spec.checksum?.offset !== undefined) {
    payloadEnd = spec.checksum.offset;
  } else {
    payloadEnd = bytes.length - (spec.end?.length ?? 0);
  }
  const payload = bytes.slice(payloadStart, payloadEnd);

  const values = decodeInJs(ex, layout, payload);
  if (!Object.keys(values).length) {
    problems.push(`${ex.slug}: 数据区未解析出任何参数（布局或参数表不匹配）`);
  }
}
if (problems.length) {
  console.error("生成中止，以下协议的数据区与参数表不匹配：");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const sources = {};

for (const ex of examples) {
  const sampleHex = sampleMap.get(ex.slug);
  if (!sampleHex) throw new Error(`找不到示例报文: ${ex.slug}`);

  const spec = specs[ex.kind];
  if (!spec) throw new Error(`找不到帧结构定义: ${ex.kind}`);

  const textKinds = new Set([
    "key-value",
    "spaced-text",
    "nmea",
    "cmd-text",
    "group-text",
    "hl7",
  ]);

  const code = textKinds.has(ex.kind)
    ? genText(ex, sampleHex, ex.kind)
    : genBinary(ex, spec, sampleHex);

  sources[ex.slug] = { filename: ex.filename, code };
}

const entries = Object.entries(sources)
  .map(
    ([slug, v]) =>
      `  ${JSON.stringify(slug)}: {\n    filename: ${JSON.stringify(v.filename)},\n    code: ${JSON.stringify(v.code)},\n  },`,
  )
  .join("\n");

const out = `import type { PythonSource } from "./types";

/**
 * 各协议的 Python 帧解析示例源码。
 *
 * 本文件由 scripts/gen-python-examples.mjs 生成，请勿手工修改：
 *   node scripts/gen-python-examples.mjs
 *
 * 每份源码都对应协议页「帧格式」表的结构定义，并内置 demo 自检，
 * 可直接用协议页给出的示例报文运行验证。
 */
export const pythonSources: Record<string, PythonSource> = {
${entries}
};
`;

writeFileSync(resolve(ROOT, "src/data/python-sources.ts"), out, "utf8");
console.log(`已写入 src/data/python-sources.ts（${Object.keys(sources).length} 份）`);
