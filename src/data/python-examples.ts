import type { Protocol } from "./types";

/**
 * Python 帧解析示例的元信息。
 *
 * 每个协议对应一种帧族（frame family）。同一帧族的多个设备共用同一个解析器模板，
 * 差异体现在参数表与命令码上。这样既能保证示例与「帧格式」表严格一致，
 * 又避免为 24 个协议维护 24 份几乎重复的代码。
 */
export type PythonFrameKind =
  /** 0x0B 起止、长度字段 + 累加和校验（Philips IntelliVue） */
  | "intellivue"
  /** 0x7E 起止、长度字段 + CRC16（迈瑞 BeneVision / BeneHeart / WATO / Passport） */
  | "mindray"
  /** 0xBD 0xBD 起、长度字段 + CRC16（普门 Biolight） */
  | "biolight"
  /** 0xAA 起、长度字段 + CRC16（Comen Medicus） */
  | "comen"
  /** 0x02 起止、类型码 + 长度字段 + 累加和（Dräger Perseus） */
  | "drager-perseus"
  /** 0x02 起止、长度字段 + 命令标识 + 累加和（Hamilton） */
  | "hamilton"
  /** 0x55 0xAA 起、长度字段 + 累加和（Bionet BioVision） */
  | "bionet"
  /** 0x02 0x02 起、长度字段 + CRC16（Tecno / SEEM） */
  | "tecno"
  /** 0xAA 0x55 同步头、定长（Edwards CLES5000） */
  | "edwards"
  /** 0x4D 0x53 起、异或校验（Masimo Radical） */
  | "masimo"
  /** 0x52 0x01 起、定长（Philips Capsule） */
  | "capsule"
  /** 关键字:值 文本协议（GE CARESCAPE / Aestiva / B.Braun） */
  | "key-value"
  /** 关键字 空格 文本协议（Nihon Kohden） */
  | "spaced-text"
  /** NMEA 语句（Dräger Infinity） */
  | "nmea"
  /** 命令-应答文本协议（MAQUET Servona） */
  | "cmd-text"
  /** 分组文本协议（Getinge ERVA） */
  | "group-text"
  /** HL7 v2 消息（多品牌通用） */
  | "hl7";

export type PythonExample = {
  /** 协议 slug，与 src/data/protocols-*.ts 对应 */
  slug: string;
  /** 帧族，决定使用哪个解析器模板 */
  kind: PythonFrameKind;
  /** 生成的 Python 文件名 */
  filename: string;
  /** 数据区布局，见 scripts/gen-python-examples.mjs 的 LAYOUTS */
  payloadLayout: string;
  /** 数据区起始偏移（相对于整帧）；缺省时用帧族默认值 */
  payloadOffset?: number;
  /** 参数表：编号 -> 名称/单位/比例因子 */
  params?: {
    id: number;
    name: string;
    unit: string;
    scale: number;
    note?: string;
  }[];
  /** 关键字表（文本协议） */
  keywords?: { keyword: string; name: string; unit?: string; desc: string }[];
  /** 命令码说明（二进制协议） */
  commands?: { code: string; name: string; desc: string }[];
  /** 观察标识映射表（HL7 协议）：LOINC 编码 -> 名称/单位 */
  observations?: { code: string; name: string; unit?: string; note?: string }[];
  /** 该协议用到的额外说明，会出现在代码注释里 */
  notes?: string[];
};

/**
 * 各协议的 Python 示例元信息。
 *
 * 参数表按协议页「数据字典」整理，比例因子来自参数字典中的分辨率。
 */
