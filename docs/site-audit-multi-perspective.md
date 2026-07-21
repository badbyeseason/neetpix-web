# Neetpix 全方位审视报告

**审视日期**：2026-07-21
**审视对象**：https://neetpix.com
**审视视角**：资深站长 / 知名网站创业者 / 互联网投资人

## 总览

- 三视角合计发现问题：**68 条**
- P0 严重问题：**13 条**（其中 1.5.1 与 1.1.1 同一问题，单列以突出严重性）
- P1 中等问题：**30 条**
- P2 优化项：**25 条**

审视基于对 `web/` 源码（首页、布局、工具页、sitemap/robots、next.config、package.json、API 路由、SEO 组件）、`docs/` 4 份现有规划文档、以及线上 neetpix.com 公开表现的逐项核查。每条问题均标注 P0/P1/P2 严重度、归属（本次执行 / 后续 spec / 持续运营），并给出具体到文件/配置的可执行行动建议。

严重度判定标准：
- **P0**：影响线上稳定 / 用户体验 / SEO 收录的关键问题，应立即修复（本次 spec 或 7 天内）
- **P1**：明显但非紧急的问题，30 天内修复
- **P2**：优化项，可延后

---

## 视角 1：资深站长审视

### 1.1 技术与基础设施

#### 1.1.1 [P0] `next.config.ts` 几乎为空，未配置任何安全响应头
当前 `web/next.config.ts` 仅 9 行，仅启用 next-intl 插件，未导出 `headers()`。线上响应头缺失 `Content-Security-Policy`、`Strict-Transport-Security`、`X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy`。这是隐私叙事站点的硬伤——HN/Reddit 用户用 DevTools 一查就破。**行动**：在 `next.config.ts` 内新增 `async headers()` 配置，对所有路由 `(.*)` 输出至少：
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.googletagmanager.com https://hm.baidu.com; connect-src 'self' https://api.mymemory.translated.net; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline';`（`wasm-unsafe-eval` 为 qpdf-wasm/onnxruntime-web 必需）

#### 1.1.2 [P0] 无错误监控系统，生产事故盲飞
全站未集成 Sentry 或任何 runtime error 上报。WASM 加载失败、Web Worker 崩溃、tesseract.js 模型下载失败、onnxruntime-web GPU 初始化失败等高频风险点，团队无法第一时间感知。`web/src/app/error.tsx` 仅渲染兜底 UI，未上报。**行动**：接入 `@sentry/nextjs`（免费层 5,000 errors/月足够），在 `sentry.client.config.ts` 中过滤掉 `AbortError`、`ResizeObserver loop` 等噪音；同时在 `app/error.tsx` 的 `Error` 组件内调用 `Sentry.captureException(error)`。

#### 1.1.3 [P0] `/api/translate` 路由无速率限制，可被作为开放代理滥用
`web/src/app/api/translate/route.ts` 已做输入校验（5000 字 / langpair 白名单），但**完全无频率限制**。攻击者可脚本化调用把 MyMemory 免费配额打满，导致 IP 被封后所有翻译功能瘫痪。当前是全站唯一外部 API 依赖，单点风险高。**行动**：使用 `@upstash/ratelimit` + `@upstash/redis`（免费层 10K commands/天）按 IP 限速：`30 req/min` + `200 req/day`；超限返回 429 + `Retry-After` header。

#### 1.1.4 [P1] 无任何自动化测试
`web/` 下无 `*.test.ts` 文件，27 个工具的核心库（`web/src/lib/pdf-to-word.ts`、`image-compress.ts`、`remove-background.ts` 等）均无单元测试。每次改动 PDF/图片处理逻辑全靠手动回归，长期不可持续。**行动**：新增 Vitest 配置，优先为 `lib/` 下纯函数模块（pdf-merge、pdf-split、image-convert、qr-generator 等）写快照/输入输出测试，目标覆盖率 30% 起步。

#### 1.1.5 [P1] 无 CI/CD 配置
仓库根目录无 `.github/workflows/`，代码 push 直接触发 Vercel 部署，无 lint/build/tsc 预检门禁。一旦主分支引入类型错误或构建失败，直接打挂生产。**行动**：新增 `.github/workflows/ci.yml`，PR 触发 `npm ci && npm run lint && npx tsc --noEmit && npm run build`，失败阻断合并；同时在 Vercel 项目设置开启 "GitHub Commit Checks" 阻断未通过 PR 的部署。

#### 1.1.6 [P1] 无 staging 环境保护
Vercel Preview Deployments 默认公开可访问，任何 PR 触发的 preview URL 可被搜索引擎或外部用户爬到未发布功能（如未对外的 PDF 工具）。**行动**：在 Vercel 项目设置 → Deployment Protection 开启 "Vercel Authentication" + "Password Protection" for Preview Deployments；并将 preview 域名加入 `robots.txt` Disallow。

#### 1.1.7 [P2] `sitemap.ts` 的 `lastModified: new Date()` 让搜索引擎无法判断真实更新
`web/src/app/sitemap.ts` 第 47 行所有 URL 都用 `new Date()`，每次构建全部 URL 都"今日更新"，Google 可能降低 trust 评分。**行动**：改为基于 git 最后修改时间（构建时通过 `git log` 注入）或固定上线日期；首页用构建时间，工具页用各自首次发布日期。

### 1.2 性能

#### 1.2.1 [P0] 重量级 WASM/JS 库未做按需加载分析，潜在包体积 30MB+
依赖中含 `@jspawn/qpdf-wasm`、`onnxruntime-web`、`@xenova/transformers`、`tesseract.js`、`pdfjs-dist`、`mammoth` 等大型库。当前 `web/src/app/[locale]/tools/*` 各工具页未使用 `next/dynamic({ ssr: false })` 显式拆分（grep 未发现），首页与工具页可能误将这些库打入首屏 chunk，LCP/INP 严重劣化。**行动**：
1. 安装 `@next/bundle-analyzer`，在 `next.config.ts` 用 `withBundleAnalyzer` 包装，跑 `ANALYZE=true npm run build` 输出 chunk 报告；
2. 对每个 `*Client.tsx` 内的库引入改为 `const lib = await import('xxx')` 模式（动态 import）；
3. WASM 文件（`public/qpdf.wasm`、`public/qpdf.js`）用 CDN cache-control 长缓存。

