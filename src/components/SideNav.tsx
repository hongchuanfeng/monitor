"use client";

import { useEffect, useState } from "react";

export type TocItem = { id: string; label: string; children?: TocItem[] };

export default function SideNav({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const targets = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);

    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: [0, 1] },
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [items]);

  const flat = items.flatMap((i) => [i, ...(i.children ?? [])]);

  return (
    <nav className="proto-toc" aria-label="本页目录">
      {flat.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`proto-toc__item${activeId === item.id ? " active" : ""}`}
          style={item.children ? { paddingLeft: 14, fontSize: 13.5 } : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
