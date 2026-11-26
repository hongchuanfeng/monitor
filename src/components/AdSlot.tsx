"use client";

import { useEffect, useRef } from "react";
import { useConsent } from "./ConsentProvider";

type AdFormat = "banner" | "rectangle" | "half" | "inline" | "mobile";

type Props = {
  format?: AdFormat;
  /** AdSense 广告位 ID；未配置时显示占位 */
  slot?: string;
  /** 是否允许投放个性化广告（未个性化同意时仅展示非个性化） */
  className?: string;
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const FORMAT_LABEL: Record<AdFormat, string> = {
  banner: "横幅",
  rectangle: "矩形",
  half: "半高",
  inline: "内嵌",
  mobile: "移动端",
};

export default function AdSlot({ format = "banner", slot, className }: Props) {
  const { decided, personalized } = useConsent();
  const ref = useRef<HTMLModElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    // 未做出选择前不加载广告脚本；个性化同意前不加载个性化广告
    if (!decided) return;
    if (!slot) return;
    if (loaded.current) return;

    const el = ref.current;
    if (!el) return;

    try {
      const ads = window.adsbygoogle || (window.adsbygoogle = []);
      ads.push({
        google_ad_client: process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "",
        google_ad_slot: slot,
        google_ad_format: "auto",
        google_ad_full_width_responsive: "true",
        // 未同意个性化时请求非个性化广告
        ...(personalized ? {} : { google_adsense_rr: "on" }),
      });
      loaded.current = true;
    } catch {
      // 广告加载失败不影响页面内容
    }
  }, [decided, personalized, slot]);

  return (
    <aside
      className={`ad-slot ad-slot--${format}${className ? ` ${className}` : ""}`}
      aria-label="广告"
    >
      <span className="ad-slot__label">广告</span>
      <div className="ad-slot__inner">
        {slot ? (
          <ins
            ref={ref}
            className="adsbygoogle"
            style={{ display: "block", width: "100%" }}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          <p className="ad-slot__placeholder">
            广告位预留（{FORMAT_LABEL[format]}）
            <span>配置 NEXT_PUBLIC_ADSENSE_CLIENT 后自动加载</span>
          </p>
        )}
      </div>
    </aside>
  );
}