#### 1.2.2 [P1] `next.config.ts` 未启用 `experimental.optimizePackageImports`
`lucide-react` 整包导入会拉入全部图标，bundle 体积虚高。**行动**：在 nextConfig 加 `experimental: { optimizePackageImports: ['lucide-react'] }`，预期 lucide chunk 缩小 80%+。

#### 1.2.3 [P1] 无 `app/[locale]/loading.tsx` 路由级骨架屏
用户从首页跳工具页时若 Vercel 冷启动或 SSR 慢，白屏 1-3 秒。当前仅工具内 `processing` 状态有进度条。**行动**：在 `app/[locale]/tools/[tool]/loading.tsx` 加通用骨架屏（卡片占位 + spinner），覆盖所有工具页。

#### 1.2.4 [P1] manifest.json 声明 PWA 但缺 Service Worker
`web/public/manifest.json` 配置完整，但无 SW 注册代码（无 `service-worker.ts`、无 `next-pwa`）。安装后离线不可用，PWA 形同摆设。**行动**：用 `@serwist/next` 或手写 SW（缓存 `/static/`、WASM 文件、已访问工具页 HTML），在 `app/layout.tsx` 注册；目标：已访问工具可离线复用。

#### 1.2.5 [P2] 全站共用单张 `/og-image.png`，社交分享卡片无差异
所有工具页 openGraph.images 都指向同一文件，Twitter/微信分享卡片无法区分工具。**行动**：用 `@vercel/og` 在 `app/[locale]/tools/[tool]/opengraph-image.tsx` 内动态生成 1200×630 PNG（工具名 + 隐私 tagline + Logo），每页独立。

#### 1.2.6 [P2] 字体策略缺失
`web/README.md` 提到 `next/font` 加载 Geist，但 `web/src/app/layout.tsx` 实际未引入 `next/font`，无字体加载优化。**行动**：在根 layout 用 `import { Geist } from "next/font/google"` 引入，apply 到 `<html>` className；移除可能的系统字体回退闪烁。

### 1.3 用户体验（UX）

#### 1.3.1 [P0] 文件大小限制与营销叙事直接矛盾
`web/src/app/[locale]/tools/pdf-to-word/PdfToWordClient.tsx` 第 11 行 `MAX_SIZE = 50 * 1024 * 1024` 写死 50MB 限制，但首页 hero、`docs/marketing-and-growth-strategy.md` 文案反复宣称"没有文件大小限制 / no file size limits"。用户上传 60MB PDF 被静默拒绝 → "真免费无套路"叙事瞬间崩塌，差评高发。**行动**：二选一——
- **方案 A（推荐）**：真正取消大小限制，仅靠浏览器内存自然约束（PDF 工具 WASM 处理 200MB 内一般可行），并在 FAQ 解释"超大文件可能因浏览器内存失败"；
- **方案 B**：所有营销文案与首页 hero 显式标注"建议 ≤ 50MB"，保持代码现状。
- 同时检查其余 26 个工具是否也有隐藏大小限制，统一策略。

#### 1.3.2 [P1] 根级 `error.tsx` 与 `not-found.tsx` 仅英文，中文用户 404/500 看到英文文案
`web/src/app/error.tsx`、`web/src/app/not-found.tsx` 因不在 `[locale]/` 内无法使用 `useTranslations`，采用英文兜底。中文用户遇到错误页体验割裂。**行动**：在 `app/[locale]/error.tsx`、`app/[locale]/not-found.tsx` 新增本地化版本（next-intl 支持），保留根级作为最终 fallback。

#### 1.3.3 [P1] 无暗色模式
Header 用 `bg-white/80`、Footer 用 `bg-bg-warm`，无 `prefers-color-scheme` 适配。目标用户（HN/Reddit/开发者）偏好暗色，缺失影响停留时长与"懂技术"的品牌感知。**行动**：在 `globals.css` 用 CSS 变量定义 token，加 `@media (prefers-color-scheme: dark)` 覆盖；在 Header 加手动切换按钮 + localStorage 持久化。

#### 1.3.4 [P2] Feedback 浮动按钮与 ShareBar 微信 QR 模态 z-index 冲突
`Feedback.tsx` 浮动按钮 `z-50`，`ShareBar.tsx` 微信模态 `z-50`，移动端小屏 Feedback 按钮可能遮挡模态关闭按钮。**行动**：Feedback 按钮 z-index 下调到 `z-40`；微信模态打开时通过事件总线通知 Feedback 隐藏。

#### 1.3.5 [P2] `RelatedTools` 推荐过度堆砌
如 `image-compress/page.tsx` 第 51 行一次推荐 10 个相关工具，视觉拥挤且稀释点击率。**行动**：精简到 4-6 个，按"用户下一步行为"排序（image-compress 后推荐 image-convert 而非 image-id-photo）。

#### 1.3.6 [P2] 移动端 Header 工具下拉用 hover 展开，触屏设备无法触发
`Header.tsx` 第 132-135 行 `onMouseEnter` / `onMouseLeave` 控制 `toolsOpen`，iPad/触屏笔记本 hover 不触发，需点击触发按钮但交互不直觉。**行动**：改为 click + hover 双触发（`onClick` 也切换 toolsOpen），或对 `pointer: coarse` 媒体查询仅显示汉堡菜单。

### 1.4 SEO

#### 1.4.1 [P0] 工具页 title 模板缺核心 SEO 关键词
当前 title 格式 `"{toolName} - Neetpix"`（如 "PDF to Word - Neetpix"），未含高搜索量词 "Free / Online / No Upload"。marketing-strategy 文档第 143 行已规划 `Free PDF to Word Online – No Upload, No Limit | Neetpix` 但未落地。**行动**：批量改写 `web/src/messages/en.json` 与 `zh.json` 中 27 个工具的 `*.title` 字段，统一格式 `[Free] {tool} Online [No Upload] | Neetpix`；改写后需确保与 hero/H1 关键词一致。

#### 1.4.2 [P0] 无博客/内容目录，SEO 长尾策略无落地页
`docs/marketing-and-growth-strategy.md` 规划 12 篇 P0 博客（Smallpdf 替代、Remove.bg 替代、隐私风险等），但 `app/[locale]/blog/` 目录不存在。30 天内不会有显著 SEO 流量。**行动**：本次 spec 内新增 `app/[locale]/blog/[slug]/page.tsx` + MDX 内容目录 + `app/[locale]/blog/page.tsx` 列表页；先上线 4 篇 P0 文章（"PDF tool privacy risk"、"Smallpdf free alternative"、"Remove.bg free alternative"、"TinyPNG free alternative"），同步在 Dev.to / Hashnode / 知乎发布。

