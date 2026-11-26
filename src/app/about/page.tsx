import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "关于我们",
  description:
    "监护仪与麻醉机通讯协议文档站的运营主体、内容整理方式与收录范围说明。",
  alternates: { canonical: "/about/" },
};

export default function AboutPage() {
  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="breadcrumb__sep">/</span>
          <span>关于我们</span>
        </nav>

        <div className="legal-page">
          <h1>关于我们</h1>
          <p className="legal-updated">最后更新：2026-11-26</p>

          <h2>站点定位</h2>
          <p>
            本站是一个面向医疗设备软件开发者的技术文档站，聚焦监护仪（Patient
            Monitor）与麻醉机（Anesthesia Machine）的设备通讯协议。我们把散落在各厂商手册、
            论坛帖子与开源实现中的协议信息整理成结构一致的说明文档，让接入者不必在十几个来源之间反复比对。
          </p>

          <h2>我们收录什么</h2>
          <p>
            收录范围为全球与中国市场占有率前 10 的监护仪与麻醉机品牌。每个协议页包含六部分：协议概览、物理层与电气参数、帧格式、数据字典、命令与查询、报文示例，并附带 C# 与 Java 两套连接示例代码。
          </p>
          <ul>
            <li>
              覆盖 Philips、GE Healthcare、迈瑞、Dräger、日光电子、Masimo、Edwards、
              Getinge、MAQUET、Hamilton 等品牌
            </li>
            <li>
              协议类型涵盖 RS-232、RS-422、RS-485、以太网、HL7 v2 与 NMEA 0183
            </li>
            <li>每个协议页标注最后更新时间，重要修订会在更新日志中记录</li>
          </ul>

          <h2>内容整理方式</h2>
          <p>
            我们的整理原则是「可核对」：每一页都列出参考来源，并明确指出哪些内容取自厂商原厂手册、哪些来自公开的接口实现、哪些属于我们的归纳与验证说明。当不同来源存在冲突时，我们通常按厂商文档优先的原则处理，并在正文中标注差异。
          </p>
          <p>
            我们也会在正文中保留一些「踩坑提示」——例如设定值与实测值必须分开、波形差分编码需要还原、探头脱落时不可把旧值当作 0。这部分内容是接入实践中反复遇到的问题，对读者的实际帮助往往超过字段表本身。
          </p>

          <h2>运营主体</h2>
          <p>
            本站由 removewatermarker.com 运营，用于分享技术资料并为开发者提供工具入口。站点内容以技术文档为主，通过页面底部与页脚区域展示少量第三方广告。
          </p>

          <h2>联系我们</h2>
          <p>
            如果你在接入过程中发现协议描述有误，或希望我们补充某个具体型号，请通过{" "}
            <Link href="/contact/">联系我们</Link> 页面提交反馈。内容勘误会被优先处理，并同步更新到对应协议页与更新日志。
          </p>

          <h2>免责声明</h2>
          <p>
            本站内容仅供参考，不能替代厂商原厂手册，也不能作为医疗设备临床使用的依据。请阅读完整的{" "}
            <Link href="/disclaimer/">免责声明</Link>。
          </p>
        </div>
      </div>
    </div>
  );
}