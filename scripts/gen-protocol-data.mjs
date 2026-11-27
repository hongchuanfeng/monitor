/**
 * 生成并校验各协议的示例报文。
 *
 * 运行：node scripts/gen-protocol-data.mjs            输出最终 sampleHex 与 decode 分段
 *       node scripts/gen-protocol-data.mjs --check    只校验（分段覆盖 + 校验和自洽）
 *
 * 帧布局模型
 * ----------
 *   frame = start + preLength + lenField + body + checksum + end
 *
 * 其中 lenField 的取值 = body 的字节数，即长度字段只计数「长度字段之后、校验之前」
 * 的负载区，不含长度字段本身、校验字节与帧尾定界符。
 */
import { rmSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CR_MARK, toMessage } from "./lib/text-display.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK_ONLY = process.argv.includes("--check");

// ---------------------------------------------------------------- 校验算法

const sum8 = (b) => b.reduce((a, x) => a + x, 0) & 0xff;
const xor8 = (b) => b.reduce((a, x) => a ^ x, 0);

function crc16Ccitt(data) {
  let crc = 0x0000;
  for (const b of data) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

const fmt = (b) => b.map((x) => x.toString(16).padStart(2, "0").toUpperCase()).join(" ");
const le16 = (v) => [v & 0xff, (v >> 8) & 0xff];
const be16 = (v) => [(v >> 8) & 0xff, v & 0xff];
const ascii = (s) => Array.from(Buffer.from(s, "ascii"));

// ---------------------------------------------------------------- 协议定义

const protocols = [];

/**
 * 二进制帧协议。
 * start      帧起始字节
 * preLength  长度字段之前的固定字节（如类型码、序号）
 * lenSize    长度字段字节数（0 表示无长度字段）
 * lenEndian  长度字段字节序
 * body       负载区
 * checksum   校验定义：kind / size / endian / coverStart（覆盖起始下标）
 * end        帧尾定界字节
 */
function binary({ slug, brand, title, start, preLength = [], lenSize = 0, lenEndian = "be", body, checksum, end = [], segments }) {
  protocols.push({
    slug,
    brand,
    title,
    kind: "binary",
    build() {
      const lenField =
        lenSize === 0
          ? []
          : lenSize === 1
            ? [body.length]
            : lenEndian === "le"
              ? le16(body.length)
              : be16(body.length);

      const frame = [...start, ...preLength, ...lenField, ...body];
      const csOffset = frame.length;
      const total = csOffset + checksum.size + end.length;

      let csBytes = [];
      if (checksum.kind === "none") {
        csBytes = [];
      } else if (checksum.kind === "sum8") {
        csBytes = [sum8(frame.slice(checksum.coverStart, csOffset))];
      } else if (checksum.kind === "xor8") {
        csBytes = [xor8(frame.slice(checksum.coverStart, csOffset))];
      } else {
        const crc = crc16Ccitt(frame.slice(checksum.coverStart, csOffset));
        csBytes = checksum.endian === "le" ? le16(crc) : be16(crc);
      }

      const full = [...frame, ...csBytes, ...end];
      return { frame: full, segments, csOffset, total };
    },
  });
}

/**
 * HL7 v2 消息。
 *
 * HL7 的消息结构是「段 + 字段」两层：段以 0x0D 结束，字段以竖线分隔，
 * 组件再以 ^ 分隔。因此这里按「段 -> 字段列表」描述，
 * 由本函数拼装出报文，并自动生成与字段一一对应的解码分段，
 * 避免手写偏移导致段与字节对不上。
 *
 * fields 数组的第一个元素固定为段类型名（MSH / OBX / PID ...），
 * 其余元素按顺序为该段的字段。
 *
 * 字段编号有个例外：MSH-1 本身就是字段分隔符竖线，
 * 它由 join 时插入的分隔符承担，因此 MSH 段 fields[1] 对应的是 MSH-2；
 * 其余段 fields[1] 对应字段 1。
 *
 * descs 为「字段编号 -> 中文说明」的映射，省略的字段使用自动生成的说明。
 */
function hl7({ slug, brand, title, segments }) {
  protocols.push({
    slug,
    brand,
    title,
    kind: "text",
    /** HL7 是文本协议，页面与样本包均以字符串形式展示报文 */
    isText: true,
    build() {
      // 每段都以 0x0D 结束，最后一段同样带段结束符
      const text = segments.map((seg) => `${seg.fields.join("|")}\r`).join("");

      const frame = ascii(text);
      const resolved = [];
      let cursor = 0;

      for (const seg of segments) {
        const parts = seg.fields;
        const isMsh = parts[0] === "MSH";
        // MSH 段的字段编号整体后移一位：MSH-1 是分隔符本身
        const fieldNo = (i) => (isMsh ? i + 1 : i);

        for (let i = 0; i < parts.length; i++) {
          const len = parts[i].length + (i < parts.length - 1 ? 1 : 0);
          if (len === 0) continue;

          let desc;
          if (i === 0) {
            desc = `段标识 ${parts[0]}${isMsh ? "，其后紧跟字段分隔符竖线 0x7C。" : "。"}`;
          } else if (parts[i] === "") {
            desc = `${parts[0]}-${fieldNo(i)}，留空。`;
          } else {
            desc = seg.descs?.[fieldNo(i)] ?? `${parts[0]}-${fieldNo(i)} 字段。`;
          }

          // 分段文本与十六进制一一对应：CR 在表格里显示为可见占位符 ␍
          const raw = text.slice(cursor, cursor + len);
          resolved.push({
            span: [cursor, cursor + len],
            desc,
            text: raw.replace(/\r/g, CR_MARK),
          });
          cursor += len;
        }

        // 段结束符 0x0D
        resolved.push({
          span: [cursor, cursor + 1],
          desc: `回车 0x0D，${parts[0]} 段结束。`,
          text: CR_MARK,
        });
        cursor += 1;
      }

      return {
        frame,
        segments: resolved,
        csOffset: null,
        total: null,
        /** 报文原文，供页面按字符串展示 */
        text: text,
        /** 多行展示文本，每个 HL7 段占一行 */
        display: toMessage(text),
      };
    },
  });
}

/**
 * 文本协议：整段字节按分隔符切分。
 * segments 用「标记 + 长度」描述，标记在正文中出现的位置即该段的起点，
 * 长度缺省表示「到下一个标记之前」。这样可以避免手写偏移导致错位。
 */
function text({ slug, brand, title, body, segments }) {
  protocols.push({
    slug,
    brand,
    title,
    kind: "text",
    build() {
      const frame = ascii(body);
      const resolved = [];
      let cursor = 0;
      for (const s of segments) {
        const idx = body.indexOf(s.mark, cursor);
        if (idx < 0) throw new Error(`${slug}: 找不到标记 ${JSON.stringify(s.mark)}`);
        if (idx !== cursor) {
          throw new Error(
            `${slug}: 标记 ${JSON.stringify(s.mark)} 位置 ${idx} 与预期 ${cursor} 不符`,
          );
        }
        const len = s.len ?? 0;
        resolved.push({ span: [idx, idx + len], desc: s.desc });
        cursor = idx + len;
      }
      return { frame, segments: resolved, csOffset: null, total: null };
    },
  });
}

// ---- 监护仪 ---------------------------------------------------------------

binary({
  slug: "philips-intellivue-rs232",
  brand: "Philips",
  title: "IntelliVue",
  start: [0x0b],
  preLength: [0x02, 0x00, 0x1f],
  lenSize: 2,
  body: [0x00, 0x03, 0x00, 0x5a, 0x00, 0x04, 0x00, 0x62],
  checksum: { kind: "sum8", size: 1, coverStart: 1 },
  end: [0x0d],
  segments: [
    { span: [0, 1], desc: "STX，帧开始，固定 0x0B。" },
    { span: [1, 2], desc: "帧类型 0x02，代表实时测量数据帧。" },
    { span: [2, 4], desc: "序号 31，上位机应答时需原样回填该值。" },
    { span: [4, 6], desc: "负载长度 8 字节，随后应读取 8 字节内容。" },
    { span: [6, 8], desc: "参数 ID 0x0003，对应心率测量项。" },
    { span: [8, 10], desc: "心率原始值 0x005A，即 90 bpm。" },
    { span: [10, 12], desc: "参数 ID 0x0004，对应血氧饱和度。" },
    { span: [12, 14], desc: "血氧原始值 0x0062，即 98 %。" },
    { span: [14, 15], desc: "校验和，帧类型至负载区末字节的累加和低 8 位。" },
    { span: [15, 16], desc: "ETX，帧结束，固定 0x0D。" },
  ],
});

binary({
  slug: "philips-capsule",
  brand: "Philips",
  title: "Capsule",
  start: [0x52, 0x01],
  body: [0, 0, 0, 0, 0, 0, 0, 0, 0x03, 0x01, 0x00, 0x00, 0x9a, 0x44, 0x94, 0x01, 0x1f, 0x03],
  checksum: { kind: "none", size: 0, coverStart: 0 },
  segments: [
    { span: [0, 2], desc: "记录头 0x52 0x01，标志位与记录类型（波形记录）合并编码。" },
    { span: [2, 10], desc: "时间戳 8 字节，小端序，本例为零值表示尚未同步时钟。" },
    { span: [10, 14], desc: "设备 ID，小端序，标识为 0x00000103 号模块。" },
    { span: [14, 16], desc: "参数 ID 0x449A，小端序。" },
    { span: [16, 18], desc: "参数值 0x0194，小端序，按比例因子 0.1 换算为 40.4 ms。" },
    { span: [18, 19], desc: "信号质量指标。" },
    { span: [19, 20], desc: "记录状态标志。" },
  ],
});

text({
  slug: "ge-carescape-b650",
  brand: "GE Healthcare",
  title: "CARESCAPE",
  body: "ECGR:72\rSPO2:98\r",
  segments: [
    { mark: "ECGR", len: 4, desc: "关键字 ECGR，对应 ECG 相关记录。" },
    { mark: ":", len: 1, desc: "分隔符冒号 0x3A。" },
    { mark: "72", len: 2, desc: "值为 ASCII \"72\"，表示心率 72 bpm。" },
    { mark: "\r", len: 1, desc: "回车 0x0D，本条记录结束。" },
    { mark: "SPO2", len: 4, desc: "关键字 SPO2，对应血氧饱和度记录。" },
    { mark: ":", len: 1, desc: "分隔符冒号。" },
    { mark: "98", len: 2, desc: "值为 ASCII \"98\"，表示血氧 98 %。" },
    { mark: "\r", len: 1, desc: "回车 0x0D，记录结束。" },
  ],
});

hl7({
  slug: "mindray-benevision-n22",
  brand: "Mindray（迈瑞）",
  title: "BeneVision N",
  segments: [
    {
      fields: [
        "MSH",
        "^~\\&",
        "MINDRAY",
        "BENEVISION N22",
        "MEDCOLLECTOR",
        "",
        "20261126120000",
        "",
        "ORU^R01",
        "1",
        "P",
        "2.5",
      ],
      descs: {
        2: "MSH-2 编码字符集 ^~\\&，表示 UTF-8（Unicode 2.2）。",
        3: "MSH-3 发送方应用 MINDRAY，标识数据来自迈瑞监护仪。",
        4: "MSH-4 发送方设施 BENEVISION N22，标识具体设备型号与床位。",
        5: "MSH-5 接收方应用 MEDCOLLECTOR，标识本条消息发往的采集端。",
        6: "MSH-6 接收方设施，此处留空。",
        7: "MSH-7 消息时间 20261126120000。",
        8: "MSH-8 安全信息，此处留空。",
        9: "MSH-9 消息类型 ORU^R01，监护机数据以观察结果形式上报。",
        10: "MSH-10 控制编号 1，用于消息去重与 ACK 配对。",
        11: "MSH-11 处理标识 P，表示消息为生产环境数据。",
        12: "MSH-12 版本号 2.5。",
      },
    },    {
      fields: ["PID", "1", "", "P000098^^^HOSPITAL", "", "MRN2026112601^^^HOSPITAL", "", "19850612", "M"],
      descs: {
        1: "PID-1 集合序号 1。",
        2: "PID-2 患者标识列表，此处留空。",
        3: "PID-3 患者标识列表 P000098^^^HOSPITAL，首段为院内患者编号。",
        4: "PID-4 患者姓名，此处留空。",
        5: "PID-5 病人标识列表 MRN2026112601^^^HOSPITAL，院方病案号。",
        6: "PID-6 母亲姓名，此处留空。",
        7: "PID-7 出生日期 19850612。",
        8: "PID-8 患者性别 M。",
      },
    },
    {
      fields: ["OBR", "1", "ORD2026112601", "P000098", "HR^Heart Rate^LN", "", "", "", "20261126120000"],
      descs: {
        1: "OBR-1 集合序号 1。",
        2: "OBR-2 placer 订单号，由采集端分配。",
        3: "OBR-3 filler 订单号，此处填入患者编号便于回溯。",
        4: "OBR-4 通用检验标识 HR^Heart Rate^LN，给出本次上报的观察项。",
        5: "OBR-5 优先级，此处留空。",
        6: "OBR-6 请求日期时间，此处留空。",
        7: "OBR-7 观察日期时间，此处留空。",
        8: "OBR-8 观察结束时间 20261126120000。",
      },
    },
    {
      fields: ["OBX", "1", "NM", "8867-4^Heart rate^LN", "", "72", "bpm", "", "", "", "", "F"],
      descs: {
        1: "OBX-1 序号 1。",
        2: "OBX-2 值类型 NM，表示数值型。",
        3: "OBX-3 观察标识 8867-4^Heart rate^LN，首段为 LOINC 编码。",
        4: "OBX-4 观察值子标识，此处留空。",
        5: "OBX-5 观察值 72。",
        6: "OBX-6 单位 bpm。",
        7: "OBX-7 参考范围下限，此处留空。",
        8: "OBX-8 参考范围上限，此处留空。",
        9: "OBX-9 异常标志，此处留空。",
        10: "OBX-10 异常性质，此处留空。",
        11: "OBX-11 观察结果状态 F，表示最终结果。",
      },
    },
    {
      fields: ["OBX", "2", "NM", "2708-6^SpO2^LN", "", "98", "%", "", "", "", "", "F"],
      descs: {
        1: "OBX-1 序号 2。",
        2: "OBX-2 值类型 NM。",
        3: "OBX-3 观察标识 2708-6^SpO2^LN，LOINC 编码 2708-6。",
        4: "OBX-4 观察值子标识，此处留空。",
        5: "OBX-5 观察值 98。",
        6: "OBX-6 单位 %。",
        7: "OBX-7 至 OBX-10 留空。",
        11: "OBX-11 观察结果状态 F。",
      },
    },
    {
      fields: ["OBX", "3", "NM", "9279-1^Respiratory rate^LN", "", "16", "/min", "", "", "", "", "F"],
      descs: {
        1: "OBX-1 序号 3。",
        2: "OBX-2 值类型 NM。",
        3: "OBX-3 观察标识 9279-1^Respiratory rate^LN，LOINC 编码 9279-1。",
        4: "OBX-4 观察值子标识，此处留空。",
        5: "OBX-5 观察值 16。",
        6: "OBX-6 单位 /min。",
        7: "OBX-7 至 OBX-10 留空。",
        11: "OBX-11 观察结果状态 F。",
      },
    },
  ],
});

binary({
  slug: "mindray-beneheart-d6",
  brand: "Mindray（迈瑞）",
  title: "BeneHeart D6",
  start: [0x7e],
  lenSize: 1,
  body: [0x00, 0x21, 0x01, 0x01, 0x40, 0x01, 0x96, 0x00, 0x8c, 0x00],
  checksum: { kind: "crc16-ccitt", size: 2, endian: "le", coverStart: 1 },
  end: [0x7e],
  segments: [
    { span: [0, 1], desc: "起始符 0x7E。" },
    { span: [1, 2], desc: "数据区长度 10 字节。" },
    { span: [2, 3], desc: "控制字段 0x00。" },
    { span: [3, 4], desc: "命令码 0x21，对应心电测量结果。" },
    { span: [4, 5], desc: "导联组编号 1。" },
    { span: [5, 6], desc: "导联序号 1。" },
    { span: [6, 8], desc: "PR 间期 0x0140，小端序，即 320 ms。" },
    { span: [8, 10], desc: "QRS 时限 0x0096，即 150 ms。" },
    { span: [10, 12], desc: "QT 间期 0x008C，即 140 ms。" },
    { span: [12, 14], desc: "CRC16 校验值，小端序。" },
    { span: [14, 15], desc: "结束符 0x7E。" },
  ],
});

text({
  slug: "drager-infinity-plus",
  brand: "Dräger",
  title: "Infinity NMEA",
  body: "$PWER,0,1*11\r\n",
  segments: [
    { mark: "$", len: 1, desc: "起始符 $ 0x24。" },
    { mark: "PWER", len: 4, desc: "语句标识 PWER，对应电源与状态类语句。" },
    { mark: ",", len: 1, desc: "字段分隔逗号。" },
    { mark: "0", len: 1, desc: "字段 1，电源状态 0。" },
    { mark: ",", len: 1, desc: "字段分隔逗号。" },
    { mark: "1", len: 1, desc: "字段 2，运行状态 1。" },
    { mark: "*", len: 1, desc: "星号 0x2A，其后为校验和。" },
    { mark: "11", len: 2, desc: "校验和 0x11，为 $ 与 * 之间所有字符的异或。" },
    { mark: "\r\n", len: 2, desc: "回车换行，语句结束。" },
  ],
});

text({
  slug: "nihon-kohden-icm53",
  brand: "Nihon Kohden（日光电子）",
  title: "iCM 中央站",
  body: "S02 098 100 -\r",
  segments: [
    { mark: "S02", len: 3, desc: "记录类型 S02，对应一类监护测量记录。" },
    { mark: " ", len: 1, desc: "字段分隔空格。" },
    { mark: "098", len: 3, desc: "数值字段 098。" },
    { mark: " ", len: 1, desc: "字段分隔空格。" },
    { mark: "100", len: 3, desc: "数值字段 100。" },
    { mark: " ", len: 1, desc: "字段分隔空格。" },
    { mark: "-", len: 1, desc: "短横线，标记该字段当前无有效值。" },
    { mark: "\r", len: 1, desc: "回车 0x0D，记录结束。" },
  ],
});

binary({
  slug: "masimo-radical7",
  brand: "Masimo",
  title: "Radical-7",
  start: [0x4d, 0x53],
  body: [0x01, 0x01, 0x12, 0x00, 0x5a],
  checksum: { kind: "xor8", size: 1, coverStart: 0 },
  segments: [
    { span: [0, 2], desc: "帧头 MS（ASCII 0x4D 0x53）。" },
    { span: [2, 3], desc: "块类型 0x01，代表测量数据块。" },
    { span: [3, 4], desc: "本块包含 1 个参数。" },
    { span: [4, 5], desc: "参数 ID 0x12，指明后续数值采用双字节无符号编码。" },
    { span: [5, 7], desc: "参数值 0x005A，即 90，表示血氧饱和度 90 %。" },
    { span: [7, 8], desc: "异或校验值，覆盖帧头至最后一个数值字节。" },
  ],
});

binary({
  slug: "edwards-lifesciences-cles5000",
  brand: "Edwards Lifesciences",
  title: "CLES5000",
  start: [0xaa, 0x55],
  body: [0x01, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  checksum: { kind: "none", size: 0, coverStart: 0 },
  segments: [
    { span: [0, 2], desc: "同步头 0xAA 0x55。" },
    { span: [2, 3], desc: "记录类型 0x01，连续测量记录。" },
    { span: [3, 7], desc: "时间戳，小端序，设备内部相对计数。" },
    { span: [7, 8], desc: "本帧包含 1 个参数。" },
    { span: [8, 10], desc: "参数 ID 0x0000，小端序。" },
    { span: [10, 14], desc: "参数值 0，为该示例中的占位值（定点数，比例因子 0.001）。" },
  ],
});

binary({
  slug: "bionet-biovision",
  brand: "Bionet",
  title: "BioVision",
  start: [0x55, 0xaa],
  lenSize: 1,
  body: [0x05, 0x00, 0x00, 0x00, 0x64, 0x01, 0x00],
  checksum: { kind: "sum8", size: 1, coverStart: 2 },
  segments: [
    { span: [0, 2], desc: "帧头 0x55 0xAA。" },
    { span: [2, 3], desc: "数据区长度 7 字节，计数到校验字节之前。" },
    { span: [3, 4], desc: "通道号 5。" },
    { span: [4, 6], desc: "参数编号 0x0000，对应心率测量项。" },
    { span: [6, 8], desc: "参数值 0x0064，即 100 bpm。" },
    { span: [8, 9], desc: "状态标志 0x01。" },
    { span: [9, 10], desc: "保留字段。" },
    { span: [10, 11], desc: "累加和校验，取低 8 位。" },
  ],
});
binary({
  slug: "comen-medicus",
  brand: "Comen（科曼）",
  title: "Medicus",
  start: [0xaa],
  preLength: [0x01],
  lenSize: 1,
  body: [0x48, 0x52, 0x3d, 0x37, 0x32],
  checksum: { kind: "crc16-ccitt", size: 2, endian: "le", coverStart: 1 },
  segments: [
    { span: [0, 1], desc: "帧头 0xAA。" },
    { span: [1, 2], desc: "类型码 0x01。" },
    { span: [2, 3], desc: "负载长度 5 字节。" },
    { span: [3, 6], desc: "负载中的 ASCII 片段 \"HR=\"。" },
    { span: [6, 8], desc: "ASCII 数值 72，即心率 72 bpm。" },
    { span: [8, 10], desc: "CRC16 校验值，小端序。" },
  ],
});

binary({
  slug: "biolight-monitor",
  brand: "Biolight（普门科技）",
  title: "iPM 监护",
  start: [0xbd, 0xbd],
  preLength: [0x01],
  lenSize: 2,
  body: [0x00, 0x01, 0x00, 0x01, 0x02, 0x48],
  checksum: { kind: "crc16-ccitt", size: 2, endian: "le", coverStart: 2 },
  segments: [
    { span: [0, 2], desc: "帧头 0xBD 0xBD。" },
    { span: [2, 3], desc: "消息类型 0x01，实时数据推送。" },
    { span: [3, 5], desc: "负载长度 6 字节，含设备标识与参数块。" },
    { span: [5, 7], desc: "设备标识 0x0001。" },
    { span: [7, 9], desc: "参数编号 0x0001，对应心率测量项。" },
    { span: [9, 11], desc: "参数原始值 0x0248，按比例因子 0.1 换算为 58.4 bpm。" },
    { span: [11, 13], desc: "CRC16 校验值，小端序。" },
  ],
});

binary({
  slug: "mindray-passport-i8",
  brand: "Mindray（迈瑞）",
  title: "Passport i8",
  start: [0x7e],
  lenSize: 1,
  body: [0x01, 0x11, 0x01, 0x00, 0x64, 0x00],
  checksum: { kind: "crc16-ccitt", size: 2, endian: "le", coverStart: 1 },
  end: [0x7e],
  segments: [
    { span: [0, 1], desc: "起始符 0x7E。" },
    { span: [1, 2], desc: "数据区长度 6 字节。" },
    { span: [2, 3], desc: "控制字段 0x01。" },
    { span: [3, 4], desc: "命令码 0x11，对应参数订阅。" },
    { span: [4, 6], desc: "参数编号 0x0001，小端序，对应心率测量项。" },
    { span: [6, 8], desc: "参数原始值 0x0064，小端序，即 100 bpm。" },
    { span: [8, 10], desc: "CRC16 校验值，小端序。" },
    { span: [10, 11], desc: "结束符 0x7E。" },
  ],
});

text({
  slug: "b-braun-monitoring",
  brand: "B. Braun（贝朗）",
  title: "生命体征模块",
  body: "ECGR:72\rSPO2:98\rTEMP:36.8\r",
  segments: [
    { mark: "ECGR", len: 4, desc: "关键字 ECGR，对应 ECG 心率记录。" },
    { mark: ":", len: 1, desc: "冒号分隔符。" },
    { mark: "72", len: 2, desc: "数值 72，表示心率 72 bpm。" },
    { mark: "\r", len: 1, desc: "回车，本行结束。" },
    { mark: "SPO2", len: 4, desc: "关键字 SPO2，对应血氧饱和度记录。" },
    { mark: ":", len: 1, desc: "冒号分隔符。" },
    { mark: "98", len: 2, desc: "数值 98，表示血氧 98 %。" },
    { mark: "\r", len: 1, desc: "回车，本行结束。" },
    { mark: "TEMP", len: 4, desc: "关键字 TEMP，对应体温记录。" },
    { mark: ":", len: 1, desc: "冒号分隔符。" },
    { mark: "36.8", len: 4, desc: "数值 36.8，对应体温 36.8 °C。" },
    { mark: "\r", len: 1, desc: "回车，记录结束。" },
  ],
});

// ---- 麻醉机 ---------------------------------------------------------------

binary({
  slug: "drager-perseus-a500",
  brand: "Dräger",
  title: "Perseus A500",
  start: [0x02],
  preLength: [0x01],
  lenSize: 2,
  body: [0x00, 0x01, 0x00, 0x00, 0x01, 0xf4, 0x00, 0x02, 0x00, 0x00, 0x00, 0x0c],
  checksum: { kind: "sum8", size: 1, coverStart: 1 },
  end: [0x03],
  segments: [
    { span: [0, 1], desc: "帧起始 0x02。" },
    { span: [1, 2], desc: "帧类型 0x01，参数上报帧。" },
    { span: [2, 4], desc: "数据区长度 12 字节。" },
    { span: [4, 6], desc: "参数标识 0x0001，对应潮气量 VT。" },
    { span: [6, 10], desc: "参数值 500 mL。" },
    { span: [10, 12], desc: "参数标识 0x0002，对应呼吸频率 RR。" },
    { span: [12, 16], desc: "参数值 12 bpm。" },
    { span: [16, 17], desc: "累加校验，覆盖帧类型至数据区末尾。" },
    { span: [17, 18], desc: "帧结束 0x03。" },
  ],
});

text({
  slug: "ge-datex-ohmeda-aestiva",
  brand: "GE Healthcare",
  title: "Aestiva",
  body: "VENTMODE:PCV\rVT:500\r",
  segments: [
    { mark: "VENTMODE", len: 8, desc: "关键字 VENTMODE，对应通气模式记录。" },
    { mark: ":", len: 1, desc: "冒号分隔符。" },
    { mark: "PCV", len: 3, desc: "值为 ASCII \"PCV\"，表示压力控制通气。" },
    { mark: "\r", len: 1, desc: "回车，本行结束。" },
    { mark: "VT", len: 2, desc: "下一行关键字 VT，对应潮气量。" },
    { mark: ":", len: 1, desc: "冒号分隔符。" },
    { mark: "500", len: 3, desc: "值为 ASCII \"500\"，对应潮气量 500 mL。" },
    { mark: "\r", len: 1, desc: "回车，记录结束。" },
  ],
});

binary({
  slug: "mindray-wato-ex65",
  brand: "Mindray（迈瑞）",
  title: "WATO EX",
  start: [0x7e],
  lenSize: 1,
  body: [0x00, 0x21, 0x03, 0x01, 0x00, 0xf4, 0x01, 0x00, 0x08, 0x1e, 0x00, 0x00, 0x1a, 0x0a, 0x00],
  checksum: { kind: "crc16-ccitt", size: 2, endian: "le", coverStart: 1 },
  end: [0x7e],
  segments: [
    { span: [0, 1], desc: "起始符 0x7E。" },
    { span: [1, 2], desc: "数据区长度 15 字节。" },
    { span: [2, 3], desc: "控制字段 0x00，请求方向。" },
    { span: [3, 4], desc: "命令码 0x21，通气参数上报。" },
    { span: [4, 5], desc: "参数个数 3。" },
    { span: [5, 7], desc: "参数编号 0x0001，小端序，对应潮气量 VT。" },
    { span: [7, 9], desc: "参数值 500 mL。" },
    { span: [9, 11], desc: "参数编号 0x0800，小端序，对应呼吸频率 RR。" },
    { span: [11, 13], desc: "参数值 30 bpm。" },
    { span: [13, 15], desc: "参数编号 0x1A00，小端序，对应气道峰压 Ppeak。" },
    { span: [15, 17], desc: "参数值 10 cmH₂O。" },
    { span: [17, 19], desc: "CRC16 校验值，小端序。" },
    { span: [19, 20], desc: "结束符 0x7E。" },
  ],
});

text({
  slug: "nihon-kohden-anesthesia",
  brand: "Nihon Kohden（日光电子）",
  title: "麻醉机中央站",
  body: "V01 PCV 08 500\r",
  segments: [
    { mark: "V01", len: 3, desc: "记录类型 V01，对应通气模式记录。" },
    { mark: " ", len: 1, desc: "字段分隔空格。" },
    { mark: "PCV", len: 3, desc: "文本字段 PCV，表示压力控制通气。" },
    { mark: " ", len: 1, desc: "字段分隔空格。" },
    { mark: "08", len: 2, desc: "数值字段 08，呼吸频率。" },
    { mark: " ", len: 1, desc: "字段分隔空格。" },
    { mark: "500", len: 3, desc: "数值字段 500，潮气量。" },
    { mark: "\r", len: 1, desc: "回车 0x0D，记录结束。" },
  ],
});

binary({
  slug: "hamilton-c6",
  brand: "Hamilton Medical",
  title: "C6",
  start: [0x02],
  lenSize: 2,
  body: [0x00, 0x33, 0x01, 0x3c, 0x00, 0x0a, 0x00, 0x1f, 0x00, 0x1e, 0x00],
  checksum: { kind: "sum8", size: 1, coverStart: 1 },
  end: [0x03],
  segments: [
    { span: [0, 1], desc: "帧起始 0x02。" },
    { span: [1, 3], desc: "数据区长度 11 字节。" },
    { span: [3, 5], desc: "命令标识 0x3300，实时监视类命令。" },
    { span: [5, 6], desc: "数据区子类型 0x01，表示参数上报。" },
    { span: [6, 8], desc: "参数标识 0x003C，小端序，对应潮气量 Vte。" },
    { span: [8, 10], desc: "参数值 10 mL。" },
    { span: [10, 12], desc: "参数标识 0x001F，小端序，对应总呼吸频率 fTotal。" },
    { span: [12, 14], desc: "参数值 30 bpm。" },
    { span: [14, 15], desc: "累加校验值。" },
    { span: [15, 16], desc: "帧结束 0x03。" },
  ],
});

text({
  slug: "maquet-servona",
  brand: "MAQUET (Getinge)",
  title: "Servona",
  body: "VENT PCV\rFREQ 08\r",
  segments: [
    { mark: "VENT", len: 4, desc: "关键字 VENT，对应通气参数记录。" },
    { mark: " ", len: 1, desc: "空格分隔。" },
    { mark: "PCV", len: 3, desc: "文本字段 PCV，表示压力控制通气。" },
    { mark: "\r", len: 1, desc: "回车，本行结束。" },
    { mark: "FREQ", len: 4, desc: "下一行关键字 FREQ，对应频率记录。" },
    { mark: " ", len: 1, desc: "空格分隔。" },
    { mark: "08", len: 2, desc: "数值 08，对应呼吸频率 8 bpm。" },
    { mark: "\r", len: 1, desc: "回车，记录结束。" },
  ],
});

text({
  slug: "getinge-erva",
  brand: "Getinge",
  title: "ERVA",
  body: "GRP0VENT:PCV\rEND",
  segments: [
    { mark: "GRP0", len: 4, desc: "分组标签 GRP0，标识后续数据为一个数据组。" },
    { mark: "VENT", len: 4, desc: "组内首个字段关键字 VENT。" },
    { mark: ":", len: 1, desc: "冒号分隔符。" },
    { mark: "PCV", len: 3, desc: "字段值 PCV，表示压力控制通气。" },
    { mark: "\r", len: 1, desc: "回车，字段行结束。" },
    { mark: "END", len: 3, desc: "分组结束标记 END。" },
  ],
});

binary({
  slug: "tecno-anesthesia",
  brand: "Tecno (SEEM)",
  title: "Tecno / SEEM",
  start: [0x3c, 0x3c],
  preLength: [0x02],
  lenSize: 1,
  body: [0x00, 0x01, 0x00, 0x00, 0x01, 0xf4],
  checksum: { kind: "crc16-ccitt", size: 2, endian: "le", coverStart: 2 },
  segments: [
    { span: [0, 2], desc: "帧起始定界符 «»（0x3C 0x3C）。" },
    { span: [2, 3], desc: "记录类型 0x02，参数记录。" },
    { span: [3, 4], desc: "负载长度 6 字节。" },
    { span: [4, 6], desc: "参数编号 0x0001。" },
    { span: [6, 10], desc: "参数值 500。" },
    { span: [10, 12], desc: "CRC16 校验值，小端序。" },
  ],
});

binary({
  slug: "biolight-ventilator",
  brand: "Biolight（普门科技）",
  title: "VG 呼吸机",
  start: [0xbd, 0xbd],
  preLength: [0x01],
  lenSize: 2,
  body: [0x00, 0x02, 0x00, 0x02, 0x01, 0x2c],
  checksum: { kind: "crc16-ccitt", size: 2, endian: "le", coverStart: 2 },
  segments: [
    { span: [0, 2], desc: "帧头 0xBD 0xBD。" },
    { span: [2, 3], desc: "消息类型 0x01，实时数据推送。" },
    { span: [3, 5], desc: "负载长度 6 字节。" },
    { span: [5, 7], desc: "设备标识 0x0002。" },
    { span: [7, 9], desc: "参数编号 0x0002，对应分钟通气量 MV。" },
    { span: [9, 11], desc: "参数原始值 0x012C，按比例因子 0.1 换算为 30.0 L/min。" },
    { span: [11, 13], desc: "CRC16 校验值，小端序。" },
  ],
});

hl7({
  slug: "drager-perseus-hl7",
  brand: "Dräger",
  title: "HL7 v2 通用",
  segments: [
    {
      fields: [
        "MSH",
        "^~\\&",
        "MIDDLEWARE",
        "CENTRAL",
        "",
        "",
        "20261126120000",
        "",
        "ORU^R01",
        "1",
        "P",
        "2.5",
      ],
      descs: {
        2: "MSH-2 编码字符集 ^~\\&，表示 UTF-8（Unicode 2.2）。",
        3: "MSH-3 发送方应用 MIDDLEWARE，标识数据来自中间件。",
        4: "MSH-4 发送方设施 CENTRAL，标识本条消息发往的目标系统。",
        5: "MSH-5 接收方应用，此处留空。",
        6: "MSH-6 接收方设施，此处留空。",
        7: "MSH-7 消息时间 20261126120000。",
        8: "MSH-8 安全信息，此处留空。",
        9: "MSH-9 消息类型 ORU^R01。",
        10: "MSH-10 控制编号 1。",
        11: "MSH-11 处理标识 P。",
        12: "MSH-12 版本号 2.5。",
      },
    },
    {
      fields: ["OBX", "1", "NM", "HR^Heart Rate", "", "60", "bpm", "", "", "", "", "F"],
      descs: {
        1: "OBX-1 序号 1。",
        2: "OBX-2 值类型 NM 表示数值。",
        3: "OBX-3 观察标识 HR^Heart Rate。",
        4: "OBX-4 观察值子标识，此处留空。",
        5: "OBX-5 观察值 60。",
        6: "OBX-6 单位 bpm。",
        7: "OBX-7 至 OBX-10 留空。",
        11: "OBX-11 观察结果状态 F，表示最终结果。",
      },
    },
  ],
});

// ---------------------------------------------------------------- 执行

let problems = 0;
const results = [];

for (const p of protocols) {
  const { frame, segments, text, display } = p.build();
  const issues = [];

  // 分段必须连续且完整覆盖整帧
  let cursor = 0;
  for (const s of segments) {
    if (s.span[0] !== cursor) {
      issues.push(`分段不连续：期望从 ${cursor} 开始，实际 ${s.span[0]}`);
      cursor = s.span[0];
    }
    cursor = s.span[1];
  }
  if (cursor !== frame.length) {
    issues.push(`分段未覆盖整帧：覆盖到 ${cursor}，帧长 ${frame.length}`);
  }

  // 文本协议的报文原文必须与字节流一致
  if (text !== undefined) {
    if (Buffer.from(text, "ascii").length !== frame.length) {
      issues.push(
        `报文原文长度与字节流不一致：原文 ${Buffer.from(text, "ascii").length} 字节，字节流 ${frame.length} 字节`,
      );
    }
  }

  if (issues.length) {
    problems++;
    console.log(`\n[问题] ${p.slug}`);
    for (const i of issues) console.log(`   - ${i}`);
  }

  results.push({
    slug: p.slug,
    brand: p.brand,
    title: p.title,
    frame,
    segments,
    text,
    display,
  });
}

if (!CHECK_ONLY) {
  const out = [];
  for (const r of results) {
    out.push(`### ${r.slug}  (${r.brand} ${r.title})`);
    out.push(`  sampleHex: "${fmt(r.frame)}"`);
    // 文本协议额外给出可读的报文原文，页面与样本包据此按字符串展示
    if (r.text !== undefined) {
      out.push(`  sampleText: ${JSON.stringify(r.text)}`);
      out.push(`  sampleDisplay: ${JSON.stringify(r.display)}`);
    }
    for (const s of r.segments) {
      const bytes = r.frame.slice(s.span[0], s.span[1]);
      const textField =
        s.text === undefined ? "" : `, text: ${JSON.stringify(s.text)}`;
      out.push(
        `    { hex: "${fmt(bytes)}", desc: ${JSON.stringify(s.desc)}${textField} },`,
      );
    }
    out.push("");
  }
  const target = resolve(ROOT, "scripts/.protocol-samples.txt");
  writeFileSync(target, out.join("\n"), "utf8");
  console.log(`已写入 ${target}`);
}

console.log(`\n共 ${results.length} 个协议，${problems} 个分段存在问题。`);
process.exit(problems ? 1 : 0);
