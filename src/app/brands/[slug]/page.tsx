import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import { getAllBrands, getBrandBySlug } from "@/data";
import { categories } from "@/data/site";

export function generateStaticParams() {
  return getAllBrands().map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const b = getBrandBySlug(slug);
  if (!b) return {};
  return {
    title: `${b.name} 监护仪与麻醉机通讯协议`,
    description: `${b.name} 设备的通讯协议说明，覆盖 ${b.protocols.length} 个协议页、${b.models.length} 个型号，包含帧格式、数据字典、报文示例与连接代码。`,
    alternates: { canonical: `/brands/${b.slug}/` },
  };
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const b = getBrandBySlug(slug);
  if (!b) notFound();

  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="breadcrumb__sep">/</span>
          <Link href="/brands/">品牌</Link>
          <span className="breadcrumb__sep">/</span>
          <span>{b.name}</span>
        </nav>

        <h1 className="page-title">{b.name}</h1>
        <p className="page-subtitle">
          {b.protocols.length} 个协议页 · {b.models.length} 个型号 ·{" "}
          {b.interfaces.length} 种接口类型
        </p>

        <div className="proto-meta">
          <div className="proto-meta__cell">
            <div className="proto-meta__label">监护仪协议</div>
            <div className="proto-meta__value">{b.monitorCount}</div>
          </div>
          <div className="proto-meta__cell">
            <div className="proto-meta__label">麻醉机协议</div>
            <div className="proto-meta__value">{b.anesthesiaCount}</div>
          </div>
          <div className="proto-meta__cell">
            <div className="proto-meta__label">覆盖型号</div>
            <div className="proto-meta__value">{b.models.length}</div>
          </div>
          <div className="proto-meta__cell">
            <div className="proto-meta__label">接口</div>
            <div className="proto-meta__value">{b.interfaces.join(" / ")}</div>
          </div>
        </div>

        <AdSlot format="banner" />

        <section>
          <h2 className="section-title">协议页</h2>
          {b.protocols.map((p) => (
            <Link
              key={p.slug}
              href={`/protocols/${p.category}/${p.slug}/`}
              className="protocol-item"
            >
              <span className="protocol-item__brand">
                {categories.find((c) => c.slug === p.category)?.name} · {p.brand}
              </span>
              <h3 className="protocol-item__title">{p.title}</h3>
              <p className="protocol-item__summary">{p.summary}</p>
              <div className="protocol-item__meta">
                <span>型号：{p.models.join("、")}</span>
                <span>更新 {p.updatedAt}</span>
              </div>
              <div className="tag-row" style={{ marginTop: 10 }}>
                {p.interfaces.map((i) => (
                  <span key={i} className="tag">
                    {i}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </section>

        <section style={{ marginTop: 40 }}>
          <h2 className="section-title">覆盖型号</h2>
          <div className="tag-row" style={{ gap: 8 }}>
            {b.models.map((m) => (
              <span key={m} className="tag" style={{ padding: "7px 14px", fontSize: 13.5 }}>
                {m}
              </span>
            ))}
          </div>
        </section>

        <AdSlot format="inline" />
      </div>
    </div>
  );
}