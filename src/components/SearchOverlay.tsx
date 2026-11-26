"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export type SearchDoc = {
  kind: "协议页" | "代码示例" | "品牌";
  title: string;
  excerpt: string;
  href: string;
  keywords: string;
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? <mark key={i}>{part}</mark> : part,
  );
}

export default function SearchOverlay({
  docs,
  onClose,
}: {
  docs: SearchDoc[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs.slice(0, 8);
    return docs
      .map((d) => {
        const hay = `${d.title} ${d.excerpt} ${d.keywords}`.toLowerCase();
        const idx = hay.indexOf(q);
        return { doc: d, score: idx >= 0 ? 100 - idx : -1 };
      })
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.doc);
  }, [docs, query]);

  return (
    <div
      className="search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="站内搜索"
    >
      <div className="search-overlay__inner">
        <div className="search-overlay__field">
          <span aria-hidden="true" style={{ fontSize: 20, color: "#9ca3af" }}>
            ⌕
          </span>
          <input
            ref={inputRef}
            className="search-overlay__input"
            type="search"
            placeholder="搜索型号、协议名或关键字（如 HL7、RS-232、ETCO2）"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="搜索关键字"
          />
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="关闭搜索"
          >
            ✕
          </button>
        </div>
        <p className="search-overlay__hint">
          共 {results.length} 条结果 · 按 Esc 关闭
        </p>

        <div style={{ marginTop: 24 }}>
          {results.length === 0 ? (
            <p className="text-muted">没有找到匹配的内容，换个关键字试试。</p>
          ) : (
            results.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="search-result"
                onClick={onClose}
              >
                <span className="search-result__kind">{r.kind}</span>
                <h3 className="search-result__title">
                  {highlightMatch(r.title, query.trim())}
                </h3>
                <p className="search-result__excerpt">
                  {highlightMatch(r.excerpt, query.trim())}
                </p>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}