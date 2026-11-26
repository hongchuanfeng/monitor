import Link from "next/link";
import { friendLinks, legalLinks, siteConfig } from "@/data/site";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <p className="drawer__title" style={{ marginBottom: 14 }}>
          友情链接
        </p>
        <div className="footer-links">
          {friendLinks.map((l) => (
            <a
              key={l.url}
              href={l.url}
              className="footer-link"
              target="_blank"
              rel="nofollow noopener"
            >
              {l.name}
              <span className="footer-link__icon" aria-hidden="true">
                ↗
              </span>
            </a>
          ))}
        </div>

        <div className="footer-legal">
          {legalLinks.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="footer-bottom">
          <p>
            © {year} {siteConfig.publisher} · 保留所有权利
          </p>
          <p>
            协议资料由公开信息整理，实际以厂商原厂手册为准 ·{" "}
            <Link href="/sitemap/">站点地图</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
