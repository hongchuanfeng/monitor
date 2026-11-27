"use client";

import { useEffect, useMemo, useState } from "react";

export type TocItem = { id: string; label: string; children?: TocItem[] };

/** 扁平化后的目录项，isChild 用于区分层级 */
type FlatItem = TocItem & { isChild: boolean };

export default function SideNav({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  // 顶层项与其子项都是锚点目标，展开成一份扁平列表
  const flat = useMemo<FlatItem[]>(
    () =>
      items.flatMap((i) => [
        { ...i, isChild: false },
        ...(i.children ?? []).map((c) => ({ ...c, isChild: true })),
      ]),
    [items],
  );

  useEffect(() => {
    const targets = flat
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
  }, [flat]);

  return (
    <nav className="proto-toc" aria-label="本页目录">
      {flat.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`proto-toc__item${item.isChild ? " proto-toc__item--child" : ""}${activeId === item.id ? " active" : ""}`}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
