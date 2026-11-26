"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useConsent } from "./ConsentProvider";

type PrefKey = "necessary" | "analytics" | "ads";

const PREF_DESC: Record<PrefKey, string> = {
  necessary:
    "维持站点基本功能，例如 Cookie 同意状态与页面偏好。无法关闭。",
  analytics: "通过 Google Analytics 统计访问量与页面表现，帮助改进内容。",
  ads: "允许 Google AdSense 投放个性化广告并读取广告相关 Cookie。",
};

export default function CookieBanner() {
  const { decided, acceptAll, essentialOnly } = useConsent();
  const [showBanner, setShowBanner] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({
    necessary: true,
    analytics: false,
    ads: false,
  });

  useEffect(() => {
    if (decided) setShowBanner(false);
    else setShowBanner(true);
  }, [decided]);

  const apply = (next: Record<PrefKey, boolean>) => {
    setPrefs(next);
    // 只有广告与统计均被接受时，才视为接受全部
    if (next.analytics && next.ads) acceptAll();
    else essentialOnly();
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="cookie-banner" role="region" aria-label="Cookie 同意">
        <div className="container cookie-banner__inner">
          <p className="cookie-banner__text">
            我们使用 Cookie 来投放广告并分析站点流量。你可以接受全部、仅使用必要
            Cookie，或管理偏好。详见{" "}
            <Link href="/privacy/">隐私政策</Link>。
          </p>
          <div className="cookie-banner__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setShowPrefs(true)}
            >
              管理偏好
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={essentialOnly}
            >
              仅必要
            </button>
            <button type="button" className="btn btn--primary" onClick={acceptAll}>
              接受全部
            </button>
          </div>
        </div>
      </div>

      {showPrefs && (
        <div
          className="cookie-prefs"
          role="dialog"
          aria-modal="true"
          aria-label="Cookie 偏好设置"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPrefs(false);
          }}
        >
          <div className="cookie-prefs__panel">
            <h2 className="section-title" style={{ marginTop: 0 }}>
              Cookie 偏好
            </h2>
            <p className="text-small text-muted" style={{ marginTop: 0 }}>
              你可以随时通过页脚的隐私政策页面调整选择。拒绝非必要 Cookie
              后，个性化广告将不再加载。
            </p>

            {(["necessary", "analytics", "ads"] as PrefKey[]).map((key) => (
              <div className="cookie-prefs__row" key={key}>
                <div>
                  <div className="cookie-prefs__name">
                    {key === "necessary"
                      ? "必要 Cookie"
                      : key === "analytics"
                        ? "统计与分析"
                        : "广告"}
                  </div>
                  <p className="cookie-prefs__desc">{PREF_DESC[key]}</p>
                </div>
                <button
                  type="button"
                  className="switch"
                  role="switch"
                  aria-checked={prefs[key]}
                  aria-label={`切换${key === "necessary" ? "必要" : key === "analytics" ? "统计" : "广告"}Cookie`}
                  disabled={key === "necessary"}
                  onClick={() =>
                    apply({ ...prefs, [key]: !prefs[key] })
                  }
                />
              </div>
            ))}

            <div
              className="cookie-banner__actions"
              style={{ marginTop: 20, justifyContent: "flex-end" }}
            >
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setShowPrefs(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  apply(prefs);
                  setShowPrefs(false);
                }}
              >
                保存偏好
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
