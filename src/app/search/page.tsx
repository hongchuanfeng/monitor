import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import SearchPageClient from "@/components/SearchPageClient";
import { buildSearchIndex } from "@/lib/search-index";

export const metadata: Metadata = {
  title: "站内搜索",
  description:
    "搜索监护仪与麻醉机通讯协议、型号、接口类型与连接示例代码，覆盖协议页、代码示例与品牌入口。",
  alternates: { canonical: "/search/" },
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  const docs = buildSearchIndex();

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 860 }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="breadcrumb__sep">/</span>
          <span>搜索</span>
        </nav>

        <h1 className="page-title">站内搜索</h1>
        <p className="page-subtitle">
          索引共 {docs.length} 条内容，覆盖协议页、代码示例与品牌入口。
        </p>

        <Suspense fallback={<p className="text-muted">搜索索引加载中…</p>}>
          <SearchPageClient docs={docs} />
        </Suspense>
      </div>
    </div>
  );
}