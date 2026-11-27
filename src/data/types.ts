export type Category = "monitor" | "anesthesia";

export type FrameField = {
  field: string;
  length: string;
  desc: string;
};

export type PhysioItem = {
  name: string;
  unit: string;
  range: string;
  resolution: string;
  note: string;
};

export type CommandItem = {
  name: string;
  request: string;
  response: string;
  desc: string;
};

export type DecodeItem = {
  hex: string;
  desc: string;
  /**
   * 该段的可读文本形式，仅文本协议（如 HL7）提供。
   *
   * 段结束符 CR 在表格里不可见，因此用可见占位符 ␍ 表示。
   */
  text?: string;
};

export type Protocol = {
  slug: string;
  brand: string;
  brandSlug: string;
  category: Category;
  title: string;
  models: string[];
  interfaces: string[];
  baud: string;
  summary: string;
  updatedAt: string;
  overview: string[];
  physical: string[];
  frame: FrameField[];
  dictionary: PhysioItem[];
  commands: CommandItem[];
  sampleHex: string;
  /**
   * 报文原文，仅文本协议（如 HL7）提供。
   *
   * HL7 的报文本身就是可读字符串，页面按字符串展示比十六进制更直观，
   * 也便于直接复制使用。
   */
  sampleText?: string;
  /**
   * 报文的多行展示文本，仅文本协议提供：段分隔符 CR 换成换行，每段占一行。
   */
  sampleDisplay?: string;
  decode: DecodeItem[];
  sources: string[];
  related: string[];
};

export type CodeExample = {
  slug: string;
  title: string;
  desc: string;
  lang: "csharp" | "java" | "python";
  filename: string;
  dependency?: string;
  code: string;
};

/**
 * 设备样本数据包的元信息。
 *
 * 样本包按协议 slug 组织，目录下含原始字节、十六进制文本与可读说明三种格式。
 */
export type SamplePacket = {
  /** 协议 slug，与 src/data/protocols-*.ts 对应 */
  slug: string;
  title: string;
  brand: string;
  brandSlug: string;
  category: Category;
  models: string[];
  interfaces: string[];
  baud: string;
  summary: string;
  updatedAt: string;
  /** 样本报文的字节长度 */
  byteLength: number;
  /** 是否为文本协议并补上了消息结束符 */
  hasTextTerminator: boolean;
  /** 报文是否以字符串形式展示（HL7 等文本协议） */
  isStringProtocol: boolean;
  /** 样本包目录（相对 public/） */
  dir: string;
  /** 各格式文件名（相对样本包目录） */
  files: {
    /** 原始字节 */
    bin: string;
    /** 十六进制文本 */
    hex: string;
    /** 人类可读说明 */
    txt: string;
    /** 报文原文，仅文本协议提供 */
    raw: string | null;
  };
};

/** 按协议 slug 索引的 Python 示例源码 */
export type PythonSource = {
  filename: string;
  code: string;
};

export type ChangelogEntry = {
  date: string;
  title: string;
  items: string[];
};
