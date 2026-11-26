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

export default function HomePage() {
  const monitor = getProtocolsByCategory("monitor");
  const anesthesia = getProtocolsByCategory("anesthesia");
  const brands = getAllBrands();
  const topBrands = getTopBrands();
  const recent = getRecentUpdates(5);
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

  return (
    <div className="page">
      <div className="container">
        <AdSlot format="banner" />

        <section className="hero">
          <h1>监护仪与麻醉机 通讯协议文档库</h1>
          <p>
            全球 / 中国 前 10 品牌 · 帧结构与校验 · 数据字典与报文示例 · C# 与
            Java 连接示例代码
          </p>
          <div className="hero__actions">
            <Link href="/protocols/monitor/" className="btn btn--primary">
              浏览监护仪协议
            </Link>
            <Link href="/protocols/anesthesia/" className="btn btn--secondary">
              浏览麻醉机协议
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
        </section>

        <section aria-labelledby="cat-title">
          <h2 id="cat-title" className="section-title">
            设备品类
          </h2>
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

        <section aria-labelledby="brand-title" style={{ marginTop: 48 }}>
          <h2 id="brand-title" className="section-title">
            按品牌浏览
          </h2>
          <div className="tag-row" style={{ gap: 8 }}>
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
        </section>

        <AdSlot format="inline" />

        <section aria-labelledby="latest-title">
          <h2 id="latest-title" className="section-title">
            最新发布
          </h2>
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

        <section aria-labelledby="stats-title" style={{ marginTop: 48 }}>
          <h2 id="stats-title" className="section-title">
            站点数据
          </h2>
          <div className="grid-4">
            {[
              { n: String(monitor.length + anesthesia.length), l: "协议页" },
              { n: String(brands.length), l: "收录品牌" },
              { n: String(totalModels), l: "覆盖型号" },
              { n: "2", l: "示例语言" },
            ].map((s) => (
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
      </div>
    </div>
  );
}