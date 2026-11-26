"use client";

import { useCallback, useState } from "react";

type Props = {
  code: string;
  filename?: string;
  meta?: string;
  language?: string;
};

/**
 * 轻量级语法高亮：不引入第三方依赖，按语言做词法着色。
 * 仅用于展示，不影响复制得到的原始文本。
 */
function highlight(code: string, language: string): string {
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (language === "java" || language === "csharp") {
    const keywords = new Set([
      "public", "private", "protected", "internal", "static", "class", "interface",
      "struct", "enum", "record", "void", "var", "new", "return", "if", "else",
      "for", "foreach", "while", "do", "switch", "case", "break", "continue",
      "try", "catch", "finally", "throw", "throws", "async", "await", "using",
      "namespace", "package", "import", "this", "base", "null", "true", "false",
      "readonly", "const", "string", "int", "long", "double", "float", "bool",
      "byte", "char", "sealed", "override", "virtual", "abstract", "partial",
      "out", "in", "ref", "is", "as", "typeof", "nameof", "operator", "when",
    ]);

    let result = escaped;

    // 字符串（先处理，避免内部内容被当作关键字）
    result = result.replace(
      /(&quot;|&#39;|")((?:\\.|(?!\1).)*)\1/g,
      (m) => `<span class="tok-str">${m}</span>`,
    );

    // 注释
    result = result.replace(
      /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
      (m) => `<span class="tok-comment">${m}</span>`,
    );

    // 关键字
    result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (m) =>
      keywords.has(m) ? `<span class="tok-key">${m}</span>` : m,
    );

    // 类型名
    result = result.replace(/\b([A-Z][A-Za-z0-9_]*)\b/g, (m) =>
      m.startsWith("<span") ? m : `<span class="tok-type">${m}</span>`,
    );

    // 数字
    result = result.replace(
      /\b(\d+(\.\d+)?[fFdDlL]?)\b/g,
      (m) => (m.startsWith("<span") ? m : `<span class="tok-num">${m}</span>`),
    );

    return result;
  }

  return escaped;
}

export default function CodeBlock({ code, filename, meta, language = "csharp" }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [code]);

  const download = useCallback(() => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? "example.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [code, filename]);

  const html = highlight(code, language);

  return (
    <div className="code-block">
      <div className="code-block__head">
        <span className="code-block__meta">
          {filename ? filename : "代码"}
          {meta ? ` · ${meta}` : ""}
        </span>
        <div className="code-block__actions">
          <button
            type="button"
            className={`code-btn${copied ? " done" : ""}`}
            onClick={copy}
          >
            {copied ? "已复制" : "复制"}
          </button>
          {filename && (
            <button type="button" className="code-btn" onClick={download}>
              下载
            </button>
          )}
        </div>
      </div>
      <pre className="code-pre">
        <code
          dangerouslySetInnerHTML={{ __html: html }}
          data-language={language}
        />
      </pre>
    </div>
  );
}
