# AdSense 申请与隐私声明配置说明

本文档说明如何在站点中接入 Google AdSense、如何配置隐私与 Cookie 声明，以及申请账号时各表单项应该怎么填。

---

## 一、核心组件与数据流

站点的广告与隐私相关实现集中在三个文件：

| 文件 | 职责 |
| --- | --- |
| `src/components/ConsentProvider.tsx` | 同意状态的全局上下文，向下传递 `decided` 与 `personalized` |
| `src/components/CookieBanner.tsx` | 底部 Cookie 同意横幅，提供「接受全部」与「仅必要」两个选项 |
| `src/components/AdSlot.tsx` | 广告位容器，负责向 `window.adsbygoogle` 推送广告请求 |

数据流如下：

```
用户首次访问
   │
   ├─ ConsentProvider 读取 localStorage
   │     ├─ 无记录 → decided=false → CookieBanner 展示
   │     └─ 有记录 → decided=true  → 直接渲染页面
   │
   ├─ 用户点击「接受全部」→ personalized=true  → 持久化到 localStorage
   └─ 用户点击「仅必要」→ personalized=false → 持久化到 localStorage
                │
                ▼
        AdSlot 使用 effect
                │
                ├─ decided 为 false → 直接 return，不投放任何广告
                ├─ decided 为 true 且 personalized 为 true
                │     → ads.push({ client, slot, format, full_width_responsive })
                └─ decided 为 true 且 personalized 为 false
                      → ads.push({ ..., google_adsense_rr: "on" })  // 非个性化广告
```

> 关键点：AdSense 脚本在 `layout.tsx` 中通过 `next/script` 以 `afterInteractive` 策略加载，
> 且仅在配置了 `NEXT_PUBLIC_ADSENSE_CLIENT` 时才渲染。用户做出同意选择前，
> 广告位组件不会调用 `ads.push()`，因此不会产生个性化广告请求。

---

## 二、环境变量配置

在项目根目录创建 `.env.production`：

```bash
# 必填：AdSense 出版商 ID
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-0000000000000000
```

获取方式：AdSense 后台 →「账号」→「账号信息」→ 底部「AdSense 账号 ID」。

未配置时：

- 站点仍可正常访问与被收录
- 广告位显示占位提示「广告位预留（横幅）/ 配置 NEXT_PUBLIC_ADSENSE_CLIENT 后自动加载」
- `layout.tsx` 不会注入 `adsbygoogle.js` 脚本，不产生任何外部请求

这也是**提交 AdSense 申请前的推荐状态**：先以无广告状态上线并通过审核，
拿到审核通过后再补上环境变量重新部署，可以避免「空广告位」影响审核判断。

---

## 三、AdSense 后台配置步骤

### 3.1 账号与站点

| 表单项 | 填写内容 |
| --- | --- |
| 网站名称 | 监护仪与麻醉机通讯协议文档 |
| 网站地址 | `https://www.removewatermarker.com` |
| 网站类别 | 「技术文档 / 编程与开发」或最接近的选项 |
| 运营方式 | 「我使用自己的内容」 |

### 3.2 自动广告与广告位

1. 进入「广告」→「广告概览」，先让**自动广告**运行一段时间。
2. 自动广告稳定后，再按需创建手动广告位（推荐只用自动广告，避免广告位过多影响体验）。
3. 创建手动广告位时，把返回的 `ca-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX` 广告位 ID
   填入对应页面的 `<AdSlot slot="..." />` 属性。

站点当前使用 `AdSlot` 的位置：

| 位置 | 格式 |
| --- | --- |
| 首页 | `banner`（页面上方）与 `inline`（页尾附近） |
| 协议详情页 | `inline`（正文末尾） |
| 协议品类页 / 协议总览页 / 代码示例页 / 品牌页 | `banner`（页面上方） |
| 品牌详情页 | `banner`（页面上方）与 `inline`（正文末尾） |

### 3.3 隐私与消息中心

AdSense 后台 →「隐私与消息」，需完成两项配置：

**① Cookie 提示**

- 选择「Cookie 提示」，并通过 **Funding Choices** 部署到站点。
- Funding Choices 生成的代码应与本项目自带的 `CookieBanner` 二选一：
  - 保留自带的：实现更简单，样式与站点一致，但需在本文档中向审核方说明；
  - 改用 Funding Choices：属于 Google 官方方案，审核更顺畅，需移除 `CookieBanner` 的渲染。

> 当前项目默认保留自带横幅（`src/app/layout.tsx` 中的 `<CookieBanner />`）。
> 若审核被要求使用官方组件，把 `layout.tsx` 里这一行删掉，并按 Funding Choices
> 提供的代码在 `layout.tsx` 的 `<head>` 中引入即可。

**② 用户数据声明**

在「隐私与消息」中声明使用的 Cookie 与数据类别。若站点后续接入 GA4，需一并声明。

| 声明项 | 本站点对应 |
| --- | --- |
| 广告 Cookie | Google AdSense（个性化广告） |
| 分析 Cookie | Google Analytics（GA4），如已接入 |
| 功能 Cookie | 同意状态存储（本地 `localStorage`，非 Cookie） |
| 广告个性化 | 已实现，遵循用户选择 |

---

## 四、代码实现要点

### 4.1 广告位组件

