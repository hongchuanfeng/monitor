import Link from "next/link";
import type { SamplePacket } from "@/data/types";
import { categories } from "@/data/site";

/**
 * 样本数据包下载卡片。
 *
 * 三种格式各司其职：
 *   .bin  原始字节，可直接喂给串口/TCP 采集程序
 *   .hex  十六进制文本，便于贴进日志或调试代码
 *   .txt  人类可读说明，含逐段解读
 */
export default function SamplePacketCard({
  packet,
}: {
  packet: SamplePacket;
}) {
  const cat = categories.find((c) => c.slug === packet.category);

  return (
    <div className="sample-card">
      <div className="sample-card__head">
        <div>
          <p className="sample-card__brand">
            {cat?.name} · {packet.brand}
          </p>
          <h3 className="sample-card__title">
            <Link href={`/protocols/${packet.category}/${packet.slug}/`}>
              {packet.title}
            </Link>
          </h3>
        </div>
        <span className="sample-card__size">{packet.byteLength} 字节</span>
      </div>

      <p className="sample-card__summary">{packet.summary}</p>

      <dl className="sample-card__meta">
        <div>
          <dt>覆盖型号</dt>
          <dd>{packet.models.join("、")}</dd>
        </div>
        <div>
          <dt>接口</dt>
          <dd>{packet.interfaces.join(" / ")}</dd>
        </div>
        <div>
          <dt>通讯参数</dt>
          <dd>{packet.baud}</dd>
        </div>
      </dl>

      <div className="sample-card__files">
        <a
          className="sample-file"
          href={`/${packet.dir}/${packet.files.bin}`}
          download
        >
          <span className="sample-file__ext">.bin</span>
          <span className="sample-file__desc">原始字节</span>
        </a>
        <a
          className="sample-file"
          href={`/${packet.dir}/${packet.files.hex}`}
          download
        >
          <span className="sample-file__ext">.hex</span>
          <span className="sample-file__desc">十六进制</span>
        </a>
        <a
          className="sample-file"
          href={`/${packet.dir}/${packet.files.txt}`}
          download
        >
          <span className="sample-file__ext">.txt</span>
          <span className="sample-file__desc">逐段说明</span>
        </a>
        {packet.files.raw && (
          <a
            className="sample-file"
            href={`/${packet.dir}/${packet.files.raw}`}
            download
          >
            <span className="sample-file__ext">.raw</span>
            <span className="sample-file__desc">报文原文</span>
          </a>
        )}
      </div>
    </div>
  );
}
