import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: "联系我们",
  description:
    "监护仪与麻醉机通讯协议文档站的联系方式，支持协议勘误、补充新机型与代码示例问题反馈。",
  alternates: { canonical: "/contact/" },
};

export default function ContactPage() {
  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="breadcrumb__sep">/</span>
          <span>联系我们</span>
        </nav>

        <div className="legal-page">
          <h1>联系我们</h1>
          <p className="legal-updated">最后更新：2026-11-26</p>

          <p>
            欢迎对协议内容提出勘误，或告诉我们你还希望看到哪些型号的通讯协议。
            我们通常会在三个工作日内回复。
          </p>

          <h2>邮箱</h2>
          <p>
            <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
          </p>
          <p className="text-small text-muted">
            建议在邮件标题中注明协议页名称，便于我们定位，例如「Dräger Perseus
            A500 帧长度字段勘误」。
          </p>

          <h2>反馈表单</h2>
          <p>
            也可以使用下面的表单描述你的需求。表单会先在浏览器端校验并给出确认提示，
            提交后请通过上方邮箱与我们取得联系。
          </p>
          <ContactForm />

          <h2>常见问题</h2>
          <h3>能否提供某个具体型号的原厂手册？</h3>
          <p>
            不能。厂商手册通常受版权保护，我们只整理公开可得的接口信息与自行核对的结构描述。
          </p>

          <h3>发现协议描述有误怎么办？</h3>
          <p>
            请通过邮箱告知，并尽量附上你实测的报文样例与机型固件版本，我们会核实后更新对应页面并记入{" "}
            <Link href="/changelog/">更新日志</Link>。
          </p>

          <h3>可以转载本站内容吗？</h3>
          <p>
            请参阅 <Link href="/terms/">服务条款</Link> 中的内容使用条款。
          </p>
        </div>
      </div>
    </div>
  );
}