import Link from "next/link";
import { getAllProtocols } from "@/data";
import { pythonExampleBySlug } from "@/data/python-examples";
import { pythonSources } from "@/data/python-sources";

/**
 * 按设备列出全部协议的 Python 帧解析器。
 *
 * 每份源码都对应协议页「帧格式」表的结构定义，并内置 demo 自检，
 * 可直接用协议页给出的示例报文运行验证。
 */
export default function ProtocolPythonList() {
  const protocols = getAllProtocols().filter((p) => pythonSources[p.slug]);
  if (!protocols.length) return null;

  const monitor = protocols.filter((p) => p.category === "monitor");
  const anesthesia = protocols.filter((p) => p.category === "anesthesia");

  return (
    <section style={{ marginTop: 40 }}>
      <h2 style={{ fontSize: 24, margin: "0 0 8px" }}>全部设备的 Python 帧解析器</h2>
      <p className="text-muted" style={{ margin: "0 0 18px" }}>
        下列每一份源码都按对应协议页「帧格式」表的结构定义生成：
        起始符定位、长度字段推导、校验和验证与数据区参数解析。
        代码内置 demo，会用协议页的示例报文做一次自检，可直接运行验证。
      </p>

      {[
        { title: "监护仪", items: monitor },
        { title: "麻醉机", items: anesthesia },
      ].map((group) =>
        group.items.length ? (
          <div key={group.title} style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, margin: "0 0 12px" }}>{group.title}</h3>
            <div className="grid-2">
              {group.items.map((p) => {
                const meta = pythonExampleBySlug[p.slug];
                return (
                  <Link
                    key={p.slug}
                    href={`/protocols/${p.category}/${p.slug}/`}
                    className="card card--hover"
                    style={{ display: "block" }}
                  >
                    <p
                      className="text-small"
                      style={{ margin: 0, color: "var(--color-primary)" }}
                    >
                      {p.brand} · {meta?.filename ?? "parser.py"}
                    </p>
                    <p style={{ margin: "6px 0 0", fontWeight: 600, fontSize: 15 }}>
                      {p.title}
                    </p>
                    <p className="text-small text-muted" style={{ margin: "6px 0 0" }}>
                      {p.summary}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null,
      )}
    </section>
  );
}