#### 1.4.3 [P1] `JsonLd.tsx` 仅输出 `WebApplication`，缺 `FAQPage` / `HowTo` / `BreadcrumbList`
`web/src/components/seo/JsonLd.tsx` 只渲染 WebApplication schema，Faq 组件虽存在但未输出对应 JSON-LD。Google Rich Results 多个特征位（FAQ 富结果、HowTo 步骤、面包屑）均错失。**行动**：在 `Faq.tsx` 内同步输出 `{"@type":"FAQPage","mainEntity":[...]}` JSON-LD；在工具页加 `BreadcrumbList`（Home > Category > Tool）；为有步骤的工具加 `HowTo` schema。

#### 1.4.4 [P1] 仅支持 en/zh，与 marketing-strategy 规划的 ja/es/fr/de 路线图脱节
中文市场被"帮小忙"+ WPS 垂直整合压制，英语市场竞争最激烈（Smallpdf/iLovePDF DR 80+）。日语市场 PDF 工具付费意愿高且竞争弱。**行动**：本次 spec 后排期独立 spec "i18n-expansion"，优先加 ja，按 en → ja → es → fr → de 顺序；翻译方式：机器翻译 + 关键页（首页、Top 10 工具）人工校对。

#### 1.4.5 [P1] 无对比页 / vs 页承接"替代品"长尾搜索
marketing-strategy 第 414-421 行规划 `/compare/smallpdf-vs-neetpix` 等对比页，但目录不存在。第二档关键词（"Smallpdf free alternative"、"iLovePDF 免费替代"）无承接页。**行动**：新增 `app/[locale]/compare/[slug]/page.tsx` 模板，先做 4 个对比页（vs Smallpdf / iLovePDF / Remove.bg / TinyPNG），含对比表 + JSON-LD `Article` + `ItemList`。

#### 1.4.6 [P2] `robots.ts` 过于简单，缺 sitemap 引用扩展
当前 `robots.ts` 仅 8 行，无 crawl-delay、无分语言 sitemap 引用。**行动**：扩展为多 sitemap（`/sitemap.xml` + `/sitemap-images.xml`），加 `crawl-delay: 1` 防爬虫压力。

### 1.5 安全

#### 1.5.1 [P0] （同 1.1.1，单列以突出严重性）CSP / HSTS / X-Frame-Options 全缺失
作为隐私叙事站点，缺失 CSP 与 HSTS 是叙事硬伤——HN 用户会用 DevTools 一查即破。详细行动见 1.1.1。

#### 1.5.2 [P1] Footer 直接暴露 `mailto:im.badbye@gmail.com`，邮件爬虫轻松抓取
`web/src/components/layout/Footer.tsx` 第 17 行 + `Feedback.tsx` 第 24 行 + `about/page.tsx` 第 86 行三处明文邮箱。半年内必然进垃圾邮件列表。**行动**：用 JS 运行时拼接邮箱（`user` + `@` + `neetpix.com`）替代 `mailto:` 明文；或改用托管 contact form（Vercel Form / Resend Contact Form）。

#### 1.5.3 [P1] `heic2any@0.0.4` 是 0.0.x 早期版本，长期未更新
`web/package.json` 第 21 行依赖 `heic2any@^0.0.4`，npm 上该包 4 年未更新，潜在兼容/安全风险。**行动**：评估替代（`heic-convert`、`libheif-js`），或锁定 exact version 并在 CI 加 `npm audit` 监控 CVE。

#### 1.5.4 [P2] 无依赖漏洞扫描
建议在 `.github/workflows/ci.yml` 加 `npm audit --production --audit-level=high` 步骤，或接入 Dependabot / Snyk，PR 中自动告警高危 CVE。

#### 1.5.5 [P2] `manifest.json` 的 `start_url: "/"` 在 `localePrefix: "as-needed"` 下中文 PWA 用户启动会落到英文首页
**行动**：start_url 改为相对路径，在 SW 中根据 `Accept-Language` 重定向到 `/zh/`；或在 manifest 加 `start_url: "/?from=pwa"` + 客户端检测语言跳转。

**本视角小计**：30 条问题（1.1 × 7、1.2 × 6、1.3 × 6、1.4 × 6、1.5 × 5）

---

## 视角 2：知名网站创业者审视

### 2.1 商业模式

#### 2.1.1 [P1] 0 变现 + Vercel/MyMemory 持续成本，runway 完全靠创始人自掏
`docs/growth-and-membership-strategy.md` 设定 MAU > 50,000 才进入阶段 3 付费，按当前 SEO 起量节奏可能要 12-18 个月。期间无任何收入验证付费意愿，且无外部信号判断产品市场契合度。**行动**：提前 6 个月试水"轻变现"——
1. 首页加 "Buy me a coffee" / Stripe 一次性捐赠按钮（5 分钟接入，0 维护）；
2. 对 PDF 转 Word 扫描件 OCR 功能引入"每日 3 次免费，超出看 5 秒赞助视频"；
3. 既不影响免费体验，又能验证付费意愿信号。

#### 2.1.2 [P1] 27 工具全部"完全免费 + 无限制"放弃所有变现杠杆
竞品 Smallpdf/iLovePDF 的免费版限制反而教育了用户"高级功能值钱"。Neetpix 一刀切免费相当于主动放弃定价锚点。**行动**：保留 26 个工具完全免费，对 1 个高价值工具（建议 PDF 转 Word，扫描件 OCR 模式）引入"批量 ≥ 10 文件需 Pro"或"单文件 > 50MB 需 Pro"，作为变现锚点与免费版的对比项。

#### 2.1.3 [P2] 无 B2B / API 产品线，错失高 ARPU 客群
Neetpix 的隐私架构对企业 IT/法务/金融是天然卖点。当前无 `/enterprise` 着陆页、无 API 文档。**行动**：本次 spec 后新增 `/enterprise` 着陆页（"Private deployment / API quota / SLA"）+ "申请 demo" 表单（Resend webhook 入库），测试企业线索获取成本；即便零成交也能验证需求。

### 2.2 产品力

