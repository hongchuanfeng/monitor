import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: "广告声明",
  description:
    "本站展示的第三方广告由独立广告商提供，本站与其无隶属关系，广告内容不由本站负责。",
  alternates: { canonical: "/ads/" },
};

export default function AdsPage() {
  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="breadcrumb__sep">/</span>
          <span>广告声明</span>
        </nav>

        <div className="legal-page">
          <h1>广告声明</h1>
          <p className="legal-updated">最后更新：2026-11-26</p>

          <h2>一、广告的投放</h2>
          <p>
            本站通过 Google AdSense 平台在部分页面展示第三方广告。广告位置包括顶部横幅、侧边栏矩形、列表页穿插位与内容页内嵌位。广告容器以「广告」标识明确区分，与本站正文内容相互独立。
          </p>

          <h2>二、与广告商的关系</h2>
          <p>
            广告由 Google AdSense 及其广告商提供。本站与广告商之间不存在合伙、代理或雇佣关系，
            也未对广告商的商业行为承担任何责任。
          </p>

          <h2>三、广告内容不由本站负责</h2>
          <p>
            本站不对广告内容、链接指向的第三方网站内容或由广告引起的任何交易承担担保责任。
            广告所描述的产品与服务，其质量、真实性与合规性由广告商自行负责。若你发现不当广告，
            请通过 <a href="https://support.google.com/adsense" target="_blank" rel="nofollow noopener">Google AdSense 反馈中心</a>{" "}
            举报。
          </p>

          <h2>四、广告与本站内容无关联</h2>
          <p>
            广告商投放广告时可能依据你的浏览行为与 Cookie 信息进行定向，
            这不代表广告内容受到本站认可，也不代表本站与相关产品或服务存在任何形式的合作关系。
          </p>

          <h2>五、个性化广告的控制</h2>
          <p>
            你可以通过页面底部的 Cookie 同意横幅选择「仅必要」以停止加载个性化广告。
            关于 Cookie 的完整说明，请参阅 <Link href="/privacy/">隐私政策</Link>。
          </p>

          <h2>六、第三方链接</h2>
          <p>
            页脚「友情链接」区块列出的站点以及广告落地页均由第三方运营，本站不对其内容、
            隐私实践与可用性作出任何承诺。点击此类链接即表示离开本站，其内容受对应网站的条款约束。
          </p>

          <h2>七、广告投放策略</h2>
          <p>
            为保证阅读体验，本站遵循以下原则：不在代码块、表格与正文段落中间插入广告；
            不使用干扰用户点击的浮层或自动跳转；不投放与医疗安全相关的误导性内容；
            每个页面的广告数量控制在最低必要限度。
          </p>

          <h2>八、联系我们</h2>
          <p>
            关于广告的咨询与合作，请发送邮件至{" "}
            <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>。
          </p>
        </div>
      </div>
    </div>
  );
}