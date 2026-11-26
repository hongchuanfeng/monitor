"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { SearchDoc } from "@/components/SearchOverlay";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? <mark key={i}>{p}</mark> : p,
      )}
    </>
  );
}

export default function SearchPageClient({ docs }: { docs: SearchDoc[] }) {
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [kind, setKind] = useState<string>("all");

  const kinds = ["all", "协议页", "代码示例", "品牌"];

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = docs;
    if (kind !== "all") list = list.filter((d) => d.kind === kind);
    if (!q) return list.slice(0, 20);
    return list
      .map((d) => {
        const hay = `${d.title} ${d.excerpt} ${d.keywords}`.toLowerCase();
        const idx = hay.indexOf(q);
        return { doc: d, score: idx >= 0 ? 100 - idx : -1 };
      })
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.doc);
  }, [docs, query, kind]);

  return (
    <>
      <form action="/search/" method="get" style={{ marginBottom: 20 }}>
        <label className="sr-only" htmlFor="search-input">
          搜索关键字
        </label>
        <input
          id="search-input"
          name="q"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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

      <div className="tag-row" style={{ marginBottom: 20 }}>
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            className={`tag${kind === k ? " tag--primary" : ""}`}
            style={{ padding: "6px 14px", cursor: "pointer" }}
            onClick={() => setKind(k)}
          >
            {k === "all" ? "全部" : k}
          </button>
        ))}
      </div>

      <p className="text-small text-muted">约 {results.length} 条结果</p>

      {results.length === 0 ? (
        <p className="text-muted">没有找到匹配的内容，换个关键字试试。</p>
      ) : (
        results.map((r) => (
          <Link key={r.href} href={r.href} className="search-result">
            <span className="search-result__kind">{r.kind}</span>
            <h2 className="search-result__title">
              <Highlight text={r.title} query={query.trim()} />
            </h2>
            <p className="search-result__excerpt">
              <Highlight text={r.excerpt} query={query.trim()} />
            </p>
          </Link>
        ))
      )}
    </>
  );
}