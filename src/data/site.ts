export const siteConfig = {
  name: "监护仪·麻醉机协议库",
  shortName: "协议库",
  description:
    "全球与中国前 10 品牌监护仪、麻醉机的通讯协议说明，含帧格式、数据字典、报文示例，以及 C# 与 Java 连接示例代码。",
  url: "https://www.removewatermarker.com",
  locale: "zh_CN",
  publisher: "removewatermarker.com",
  email: "contact@removewatermarker.com",
} as const;

export const navLinks = [
  { href: "/protocols/", label: "协议" },
  { href: "/code/", label: "代码示例" },
  { href: "/brands/", label: "品牌" },
  { href: "/about/", label: "关于" },
] as const;

export const mobileTabLinks = [
  { href: "/", label: "首页", icon: "⌂" },
  { href: "/protocols/", label: "协议", icon: "☰" },
  { href: "/code/", label: "代码", icon: "⌘" },
  { href: "/search/", label: "搜索", icon: "⌕" },
] as const;

/** 友情链接 —— 全部为文字链接，外链加 nofollow */
export const friendLinks = [
  { name: "在线文字转字幕AI工具", url: "https://www.chdaoai.com/zh/text-to-subtitles" },
  { name: "传道PDF图片条码工具", url: "https://www.openai2025.com/" },
  { name: "在线base64工具", url: "https://www.base64.club/" },
  { name: "NBA趣事", url: "https://www.zorezoro.com/" },
  { name: "在线免费游戏", url: "https://www.icebreakgame.com/" },
  { name: "中国菜系大全", url: "https://food.zorezoro.com/" },
  { name: "中国功夫大全", url: "https://gf.zorezoro.com/" },
  { name: "中国24史", url: "https://china.zorezoro.com/" },
] as const;

/** 页脚合规链接 —— 需求 8.3 必备页面 */
export const legalLinks = [
  { href: "/about/", label: "关于我们" },
  { href: "/contact/", label: "联系我们" },
  { href: "/privacy/", label: "隐私政策" },
  { href: "/terms/", label: "服务条款" },
  { href: "/ads/", label: "广告声明" },
  { href: "/disclaimer/", label: "免责声明" },
  { href: "/sitemap/", label: "站点地图" },
  { href: "/changelog/", label: "更新日志" },
] as const;

/** 协议分类 */
export const categories = [
  {
    slug: "monitor" as const,
    name: "监护仪",
    en: "Patient Monitor",
    desc: "床旁持续监测心率、血氧、血压、呼吸与体温的设备，覆盖全球与中国市占率前 10 品牌。",
  },
  {
    slug: "anesthesia" as const,
    name: "麻醉机",
    en: "Anesthesia Machine",
    desc: "提供麻醉气体输送与机械通气支持的设备，输出通气参数、气体浓度与麻醉剂浓度。",
  },
];

/** 接口类型筛选选项 */
export const interfaceOptions = [
  "RS-232",
  "RS-422",
  "RS-485",
  "以太网",
  "HL7 v2",
  "NMEA 0183",
  "USB",
  "Bluetooth",
];

/** 排序方式 */
export const sortOptions = [
  { slug: "default", label: "默认" },
  { slug: "updated", label: "最近更新" },
  { slug: "brand", label: "按品牌" },
] as const;
