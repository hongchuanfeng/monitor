"use client";

import { useCallback, useState } from "react";

type Props = {
  code: string;
  filename?: string;
  meta?: string;
  language?: string;
};

type TokenKind =
  | "str"
  | "comment"
  | "key"
  | "type"
  | "num"
  | "plain";

type Token = { kind: TokenKind; text: string };

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const JAVA_KEYWORDS = new Set([
  "public", "private", "protected", "internal", "static", "class", "interface",
  "struct", "enum", "record", "void", "var", "new", "return", "if", "else",
  "for", "foreach", "while", "do", "switch", "case", "break", "continue",
  "try", "catch", "finally", "throw", "throws", "async", "await", "using",
  "namespace", "package", "import", "this", "base", "null", "true", "false",
  "readonly", "const", "string", "int", "long", "double", "float", "bool",
  "byte", "char", "sealed", "override", "virtual", "abstract", "partial",
  "out", "in", "ref", "is", "as", "typeof", "nameof", "operator", "when",
]);

const PY_KEYWORDS = new Set([
  "def", "class", "return", "if", "elif", "else", "for", "while", "break",
  "continue", "try", "except", "finally", "raise", "with", "as", "import",
  "from", "pass", "lambda", "yield", "global", "nonlocal", "assert", "del",
  "is", "not", "and", "or", "in", "async", "await", "None", "True", "False",
  "self", "cls", "super",
]);

const PY_BUILTINS = new Set([
  "int", "str", "bytes", "float", "bool", "list", "dict", "set", "tuple",
  "range", "len", "print", "open", "enumerate", "zip", "sum", "min", "max",
  "abs", "round", "sorted", "type", "isinstance", "bytearray",
  "ValueError", "Exception", "RuntimeError", "struct", "dataclass", "field",
]);

/**
 * 把源码切成 token。
 *
 * 关键点：一次性扫完原文并按类别归组，绝不在「已插入 span 标签」的字符串上
 * 再跑一遍正则。否则 span 的 class 名（class / str / int）会被当成源码里的
 * 关键字重新着色，把标签本身打乱。
 */
function tokenize(code: string, language: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const push = (kind: TokenKind, text: string) => {
    if (text) tokens.push({ kind, text });
  };

  if (language === "python") {
    // Python：注释、三引号文档字符串、普通字符串
    while (i < code.length) {
      const ch = code[i];

      if (ch === "#") {
        const end = code.indexOf("\n", i);
        const stop = end < 0 ? code.length : end;
        push("comment", code.slice(i, stop));
        i = stop;
        continue;
      }

      if (code.startsWith('"""', i) || code.startsWith("'''", i)) {
        const quote = code.slice(i, i + 3);
        const end = code.indexOf(quote, i + 3);
        const stop = end < 0 ? code.length : end + 3;
        push("str", code.slice(i, stop));
        i = stop;
        continue;
      }

      if (ch === '"' || ch === "'") {
        let j = i + 1;
        while (j < code.length) {
          if (code[j] === "\\") {
            j += 2;
            continue;
          }
          if (code[j] === ch) break;
          if (code[j] === "\n") break;
          j++;
        }
        const stop = Math.min(j + 1, code.length);
        push("str", code.slice(i, stop));
        i = stop;
        continue;
      }

      if (/[A-Za-z_]/.test(ch)) {
        let j = i;
        while (j < code.length && /[A-Za-z0-9_]/.test(code[j])) j++;
        const word = code.slice(i, j);
        if (PY_KEYWORDS.has(word)) push("key", word);
        else if (PY_BUILTINS.has(word)) push("type", word);
        else push("plain", word);
        i = j;
        continue;
      }

      if (/[0-9]/.test(ch)) {
        let j = i;
        while (j < code.length && /[0-9.]/.test(code[j])) j++;
        push("num", code.slice(i, j));
        i = j;
        continue;
      }

      if (ch === "@") {
        let j = i + 1;
        while (j < code.length && /[A-Za-z0-9_.]/.test(code[j])) j++;
        push("key", code.slice(i, j));
        i = j;
        continue;
      }

      push("plain", ch);
      i++;
    }

    return tokens;
  }

  // Java / C#
  while (i < code.length) {
    const ch = code[i];

    if (code.startsWith("//", i)) {
      const end = code.indexOf("\n", i);
      const stop = end < 0 ? code.length : end;
      push("comment", code.slice(i, stop));
      i = stop;
      continue;
    }

    if (code.startsWith("/*", i)) {
      const end = code.indexOf("*/", i + 2);
      const stop = end < 0 ? code.length : end + 2;
      push("comment", code.slice(i, stop));
      i = stop;
      continue;
    }

    if (ch === '"') {
      let j = i + 1;
      while (j < code.length) {
        if (code[j] === "\\") {
          j += 2;
          continue;
        }
        if (code[j] === '"') break;
        if (code[j] === "\n") break;
        j++;
      }
      const stop = Math.min(j + 1, code.length);
      push("str", code.slice(i, stop));
      i = stop;
      continue;
    }

    if (ch === "'") {
      let j = i + 1;
      while (j < code.length) {
        if (code[j] === "\\") {
          j += 2;
          continue;
        }
        if (code[j] === "'") break;
        if (code[j] === "\n") break;
        j++;
      }
      const stop = Math.min(j + 1, code.length);
      push("str", code.slice(i, stop));
      i = stop;
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < code.length && /[A-Za-z0-9_]/.test(code[j])) j++;
      const word = code.slice(i, j);
      if (JAVA_KEYWORDS.has(word)) push("key", word);
      else if (/^[A-Z]/.test(word)) push("type", word);
      else push("plain", word);
      i = j;
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < code.length && /[0-9a-fA-FxX._]/.test(code[j])) j++;
      push("num", code.slice(i, j));
      i = j;
      continue;
    }

    push("plain", ch);
    i++;
  }

  return tokens;
}

const CLASS_BY_KIND: Record<TokenKind, string | null> = {
  str: "tok-str",
  comment: "tok-comment",
  key: "tok-key",
  type: "tok-type",
  num: "tok-num",
  plain: null,
};

/**
 * 轻量级语法高亮：不引入第三方依赖，按语言做词法着色。
 * 仅用于展示，不影响复制得到的原始文本。
 */
function highlight(code: string, language: string): string {
  return tokenize(code, language)
    .map((token) => {
      const cls = CLASS_BY_KIND[token.kind];
      const escaped = escapeHtml(token.text);
      return cls ? `<span class="${cls}">${escaped}</span>` : escaped;
    })
    .join("");
}

export default function CodeBlock({
  code,
  filename,
  meta,
  language = "csharp",
}: Props) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [code]);

  const download = useCallback(() => {
    if (!filename) return;
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
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