export const pythonExamples: PythonExample[] = [
  // ---------------------------------------------------------------- 监护仪
  {
    slug: "philips-intellivue-rs232",
    kind: "intellivue",
    filename: "philips_intellivue_parser.py",
    payloadLayout: "intellivue",
    params: [
      { id: 0x0003, name: "HR", unit: "bpm", scale: 1, note: "心率" },
      { id: 0x0004, name: "SpO2", unit: "%", scale: 1, note: "血氧饱和度" },
    ],
    commands: [
      { code: "0x01", name: "设备识别", desc: "负载为空，返回型号、序列号与软件版本" },
      { code: "0x02", name: "实时测量", desc: "周期广播的测量值帧" },
      { code: "0x03", name: "波形数据", desc: "需先订阅通道" },
    ],
    notes: [
      "测量项 ID 在 MP 系列与 MX 系列之间保持一致，可建立跨型号的统一映射表。",
      "校验和覆盖帧类型至负载区末字节的累加和低 8 位，不含 STX 与 ETX。",
    ],
  },
  {
    slug: "philips-capsule",
    kind: "capsule",
    filename: "philips_capsule_parser.py",
    payloadLayout: "capsule",
    params: [
      { id: 0x449A, name: "SV", unit: "ms", scale: 0.1, note: "心率变异" },
    ],
    notes: [
      "记录为定长结构，模块自身维护时间基准，与医院网络时间存在偏差。",
      "信号质量字段低于阈值时建议在界面上标记该数据点不可靠。",
    ],
  },
  {
    slug: "ge-carescape-b650",
    kind: "key-value",
    filename: "ge_carescape_parser.py",
    payloadLayout: "text",
    keywords: [
      { keyword: "ECGR", name: "HR", unit: "bpm", desc: "ECG 心率" },
      { keyword: "SPO2", name: "SpO2", unit: "%", desc: "血氧饱和度" },
      { keyword: "RESP", name: "RR", unit: "bpm", desc: "呼吸频率" },
      { keyword: "NIBP", name: "NIBP", unit: "mmHg", desc: "无创血压" },
      { keyword: "TEMP", name: "T", unit: "°C", desc: "体温" },
    ],
    notes: [
      "关键字分多个命名空间，测量值、报警与设备状态使用不同前缀，需先分流。",
      "部分固件使用 CRLF，个别机型会在记录中间插入额外换行，解析时应按行归并。",
    ],
  },
  {
    slug: "mindray-benevision-n22",
    kind: "hl7",
    filename: "mindray_benevision_parser.py",
    payloadLayout: "text",
    notes: [
      "HL7 消息以 0x0D 分隔段、0x1C 分隔消息，采集端必须自己维护缓冲区来切分。",
      "测量值承载在 OBX 段，OBX-3 的首个组件是 LOINC 编码，跨厂商映射以它为准。",
      "设备输出为事件驱动，采集端不应假设固定推送周期。",
    ],
    observations: [
      { code: "8867-4", name: "HR", unit: "bpm", note: "心率 LOINC 编码" },
      { code: "2708-6", name: "SpO2", unit: "%", note: "血氧饱和度 LOINC 编码" },
      { code: "9279-1", name: "RR", unit: "/min", note: "呼吸频率 LOINC 编码" },
    ],
  },
  {
    slug: "mindray-beneheart-d6",
    kind: "mindray",
    filename: "mindray_beneheart_parser.py",
    payloadLayout: "mindray-beneheart",
    params: [
      { id: 0x0140, name: "PR", unit: "ms", scale: 1, note: "PR 间期" },
      { id: 0x0096, name: "QRS", unit: "ms", scale: 1, note: "QRS 时限" },
      { id: 0x008C, name: "QT", unit: "ms", scale: 1, note: "QT 间期" },
    ],
    notes: [
      "该接口输出的是设备算好的分析结论，上位机无需自行实现 QRS 检测。",
      "测量质量标志不足时设备仍会输出数值，此类数值不建议直接写入病历系统。",
    ],
  },
  {
    slug: "drager-infinity-plus",
    kind: "nmea",
    filename: "drager_infinity_parser.py",
    payloadLayout: "text",
    keywords: [
      { keyword: "PWER", name: "Power", desc: "电源与运行状态" },
      { keyword: "PHRASE", name: "Phase", desc: "心率与血氧相位" },
      { keyword: "ALARM", name: "Alarm", desc: "报警条目" },
    ],
    notes: [
      "ASCII 输出遵循 NMEA 0183 形态，现成的 NMEA 解析库可以直接复用。",
      "校验和为 $ 与 * 之间所有字符的异或值。",
    ],
  },
  {
    slug: "nihon-kohden-icm53",
    kind: "spaced-text",
    filename: "nihon_kohden_parser.py",
    payloadLayout: "text",
    keywords: [
      { keyword: "S", name: "Vital", desc: "监护测量记录" },
      { keyword: "A", name: "Alarm", desc: "报警记录" },
    ],
    notes: [
      "记录以行首两字符标识类型，后续为定宽字段，缺失值以空格填充。",
      "定长字段保证某项数据缺失不会影响后续字段的读取位置。",
    ],
  },
  {
    slug: "masimo-radical7",
    kind: "masimo",
    filename: "masimo_radical_parser.py",
    payloadLayout: "masimo",
    params: [
      { id: 0x0012, name: "SpO2", unit: "%", scale: 1, note: "血氧饱和度" },
    ],
    notes: [
      "参数类型字段决定后续数值的编码方式与长度，跳过它直接按偏移读数会得到错误结果。",
      "PI 值在探头脱落、灌注不足或患者低血压时都会显著下降。",
    ],
  },
  {
    slug: "edwards-lifesciences-cles5000",
    kind: "edwards",
    filename: "edwards_cles5000_parser.py",
    payloadLayout: "edwards",
    params: [
      { id: 0x0000, name: "CO", unit: "L/min", scale: 0.001, note: "连续心输出量" },
    ],
    notes: [
      "所有数值统一使用带比例因子的定点表示，跳过字典会得到数量级错误。",
      "参数数量固定且帧长固定，解析可直接按偏移读取，无需状态机。",
    ],
  },
  {
    slug: "bionet-biovision",
    kind: "bionet",
    filename: "bionet_biovision_parser.py",
    payloadLayout: "bionet",
    params: [
      { id: 0x0000, name: "HR", unit: "bpm", scale: 1, note: "心率" },
    ],
    notes: [
      "长度字段只有一字节，单帧负载上限约 255 字节，波形需拆分成多帧分批传输。",
      "通道号前置在帧内，多通道混传时无需额外的通道协商过程。",
    ],
  },
  {
    slug: "comen-medicus",
    kind: "comen",
    filename: "comen_medicus_parser.py",
    payloadLayout: "comen",
    notes: [
      "负载中常常直接内嵌可读的 ASCII 片段，解析时需要同时处理二进制与文本两种形态。",
      "CRC16 的存在让协议具备较强的抗干扰能力，可避免错误数值静默写入病历系统。",
    ],
  },
  {
    slug: "biolight-monitor",
    kind: "biolight",
    filename: "biolight_monitor_parser.py",
    payloadLayout: "biolight",
    params: [
      { id: 0x0001, name: "HR", unit: "bpm", scale: 0.1, note: "心率" },
    ],
    notes: [
      "设备标识用于区分同一物理总线上的多台监护机，避免把不同床位的数据混在一起。",
      "同一套帧格式与 CRC 算法也用于普门的呼吸机与麻醉机产品线。",
    ],
  },
  {
    slug: "mindray-passport-i8",
    kind: "mindray",
    filename: "mindray_passport_parser.py",
    payloadLayout: "mindray-passport",
    params: [
      { id: 0x0001, name: "HR", unit: "bpm", scale: 1, note: "心率" },
    ],
    notes: [
      "会话建立失败时设备不会主动推送数据，这是接入该机型最先要验证的一步。",
      "趋势数据可按时间区间回取，用于填补转运途中网络中断造成的数据空档。",
    ],
  },
  {
    slug: "b-braun-monitoring",
    kind: "key-value",
    filename: "b_braun_parser.py",
    payloadLayout: "text",
    keywords: [
      { keyword: "ECGR", name: "HR", unit: "bpm", desc: "ECG 心率" },
      { keyword: "SPO2", name: "SpO2", unit: "%", desc: "血氧饱和度" },
      { keyword: "NIBP", name: "NIBP", unit: "mmHg", desc: "无创血压" },
      { keyword: "TEMP", name: "T", unit: "°C", desc: "体温" },
    ],
    notes: [
      "数值部分使用十进制文本表达，部分字段带单位后缀，便于人工核对。",
      "监护参数与报警使用不同关键字前缀，设备自检状态不应混入生命体征通道。",
    ],
  },

  // ---------------------------------------------------------------- 麻醉机
  {
    slug: "drager-perseus-a500",
    kind: "drager-perseus",
    filename: "drager_perseus_parser.py",
    payloadLayout: "drager-perseus",
    params: [
      { id: 0x0001, name: "VT", unit: "mL", scale: 1, note: "潮气量" },
      { id: 0x0002, name: "RR", unit: "bpm", scale: 1, note: "呼吸频率" },
    ],
    notes: [
      "会话建立前设备不会主动推送数据，这是接入该机型最先要验证的一步。",
      "通气参数与监护数据使用不同命令码，订阅关系需分别建立。",
    ],
  },
  {
    slug: "ge-datex-ohmeda-aestiva",
    kind: "key-value",
    filename: "ge_aestiva_parser.py",
    payloadLayout: "text",
    keywords: [
      { keyword: "VENTMODE", name: "VentMode", desc: "通气模式" },
      { keyword: "VT", name: "VT", unit: "mL", desc: "潮气量" },
      { keyword: "RR", name: "RR", unit: "bpm", desc: "呼吸频率" },
      { keyword: "MAC", name: "MAC", unit: "%", desc: "最低肺泡有效浓度" },
      { keyword: "ETCO2", name: "EtCO2", unit: "mmHg", desc: "呼末二氧化碳" },
    ],
    notes: [
      "每行一个测量项，行首是标识，数值以逗号分隔，与 CSV 一致。",
      "文本协议不提供显式校验，个别行在干扰下可能被截断，应缓存不完整的行等待下一行。",
    ],
  },
  {
    slug: "mindray-wato-ex65",
    kind: "mindray",
    filename: "mindray_wato_parser.py",
    payloadLayout: "mindray-wato",
    params: [
      { id: 0x0001, name: "VT", unit: "mL", scale: 1, note: "潮气量" },
      { id: 0x0800, name: "RR", unit: "bpm", scale: 1, note: "呼吸频率" },
      { id: 0x1A00, name: "Ppeak", unit: "cmH₂O", scale: 1, note: "吸气峰压" },
    ],
    notes: [
      "麻醉剂浓度字段部分机型按体积百分比直接编码，部分使用偏移值，必须按手册换算表处理。",
      "设备内部维护独立的日志缓冲，断线后可以回补一段时间内的数据。",
    ],
  },
  {
    slug: "nihon-kohden-anesthesia",
    kind: "spaced-text",
    filename: "nihon_kohden_anesthesia_parser.py",
    payloadLayout: "text",
    keywords: [
      { keyword: "V", name: "Ventilation", desc: "通气参数记录" },
      { keyword: "A", name: "Alarm", desc: "报警记录" },
      { keyword: "G", name: "Gas", desc: "气体浓度记录" },
    ],
    notes: [
      "记录以两字符类型码开头，数值按固定列宽排列，缺失以占位符填充。",
      "该类接口不带显式校验，应结合数值范围检查来过滤异常值。",
    ],
  },
  {
    slug: "hamilton-c6",
    kind: "hamilton",
    filename: "hamilton_c6_parser.py",
    payloadLayout: "hamilton",
    params: [
      { id: 0x003C, name: "Vte", unit: "mL", scale: 1, note: "潮气量" },
      { id: 0x001F, name: "fTotal", unit: "bpm", scale: 1, note: "总呼吸频率" },
    ],
    commands: [
      { code: "0x3300", name: "实时监视", desc: "一次可指定多个参数" },
      { code: "0x3400", name: "参数设置", desc: "会实际改变通气行为，必须限制调用来源" },
      { code: "0x3500", name: "读取报警", desc: "条目带确认状态位" },
    ],
    notes: [
      "部分固件要求先握手再发送监视命令，跳过这一步会表现为设备无任何响应。",
      "参数以带比例因子的定点数表示，比例因子写在参数字典中。",
    ],
  },
  {
    slug: "maquet-servona",
    kind: "cmd-text",
    filename: "maquet_servona_parser.py",
    payloadLayout: "text",
    keywords: [
      { keyword: "VENT", name: "Ventilation", desc: "通气参数" },
      { keyword: "FREQ", name: "Frequency", unit: "bpm", desc: "呼吸频率" },
      { keyword: "ETCO2", name: "EtCO2", unit: "mmHg", desc: "呼末二氧化碳" },
      { keyword: "O2", name: "FreshGas", unit: "L/min", desc: "新鲜气体流量" },
    ],
    notes: [
      "协议采用「一问一答」同步事务模型，请求与响应成对出现。",
      "协议本身不带校验，应为每条命令设置超时与重试，连续失败时重建连接。",
    ],
  },
  {
    slug: "getinge-erva",
    kind: "group-text",
    filename: "getinge_erva_parser.py",
    payloadLayout: "text",
    keywords: [
      { keyword: "VENT", name: "VentMode", desc: "通气模式" },
      { keyword: "GAS", name: "Gas", desc: "气体浓度" },
      { keyword: "ALARM", name: "Alarm", desc: "报警条目" },
    ],
    notes: [
      "每个分组以 GRP0 开头，以 END 结束，组内字段以逗号分隔。",
      "不同批次固件支持的字段并不完全一致，遇到未知分组可跳过整段而不会错位。",
    ],
  },
  {
    slug: "tecno-anesthesia",
    kind: "tecno",
    filename: "tecno_anesthesia_parser.py",
    payloadLayout: "tecno",
    params: [
      { id: 0x0001, name: "VT", unit: "mL", scale: 1, note: "潮气量" },
    ],
    notes: [
      "定界符成对出现，使得在任意位置重新同步变得容易。",
      "Tecno 与 SEEM 共用同一套通信框架，解析逻辑可以完全复用。",
    ],
  },
  {
    slug: "biolight-ventilator",
    kind: "biolight",
    filename: "biolight_ventilator_parser.py",
    payloadLayout: "biolight",
    params: [
      { id: 0x0002, name: "MV", unit: "L/min", scale: 0.1, note: "分钟通气量" },
    ],
    notes: [
      "呼吸机侧的握手与订阅是分开的两步，未完成握手的设备不会响应订阅请求。",
      "参数字典应做成数据驱动，而不是在代码里散落魔法数字。",
    ],
  },
  {
    slug: "drager-perseus-hl7",
    kind: "hl7",
    filename: "hl7_v2_parser.py",
    payloadLayout: "text",
    notes: [
      "同一套 HL7 解析器可以覆盖多品牌麻醉机，是多品牌混合手术室的推荐路径。",
      "参数标识的跨厂商映射是实际难点，需要建立厂商到标准编码的映射表。",
      "设备输出通常是事件驱动而非周期驱动，采集端不应假设固定周期。",
    ],
    observations: [
      { code: "8867-4", name: "HR", unit: "bpm", note: "心率 LOINC 编码" },
      { code: "2708-6", name: "SpO2", unit: "%", note: "血氧饱和度 LOINC 编码" },
      { code: "9279-1", name: "RR", unit: "/min", note: "呼吸频率 LOINC 编码" },
    ],
  },
];

