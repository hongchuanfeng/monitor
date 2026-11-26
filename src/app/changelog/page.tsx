import type { Metadata } from "next";
import Link from "next/link";
import { changelog } from "@/data/changelog";

export const metadata: Metadata = {
  title: "更新日志",
  description:
    "监护仪与麻醉机通讯协议文档站的更新记录，包含新增协议页、字段勘误与代码示例变更。",
  alternates: { canonical: "/changelog/" },
};

export default function ChangelogPage() {
  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="breadcrumb__sep">/</span>
          <span>更新日志</span>
        </nav>

        <div className="legal-page">
          <h1>更新日志</h1>
          <p className="legal-updated">最后更新：2026-11-26</p>

          <p>
            本站持续维护协议内容。以下记录了内容的新增、勘误与结构调整，
            便于你判断某个协议页的可靠程度与时效。
          </p>

          <div style={{ marginTop: 24 }}>
            {changelog.map((entry) => (
              <article key={entry.date + entry.title} className="changelog-item">
                <div className="changelog-item__date">{entry.date}</div>
                <div>
                  <h2 className="changelog-item__title">{entry.title}</h2>
                  <ul className="changelog-item__list">
                    {entry.items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>

          <h2 style={{ marginTop: 40 }}>关于更新频率</h2>
          <p>
            我们保持每周至少一次内容更新的节奏。协议勘误通常在收到读者反馈后的 72
            小时内核实并发布，新机型的收录速度取决于公开资料的完整程度。
          </p>
        </div>
      </div>
    </div>
  );
}