/**
 * 文本协议的显示约定。
 *
 * HL7 等文本协议的报文本身就是可读的字符序列，用十六进制展示既难读也不便于直接使用。
 * 但控制字符（HL7 的段结束符 0x0D）在 HTML 的 <pre> 里不可见，
 * 逐段解读表若直接放原文，CR 那一行看上去就是空的。
 * 因此约定用可见占位符 ␍ 表示 CR，段与段之间用换行分隔。
 */

/** 段结束符 CR 的可见占位符 */
export const CR_MARK = "\u240D";

/** 报文原文转成逐段解读表用的片段文本：CR 显示为 ␍ */
export function toFragment(raw) {
  return raw.replace(/\r/g, CR_MARK);
}

/** 报文原文转成页面展示用的多行文本：每个段占一行 */
export function toMessage(raw) {
  return raw.replace(/\r/g, "\n");
}
