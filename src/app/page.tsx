import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import {
  getAllBrands,
  getProtocolsByCategory,
  getRecentUpdates,
  getTopBrands,
  getTotalModelCount,
} from "@/data";
import { categories } from "@/data/site";
import { codeExampleGroups } from "@/data/code-examples";
import { changelog } from "@/data/changelog";
import { DICT_ANESTHESIA, DICT_MONITOR } from "@/data/dictionaries";
import { samplePackets } from "@/data/sample-packets";

/** 首页展示的样本包：优先 HL7 与最新的协议，兼顾不同品牌 */
const homeSamples = [
  ...samplePackets.filter((s) => s.interfaces.some((i) => i.includes("HL7"))),
  ...samplePackets.filter((s) => !s.interfaces.some((i) => i.includes("HL7"))),
].slice(0, 6);

/** 接入工作流 —— 首页用四步说明典型对接路径 */
const STEPS = [
  {
    n: "01",
    title: "确认物理层与电气参数",
    desc: "先确定接口类型、波特率、数据位与校验方式。RS-232 多为三线制直连，RS-422 / RS-485 需要确认总线上每台设备的唯一地址。",
  },
  {
    n: "02",
    title: "拆解帧结构并验证校验",
    desc: "按协议页的「帧格式」表定位起始符、长度字段、校验位与帧尾，确认整帧长度推导方式，再拿示例报文做一次字节级比对。",
  },
  {
    n: "03",
    title: "映射数据字典与缩放因子",
    desc: "把参数编号映射为带单位与量程的工程值。注意比例因子与定点表示，并区分「无效读数」与真实数值 0。",
  },
  {
    n: "04",
    title: "处理断线、超时与重连",
    desc: "设备静默断开时不会抛异常，必须用「无数据超时」作为主要断线判据，并配合指数退避重连与看门狗机制。",
  },
];

/** 接口类型速查 —— 便于按传输方式快速定位 */
const INTERFACE_NOTES: Record<string, string> = {
  "RS-232": "点对点全双工，最常见的床旁串口方案，波特率多为 9600–115200 8N1。",
  "RS-422": "差分传输，支持多床位集中站，同一总线需为每台设备分配唯一地址。",
  "RS-485": "半双工总线，多设备共享同一对线，注意地址分配与终端电阻。",
  "以太网": "多采用 TCP 端口承载，帧边界与串口一样需要自己从字节流中切分。",
  "HL7 v2": "医疗信息交换标准，以 MSH / PID / ORU 等消息段组织数据，常用于与 HIS / EMR 对接。",
  "NMEA 0183": "以 $ 起始、* 加校验和结尾的文本行，ASCII 协议可直接复用现成解析库。",
  "USB": "部分厂商以虚拟串口形式呈现，配置参数与对应 RS-232 一致。",
  "Bluetooth": "多见于无线生理参数模块，数据经接收端汇聚后以无线链路属性上报。",
  "无线链路": "802.11 无线链路，需关注信道配置、信号质量与时间基准对齐。",
  "HSMS": "基于 TCP 的设备消息交换规范，常与串口通道并行使用，对接时需注意两路数据的时间戳对齐。",
};

/** 把协议数据里的接口标签归一化为接口大类 */
function normalizeInterface(iface: string): string {
  if (iface.startsWith("RS-232") || iface.includes("RS/232")) return "RS-232";
  if (iface.startsWith("RS-422")) return "RS-422";
  if (iface.startsWith("RS-485")) return "RS-485";
  if (iface.startsWith("HL7")) return "HL7 v2";
  if (iface.startsWith("HSMS")) return "HSMS";
  if (iface.includes("以太网") || iface.startsWith("Ethernet")) return "以太网";
  if (iface.startsWith("NMEA")) return "NMEA 0183";
  if (iface.startsWith("USB")) return "USB";
  if (iface.startsWith("Bluetooth")) return "Bluetooth";
  if (iface.includes("无线")) return "无线链路";
  return iface;
}