```tsx
// src/components/AdSlot.tsx
const { decided, personalized } = useConsent();
const ref = useRef<HTMLModElement>(null);
const loaded = useRef(false);

useEffect(() => {
  if (!decided) return;          // 未做出选择 → 不投放
  if (!slot) return;             // 未配置广告位 ID → 不投放
  if (loaded.current) return;    // 避免 React 严格模式下重复投放

  const el = ref.current;
  if (!el) return;

  const ads = window.adsbygoogle || (window.adsbygoogle = []);
  ads.push({
    google_ad_client: process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "",
    google_ad_slot: slot,
    google_ad_format: "auto",
    google_ad_full_width_responsive: "true",
    ...(personalized ? {} : { google_adsense_rr: "on" }),
  });
  loaded.current = true;
}, [decided, personalized, slot]);
```

三个保护点值得保留：

1. `!decided` 早退 —— 保证未同意前不投放；
2. `loaded.current` 守卫 —— React 18/19 严格模式会二次挂载 effect，缺少守卫会重复 `ads.push`；
3. `google_adsense_rr: "on"` —— 用户选择「仅必要」时请求非个性化广告。

### 4.2 同意状态存储

`ConsentProvider` 把选择写入 `localStorage`，键名为 `monitor-protocol-consent`：

| 键值 | 含义 |
| --- | --- |
| `"all"` | 接受全部，允许个性化广告 |
| `"essential"` | 仅必要，仅展示非个性化广告 |

未写入该键时视为「尚未做出选择」，横幅会展示，广告位不投放。

用户可在页脚通过隐私政策页重新打开偏好面板调整选择，面板中的「统计与分析」与「广告」
两个开关分别对应 GA4 与 AdSense；只有两者同时开启才会被视作「接受全部」。

`CookieBanner` 提供三个操作：

| 按钮 | 行为 |
| --- | --- |
| 接受全部 | 立即写入 `"all"`，横幅关闭 |
| 仅必要 | 写入 `"essential"`，横幅关闭 |
| 管理偏好 | 打开偏好面板，可逐项开关 |

### 4.3 广告标识与视觉规范

- 每个广告容器都有 `广告` 文字标识（`.ad-slot__label`），满足 Google 对广告可识别性的要求。
- 广告区域通过 `ad-slot` 系列样式与正文分隔，桌面端为侧栏矩形，移动端自动转为横向条幅。
- 未配置广告位 ID 时显示占位说明而不是空白，便于开发阶段定位问题。

---

## 五、隐私声明文案要点

站点的 `/privacy/` 页面需要与 AdSense 后台的声明保持一致，至少覆盖：

1. **收集的数据类型** —— 设备信息、浏览记录、IP 地址、Cookie；
2. **用途** —— 广告投放、内容统计、体验优化；
3. **第三方** —— Google AdSense（Google LLC）、Google Analytics（Google LLC），并附上
   Google 隐私与条款链接；
4. **同意机制** —— 首次访问展示横幅，未选择前不加载个性化广告；
5. **选择权与撤回** —— 任何时候可在隐私政策页点击「重新选择 Cookie 偏好」；
6. **数据处理地点** —— Google 数据中心分布情况；
7. **未成年人条款**；
8. **政策更新** —— 变更时在页面标注更新日期；
9. **联系方式** —— 真实可用的邮箱。

---

## 六、GA4 接入（可选）

若需接入 GA4，在 `layout.tsx` 的 `<head>` 中加入：

```tsx
<Script
  async
  src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
  strategy="afterInteractive"
/>
```

并在 `<Script id="ga-init" strategy="afterInteractive">` 中写入 `gtag('config', ...)`。

注意事项：

- GA4 属于分析 Cookie，同样需要纳入隐私声明；
- 建议与 AdSense 的同意状态联动，未同意时不要触发 `gtag('config')`；
- 在 AdSense 后台完成 GA4 关联后，广告收入报表可直接显示来源渠道。

---

## 七、常见问题

**Q：广告位一直显示占位提示？**
A：`NEXT_PUBLIC_ADSENSE_CLIENT` 未配置或广告位 ID 未传入 `slot` 属性。修改 `.env.production` 后需重新执行 `npm run build`，
因为 `NEXT_PUBLIC_` 变量在构建时被内联。

**Q：控制台报 `adsbygoogle.push() error: No slot size for availableWidth`？**
A：容器宽度为 0 导致广告无法渲染。检查父级元素在广告渲染时是否已具备宽度，
本项目已通过 `data-full-width-responsive="true"` 交由 Google 自适应处理。

**Q：同一页面出现多个 `adsbygoogle.push()` 报错？**
A：确认 `AdSlot` 的 `loaded.current` 守卫未被移除，否则 React 严格模式会重复推送。

**Q：用户选了「仅必要」，为什么仍看到个性化广告？**
A：检查 `personalized` 是否正确传递到 `AdSlot`。该值来自 `useConsent()`，
若 `ConsentProvider` 未包在组件树上层，`personalized` 会一直是 `false`。

**Q：审核通过后必须重新构建吗？**
A：必须。`NEXT_PUBLIC_ADSENSE_CLIENT` 在构建时内联进 JS 产物，
仅重启服务不会生效。

---

## 八、相关文档

- 部署与域名绑定：`docs/部署与域名绑定.md`
- 准入自检清单：`docs/AdSense准入自检清单.md`
- 站内广告声明页：`/ads/`
- 站内隐私政策页：`/privacy/`
