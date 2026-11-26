import type { Metadata } from "next";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import CodeExamplesClient from "@/components/CodeExamplesClient";

export const metadata: Metadata = {
  title: "连接示例代码",
  description:
    "监护仪与麻醉机的 C# 与 Java 连接示例代码，涵盖串口连接、TCP 连接、帧解析器、断线重连看门狗与生理参数输出，共五组完整实现。",
  alternates: { canonical: "/code/" },
};

export default function CodePage() {
  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="breadcrumb__sep">/</span>
          <span>代码示例</span>
        </nav>

        <h1 className="page-title">连接示例代码</h1>
        <p className="page-subtitle">
          完整的 C# 与 Java 连接实现，覆盖串口与 TCP 接入、帧解析、断线重连与参数输出。
          两套实现结构保持一致，便于逐节对照阅读。
        </p>

        <AdSlot format="banner" />

        <CodeExamplesClient />

        <div className="callout callout--info" style={{ marginTop: 24 }}>
          <span className="callout__icon" aria-hidden="true">
            ℹ
          </span>
          <div>
            <p className="callout__title">关于示例中的协议细节</p>
            <p className="callout__body">
              示例代码中的帧结构以 Philips IntelliVue 为例说明。不同厂商的命令字、
              校验方式与缩放因子差异较大，请结合对应协议页与原厂手册调整后再使用。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}