/** 常见问题 —— 命中搜索意图的问答对 */
const FAQS = [
  {
    q: "监护仪与麻醉机的通讯协议有统一标准吗？",
    a: "没有完全统一的行业标准。HL7 v2 与 NMEA 0183 是少数被多厂商采用的通用规范，可用于系统间集成；但设备自身的参数广播、波形推送与命令交互，各厂商基本都使用私有协议，因此在多数场景下仍需按型号对接。",
  },
  {
    q: "同一品牌的不同型号可以复用同一套解析代码吗？",
    a: "多数情况下可以。Philips IntelliVue 的测量项编号在 MP 系列与 MX 系列之间保持一致，GE CARESCAPE 的关键字表在 B650 与后续机型间也基本通用。少数跨代机型（如 GE Datex-Ohmeda 早期与后期机型）命令集存在差异，需要单独处理。",
  },
  {
    q: "波形数据为什么需要差分还原？",
    a: "波形以相邻采样点的增量形式传输，只传差值可以显著降低串口带宽占用。代价是对丢包极其敏感：一次字节丢失会导致后续所有波形失真，直到下一个复位同步点。因此建议在采集端保留上一采样点，并配合序号做丢帧检测。",
  },
  {
    q: "设定值与实测值应当如何区分？",
    a: "两者使用不同的字段编号，不能混用。通气设定值反映临床人员的配置，实测值由设备传感器测量得到。机械通气分析应以实测值为准，设定值仅用于判断设备是否达到预期运行状态。",
  },
  {
    q: "设备「无有效读数」时应该上传 0 吗？",
    a: "不应该。探头脱落、电极脱落或低灌注时，设备输出的是无效标志而非数值 0。把无效读数当作零值写入病历系统，会造成临床误判。正确做法是保留无效状态，在界面上显示为「--」。",
  },
  {
    q: "串口与 HL7 双通道并行时数据会重复吗？",
    a: "会。两条通道通常各自独立推送同一份测量值，需要在采集端按设备标识、参数编号与时间戳做去重与合并，否则容易产生重复计数。",
  },
];

