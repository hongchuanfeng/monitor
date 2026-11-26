import type { Metadata } from "next";
import Link from "next/link";
import { getAllBrands, getAllProtocols } from "@/data";
import { categories } from "@/data/site";

export const metadata: Metadata = {
  title: "站点地图",
  description:
    "监护仪与麻醉机通讯协议文档站全部页面索引，包含协议页、品牌页、代码示例与合规页面。",
  alternates: { canonical: "/sitemap/" },
};

export default function SitemapPage() {
  const protocols = getAllProtocols();
  const brands = getAllBrands();

  const legal = [
    { href: "/about/", label: "关于我们" },
    { href: "/contact/", label: "联系我们" },
    { href: "/privacy/", label: "隐私政策" },
    { href: "/terms/", label: "服务条款" },
    { href: "/ads/", label: "广告声明" },
    { href: "/disclaimer/", label: "免责声明" },
    { href: "/changelog/", label: "更新日志" },
  ];

  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="breadcrumb__sep">/</span>
          <span>站点地图</span>
        </nav>

        <div className="legal-page">
          <h1>站点地图</h1>
          <p className="legal-updated">最后更新：2026-11-26</p>

          <p>
            本页列出站点的全部可索引页面。机器可读的 XML 版本位于{" "}
            <a href="/sitemap.xml">/sitemap.xml</a>。
          </p>

          <h2>主要页面</h2>
          <ul>
            <li>
              <Link href="/">首页</Link>
            </li>
            <li>
              <Link href="/protocols/">协议总览</Link>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/protocols/${c.slug}/`}>{c.name}通讯协议</Link>
              </li>
            ))}
            <li>
              <Link href="/code/">代码示例</Link>
            </li>
            <li>
              <Link href="/brands/">品牌列表</Link>
            </li>
            <li>
              <Link href="/search/">站内搜索</Link>
            </li>
          </ul>

          <h2>协议页（{protocols.length}）</h2>
          <ul>
            {protocols.map((p) => (
              <li key={p.slug}>
                <Link href={`/protocols/${p.category}/${p.slug}/`}>{p.title}</Link>
              </li>
            ))}
          </ul>

          <h2>品牌页（{brands.length}）</h2>
          <ul>
            {brands.map((b) => (
              <li key={b.slug}>
                <Link href={`/brands/${b.slug}/`}>{b.name}</Link>
              </li>
            ))}
          </ul>

          <h2>合规与说明页面</h2>
          <ul>
            {legal.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}