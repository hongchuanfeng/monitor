import type { ChangelogEntry } from "./types";

export const changelog: ChangelogEntry[] = [
  {
    date: "2026-11-26",
    title: "扩充品牌与机型覆盖，补齐合规与部署文档",
    items: [
      "新增 B. Braun 生命体征监测设备通讯协议页，补齐监护仪品类要求的品牌覆盖",
      "新增 Tecno / SEEM 麻醉机通讯协议页，扩充国产与欧洲品牌机型清单",
      "协议页总数扩充至 24 页，收录机型条目扩充至 200 条，全部页面正文均达到 800 字以上",
      "新增《部署说明与域名绑定指引》《AdSense 准入自检清单与上线前核对表》《AdSense 申请与隐私声明配置说明》三份配套文档",
    ],
  },
  {
    date: "2026-11-26",
    title: "新增 HL7 v2 通用对接说明与合规页面",
    items: [
      "新增《麻醉机 HL7 v2 消息对接说明（通用）》，覆盖 MSH / PID / ORU / OBR / OBX 段结构与字段映射方法",
      "上线关于、联系、隐私政策、服务条款、广告声明、免责声明、更新日志七个合规页面",
      "调整页脚结构，将友情链接区块与合规链接分层呈现",
    ],
  },
  {
    date: "2026-11-24",
    title: "补充迈瑞 WATO EX 麻醉机协议",
    items: [
      "新增迈瑞 WATO EX-65 / EX-100 / EX-120 麻醉机通讯协议页",
      "补充通气设定值与实测值的字段区分说明",
      "增加麻醉剂浓度按气体类型分别编号的说明",
    ],
  },
  {
    date: "2026-11-22",
    title: "完善 BeneVision 协议字段说明",
    items: [
      "补充 BeneVision N 系列测量项缩放因子对照说明",
      "新增 BeneHeart D6 十二导联心电分析接口页面",
      "为 NetComm 以太网接口补充 TCP 端口与连接方式说明",
    ],
  },
  {
    date: "2026-11-20",
    title: "新增 Dräger Perseus A500 麻醉机协议",
    items: [
      "新增 Perseus A500 / A500 XL / Evita Infinity 协议页",
      "补充通气模式枚举与 MAC 年龄换算的注意事项",
      "说明回路压力与漏气检测为自检值而非实时值",
    ],
  },
  {
    date: "2026-11-18",
    title: "Philips IntelliVue 协议勘误",
    items: [
      "修正帧长度字段的字节序描述",
      "明确波形数据采用差分编码，需按通道换算表还原",
      "补充波形订阅为按需机制的说明",
    ],
  },
  {
    date: "2026-11-14",
    title: "新增 GE Aestiva 麻醉机协议",
    items: [
      "新增 Aestiva 5 / CS5 / iTec 麻醉机协议页",
      "补充智能报警系统报警文本的映射建议",
      "说明 Datex-Ohmeda 早期机型与后期机型命令集差异",
    ],
  },
  {
    date: "2026-11-09",
    title: "GE CARESCAPE 协议补充",
    items: [
      "补充 ECG 波形差分输出的增益换算说明",
      "新增 NIBP 测量模式枚举（MANUAL / AUTO / STAT）",
      "增加串口与 HL7 双通道并用时的去重提示",
    ],
  },
  {
    date: "2026-11-05",
    title: "新增 Nihon Kohden 与 Hamilton 协议",
    items: [
      "新增 Nihon Kohden iCM-53 中央站接口协议",
      "新增 Hamilton C6 / C7 呼吸机 RS/232 协议",
      "为 Hamilton 协议补充测量值字段顺序说明",
    ],
  },
  {
    date: "2026-10-30",
    title: "代码示例扩充至五个主题",
    items: [
      "新增断线重连与看门狗示例（C# 与 Java）",
      "新增读取生理参数并输出示例（C# 与 Java）",
      "两个语言版本的示例保持逐节对照，便于跨语言迁移",
    ],
  },
  {
    date: "2026-10-12",
    title: "新增 Masimo 与 Edwards 协议",
    items: [
      "新增 Masimo Radical-7 接口协议，重点说明 perfused index 的临床含义",
      "新增 Edwards ClearSight / CLES5000 血流动力学监测接口",
      "补充定点数比例因子换算的提醒",
    ],
  },
  {
    date: "2026-09-28",
    title: "站点上线",
    items: [
      "上线监护仪与麻醉机通讯协议文档站，首批收录 20 个型号协议页",
      "完成响应式布局，覆盖 PC 与移动端",
      "生成 sitemap.xml 与 robots.txt",
    ],
  },
];
