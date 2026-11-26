import type { Metadata } from "next";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import { getAllBrands } from "@/data";
import { categories } from "@/data/site";

export const metadata: Metadata = {
  title: "品牌列表",
  description:
    "监护仪与麻醉机通讯协议库收录的品牌清单，涵盖 Philips、GE Healthcare、迈瑞、Dräger、日光电子、Masimo 等全球与中国前 10 品牌。",
  alternates: { canonical: "/brands/" },
};

export default function BrandsPage() {
  const brands = getAllBrands();

  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="breadcrumb__sep">/</span>
          <span>品牌</span>
        </nav>

        <h1 className="page-title">品牌列表</h1>
        <p className="page-subtitle">
          共收录 {brands.length} 个品牌，覆盖监护仪与麻醉机两类设备的通讯协议。
        </p>

        <AdSlot format="banner" />

        <div className="grid-2">
          {brands.map((b) => (
            <Link
              key={b.slug}
              href={`/brands/${b.slug}/`}
              className="card card--hover"
              style={{ display: "block" }}
            >
              <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>{b.name}</h2>
              <p className="text-small text-muted" style={{ margin: "0 0 12px" }}>
                {b.protocols.length} 个协议页 · {b.models.length} 个型号 ·{" "}
                {b.interfaces.length} 种接口
              </p>
              <div className="tag-row">
                {b.monitorCount > 0 && (
                  <span className="tag tag--primary">
                    监护仪 {b.monitorCount}
                  </span>
                )}
                {b.anesthesiaCount > 0 && (
                  <span className="tag tag--success">
                    麻醉机 {b.anesthesiaCount}
                  </span>
                )}
                {b.interfaces.slice(0, 3).map((i) => (
                  <span key={i} className="tag">
                    {i}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        <section style={{ marginTop: 48 }}>
          <h2 className="section-title">按品类浏览</h2>
          <div className="grid-2">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/protocols/${c.slug}/`}
                className="card card--hover"
                style={{ display: "block" }}
              >
                <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>
                  {c.name} {c.en}
                </h3>
                <p className="text-small text-muted" style={{ margin: 0 }}>
                  {c.desc}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}