#### 2.2.1 [P0] PDF 转 Word 质量与营销文案不匹配，差评高发隐患
`PdfToWordClient.tsx` 用 pdfjs-dist 提取文本 + docx 生成，对扫描件 PDF（图片型）完全无能为力，但 FAQ 与 marketing 文案未坦诚说明。用户上传扫描合同 → 输出空白 docx → 1-star 差评。**行动**：
1. 在 `pdf-to-word` 工具内加扫描件检测（提取文本字符数 / 总页数比 < 阈值即判定扫描件）；
2. 检测到扫描件时友好提示"该 PDF 为扫描件，建议先用 image-ocr 工具"并给出跳转链接；
3. FAQ 首条明确"仅支持文本型 PDF，扫描件请配合 OCR 工具"。

#### 2.2.2 [P1] 27 工具中无批量处理，竞品普遍支持
iLovePDF/Smallpdf 普遍支持批量上传（如批量压缩 20 张图、批量转 10 个 PDF）。Neetpix 仅 `PdfMergeClient` 支持多文件，其余单文件。这是用户最常吐槽的痛点。**行动**：优先为 `image-compress`、`image-convert`、`image-watermark` 加批量上传（拖入多文件 + 进度条 + zip 打包下载），3 个工具预计 3 人天。

#### 2.2.3 [P1] 无"最近使用"工具入口
`useFavorites` 仅收藏，但用户反复使用的工具无快速入口。回访后需重新在首页滚动查找。**行动**：在 `MyToolsSection` 旁新增"最近使用"区块，localStorage 存最近 5 个 `{toolKey, lastUsedAt}`，每次工具使用时更新。

#### 2.2.4 [P1] 工具内无"撤销/重做"
如 `image-resize` 调整尺寸后无法回退，用户需重新上传。降低探索意愿。**行动**：对图片类工具（resize、watermark、blur）引入 history stack（至少支持 1 次撤销），用 `Array<Blob>` 存历史状态。

#### 2.2.5 [P2] 截图翻译是独占卖点但首页曝光不足
首页 hero CTA 指向 `/tools/remove-background`（非独占工具），错失差异化叙事。marketing-strategy 第 15 行已识别 screenshot-translate 为"独占"但未落实到首页。**行动**：A/B 测试将 hero CTA 改为 `/tools/screenshot-translate`，副标题强调"别处找不到的 OCR + 翻译"。

#### 2.2.6 [P2] 工具页缺"使用步骤"可视化
Faq 是问答式，缺 3 步图文（上传 → 配置 → 下载）。**行动**：每个工具页在 Faq 上方加 3 步图文模块，同时输出 `HowTo` JSON-LD（步骤 + 预计耗时）。

### 2.3 用户留存

#### 2.3.1 [P1] PWA 安装引导未实现（manifest 有但无 beforeinstallprompt 监听）
`docs/growth-and-membership-strategy.md` A4 规划 PWA 安装引导，但代码中无 `beforeinstallprompt` 事件监听。PWA 安装用户的 30 日留存通常是普通用户的 3-5 倍。**行动**：在 `app/[locale]/layout.tsx` 或新增 `PwaInstallPrompt.tsx` 组件内监听 `beforeinstallprompt`，缓存事件后在 Header 显示"安装到桌面"按钮，已安装用户（`display-mode: standalone`）不显示。

#### 2.3.2 [P1] 无邮件订阅入口
growth-strategy P2 提及"新工具上线通知"邮件订阅，但首页与 About 页均无订阅入口。回访的最强抓手缺失。**行动**：首页底部加输入框 + "Get notified when new tools launch" 按钮，集成 Resend Audience（免费层 1,000 封/月）或 ConvertKit 免费层；月发 1 封新工具/新功能邮件。

#### 2.3.3 [P2] 收藏夹仅本地 localStorage，跨设备不同步
`useFavorites.ts` 用 localStorage，换浏览器/设备即丢失。即便不引入账号体系，也可低成本解决。**行动**：新增"导出收藏为 JSON 文件" + "分享收藏链接"（URL 编码收藏 key 列表，访问时自动导入），低成本绕过账号体系。

#### 2.3.4 [P2] 无"新工具上线"主动通知
用户不知道何时回访。**行动**：BookmarkHint 关闭后追加"订阅新工具"二次引导；PWA 启用后考虑 Web Push（需 SW + VAPID 密钥）。

### 2.4 用户获取

#### 2.4.1 [P0] 获客渠道单一依赖 SEO，但内容基建均未上线
博客目录不存在、对比页不存在、程序化 SEO 不存在。30 天内不会有显著自然流量。**行动**：本次 spec 内立即启动 4 篇 P0 博客（已规划）+ 4 个对比页；同步在 Dev.to / Hashnode / 知乎 / 即刻分发。

#### 2.4.2 [P0] PH/HN/Reddit 发布事件未执行，每延迟一周损失数千 UV
`docs/marketing-and-growth-strategy.md` 第二章详细规划了 PH/HN/Reddit 发布节奏与文案，但全部未执行。这是 0 成本最高单日 UV 渠道（PH Top 5 单日 3K-10K UV，HN 上首页 5K-20K UV）。**行动**：本次 spec 内排期 1 周完成物料准备（5-8 张截图、30 秒 GIF、maker comment 定稿），周二 PH 发布 → 周二 HN Show HN → 周三-周四 Reddit → 周五 V2EX。

#### 2.4.3 [P1] 无 Twitter/X 账号运营
未发现 @neetpix 账号痕迹。Build in public 是长期信任资产。**行动**：注册 @neetpix，每日 1 推（工具技巧 / 用户反馈截图 / build 进度），周度 thread 总结。

#### 2.4.4 [P1] 无外链建设计划
SEO 仅靠 on-page 难以竞争"free pdf to word"等红海词（竞品 DR 80+）。**行动**：主动联系 5-10 个 DA 40+ 工具博客/导航站申请收录：alternativeto.net、productmint.com、saashub.com、fossbytes.com、`/r/pdf` wiki 等；每月新增 2-3 个友链。

#### 2.4.5 [P2] 无 Chrome 扩展导流
growth-strategy P3 规划但未启动。**行动**：作为 Q3 独立 spec，扩展功能：右键图片 → 跳转 image-compress/remove-background；右键 PDF 链接 → 跳转 pdf-merge；扩展弹窗默认展示 Top 5 工具入口。每次扩展更新触发 Chrome Web Store 曝光。

