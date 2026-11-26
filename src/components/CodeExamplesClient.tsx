"use client";

import { useState } from "react";
import CodeBlock from "./CodeBlock";
import { codeExamples, codeExampleGroups } from "@/data/code-examples";

const LANGS = [
  { key: "csharp", label: "C# (.NET)" },
  { key: "java", label: "Java" },
] as const;

export default function CodeExamplesClient() {
  const [lang, setLang] = useState<"csharp" | "java">("csharp");
  const [activeGroup, setActiveGroup] = useState(codeExampleGroups[0].slug);

  return (
    <>
      <div className="code-tabs" role="tablist" aria-label="编程语言">
        {LANGS.map((l) => (
          <button
            key={l.key}
            type="button"
            role="tab"
            aria-selected={lang === l.key}
            className={`code-tabs__tab${lang === l.key ? " active" : ""}`}
            onClick={() => setLang(l.key)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="code-page-layout">
        <aside className="code-nav">
          {codeExampleGroups.map((g) => (
            <a
              key={g.slug}
              href={`#${g.slug}`}
              className={`code-nav__item${activeGroup === g.slug ? " active" : ""}`}
              onClick={() => setActiveGroup(g.slug)}
            >
              {g.title}
            </a>
          ))}
        </aside>

        <div>
          {codeExampleGroups.map((g) => {
            const gItems = codeExamples.filter((e) => e.slug === g.slug);
            const gPrimary = gItems.find((e) => e.lang === lang);
            if (!gPrimary) return null;
            const isActive = activeGroup === g.slug;
            return (
              <section
                key={g.slug}
                id={g.slug}
                style={{ marginBottom: 48, scrollMarginTop: 88 }}
              >
                <h2 style={{ fontSize: 21, margin: "0 0 6px" }}>
                  {g.title}
                  {isActive && (
                    <span
                      className="tag tag--primary"
                      style={{ marginLeft: 10, verticalAlign: "middle" }}
                    >
                      当前
                    </span>
                  )}
                </h2>
                <p className="text-muted" style={{ margin: "0 0 14px" }}>
                  {g.desc}
                </p>
                {gPrimary.dependency && (
                  <p
                    className="text-small text-muted"
                    style={{ margin: "0 0 10px" }}
                  >
                    依赖：<code>{gPrimary.dependency}</code>
                  </p>
                )}
                <CodeBlock
                  code={gPrimary.code}
                  filename={gPrimary.filename}
                  meta={lang === "csharp" ? "C# / .NET" : "Java"}
                  language={lang}
                />
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}