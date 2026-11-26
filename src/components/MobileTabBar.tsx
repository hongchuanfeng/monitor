"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobileTabLinks } from "@/data/site";

export default function MobileTabBar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="mobile-tabbar" aria-label="快捷导航">
      <div className="mobile-tabbar__inner">
        {mobileTabLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`mobile-tabbar__link${isActive(l.href) ? " active" : ""}`}
          >
            <span className="mobile-tabbar__icon" aria-hidden="true">
              {l.icon}
            </span>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}