### 2.5 反馈闭环

#### 2.5.1 [P1] 反馈仅 mailto 一条通道，KPI 月 50 条难达成
普通用户嫌 mailto 麻烦（需打开邮件客户端、填收件人、写正文）。**行动**：`FeedbackBar.tsx` 改为内联表单（类型下拉：bug / 建议 / 痕迹 + 描述 textarea + 可选邮箱 + 自动带浏览器/OS 信息），提交到 Vercel Form 或 Resend webhook 入库（Supabase 免费层）；保留 mailto 作为兜底。

#### 2.5.2 [P2] 无 NPS/CSAT 调研
**行动**：在工具下载成功 toast 后追加"这次体验打几分？" 1-5 星评分组件，localStorage 防重复（同工具同 session 仅触发一次），数据进 PostHog/GA4 事件，周度看分布。

#### 2.5.3 [P2] 无用户访谈机制
**行动**：About 页加"加入用户访谈池"链接（Calendly 15 分钟 + $10 Amazon 礼品卡），每月访谈 3-5 个真实用户，访谈纪要进 `docs/user-research-and-expansion-roadmap.md` 持续更新。

**本视角小计**：21 条问题（2.1 × 3、2.2 × 6、2.3 × 4、2.4 × 5、2.5 × 3）

---

## 视角 3：互联网投资人审视

### 3.1 市场规模

#### 3.1.1 [P1] TAM 充足但 SOM 上限可能在 $5-10M 年收入，需明确测算
在线 PDF 工具市场 2025 年规模约 $1.2B（CAGR 6-8%），但增量主要来自亚太与移动端。Neetpix 当前定位英语 + 中文：
- **英语市场**：TAM 大但 Smallpdf/iLovePDF 已饱和，DR 80+ 难正面突破；
- **中文市场**：被"帮小忙"（3.74 亿人次）+ WPS 垂直整合压制；
- 留给 Neetpix 的 SOM 上限可能在 $5-10M 年收入（参考 TinyPNG 估 $1-3M、Remove.bg 被 Canva 收购前估 $5-10M）。
**行动**：在 `docs/product-strategy.md` 增补 SOM 测算章节，明确"3 年内目标 100K MAU + $200K ARR"或类似可证伪目标，避免战略漂移。

#### 3.1.2 [P2] 图片工具市场天花板低，需靠 PDF 工具群拉高 ARPU
在线图片处理市场（抠图/压缩/格式转换）较碎片化，单家天花板低（TinyPNG 估年收入 $1-3M）。Neetpix 图片工具群单独估值有限。**行动**：资源向 PDF 工具群倾斜（PDF 转 Word、PDF 合并/拆分、PDF 加密是高付费意愿场景）；图片工具作为引流与差异化叙事（remove-background 对标 Remove.bg），但不作为主要收入来源。

### 3.2 竞争格局

#### 3.2.1 [P0] PDF24 是直接免费 + 无上传竞品，Neetpix 隐私叙事对 PDF24 不构成差异化
PDF24（pdf24.org）同样是免费 + 隐私导向（提供桌面版与浏览器版），DR 70+，月访问量 50M+。Neetpix "100% 浏览器端"对 PDF24 的差异化仅是"客户端 vs 服务端处理"，但用户感知弱。marketing-strategy 未提及 PDF24 是盲点。**行动**：
1. 新增 `/compare/pdf24-vs-neetpix` 对比页，明确"PDF24 服务端处理 vs Neetpix 浏览器端处理"；
2. 产品页 hero 加"vs PDF24"对比表（处理方式、是否上传、是否需要 Java/Applet）；
3. FAQ 增加"Why Neetpix vs PDF24"问答。

#### 3.2.2 [P1] Smallpdf/iLovePDF 已建立强品牌 + DR 80+，SEO 正面竞争需 12-24 个月
Smallpdf（DR 88）、iLovePDF（DR 90）反向链接数 50K+，"free pdf to word"等红海词 6 个月内无法进入第一页。**行动**：6 个月内聚焦长尾词 + 程序化 SEO，目标关键词搜索量 100-500、竞争度低（如 "pdf to word no upload"、"screenshot translator online"、"free pdf compress 1gb"）；避免正面打"free pdf to word"红海词。

#### 3.2.3 [P1] 腾讯帮小忙 3.74 亿人次 + 150 工具 + 内置流量入口，中文市场正面竞争必败
`docs/product-strategy.md` 已识别但未落实到执行层。**行动**：中文市场避战，主攻英语 + 日语 + 西语市场（帮小忙无国际化）；中文版仅作为"备份语言"保留，不主动投入中文 SEO 资源。

#### 3.2.4 [P2] Remove.bg（Kaleido AI，已被 Canva 收购）在抠图领域有强品牌 + AI 模型优势
Neetpix 用 `@xenova/transformers` 本地推理质量难敌云端大模型（Remove.bg 用自研 U2-Net 改进版 + GPU 推理）。**行动**：抠图工具定位为"隐私版抠图"，不追求质量超越；目标用户是"不愿上传的用户"（合同/证件/医疗影像），通过隐私叙事差异化。

### 3.3 增长潜力

#### 3.3.1 [P0] 无 DAU/MAU/留存数据公开或内部追踪机制，投资人无法判断增长曲线
`web/src/components/Analytics.tsx` 仅加载 GA4 + 百度统计 + Vercel Analytics，三者均无用户级留存分析。Vercel Analytics 仅页面 PV/UV，无漏斗、无 cohort、无用户路径。融资尽调必备基础设施缺失。**行动**：引入 PostHog（免费层 1M events/月）做：
1. 工具使用漏斗（访问工具页 → 上传文件 → 完成处理 → 下载）；
2. 7/30 日留存 cohort；
3. 用户路径分析（首页 → 工具 A → 工具 B）；
4. 工具使用分布周度排序。

#### 3.3.2 [P1] 无 LTV/CAC 计算模型
因 0 变现 + 0 付费获客，LTV/CAC 为 0，但融资前需建立模型。**行动**：在 `docs/growth-and-membership-strategy.md` 增补假设模型：
- 假设 1% 付费转化 + $4 ARPU + 12 月留存 → LTV $0.48；
- 反推可承受 CAC 上限（LTV / CAC ≥ 3 → CAC ≤ $0.16）；
- 指导后续付费投放决策（Google Ads "free pdf to word" CPC $2-5，超出可承受 CAC，不应投放）。

