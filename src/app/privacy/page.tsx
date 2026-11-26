import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: "隐私政策",
  description:
    "本站的 Cookie 使用、第三方广告与统计服务说明，以及 GDPR / CCPA 下的数据权利与删除请求方式。",
  alternates: { canonical: "/privacy/" },
};

export default function PrivacyPage() {
  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="breadcrumb__sep">/</span>
          <span>隐私政策</span>
        </nav>

        <div className="legal-page">
          <h1>隐私政策</h1>
          <p className="legal-updated">最后更新：2026-11-26</p>

          <p>
            本政策说明 {siteConfig.publisher}（以下简称「本站」）在你访问{" "}
            {siteConfig.url} 时如何处理信息与 Cookie。你可以随时通过页面底部的 Cookie
            同意横幅调整偏好，拒绝非必要 Cookie 后个性化广告将不再加载。
          </p>

          <h2>一、我们收集的信息</h2>
          <p>本站为静态站点，不提供用户注册与账号体系。我们收集的信息分为两类：</p>
          <ul>
            <li>
              <strong>你主动提供的信息</strong>：通过{" "}
              <Link href="/contact/">联系我们</Link> 页面提交的反馈内容，包括你填写的称呼、邮箱与正文。
            </li>
            <li>
              <strong>自动收集的技术信息</strong>：由第三方服务在页面加载时记录，包括访问时间、页面地址、来源链接、浏览器与设备类型、IP地址，以及广告互动相关的标识符。这些信息不包含医疗数据，也不涉及任何患者信息。
            </li>
          </ul>

          <h2>二、Cookie 的使用与分类</h2>
          <h3>必要 Cookie</h3>
          <p>
            用于记录你的 Cookie 偏好选择、维持页面基本功能。这部分无法关闭。
          </p>
          <h3>统计与分析 Cookie</h3>
          <p>
            由 Google Analytics（GA4）设置，用于统计访问量、页面浏览与来源分布，帮助我们改进内容结构。
          </p>
          <h3>广告 Cookie</h3>
          <p>
            由 Google AdSense 设置，用于投放广告、防止广告欺诈、统计广告点击与转化，并依据你的浏览行为提供个性化广告。
          </p>
          <p>
            若你在偏好面板中关闭统计或广告，相应的脚本将不会被加载，广告将以非个性化方式呈现或完全不展示。
          </p>

          <h2>三、Google AdSense 与第三方广告</h2>
          <p>
            本站使用 Google AdSense 展示第三方广告。Google 及其合作伙伴可能使用 Cookie
            或类似技术投放广告并收集广告服务信息，具体机制可参考 Google 的{" "}
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="nofollow noopener"
            >
              广告技术说明
            </a>
            。广告内容由第三方广告商提供，本站不对广告内容或通过广告获取的外部网站内容承担责任，详见{" "}
            <Link href="/ads/">广告声明</Link>。
          </p>
          <p>
            本站已接入 Google 的隐私与消息（Privacy &amp; Messaging）中心，你可以通过页面底部的 Cookie
            同意横幅修改针对广告个性化的选择。
          </p>

          <h2>四、第三方服务清单</h2>
          <ul>
            <li>Google AdSense —— 广告投放与广告相关 Cookie</li>
            <li>Google Analytics (GA4) —— 访问统计</li>
            <li>Google reCAPTCHA（如启用）—— 表单防滥用</li>
            <li>Cloudflare 或同类 CDN —— 内容分发与安全防护</li>
          </ul>
          <p>上述服务均独立处理数据，其隐私政策以各自官网为准。</p>

          <h2>五、GDPR / CCPA 下的权利</h2>
          <p>
            在适用地区，你有权访问、更正、删除你的个人数据，限制或反对处理，撤回同意，以及
            选择不出售个人信息。你也可以要求我们不基于敏感类别信息作出个性化广告选择。
          </p>
          <p>
            撤回同意可通过页面底部的「管理偏好」按钮完成，修改后选择会被保存，无需重复操作。
            对于其他数据权利请求，请发送邮件至{" "}
            <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>，我们会在法定期限内（通常为 30
            天）答复。
          </p>

          <h2>六、数据安全与保留</h2>
          <p>
            本站全程使用 HTTPS 加密传输。我们不会主动收集敏感个人信息，也不会出售个人信息。
            通过联系表单提交的信息仅用于回复你的请求，保留至问题解决后的合理期限。
          </p>

          <h2>七、未成年人条款</h2>
          <p>
            本站内容面向医疗设备开发者，不面向未成年人，不主动收集 13
            岁以下儿童的个人信息。
          </p>

          <h2>八、政策更新</h2>
          <p>
            当本政策发生实质性变更时，我们会在本页更新「最后更新」日期，并在必要时通过页面公告说明变更内容。继续使用本站即表示你接受更新后的政策。
          </p>

          <h2>九、联系我们</h2>
          <p>
            关于本政策的疑问，请通过 <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>{" "}
            或 <Link href="/contact/">联系我们</Link> 页面与我们取得联系。
          </p>
        </div>
      </div>
    </div>
  );
}