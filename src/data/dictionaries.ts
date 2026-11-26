import type { PhysioItem } from "./types";

/** 监护仪通用生理参数字典 —— 各品牌在此基础上追加厂商专有字段 */
export const DICT_MONITOR: PhysioItem[] = [
  {
    name: "ECG 心率",
    unit: "bpm",
    range: "0 – 300",
    resolution: "1 bpm",
    note: "由 R 波峰识别得出，主机在 ECG 波形丢失时保留最后有效值并标记为「无有效心率」。",
  },
  {
    name: "SpO₂ 血氧饱和度",
    unit: "%",
    range: "0 – 100",
    resolution: "1 %",
    note: "脉搏血氧测量值，不同厂商低灌注下的表现差异较大，需结合灌注指数 PI 判断可信度。",
  },
  {
    name: "PR 脉率",
    unit: "bpm",
    range: "0 – 300",
    resolution: "1 bpm",
    note: "多数机型与 ECG 心率独立计算，二者不一致时主机同时上传两个值。",
  },
  {
    name: "NIBP 无创血压",
    unit: "mmHg",
    range: "0 – 260（收缩压）",
    resolution: "1 mmHg",
    note: "以测量完成事件上报，包含收缩压 / 舒张压 / 平均压 / 测量模式 / 报警上下限。",
  },
  {
    name: "ART 有创血压",
    unit: "mmHg",
    range: "-50 – 300",
    resolution: "1 mmHg",
    note: "单通道机型通过通道号区分，多通道机型需读取通道标识字段。",
  },
  {
    name: "RR 呼吸率",
    unit: "bpm",
    range: "0 – 150",
    resolution: "1 bpm",
    note: "可来自 ECG 阻抗测量、Capno 波形或直接传感器，选用的来源不同会影响数值。",
  },
  {
    name: "T 体温",
    unit: "°C",
    range: "25 – 43",
    resolution: "0.1 °C",
    note: "区分体表探头、腔内探头与血温测温点，不同类型使用不同字段编号。",
  },
  {
    name: "EtCO₂ 呼末二氧化碳",
    unit: "mmHg",
    range: "0 – 150",
    resolution: "1 mmHg",
    note: "同时上报 FiO₂ 与 EtCO₂，capnogram 波形通常作为独立通道传输。",
  },
];

/** 麻醉机通用参数字典 —— 监护仪参数 + 麻醉机专有气体与回路参数 */
export const DICT_ANESTHESIA: PhysioItem[] = [
  ...DICT_MONITOR.slice(0, 6),
  {
    name: "EtCO₂ 呼末二氧化碳",
    unit: "mmHg",
    range: "0 – 150",
    resolution: "1 mmHg",
    note: "麻醉机的核心通气参数，与通气模式、RR、VT、PEEP 同时上报。",
  },
  {
    name: "FiO₂ 吸入氧浓度",
    unit: "%",
    range: "21 – 100",
    resolution: "1 %",
    note: "由氧传感器测得，低浓度段受传感器漂移影响较明显。",
  },
  {
    name: "MAC 最低肺泡有效浓度",
    unit: "%",
    range: "0 – 8",
    resolution: "0.1 %",
    note: "按当前吸入麻醉剂浓度与患者年龄换算，不同机型的年龄基准不同。",
  },
  {
    name: "Ppeak 气道峰压",
    unit: "cmH₂O",
    range: "0 – 120",
    resolution: "1 cmH₂O",
    note: "机械通气关键参数，需与 Pplat、PEEP 一并分析潮气量是否符合设定。",
  },
  {
    name: "PEEP 呼气末正压",
    unit: "cmH₂O",
    range: "0 – 30",
    resolution: "1 cmH₂O",
    note: "与 PEEP 设定值不同时以上报实测值为准。",
  },
  {
    name: "VT 潮气量",
    unit: "mL",
    range: "0 – 1500",
    resolution: "10 mL",
    note: "分为吸气潮气量与呼气潮气量，多数机型上报实测呼气潮气量。",
  },
  {
    name: "麻醉剂浓度",
    unit: "%",
    range: "0 – 8",
    resolution: "0.1 %",
    note: "七氟烷、异氟烷、恩氟烷、地氟烷各有独立字段，部分老机型仅支持其中一两种。",
  },
  {
    name: "回路压力 / 泄漏量",
    unit: "cmH₂O / %",
    range: "-10 – 100",
    resolution: "1 cmH₂O",
    note: "由麻醉机自检产生，主要用于回路脱落与漏气报警联动。",
  },
];