/** 按 slug 索引 */
export const pythonExampleBySlug: Record<string, PythonExample> = Object.fromEntries(
  pythonExamples.map((e) => [e.slug, e]),
);

/** 生成 Python 源码所需的帧结构元数据 */
export type FrameSpec = {
  /** 起始字节 */
  start: number[];
  /** 结束字节 */
  end: number[];
  /** 长度字段位置与宽度 */
  lenOffset?: number;
  lenSize?: number;
  lenEndian?: "be" | "le";
  /** 负载区起始偏移 */
  payloadOffset: number;
  /** 定长帧的总长度（无长度字段时使用） */
  frameTotal?: number;
  /** 校验方式；offset 缺省表示位置随负载区长度变化，由解析器运行时推导 */
  checksum?: {
    kind: "sum8" | "xor8" | "crc16-ccitt";
    offset?: number;
    size: number;
    coverStart: number;
    endian?: "be" | "le";
  };
};

/** 各帧族的结构定义 */
export const FRAME_SPECS: Record<PythonFrameKind, FrameSpec> = {
  intellivue: {
    // STX | Type(1) | Seq(2) | Len(2) | Payload(N) | Sum(1) | ETX
    start: [0x0b],
    end: [0x0d],
    lenOffset: 4,
    lenSize: 2,
    lenEndian: "be",
    payloadOffset: 6,
    checksum: { kind: "sum8", offset: 14, size: 1, coverStart: 1 },
  },
  mindray: {
    // 7E | Len(1) | Ctrl(1) | Cmd(1) | Data(N) | CRC16(2) | 7E
    // 校验字段的位置随数据区长度变化，由解析器在运行时推导
    start: [0x7e],
    end: [0x7e],
    lenOffset: 1,
    lenSize: 1,
    lenEndian: "be",
    payloadOffset: 2,
    checksum: { kind: "crc16-ccitt", size: 2, coverStart: 1, endian: "le" },
  },
  biolight: {
    // BD BD | MsgType(1) | Len(2) | DevID(2) | ParamBlock | CRC16(2)
    start: [0xbd, 0xbd],
    end: [],
    lenOffset: 3,
    lenSize: 2,
    lenEndian: "be",
    payloadOffset: 5,
    checksum: { kind: "crc16-ccitt", offset: 11, size: 2, coverStart: 2, endian: "le" },
  },
  comen: {
    // AA | Type(1) | Len(1) | Payload(N) | CRC16(2)
    start: [0xaa],
    end: [],
    lenOffset: 2,
    lenSize: 1,
    lenEndian: "be",
    payloadOffset: 3,
    checksum: { kind: "crc16-ccitt", offset: 8, size: 2, coverStart: 1, endian: "le" },
  },
  "drager-perseus": {
    // 02 | Type(1) | Len(2) | Payload(N) | Sum(1) | 03
    start: [0x02],
    end: [0x03],
    lenOffset: 2,
    lenSize: 2,
    lenEndian: "be",
    payloadOffset: 4,
    checksum: { kind: "sum8", offset: 16, size: 1, coverStart: 1 },
  },
  hamilton: {
    // 02 | Len(2) | CmdID(2) | Data(N) | Sum(1) | 03
    start: [0x02],
    end: [0x03],
    lenOffset: 1,
    lenSize: 2,
    lenEndian: "be",
    payloadOffset: 3,
    checksum: { kind: "sum8", offset: 14, size: 1, coverStart: 1 },
  },
  bionet: {
    // 55 AA | Len(1) | Chan(1) | Data(N) | Sum(1)
    start: [0x55, 0xaa],
    end: [],
    lenOffset: 2,
    lenSize: 1,
    lenEndian: "be",
    payloadOffset: 3,
    checksum: { kind: "sum8", offset: 10, size: 1, coverStart: 2 },
  },
  tecno: {
    // 3C 3C | RecType(1) | Len(1) | Payload(N) | CRC16(2)
    start: [0x3c, 0x3c],
    end: [],
    lenOffset: 3,
    lenSize: 1,
    lenEndian: "be",
    payloadOffset: 4,
    checksum: { kind: "crc16-ccitt", offset: 10, size: 2, coverStart: 2, endian: "le" },
  },
  edwards: {
    // AA 55 | RecType(1) | Timestamp(4) | Count(1) | [ParamID(2) | Value(4)] * Count
    start: [0xaa, 0x55],
    end: [],
    payloadOffset: 7,
    frameTotal: 14,
  },
  masimo: {
    // MS | BlockType(1) | Count(1) | [ParamID(1) | Value(2)] * Count | XOR(1)
    start: [0x4d, 0x53],
    end: [],
    payloadOffset: 2,
    checksum: { kind: "xor8", offset: 7, size: 1, coverStart: 0 },
    frameTotal: 8,
  },
  capsule: {
    // 52 01 | Timestamp(8) | DevID(4) | ParamID(2) | Value(2) | Signal(1) | Flag(1)
    start: [0x52, 0x01],
    end: [],
    payloadOffset: 14,
    frameTotal: 20,
  },
  "key-value": {
    start: [],
    end: [],
    payloadOffset: 0,
  },
  "spaced-text": {
    start: [],
    end: [],
    payloadOffset: 0,
  },
  nmea: {
    start: [0x24],
    end: [],
    payloadOffset: 1,
  },
  "cmd-text": {
    start: [],
    end: [],
    payloadOffset: 0,
  },
  "group-text": {
    start: [],
    end: [],
    payloadOffset: 0,
  },
  hl7: {
    start: [],
    end: [],
    payloadOffset: 0,
  },
};
