import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import { getProtocolsByCategory } from "@/data";
import { categories } from "@/data/site";
import type { Category } from "@/data/types";

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = categories.find((c) => c.slug === category);
  if (!cat) return {};
  const list = getProtocolsByCategory(category as Category);
  return {
    title: `${cat.name}通讯协议`,
    description: `${cat.desc} 已收录 ${list.length} 个协议页，包含帧格式、数据字典、报文示例与 C#/Java 连接代码。`,
    alternates: { canonical: `/protocols/${cat.slug}/` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = categories.find((c) => c.slug === category);
  if (!cat) notFound();

  const list = getProtocolsByCategory(category as Category);
  const brandCount = new Set(list.map((p) => p.brandSlug)).size;
  const modelCount = new Set(list.flatMap((p) => p.models)).size;

  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="breadcrumb__sep">/</span>
          <Link href="/protocols/">协议总览</Link>
          <span className="breadcrumb__sep">/</span>
          <span>{cat.name}</span>
        </nav>

        <h1 className="page-title">{cat.name}通讯协议</h1>
        <p className="page-subtitle">{cat.desc}</p>

        <div className="proto-meta">
          <div className="proto-meta__cell">
            <div className="proto-meta__label">协议页</div>
            <div className="proto-meta__value">{list.length}</div>
          </div>
          <div className="proto-meta__cell">
            <div className="proto-meta__label">品牌</div>
            <div className="proto-meta__value">{brandCount}</div>
          </div>
          <div className="proto-meta__cell">
            <div className="proto-meta__label">覆盖型号</div>
            <div className="proto-meta__value">{modelCount}</div>
          </div>
          <div className="proto-meta__cell">
            <div className="proto-meta__label">接口类型</div>
            <div className="proto-meta__value">
              {new Set(list.flatMap((p) => p.interfaces)).size} 种
            </div>
          </div>
        </div>

        <AdSlot format="banner" />

        {list.map((p) => (
          <Link
            key={p.slug}
            href={`/protocols/${p.category}/${p.slug}/`}
            className="protocol-item"
          >
            <span className="protocol-item__brand">{p.brand}</span>
            <h2 className="protocol-item__title">{p.title}</h2>
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
      </div>
    </div>
  );
}