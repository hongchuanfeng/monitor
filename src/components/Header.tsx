"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import SearchOverlay, { type SearchDoc } from "./SearchOverlay";
import { navLinks, siteConfig } from "@/data/site";

export default function Header({ docs }: { docs: SearchDoc[] }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 200);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // ⌘K / Ctrl+K 唤起搜索
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header className={`site-header${scrolled ? " scrolled" : ""}`}>
        <div className="container site-header__inner">
          <Link href="/" className="site-logo">
            <span className="site-logo__mark" aria-hidden="true">
              ◆
            </span>
            <span className="site-logo__text">{siteConfig.name}</span>
          </Link>

          <nav className="site-nav" aria-label="主导航">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="site-nav__link"
                aria-current={isActive(l.href) ? "page" : undefined}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="site-header__actions">
            <button
              type="button"
              className="icon-btn"
              aria-label="搜索"
              onClick={() => setSearchOpen(true)}
            >
              ⌕
            </button>
            <button
              type="button"
              className="icon-btn hamburger"
              aria-label="打开菜单"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <button
            type="button"
            className="drawer-backdrop"
            aria-label="关闭菜单"
            onClick={() => setMenuOpen(false)}
          />
          <div className="drawer" role="dialog" aria-label="站点导航">
            <p className="drawer__title">导航</p>
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className="drawer__link">
                {l.label}
              </Link>
            ))}
            <p className="drawer__title" style={{ marginTop: 24 }}>
              合规页面
            </p>
            <Link href="/privacy/" className="drawer__link">
              隐私政策
            </Link>
            <Link href="/contact/" className="drawer__link">
              联系我们
            </Link>
            <Link href="/disclaimer/" className="drawer__link">
              免责声明
            </Link>
          </div>
        </>
      )}

      {searchOpen && (
        <SearchOverlay docs={docs} onClose={() => setSearchOpen(false)} />
      )}
    </>
  );
}