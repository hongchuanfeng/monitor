import { getAllBrands, getAllProtocols } from "@/data";
import { codeExamples } from "@/data/code-examples";
import { categories } from "@/data/site";
import type { SearchDoc } from "@/components/SearchOverlay";

/**
 * 站点搜索索引：协议页 + 代码示例 + 品牌。
 * 全部在构建期静态生成，无需后端服务。
 */
export function buildSearchIndex(): SearchDoc[] {
  const docs: SearchDoc[] = [];

  for (const p of getAllProtocols()) {
    const cat = categories.find((c) => c.slug === p.category);
    docs.push({
      kind: "协议页",
      title: p.title,
      excerpt: p.summary,
      href: `/protocols/${p.category}/${p.slug}/`,
      keywords: [
        p.brand,
        cat?.name ?? "",
        ...p.models,
        ...p.interfaces,
        ...p.frame.map((f) => f.field),
        ...p.dictionary.map((d) => d.name),
        p.baud,
      ].join(" "),
    });
  }

  for (const e of codeExamples) {
    docs.push({
      kind: "代码示例",
      title: `${e.title} · ${e.lang === "csharp" ? "C#" : "Java"}`,
      excerpt: e.desc,
      href: `/code/#${e.slug}`,
      keywords: [
        e.title,
        e.slug,
        e.filename,
        e.lang === "csharp" ? "C# .NET" : "Java",
        "串口",
        "TCP",
        "帧解析",
        "重连",
      ].join(" "),
    });
  }

  for (const b of getAllBrands()) {
    docs.push({
      kind: "品牌",
      title: `${b.name} 监护仪与麻醉机通讯协议`,
      excerpt: `${b.name} 品牌下收录 ${b.protocols.length} 个协议页、${b.models.length} 个型号。`,
      href: `/brands/${b.slug}/`,
      keywords: [b.name, b.slug, ...b.models, ...b.interfaces].join(" "),
    });
  }

  return docs;
}