#### 3.3.3 [P1] 病毒系数未追踪
`ShareBar.tsx` 已实现分享功能，但未埋点"分享触发" vs "分享回流"，无法计算 k 因子。growth-strategy KPI "分享率 > 3%"无衡量基础。**行动**：在 PostHog/GA4 加 `share_clicked`（按钮点击）+ `share_landed`（带 UTM 的回流访问）事件；每周计算 `k = 分享回流 UV / 分享触发次数`，目标 k > 0.3。

#### 3.3.4 [P2] 工具使用分布数据缺失，无法识别爆款集中资源
**行动**：PostHog 加 `tool_used` 事件（含 `tool_key` 字段），按工具维度周度排序；每月识别 Top 3 工具，集中 SEO/内容资源倾斜。

### 3.4 防御性

#### 3.4.1 [P1] 技术壁垒薄，开源库组合易被复制
qpdf-wasm、pdf-lib、tesseract.js、onnxruntime-web、@xenova/transformers 均为开源，任何竞品可一周内复制。Neetpix 的"100% 浏览器端"叙事易被模仿（PDF24 已部分实现）。**行动**：强化品牌护城河：
1. 注册"Neetpix"商标（USPTO + EUIPO + CNIPA），主导"privacy-first tools"品类认知；
2. 持续产出"为什么浏览器端处理更安全"类内容，建立品类心智；
3. 比 SEO/技术更难复制的是品牌认知。

#### 3.4.2 [P1] 无网络效应，工具站天然单机使用
用户间无互动，无 UGC 内容。**行动**：引入"用户分享的工具组合 recipe"（如"合并 PDF + 加水印 + 加页码"工作流模板），形成 UGC 内容护城河；用户可一键运行他人分享的 recipe，访问 recipe 页 = 长尾 SEO 流量。

#### 3.4.3 [P2] 转换成本低，用户随时可切换 iLovePDF
**行动**：通过"收藏 + 历史 + PWA 安装 + 邮件订阅"叠加提升转换成本，每个增量留存机制都能抬高流失摩擦；目标 6 个月内将 30 日留存从行业基准 10% 拉到 18%。

#### 3.4.4 [P2] 无规模经济（无变现导致成本不随用户增长但收入也不增长）
浏览器端处理意味着成本不随用户数线性增长（Vercel 函数调用 + 带宽是唯一可变成本），但收入也不随用户增长。**行动**：尽快引入按量付费（API/批量处理）让规模转化为收入；B2B API 是典型规模经济场景。

### 3.5 退出路径

#### 3.5.1 [P2] 潜在收购方需提前建立 BD 关系
潜在收购方：
1. **PDF 工具竞品**：Smallpdf/iLovePDF 收购以补隐私版图；
2. **浏览器厂商**：Firefox/Opera/Brave 收购作为内置工具（隐私叙事契合）；
3. **隐私导向公司**：Proton（瑞士隐私邮件）、Brave 收购补工具生态。
**行动**：6 个月内主动联系 1-2 家 BD 负责人，建立非正式关系；即便不卖也能获得 cross-promotion 机会。

#### 3.5.2 [P2] 估值参考：3-5x ARR 或 $1-3/MAU，IPO 不现实
独立工具站常见估值倍数 3-5x ARR，或按用户数 $1-3/MAU。若 Neetpix 达到 100K MAU + $50K ARR，估值约 $250K-500K。IPO 路径不现实。**行动**：在 `docs/product-strategy.md` 增补"退出场景"章节，明确最可能路径是 acquihire 或战略收购，3 年目标达到 100K MAU + $200K ARR 为可谈判估值。

#### 3.5.3 [P2] "Neetpix" 商标未注册，品牌名被抢注将阻断退出路径
商标未在主要市场（US/EU/CN）注册，若被抢注将阻断收购或融资。**行动**：6 个月内提交商标注册申请：
- **USPTO**（美国，约 $350 + 律师费 $500）；
- **EUIPO**（欧盟，约 €850）；
- **CNIPA**（中国，约 ¥300）。
分类：第 9 类（软件）、第 42 类（SaaS/在线服务）。

**本视角小计**：17 条问题（3.1 × 2、3.2 × 4、3.3 × 4、3.4 × 4、3.5 × 3）

---

## 合并行动清单（按 P0/P1/P2 排序）

