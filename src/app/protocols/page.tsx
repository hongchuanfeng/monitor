import type { Metadata } from "next";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import { getAllProtocols, getProtocolsByCategory } from "@/data";
import { categories } from "@/data/site";
import type { Category } from "@/data/types";

export const metadata: Metadata = {
  title: "协议总览",
  description:
    "监护仪与麻醉机通讯协议总览，按品类与品牌筛选，查看帧格式、数据字典、报文示例与连接代码。",
  alternates: { canonical: "/protocols/" },
};

export default function ProtocolsIndexPage() {
  const protocols = getAllProtocols();
  const monitor = getProtocolsByCategory("monitor");
  const anesthesia = getProtocolsByCategory("anesthesia");
  const brands = Array.from(new Set(protocols.map((p) => p.brandSlug))).length;

  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="breadcrumb__sep">/</span>
          <span>协议总览</span>
        </nav>

        <h1 className="page-title">协议总览</h1>
        <p className="page-subtitle">
          共 {protocols.length} 个协议页，覆盖 {brands}{" "}
          个品牌。选择品类或品牌，查看对应的通讯协议说明。
        </p>

        <AdSlot format="banner" />

        <div className="list-layout">
          <aside className="filter-panel">
            <div className="filter-group">
              <p className="filter-group__title">品类</p>
              <Link
                href="/protocols/"
                className="filter-option"
                style={{ fontWeight: 600, color: "var(--color-text)" }}
              >
                全部品类（{protocols.length}）
              </Link>
              {categories.map((c) => {
                const count =
                  c.slug === "monitor" ? monitor.length : anesthesia.length;
                return (
                  <Link
                    key={c.slug}
                    href={`/protocols/${c.slug}/`}
                    className="filter-option"
                  >
                    {c.name}（{count}）
                  </Link>
                );
              })}
            </div>

            <div className="filter-group">
              <p className="filter-group__title">按品牌</p>
              {Array.from(new Set(protocols.map((p) => p.brandSlug)))
                .map((slug) => {
                  const p = protocols.find((x) => x.brandSlug === slug)!;
                  const count = protocols.filter(
                    (x) => x.brandSlug === slug,
                  ).length;
                  return (
                    <Link
                      key={slug}
                      href={`/brands/${slug}/`}
                      className="filter-option"
                    >
                      {p.brand}（{count}）
                    </Link>
                  );
                })}
            </div>

            <div className="filter-group">
              <p className="filter-group__title">按接口</p>
              {Array.from(new Set(protocols.flatMap((p) => p.interfaces)))
                .sort()
                .map((iface) => {
                  const count = protocols.filter((p) =>
                    p.interfaces.includes(iface),
                  ).length;
                  return (
                    <span key={iface} className="filter-option">
                      {iface}（{count}）
                    </span>
                  );
                })}
            </div>
          </aside>

          <div>
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <h2 className="section-title" style={{ margin: 0 }}>
                全部协议
              </h2>
              <span className="text-small text-muted">
                共 {protocols.length} 个型号
              </span>
            </div>

            {protocols.map((p) => (
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
                  <span>型号：{p.models.slice(0, 3).join("、")}</span>
                  {p.models.length > 3 && (
                    <span>等 {p.models.length} 个型号</span>
                  )}
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
          </div>
        </div>
      </div>
    </div>
  );
}
