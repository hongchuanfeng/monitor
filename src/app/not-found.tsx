import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page">
      <div className="container" style={{ textAlign: "center", padding: "80px 24px" }}>
        <p
          style={{
            fontSize: 72,
            fontWeight: 800,
            margin: 0,
            color: "var(--color-primary)",
            lineHeight: 1,
          }}
        >
          404
        </p>
        <h1 style={{ fontSize: 22, margin: "16px 0 8px" }}>页面不存在</h1>
        <p className="text-muted" style={{ marginBottom: 28 }}>
          你访问的内容可能已被移动或删除。可以搜索协议名，或回到首页继续浏览。
        </p>

        <form
          action="/search/"
          method="get"
          style={{ maxWidth: 460, margin: "0 auto 24px" }}
        >
          <label className="sr-only" htmlFor="nf-search">
            搜索关键字
          </label>
          <input
            id="nf-search"
            name="q"
            type="search"
            placeholder="搜索型号、协议名或关键字"
            style={{
              border: "1px solid var(--color-border-strong)",
              borderRadius: "var(--radius)",
              padding: "12px 16px",
              fontSize: 15,
              width: "100%",
            }}
          />
        </form>

        <div
          className="hero__actions"
          style={{ justifyContent: "center", marginBottom: 0 }}
        >
          <Link href="/" className="btn btn--primary">
            返回首页
          </Link>
          <Link href="/protocols/" className="btn btn--secondary">
            浏览全部协议
          </Link>
        </div>
      </div>
    </div>
  );
}