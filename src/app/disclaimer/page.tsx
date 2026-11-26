import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: "免责声明",
  description:
    "本站协议资料仅供参考，实际以厂商原厂手册为准，不构成医疗建议，不用于临床决策。",
  alternates: { canonical: "/disclaimer/" },
};

export default function DisclaimerPage() {
  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="breadcrumb__sep">/</span>
          <span>免责声明</span>
        </nav>

        <div className="legal-page">
          <h1>免责声明</h1>
          <p className="legal-updated">最后更新：2026-11-26</p>

          <div className="callout callout--warning">
            <span className="callout__icon" aria-hidden="true">
              ⚠
            </span>
            <div>
              <p className="callout__title">重要提示</p>
              <p className="callout__body">
                本站内容仅供参考，不能替代厂商原厂手册，不得作为医疗设备临床使用、参数解读或诊疗决策的依据。
              </p>
            </div>
          </div>

          <h2>一、资料性质</h2>
          <p>
            本站发布的协议说明由公开资料整理、交叉核对与实测归纳而成，属于技术参考信息，
            而非厂商发布的正式技术文档。我们对内容的准确性与完整性作出合理努力，但无法保证其与任何具体型号、
            批次或固件版本完全一致。
          </p>

          <h2>二、以原厂手册为准</h2>
          <p>
            各厂商的通讯协议手册是其知识产权，受版权保护。本站对协议结构的描述可能与官方文档在术语、
            字段顺序或细节上存在差异。当出现不一致时，一律以厂商原厂手册为准，并请以你实际使用的硬件版本为准。
          </p>

          <h2>三、非医疗用途</h2>
          <p>
            本站的示例代码、数据字典与报文解析逻辑仅用于软件集成与协议调试，不构成医疗建议、
            不用于诊断或治疗决策，也不得用于替代厂商提供的临床安全机制。任何将本站信息用于临床场景的行为，
            其风险由使用者自行承担。
          </p>

          <h2>四、安全风险</h2>
          <p>
            与医疗设备建立通讯连接属于高风险操作。在真实设备上进行读写指令、参数写入或模式切换前，
            请确保：已阅读对应型号的原厂手册；设备处于安全的测试环境；已具备回滚方案；
            由具备资质的人员执行操作。错误的指令可能导致设备报警、记录中断，极端情况下可能影响患者安全。
          </p>

          <h2>五、第三方设备与商标</h2>
          <p>
            本站提及的设备名称、品牌与型号归各自权利人所有。此处仅为说明协议的适用对象，
            不构成任何形式的背书、认证、授权或商业合作声明。
          </p>

          <h2>六、第三方链接与广告</h2>
          <p>
            本站页脚包含的友情链接与页面中的第三方广告由独立第三方运营，本站不对其内容、
            安全性与合法性承担责任。详见 <Link href="/ads/">广告声明</Link>。
          </p>

          <h2>七、第三方广告与内容独立性</h2>
          <p>
            站点运营方与广告商之间不存在任何形式的控制、雇佣或代理关系，
            广告内容不构成对本站或相关产品服务的技术背书。
          </p>

          <h2>八、责任限制</h2>
          <p>
            在法律允许的最大范围内，本站运营方不对因使用或无法使用本站内容而产生的任何直接或间接损失承担责任，
            包括但不限于数据丢失、设备故障、业务中断与医疗事件。本条款与{" "}
            <Link href="/terms/">服务条款</Link> 共同构成完整的责任限制约定。
          </p>

          <h2>九、反馈勘误</h2>
          <p>
            如果你发现本站内容存在错误，请通过 <Link href="/contact/">联系我们</Link> 反馈，
            我们会核实后更新页面并记入 <Link href="/changelog/">更新日志</Link>。
          </p>

          <h2>十、联系我们</h2>
          <p>
            对本声明有疑问，请发送邮件至{" "}
            <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>。
          </p>
        </div>
      </div>
    </div>
  );
}