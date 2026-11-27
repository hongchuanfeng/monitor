import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import CodeBlock from "@/components/CodeBlock";
import SideNav, { type TocItem } from "@/components/SideNav";
import { getAllProtocols, getProtocolBySlug } from "@/data";
import { codeExamples } from "@/data/code-examples";
import { pythonExampleBySlug } from "@/data/python-examples";
import { pythonSources } from "@/data/python-sources";
import { categories, siteConfig } from "@/data/site";

export function generateStaticParams() {
  return getAllProtocols().map((p) => ({
    category: p.category,
    slug: p.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getProtocolBySlug(slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.summary,
    keywords: [
      p.brand,
      ...p.models,
      ...p.interfaces,
      `${p.brand} 通讯协议`,
      "帧格式",
      "数据字典",
    ],
    alternates: { canonical: `/protocols/${p.category}/${p.slug}/` },
    openGraph: {
      type: "article",
      title: p.title,
      description: p.summary,
      url: `${siteConfig.url}/protocols/${p.category}/${p.slug}/`,
    },
  };
}

export default async function ProtocolDetailPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const p = getProtocolBySlug(slug);
  if (!p || p.category !== category) notFound();

  const cat = categories.find((c) => c.slug === p.category)!;
  const related = p.related
    .map((r) => getProtocolBySlug(r))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const csharpExample = codeExamples.find(
    (e) => e.slug === "frame-parser" && e.lang === "csharp",
  );
  const javaExample = codeExamples.find(
    (e) => e.slug === "frame-parser" && e.lang === "java",
  );
  const pythonMeta = pythonExampleBySlug[p.slug];
  const pythonSource = pythonSources[p.slug];

  const toc: TocItem[] = [
    { id: "overview", label: "协议概览" },
    { id: "physical", label: "物理层与电气参数" },
    { id: "frame", label: "帧格式" },
    { id: "dictionary", label: "数据字典" },
    { id: "commands", label: "命令与查询" },
    { id: "sample", label: "报文示例" },
    { id: "python", label: "Python 实现" },
    { id: "code", label: "连接示例" },
    { id: "sources", label: "参考来源" },
    { id: "related", label: "相关协议" },
  ];

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: siteConfig.url },
      {
        "@type": "ListItem",
        position: 2,
        name: "协议总览",
        item: `${siteConfig.url}/protocols/`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: cat.name,
        item: `${siteConfig.url}/protocols/${cat.slug}/`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: p.title,
        item: `${siteConfig.url}/protocols/${p.category}/${p.slug}/`,
      },
    ],
  };

  const techSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: p.title,
    description: p.summary,
    dateModified: p.updatedAt,
    inLanguage: "zh-CN",
    articleSection: cat.name,
    keywords: [...p.models, ...p.interfaces].join(", "),
    author: { "@type": "Organization", name: siteConfig.publisher },
    publisher: { "@type": "Organization", name: siteConfig.publisher },
  };

  return (
    <div className="page">
      <div className="container">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(techSchema) }}
        />

        <nav className="breadcrumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="breadcrumb__sep">/</span>
          <Link href="/protocols/">协议总览</Link>
          <span className="breadcrumb__sep">/</span>
          <Link href={`/protocols/${cat.slug}/`}>{cat.name}</Link>
          <span className="breadcrumb__sep">/</span>
          <Link href={`/brands/${p.brandSlug}/`}>{p.brand}</Link>
        </nav>

        <div className="proto-layout">
          <aside className="proto-sidebar">
            <SideNav items={toc} />
          </aside>

          <article className="proto-body">
            <h1 style={{ fontSize: 30, lineHeight: 1.35, margin: "0 0 12px" }}>
              {p.title}
            </h1>

            <div className="proto-meta">
              <div className="proto-meta__cell">
                <div className="proto-meta__label">品牌</div>
                <div className="proto-meta__value">{p.brand}</div>
              </div>
              <div className="proto-meta__cell">
                <div className="proto-meta__label">品类</div>
                <div className="proto-meta__value">{cat.name}</div>
              </div>
              <div className="proto-meta__cell">
                <div className="proto-meta__label">接口</div>
                <div className="proto-meta__value">{p.interfaces.join(" / ")}</div>
              </div>
              <div className="proto-meta__cell">
                <div className="proto-meta__label">通讯参数</div>
                <div className="proto-meta__value">{p.baud}</div>
              </div>
              <div className="proto-meta__cell">
                <div className="proto-meta__label">最后更新</div>
                <div className="proto-meta__value">{p.updatedAt}</div>
              </div>
            </div>

            <div className="callout callout--info">
              <span className="callout__icon" aria-hidden="true">
                ℹ
              </span>
              <div>
                <p className="callout__title">覆盖型号</p>
                <p className="callout__body">{p.models.join("、")}</p>
              </div>
            </div>

            <h2 id="overview">协议概览</h2>
            {p.overview.map((para, i) => (
              <p key={i}>{para}</p>
            ))}

            <h2 id="physical">物理层与电气参数</h2>
            <ul>
              {p.physical.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>

            <h2 id="frame">帧格式</h2>
            <p className="table-scroll-hint">← 左右滑动查看完整表格 →</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>字段</th>
                    <th>长度</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  {p.frame.map((f, i) => (
                    <tr key={i}>
                      <td>
                        <code>{f.field}</code>
                      </td>
                      <td>{f.length}</td>
                      <td>{f.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 id="dictionary">数据字典</h2>
            <p className="table-scroll-hint">← 左右滑动查看完整表格 →</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>测量项</th>
                    <th>单位</th>
                    <th>量程</th>
                    <th>分辨率</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  {p.dictionary.map((d, i) => (
                    <tr key={i}>
                      <td>
                        <strong>{d.name}</strong>
                      </td>
                      <td>{d.unit}</td>
                      <td>{d.range}</td>
                      <td>{d.resolution}</td>
                      <td>{d.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 id="commands">命令与查询</h2>
            <p className="table-scroll-hint">← 左右滑动查看完整表格 →</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>命令</th>
                    <th>请求</th>
                    <th>响应</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  {p.commands.map((c, i) => (
                    <tr key={i}>
                      <td>
                        <strong>{c.name}</strong>
                      </td>
                      <td>{c.request}</td>
                      <td>{c.response}</td>
                      <td>{c.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 id="sample">报文示例</h2>
            <p>以下为一条示例报文的十六进制形式与逐段解读：</p>
            <div className="code-block">
              <div className="code-block__head">
                <span className="code-block__meta">报文示例 · HEX</span>
              </div>
              <pre className="code-pre">
                <code>{p.sampleHex}</code>
              </pre>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>字节</th>
                    <th>含义</th>
                  </tr>
                </thead>
                <tbody>
                  {p.decode.map((d, i) => (
                    <tr key={i}>
                      <td>
                        <code>{d.hex}</code>
                      </td>
                      <td>{d.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <AdSlot format="inline" />

            {pythonSource && (
              <>
                <h2 id="python">Python 实现</h2>
                <p>
                  下面是针对本协议生成的 Python 3 帧解析器。它按本页「帧格式」表的结构
                  定义实现：起始符定位、长度字段推导、校验和验证、数据区参数解析，
                  与上方「报文示例」表逐段对应。
                </p>
                <div className="callout callout--info">
                  <span className="callout__icon" aria-hidden="true">
                    ℹ
                  </span>
                  <div>
                    <p className="callout__title">可直接运行验证</p>
                    <p className="callout__body">
                      代码内置 demo，会用本页的示例报文做一次自检：校验和不过或帧结构
                      对不上都会直接抛异常。保存为
                      <code>{pythonSource.filename}</code> 后执行{" "}
                      <code>python {pythonSource.filename}</code> 即可。
                    </p>
                  </div>
                </div>
                {pythonMeta?.notes?.length ? (
                  <ul>
                    {pythonMeta.notes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                ) : null}
                <CodeBlock
                  code={pythonSource.code}
                  filename={pythonSource.filename}
                  language="python"
                />
              </>
            )}

            <h2 id="code">连接示例</h2>
            <p>
              下面给出 C# 与 Java 两套等价的帧解析实现，可直接用于本协议的字节流处理。
              完整的串口、TCP、重连示例见 <Link href="/code/">代码示例页</Link>。
            </p>

            {csharpExample && (
              <>
                <h3>C# 实现</h3>
                <CodeBlock
                  code={csharpExample.code}
                  filename={csharpExample.filename}
                  language="csharp"
                />
              </>
            )}
            {javaExample && (
              <>
                <h3>Java 实现</h3>
                <CodeBlock
                  code={javaExample.code}
                  filename={javaExample.filename}
                  language="java"
                />
              </>
            )}

            <h2 id="sources">参考来源</h2>
            <ul className="source-list">
              {p.sources.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            <div className="callout callout--warning">
              <span className="callout__icon" aria-hidden="true">
                ⚠
              </span>
              <div>
                <p className="callout__title">使用前请核对原厂手册</p>
                <p className="callout__body">
                  本页内容由公开资料整理与交叉核对得出，不同批次固件的命令字与字段
                  定义可能存在差异。正式接入前请以对应型号的原厂通讯协议手册为准，
                  并在隔离环境中完成实测验证。
                </p>
              </div>
            </div>

            <h2 id="related">相关协议</h2>
            <div className="grid-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/protocols/${r.category}/${r.slug}/`}
                  className="card card--hover"
                  style={{ display: "block" }}
                >
                  <p
                    className="text-small"
                    style={{ margin: 0, color: "var(--color-primary)" }}
                  >
                    {categories.find((c) => c.slug === r.category)?.name} · {r.brand}
                  </p>
                  <p style={{ margin: "6px 0 0", fontWeight: 600, fontSize: 15 }}>
                    {r.title}
                  </p>
                </Link>
              ))}
            </div>

            <p className="meta-line" style={{ marginTop: 28 }}>
              <span>最后更新：{p.updatedAt}</span>
              <span>本页内容已核实</span>
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}