| 排名 | 来源视角 | 问题 | 严重度 | 建议行动 | 归属 |
|------|---------|------|--------|---------|------|
| 1 | 站长 1.1.1 | next.config 无安全响应头（CSP/HSTS/X-Frame-Options） | P0 | 在 `next.config.ts` 加 `async headers()` 输出 6 个安全头 | 本次执行 |
| 2 | 站长 1.1.2 | 无错误监控（生产盲飞） | P0 | 接入 `@sentry/nextjs`，在 error.tsx 调 captureException | 本次执行 |
| 3 | 站长 1.1.3 | `/api/translate` 无速率限制 | P0 | 接入 `@upstash/ratelimit` 按 IP 限速 30/min + 200/day | 本次执行 |
| 4 | 站长 1.2.1 | 重量级 WASM 库未做按需加载分析 | P0 | 装 `@next/bundle-analyzer`，工具页改 `next/dynamic` 拆分 | 本次执行 |
| 5 | 站长 1.3.1 | 文件大小限制与营销叙事矛盾 | P0 | 统一 27 工具大小策略，要么取消限制要么改文案 | 本次执行 |
| 6 | 站长 1.4.1 | 工具页 title 缺 SEO 关键词 | P0 | 改写 `messages/en.json` + `zh.json` 27 个工具 title 为 `[Free] {tool} Online \| Neetpix` | 本次执行 |
| 7 | 站长 1.4.2 | 无博客目录，SEO 长尾无落地页 | P0 | 新增 `app/[locale]/blog/[slug]/page.tsx` + 4 篇 P0 文章 | 本次执行 |
| 8 | 创业者 2.4.1 | 获客渠道单一依赖 SEO 但内容基建未上线 | P0 | 启动 4 篇博客 + 4 个对比页 + Dev.to/知乎分发 | 本次执行 |
| 9 | 创业者 2.4.2 | PH/HN/Reddit 发布事件未执行 | P0 | 1 周内完成物料准备 + 周二 PH 发布 + HN/Reddit 跟进 | 本次执行 |
| 10 | 创业者 2.2.1 | PDF 转 Word 质量与营销矛盾（差评隐患） | P0 | 加扫描件检测 + 友好提示 + FAQ 明确限制 | 本次执行 |
| 11 | 投资人 3.2.1 | PDF24 是直接竞品，隐私叙事不构成差异化 | P0 | 新增 `/compare/pdf24-vs-neetpix` 对比页 + hero 对比表 | 本次执行 |
| 12 | 投资人 3.3.1 | 无 DAU/MAU/留存追踪，融资尽调基础缺失 | P0 | 引入 PostHog，埋点工具使用漏斗 + 留存 cohort | 本次执行 |
| 13 | 站长 1.5.1 | CSP/HSTS 缺失（同 1.1.1） | P0 | 同排名 1 | 本次执行 |
| 14 | 站长 1.1.4 | 无自动化测试 | P1 | 新增 Vitest 配置 + lib/ 核心模块单元测试 | 后续 spec |
| 15 | 站长 1.1.5 | 无 CI/CD 配置 | P1 | 新增 `.github/workflows/ci.yml` 跑 lint/build/tsc | 本次执行 |
| 16 | 站长 1.1.6 | 无 staging 环境保护 | P1 | Vercel 开启 Preview Deployment Authentication | 本次执行 |
| 17 | 站长 1.2.2 | 未启用 `experimental.optimizePackageImports` | P1 | next.config 加 `optimizePackageImports: ['lucide-react']` | 本次执行 |
| 18 | 站长 1.2.3 | 无 `loading.tsx` 路由级骨架屏 | P1 | `app/[locale]/tools/[tool]/loading.tsx` 加骨架屏 | 本次执行 |
| 19 | 站长 1.2.4 | PWA manifest 有但无 Service Worker | P1 | 用 `@serwist/next` 实现 SW + 离线缓存 | 后续 spec |
| 20 | 站长 1.3.2 | error.tsx/not-found.tsx 仅英文 | P1 | 新增 `[locale]/error.tsx` 与 `[locale]/not-found.tsx` 本地化版 | 本次执行 |
| 21 | 站长 1.3.3 | 无暗色模式 | P1 | globals.css CSS 变量 + Header 切换按钮 | 后续 spec |
| 22 | 站长 1.4.3 | JsonLd 仅 WebApplication，缺 FAQPage/HowTo/Breadcrumb | P1 | Faq.tsx 输出 FAQPage JSON-LD + 工具页加 BreadcrumbList | 本次执行 |
| 23 | 站长 1.4.4 | 仅 en/zh，与多语言路线图脱节 | P1 | 独立 spec "i18n-expansion" 优先加 ja | 后续 spec |
| 24 | 站长 1.4.5 | 无对比页承接"替代品"长尾 | P1 | 新增 `/compare/[slug]/page.tsx` + 4 个对比页 | 本次执行 |
| 25 | 站长 1.5.2 | mailto 明文暴露邮箱 | P1 | JS 运行时拼接邮箱或改用托管 form | 本次执行 |
| 26 | 站长 1.5.3 | heic2any 0.0.x 长期未更新 | P1 | 评估替代或锁定版本 + CI 加 npm audit | 后续 spec |
| 27 | 创业者 2.1.1 | 0 变现无收入验证 | P1 | 加捐赠按钮 + PDF 转 Word OCR 模式轻变现 | 后续 spec |
| 28 | 创业者 2.1.2 | 全部免费放弃变现杠杆 | P1 | 1 个高价值工具引入"批量需 Pro"锚点 | 后续 spec |
| 29 | 创业者 2.2.2 | 无批量处理 | P1 | image-compress/convert/watermark 加批量上传 | 后续 spec |
| 30 | 创业者 2.2.3 | 无"最近使用"入口 | P1 | MyToolsSection 旁加最近 5 个工具 | 本次执行 |
| 31 | 创业者 2.2.4 | 工具内无撤销/重做 | P1 | 图片类工具加 history stack | 后续 spec |
| 32 | 创业者 2.3.1 | PWA 安装引导未实现 | P1 | 监听 beforeinstallprompt + Header 安装按钮 | 本次执行 |
| 33 | 创业者 2.3.2 | 无邮件订阅 | P1 | 首页加订阅入口 + Resend Audience 集成 | 本次执行 |
| 34 | 创业者 2.4.3 | 无 Twitter/X 运营 | P1 | 注册 @neetpix，每日 1 推 build in public | 持续运营 |
| 35 | 创业者 2.4.4 | 无外链建设 | P1 | 联系 5-10 个 DA 40+ 工具博客/导航站申请收录 | 持续运营 |
| 36 | 创业者 2.5.1 | 反馈仅 mailto，KPI 难达成 | P1 | FeedbackBar 改内联表单 + Vercel Form 入库 | 本次执行 |
| 37 | 投资人 3.1.1 | SOM 测算缺失 | P1 | product-strategy 增补 SOM 章节 + 3 年可证伪目标 | 后续 spec |
| 38 | 投资人 3.2.2 | Smallpdf/iLovePDF DR 80+ 正面竞争必败 | P1 | 6 个月内聚焦长尾词 + 程序化 SEO | 持续运营 |
| 39 | 投资人 3.2.3 | 中文市场被帮小忙压制 | P1 | 中文避战，主攻 en/ja/es | 后续 spec |
| 40 | 投资人 3.3.2 | 无 LTV/CAC 模型 | P1 | growth-strategy 增补假设模型 | 后续 spec |
| 41 | 投资人 3.3.3 | 病毒系数未追踪 | P1 | PostHog 加 share_clicked/share_landed 事件 | 本次执行 |
| 42 | 投资人 3.4.1 | 技术壁垒薄 + 商标未注册 | P1 | 6 个月内提交 USPTO + EUIPO + CNIPA 商标注册 | 后续 spec |
| 43 | 投资人 3.4.2 | 无网络效应 | P1 | 引入"工具组合 recipe"UGC 内容 | 后续 spec |
| 44 | 站长 1.1.7 | sitemap lastModified 用 new Date() | P2 | 改为 git log 注入或固定上线日期 | 本次执行 |
| 45 | 站长 1.2.5 | 全站共用单张 OG 图 | P2 | 用 `@vercel/og` 为每个工具页生成专属 OG | 后续 spec |
| 46 | 站长 1.2.6 | 字体策略缺失 | P2 | next/font 引入 Geist | 本次执行 |
| 47 | 站长 1.3.4 | Feedback 与 ShareBar z-index 冲突 | P2 | Feedback z-index 下调到 z-40 | 本次执行 |
| 48 | 站长 1.3.5 | RelatedTools 推荐过度堆砌 | P2 | 精简到 4-6 个，按用户下一步行为排序 | 本次执行 |
| 49 | 站长 1.3.6 | 移动端 hover 下拉触屏不可用 | P2 | 改 click + hover 双触发 | 本次执行 |
| 50 | 站长 1.4.6 | robots.ts 过简 | P2 | 多 sitemap + crawl-delay | 后续 spec |
| 51 | 站长 1.5.4 | 无依赖漏洞扫描 | P2 | CI 加 npm audit / Dependabot | 本次执行 |
| 52 | 站长 1.5.5 | manifest start_url 中文 PWA 落到英文首页 | P2 | start_url 相对路径 + SW Accept-Language 重定向 | 后续 spec |
| 53 | 创业者 2.1.3 | 无 B2B/API 产品线 | P2 | 新增 `/enterprise` 着陆页 + demo 表单 | 后续 spec |
| 54 | 创业者 2.2.5 | 截图翻译曝光不足 | P2 | A/B 测试 hero CTA 改为 screenshot-translate | 本次执行 |
| 55 | 创业者 2.2.6 | 工具页缺使用步骤可视化 | P2 | 加 3 步图文 + HowTo JSON-LD | 后续 spec |
| 56 | 创业者 2.3.3 | 收藏夹仅本地不同步 | P2 | 加导出 JSON + 分享链接 | 后续 spec |
| 57 | 创业者 2.3.4 | 无新工具上线通知 | P2 | BookmarkHint 后追加订阅引导 | 后续 spec |
| 58 | 创业者 2.4.5 | 无 Chrome 扩展导流 | P2 | Q3 独立 spec | 后续 spec |
| 59 | 创业者 2.5.2 | 无 NPS/CSAT 调研 | P2 | 下载成功 toast 后加 1-5 星评分 | 后续 spec |
| 60 | 创业者 2.5.3 | 无用户访谈机制 | P2 | About 页加访谈池链接 + Calendly | 持续运营 |
| 61 | 投资人 3.1.2 | 图片工具市场天花板低 | P2 | 资源向 PDF 工具群倾斜 | 持续运营 |
| 62 | 投资人 3.2.4 | 抠图质量难敌 Remove.bg | P2 | 定位"隐私版抠图"，不追求质量超越 | 持续运营 |
| 63 | 投资人 3.3.4 | 工具使用分布数据缺失 | P2 | PostHog 加 tool_used 事件 | 本次执行 |
| 64 | 投资人 3.4.3 | 转换成本低 | P2 | 收藏 + 历史 + PWA + 邮件订阅叠加 | 持续运营 |
| 65 | 投资人 3.4.4 | 无规模经济 | P2 | 引入按量付费 B2B API | 后续 spec |
| 66 | 投资人 3.5.1 | 收购方 BD 关系未建立 | P2 | 6 个月内联系 1-2 家 BD 负责人 | 持续运营 |
| 67 | 投资人 3.5.2 | 退出估值参考缺失 | P2 | product-strategy 增补退出场景章节 | 后续 spec |
| 68 | 投资人 3.5.3 | 商标未注册 | P2 | 6 个月内提交 USPTO + EUIPO + CNIPA | 后续 spec |

