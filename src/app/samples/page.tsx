import type { Metadata } from "next";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import SamplePacketCard from "@/components/SamplePacketCard";
import { samplePackets } from "@/data/sample-packets";
import { categories } from "@/data/site";
import type { Category } from "@/data/types";

export const metadata: Metadata = {
  title: "样本数据包下载",
  description:
    "监护仪与麻醉机通讯协议的样本数据包，可直接下载原始字节、十六进制文本与逐段说明，用于联调前的解析器自检。",
  alternates: { canonical: "/samples/" },
  openGraph: {
    type: "website",
    title: "样本数据包下载",
    description:
      "各品牌监护仪与麻醉机通讯协议的样本数据包，含原始字节、十六进制文本与逐段说明。",
  },
};

export default function SamplesPage() {
  const totalBytes = samplePackets.reduce((sum, p) => sum + p.byteLength, 0);
  const hl7Count = samplePackets.filter((p) =>
    p.interfaces.some((i) => i.includes("HL7")),
  ).length;

  const byCategory = categories
    .map((c) => ({
      category: c,
      list: samplePackets.filter((p) => p.category === c.slug),
    }))
    .filter((g) => g.list.length > 0);

  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="breadcrumb__sep">/</span>
          <span>样本数据包</span>
        </nav>

        <h1 className="page-title">样本数据包下载</h1>
        <p className="page-subtitle">
          每个设备协议都提供一份真实结构的样本报文，用于在联调设备之前先验证自己的解析器。
          下载后可直接写入串口或 TCP 连接，也可以贴进日志做逐字节比对。
        </p>

        <div className="proto-meta">
          <div className="proto-meta__cell">
            <div className="proto-meta__label">样本包</div>
            <div className="proto-meta__value">{samplePackets.length}</div>
          </div>
          <div className="proto-meta__cell">
            <div className="proto-meta__label">覆盖品牌</div>
            <div className="proto-meta__value">
              {new Set(samplePackets.map((p) => p.brandSlug)).size}
            </div>
          </div>
          <div className="proto-meta__cell">
            <div className="proto-meta__label">HL7 报文</div>
            <div className="proto-meta__value">{hl7Count}</div>
          </div>
          <div className="proto-meta__cell">
            <div className="proto-meta__label">报文总字节</div>
            <div className="proto-meta__value">{totalBytes}</div>
          </div>
        </div>

        <div className="callout callout--info">
          <span className="callout__icon" aria-hidden="true">
            ℹ
          </span>
          <div>
            <p className="callout__title">三种格式怎么选</p>
            <p className="callout__body">
              <code>.bin</code> 是原始字节，协议页的 Python 解析器可直接拿它做自检；
              <code>.hex</code> 是空格分隔的十六进制文本，适合贴进日志或抓包工具比对；
              <code>.txt</code> 是逐段说明，写明了每个字节的字段含义与取值。
              HL7 这类文本协议另提供 <code>.raw</code>，就是报文的原始字符串，
              可直接贴进代码当样例数据。
            </p>
          </div>
        </div>

        <AdSlot format="banner" />

        <h2 className="section-title">怎么用这些样本包</h2>
        <div className="grid-3" style={{ marginBottom: 32 }}>
          <div className="card">
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>1. 先跑解析器自检</h3>
            <p className="text-small text-muted" style={{ margin: 0, lineHeight: 1.75 }}>
              协议页的 Python 实现内置了 demo，把 <code>.bin</code> 喂进去，
              校验和或段结构不对都会直接抛异常。
            </p>
          </div>
          <div className="card">
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>2. 再回放给设备</h3>
            <p className="text-small text-muted" style={{ margin: 0, lineHeight: 1.75 }}>
              用串口工具把 <code>.bin</code> 发给设备，观察它的应答是否与样本一致，
              可快速定位波特率与定界符设置问题。
            </p>
          </div>
          <div className="card">
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>3. 核对字段映射</h3>
            <p className="text-small text-muted" style={{ margin: 0, lineHeight: 1.75 }}>
              对照 <code>.txt</code> 里的逐段说明，逐字段核对参数编号与量纲，
              确认与院方系统期望的编码一致。
            </p>
          </div>
        </div>

        {byCategory.map((group) => (
          <section key={group.category.slug} style={{ marginBottom: 36 }}>
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <h2 className="section-title" style={{ margin: 0 }}>
                {group.category.name}
              </h2>
              <span className="text-small text-muted">
                {group.list.length} 个样本包
              </span>
            </div>

            <div className="grid-2">
              {group.list.map((p) => (
                <SamplePacketCard key={p.slug} packet={p} />
              ))}
            </div>
          </section>
        ))}

        <div className="callout callout--warning">
          <span className="callout__icon" aria-hidden="true">
            ⚠
          </span>
          <div>
            <p className="callout__title">样本包仅用于自检</p>
            <p className="callout__body">
              样本报文由公开资料整理而成，字段取值取自典型场景。不同批次固件的命令字、
              参数编号与量纲可能存在差异，正式接入前请以对应型号的原厂通讯协议手册为准，
              并在隔离环境中完成实测验证。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