export default function HomePage() {
  const monitor = getProtocolsByCategory("monitor");
  const anesthesia = getProtocolsByCategory("anesthesia");
  const brands = getAllBrands();
  const topBrands = getTopBrands();
  const recent = getRecentUpdates(8);
  const totalModels = getTotalModelCount();

  const categoryCards = [
    {
      ...categories[0],
      protocols: monitor,
      brandCount: new Set(monitor.map((p) => p.brandSlug)).size,
      modelCount: new Set(monitor.flatMap((p) => p.models)).size,
    },
    {
      ...categories[1],
      protocols: anesthesia,
      brandCount: new Set(anesthesia.map((p) => p.brandSlug)).size,
      modelCount: new Set(anesthesia.flatMap((p) => p.models)).size,
    },
  ];

  const popular = [...monitor, ...anesthesia]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);

  /** 按接口统计协议数，用于接口速查表 */
  const interfaceStats = Array.from(
    new Set(
      [...monitor, ...anesthesia].flatMap((p) =>
        p.interfaces.map(normalizeInterface),
      ),
    ),
  )
    .map((iface) => ({
      iface,
      count: [...monitor, ...anesthesia].filter((p) =>
        p.interfaces.some((i) => normalizeInterface(i) === iface),
      ).length,
    }))
    .sort((a, b) => b.count - a.count);

  /** 品牌清单（全部），用于品牌表格 */
  const brandRows = [...brands]
    .sort((a, b) => b.protocols.length - a.protocols.length)
    .map((b) => ({
      name: b.name,
      slug: b.slug,
      protocols: b.protocols.length,
      models: b.models.length,
      interfaces: b.interfaces,
    }));

  const stats = [
    { n: String(monitor.length + anesthesia.length), l: "协议页" },
    { n: String(brands.length), l: "收录品牌" },
    { n: String(totalModels), l: "覆盖型号" },
    { n: "3", l: "示例语言" },
  ];

  /** 麻醉机字典与监护仪字典共有的参数项数量 */
  const sharedCount = DICT_MONITOR.filter((d) =>
    DICT_ANESTHESIA.some((a) => a.name === d.name),
  ).length;

  return (
    <div className="page">
      <div className="container">
        <AdSlot format="banner" />

        <section className="hero">
          <h1>监护仪与麻醉机 通讯协议文档库</h1>
          <p>
            全球 / 中国 前 10 品牌 · 帧结构与校验 · 数据字典与报文示例 · C#、
            Java 与 Python 连接示例代码
          </p>
          <div className="hero__actions">
            <Link href="/protocols/monitor/" className="btn btn--primary">
              浏览监护仪协议
            </Link>
            <Link href="/protocols/anesthesia/" className="btn btn--secondary">
              浏览麻醉机协议
            </Link>
            <Link href="/samples/" className="btn btn--secondary">
              下载样本数据包
            </Link>
            <Link href="/code/" className="btn btn--secondary">
              查看连接示例代码
            </Link>
          </div>
          <form
            action="/search/"
            method="get"
            style={{ maxWidth: 560, margin: "0 auto" }}
          >
            <label className="sr-only" htmlFor="home-search">
              搜索型号、协议名或关键字
            </label>
            <input
              id="home-search"
              name="q"
              type="search"
              placeholder="搜索型号、协议名或关键字（如 HL7、RS-232、ETCO2）"
              style={{
                border: "1px solid var(--color-border-strong)",
                borderRadius: "var(--radius)",
                padding: "12px 16px",
                fontSize: 15,
                width: "100%",
              }}
            />
          </form>

          <div className="hero__stats">
            {stats.map((s) => (
              <div key={s.l} className="hero__stat">
                <span className="hero__stat-num">{s.n}</span>
                <span className="hero__stat-label">{s.l}</span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="cat-title">
          <h2 id="cat-title" className="section-title">
            设备品类
          </h2>
          <p className="section-desc">
            两个品类的协议在帧结构上差异明显，但接入思路一致：确认物理层 → 拆解帧 → 映射字典 → 处理断线。
          </p>
          <div className="grid-2">
            {categoryCards.map((c) => (
              <div key={c.slug} className="card card--hover">
                <h3 style={{ margin: "0 0 4px", fontSize: 18 }}>
                  {c.name}{" "}
                  <span style={{ fontSize: 13, color: "var(--color-text-faint)" }}>
                    {c.en}
                  </span>
                </h3>
                <p className="text-small text-muted" style={{ margin: "0 0 12px" }}>
                  {c.desc}
                </p>
                <ul className="feature-list">
                  {c.slug === "monitor" ? (
                    <>
                      <li>心率、血氧、血压、呼吸、体温、呼末二氧化碳等持续监测参数</li>
                      <li>ECG / 呼吸 / 压力等波形通道的订阅与差分还原</li>
                      <li>报警条目、设备状态与测量事件的读取方式</li>
                    </>
                  ) : (
                    <>
                      <li>通气模式、潮气量、气道峰压与 PEEP 等通气参数</li>
                      <li>吸入氧浓度、麻醉剂浓度与最低肺泡有效浓度 MAC</li>
                      <li>回路自检压力、漏气检测与通气报警联动</li>
                    </>
                  )}
                </ul>
                <p className="text-small text-muted" style={{ margin: "0 0 14px" }}>
                  {c.brandCount} 个品牌 · {c.modelCount} 个型号 · {c.protocols.length}{" "}
                  个协议页
                </p>
                <Link href={`/protocols/${c.slug}/`} className="btn btn--secondary">
                  查看协议 →
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="flow-title" style={{ marginTop: 48 }}>
          <h2 id="flow-title" className="section-title">
            接入工作流
          </h2>
          <p className="section-desc">
            不论对接监护仪还是麻醉机，完整的接入过程都可以拆成下面四步。按顺序推进可以避免绝大多数「连上了却读不出数」的问题。
          </p>
          <div className="grid-4">
            {STEPS.map((s) => (
              <div key={s.n} className="card step-card">
                <span className="step-card__num">{s.n}</span>
                <h3 className="step-card__title">{s.title}</h3>
                <p className="step-card__desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="iface-title" style={{ marginTop: 48 }}>
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 id="iface-title" className="section-title" style={{ margin: 0 }}>
              接口类型速查
            </h2>
            <Link href="/protocols/">按接口筛选全部协议 →</Link>
          </div>
          <p className="section-desc">
            同一台设备往往同时提供多种接口。串口类用于近距直连，以太网与 HL7 用于系统集成。
          </p>
          <p className="table-scroll-hint">← 左右滑动查看完整表格 →</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>接口类型</th>
                  <th>覆盖协议数</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {interfaceStats.map((row) => (
                  <tr key={row.iface}>
                    <td>
                      <code>{row.iface}</code>
                    </td>
                    <td>{row.count}</td>
                    <td className="text-muted">
                      {INTERFACE_NOTES[row.iface] ?? "各厂商实现方式差异较大，详见对应协议页。"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="hot-title" style={{ marginTop: 48 }}>
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 id="hot-title" className="section-title" style={{ margin: 0 }}>
              热门协议
            </h2>
            <Link href="/protocols/">全部协议 →</Link>
          </div>
          <div className="grid-4">
            {popular.map((p) => (
              <Link
                key={p.slug}
                href={`/protocols/${p.category}/${p.slug}/`}
                className="card card--hover"
                style={{ display: "block" }}
              >
                <p
                  className="text-small"
                  style={{
                    margin: 0,
                    color: "var(--color-primary)",
                    fontWeight: 600,
                  }}
                >
                  {p.brand}
                </p>
                <h3
                  style={{ margin: "6px 0 8px", fontSize: 15.5, lineHeight: 1.5 }}
                >
                  {p.title}
                </h3>
                <div className="tag-row">
                  {p.interfaces.slice(0, 2).map((i) => (
                    <span key={i} className="tag">
                      {i}
                    </span>
                  ))}
                </div>
                <p className="text-small text-muted" style={{ margin: "10px 0 0" }}>
                  更新 {p.updatedAt}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="dict-title" style={{ marginTop: 48 }}>
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 id="dict-title" className="section-title" style={{ margin: 0 }}>
              通用数据字典
            </h2>
            <span className="text-small text-muted">
              各品牌协议在此基础上追加厂商专有字段
            </span>
          </div>
          <p className="section-desc">
            这是监护仪与麻醉机上报的通用生理参数。不同厂商的差异主要体现在参数编号、缩放因子与
            有效性标志的表示方式上。
          </p>
          <p className="table-scroll-hint">← 左右滑动查看完整表格 →</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>参数</th>
                  <th>单位</th>
                  <th>量程</th>
                  <th>分辨率</th>
                  <th>接入提示</th>
                </tr>
              </thead>
              <tbody>
                {DICT_ANESTHESIA.map((d) => (
                  <tr key={d.name}>
                    <td>
                      <strong>{d.name}</strong>
                    </td>
                    <td>
                      <code>{d.unit}</code>
                    </td>
                    <td>{d.range}</td>
                    <td>{d.resolution}</td>
                    <td className="text-muted">{d.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-small text-muted" style={{ marginTop: -4 }}>
            监护仪品类共 {DICT_MONITOR.length} 项通用参数，麻醉机在此基础上追加{" "}
            {DICT_ANESTHESIA.length - sharedCount} 项气体与通气参数。
          </p>
        </section>

        <section aria-labelledby="code-title" style={{ marginTop: 48 }}>
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 id="code-title" className="section-title" style={{ margin: 0 }}>
              连接示例代码
            </h2>
            <Link href="/code/">全部代码 →</Link>
          </div>
          <p className="section-desc">
            五组完整实现，C#、Java 与 Python 三个语言版本结构保持一致，可逐节对照阅读。
          </p>
          <div className="grid-3">
            {codeExampleGroups.map((g) => (
              <Link
                key={g.slug}
                href={`/code/#${g.slug}`}
                className="card card--hover"
                style={{ display: "block" }}
              >
                <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>{g.title}</h3>
                <p className="text-small text-muted" style={{ margin: "0 0 10px" }}>
                  {g.desc}
                </p>
                <div className="tag-row">
                  <span className="tag">C#</span>
                  <span className="tag">Java</span>
                  <span className="tag tag--primary">Python</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="samples-title" style={{ marginTop: 48 }}>
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 id="samples-title" className="section-title" style={{ margin: 0 }}>
              样本数据包
            </h2>
            <Link href="/samples/">全部样本包 →</Link>
          </div>
          <p className="section-desc">
            每个设备协议都提供一份真实结构的样本报文，可在接设备之前先用它验证自己的解析器。
            下载后可直接写入串口或 TCP 连接。
          </p>
          <div className="grid-3">
            {homeSamples.map((s) => (
              <Link
                key={s.slug}
                href={`/protocols/${s.category}/${s.slug}/`}
                className="card card--hover"
                style={{ display: "block" }}
              >
                <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>{s.title}</h3>
                <p className="text-small text-muted" style={{ margin: "0 0 10px" }}>
                  {s.brand} · {s.byteLength} 字节
                </p>
                <div className="tag-row">
                  <span className="tag tag--primary">.bin</span>
                  <span className="tag tag--primary">.hex</span>
                  <span className="tag tag--primary">.txt</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="brand-title" style={{ marginTop: 48 }}>
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 id="brand-title" className="section-title" style={{ margin: 0 }}>
              按品牌浏览
            </h2>
            <Link href="/brands/">全部品牌 →</Link>
          </div>
          <div className="tag-row" style={{ gap: 8, marginBottom: 18 }}>
            {topBrands.map((b) => (
              <Link
                key={b.slug}
                href={`/brands/${b.slug}/`}
                className="tag"
                style={{ padding: "7px 14px", fontSize: 13.5 }}
              >
                {b.name}
              </Link>
            ))}
            <Link
              href="/brands/"
              className="tag tag--primary"
              style={{ padding: "7px 14px" }}
            >
              更多 →
            </Link>
          </div>
          <p className="table-scroll-hint">← 左右滑动查看完整表格 →</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>品牌</th>
                  <th>协议页</th>
                  <th>覆盖型号</th>
                  <th>接口</th>
                </tr>
              </thead>
              <tbody>
                {brandRows.map((b) => (
                  <tr key={b.slug}>
                    <td>
                      <Link href={`/brands/${b.slug}/`}>{b.name}</Link>
                    </td>
                    <td>{b.protocols}</td>
                    <td>{b.models}</td>
                    <td className="text-muted">
                      {b.interfaces.slice(0, 3).join("、")}
                      {b.interfaces.length > 3 && " 等"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <AdSlot format="inline" />

        <section aria-labelledby="latest-title">
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 id="latest-title" className="section-title" style={{ margin: 0 }}>
              最新发布
            </h2>
            <Link href="/changelog/">完整更新日志 →</Link>
          </div>
          <div className="update-list">
            {recent.map((p) => (
              <div key={p.slug} className="update-row">
                <span className="update-row__date">{p.updatedAt}</span>
                <Link
                  href={`/protocols/${p.category}/${p.slug}/`}
                  className="update-row__title"
                >
                  {p.title}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="changelog-title" style={{ marginTop: 48 }}>
          <h2 id="changelog-title" className="section-title">
            更新日志摘要
          </h2>
          <div className="grid-3">
            {changelog.slice(0, 3).map((c) => (
              <div key={c.date + c.title} className="card">
                <p
                  className="text-small"
                  style={{ margin: 0, color: "var(--color-primary)", fontWeight: 600 }}
                >
                  {c.date}
                </p>
                <h3 style={{ margin: "6px 0 8px", fontSize: 16 }}>{c.title}</h3>
                <ul className="feature-list">
                  {c.items.slice(0, 3).map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="faq-title" style={{ marginTop: 48 }}>
          <h2 id="faq-title" className="section-title">
            常见问题
          </h2>
          <p className="section-desc">
            以下问题来自接入过程中的高频困惑，答案均对应站内协议页与示例代码中的具体说明。
          </p>
          <div className="faq-list">
            {FAQS.map((f) => (
              <details key={f.q} className="faq-item">
                <summary className="faq-item__q">{f.q}</summary>
                <p className="faq-item__a">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="stats-title" style={{ marginTop: 48 }}>
          <h2 id="stats-title" className="section-title">
            站点数据
          </h2>
          <div className="grid-4">
            {stats.map((s) => (
              <div key={s.l} className="card" style={{ textAlign: "center" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 30,
                    fontWeight: 800,
                    color: "var(--color-primary)",
                  }}
                >
                  {s.n}
                </p>
                <p className="text-small text-muted" style={{ margin: 0 }}>
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="home-cta" style={{ marginTop: 48 }}>
          <h2>还没找到需要的型号？</h2>
          <p className="text-muted">
            本站持续扩充品牌与机型覆盖。如果你正在对接的设备暂未收录，可以把
            型号与接口信息发给我们，我们会优先补充对应协议页。
          </p>
          <div className="hero__actions" style={{ marginBottom: 0 }}>
            <Link href="/contact/" className="btn btn--primary">
              提交型号需求
            </Link>
            <Link href="/sitemap/" className="btn btn--secondary">
              查看完整站点地图
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