**归属说明**：
- **本次执行**：当前 spec `improve-search-seo-and-execute-growth` 可落地，约 30 条（含全部 13 条 P0）
- **后续 spec**：需独立 spec 推进（如多语言、账号体系、变现、PWA SW、暗色模式、批量处理、Chrome 扩展、商标注册等），约 28 条
- **持续运营**：需人工长期执行（如内容营销、社媒、外链、用户访谈、BD 关系等），约 10 条

---

## 总结与下一步建议

**审视结论**：Neetpix 在产品定位（隐私 + 免费 + 浏览器端）与技术栈（Next.js 16 + WASM 生态）上方向正确，但**安全基建缺失（无 CSP/HSTS/错误监控）、SEO 内容基建空白（无博客/对比页/多语言）、变现模型完全未启动、增长事件未埋点**四块硬伤将严重制约下一阶段增长。最致命的是 `marketing-and-growth-strategy.md` 已规划的 PH/HN/Reddit 发布、博客内容、对比页等关键动作均未执行，意味着 30 天内不会有显著自然流量，且无数据基础判断 PMF。

**最关键的 3 个行动建议**：

1. **本周内完成"安全 + 监控 + 数据"三件套**：在 `next.config.ts` 配齐 CSP/HSTS 等 6 个安全头（1.1.1）+ 接入 Sentry 错误监控（1.1.2）+ 接入 PostHog 用户行为分析（3.3.1）。这是 PH/HN 发布前的前置条件——HN 用户会用 DevTools 审视，缺 CSP 会被顶到首页评论；无 PostHog 则发布日流量无法转化为可分析数据。

2. **2 周内完成"SEO 内容 + 发布事件"双引擎启动**：上线 4 篇 P0 博客 + 4 个对比页（含 vs PDF24）（1.4.2、1.4.5、3.2.1）+ 周二 PH 发布 + HN Show HN + Reddit/V2EX 跟进（2.4.2）。这是 0 成本获取 5K-20K UV 的唯一窗口，每延迟一周损失数千 UV。

3. **30 天内完成"轻变现 + 留存机制"验证**：加捐赠按钮 + PDF 转 Word OCR 模式轻变现（2.1.1）+ 邮件订阅入口（2.3.2）+ PWA 安装引导（2.3.1）+ 内联反馈表单（2.5.1）。即便 0 成交也能验证付费意愿与留存信号，为是否进入阶段 1（账号体系）提供数据依据，避免按时间表盲推。

**风险提示**：当前 13 条 P0 问题中，1.3.1（文件大小限制与营销矛盾）、2.2.1（PDF 转 Word 扫描件质量）是**叙事一致性风险**——HN/Reddit 用户上传 60MB 文件被拒或扫描件输出空白 docx，会立刻在评论区被放大，可能反向引爆"虚假宣传"质疑，比技术问题更致命。建议在 PH/HN 发布前 24 小时内必须修复完成。
