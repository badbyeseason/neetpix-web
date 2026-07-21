# Neetpix 增长执行追踪表

> **创建日期**：2026-07-21
> **负责方**：增长运营负责人（执行侧） × 工程负责人（交付侧） × SEO 顾问（验收侧）
> **监测周期**：本次 spec 代码交付完成日起 → +7 天采集基线 → +30 天目标复盘 → +90 天战略复盘
> **关联 spec**：`improve-search-seo-and-execute-growth`
> **关联文档**：[`seo-audit-findings.md`](./seo-audit-findings.md)（62/100 基线）、[`site-audit-multi-perspective.md`](./site-audit-multi-perspective.md)（68 条问题，13 P0 / 30 P1 / 25 P2）、[`marketing-and-growth-strategy.md`](./marketing-and-growth-strategy.md)
> **更新规则**：每周一由增长运营负责人更新 KPI 列；每月 1 日新增上一月度实测数据；状态变更须在"变更日志"追加一行。

---

## 1. 本次执行项总览

下表覆盖本会话在 spec `improve-search-seo-and-execute-growth` 内实际交付的 7 大执行项。**所有"已完成"项均与代码 / 内容 / SEO / 监测四类对应**，未在本表出现的 spec 外动作（外链、社媒、裂变等）见第 3 节"未执行项与后续执行条件"。

| # | 执行项 | 类型 | 完成日期 | 关联 Task | 关联文件 / 路径 | 状态 |
|---|--------|------|----------|-----------|-----------------|------|
| 1 | CommandPalette i18n 修复（中文键词 → 工具匹配；跨 locale 兼容） | 代码 | 2026-07-21 | Task 1 | `web/src/components/Header/CommandPalette.tsx`、i18n 资源 `web/src/messages/{en,zh}.json` | ✅ 已完成 |
| 2 | SEO 审计基线建立（成熟度 62/100，Top 10 修复清单） | SEO | 2026-07-21 | Task 2 | `docs/seo-audit-findings.md` | ✅ 已完成 |
| 3 | Breadcrumb UI + BreadcrumbList JSON-LD（27 工具页 + 8 landing 页 + landing 引入） | SEO + 代码 | 2026-07-21 | Task 3 | `web/src/components/Breadcrumb.tsx`、`web/src/app/[locale]/tools/[tool]/page.tsx`、`web/src/app/[locale]/landing/[slug]/page.tsx` | ✅ 已完成 |
| 4 | FAQPage JSON-LD 动态化（Faq.tsx 渲染实际 1–6 条，移除写死 `[1,2,3].map`） | SEO + 代码 | 2026-07-21 | Task 3 | `web/src/components/Faq.tsx` | ✅ 已完成 |
| 5 | sitemap 分级 changeFrequency/priority + robots disallow `/api//_next//private/` + ShareBar alt i18n + homepage metaDescription i18n | SEO | 2026-07-21 | Task 3 | `web/src/app/sitemap.ts`、`web/src/app/robots.ts`、`web/src/components/ShareBar.tsx`、`web/src/app/[locale]/page.tsx` | ✅ 已完成 |
| 6 | 工具页内容深度增强（27 工具 useCases 段落 + 25 工具 FAQ 扩充到 4 条；UseCases 组件接入工具页 + landing） | 内容 | 2026-07-21 | Task 4 | `web/src/components/UseCases.tsx`、`web/src/lib/tools-metadata.ts`、i18n `useCases` / `faq` key | ✅ 已完成 |
| 7 | 8 个程序化 SEO landing pages | 内容 + SEO | 2026-07-21 | Task 5 | `web/src/app/[locale]/landing/[slug]/page.tsx`、`web/src/lib/landing-metadata.ts`、`web/src/app/sitemap.ts`（已收录 8 条）；slug：`compress-pdf-to-100kb` / `pdf-merge-and-compress` / `image-to-pdf-converter` / `remove-background-free` / `qr-code-generator-free` / `pdf-compress-online` / `word-to-pdf-free` / `image-compress-to-50kb` | ✅ 已完成 |
| 8 | 4 类事件埋点封装与接入（GA4 gtag + 百度 _hmt 双写） | 监测 | 2026-07-21 | Task 6 | `web/src/lib/analytics.ts`（`trackEvent` 封装）；事件接入：`tool-used`（7 个工具下载成功）/ `share-clicked`（5 个分享按钮，channel: copy/system/wechat/twitter/email）/ `feedback-clicked`（FeedbackBar toolKey）/ `landing-cta-clicked`（8 个 landing slug + targetTool） | ✅ 已完成 |
| 9 | 多视角审视报告（资深站长 / 创业者 / 投资人，68 条问题） | 监测（元） | 2026-07-21 | Task 8 | `docs/site-audit-multi-perspective.md` | ✅ 已完成 |

> **状态枚举**：✅ 已完成 / 🟡 进行中 / ⏸ 待启动 / ⛔ 已阻塞 / 🔄 待复盘

---

## 2. KPI 基线与目标（30 / 90 天）

**采集规则**：
- 基线一律以"上线部署后第 7 天"为采集窗口，记作 `T+7`，避免首日爬虫重爬 / 用户激增造成的噪音。
- 30 天目标记作 `T+30`，90 天目标记作 `T+90`，均自部署日计算。
- 所有 `TBD（部署后 7 天采集）` 占位须在基线窗口结束后由增长运营负责人替换为实测值并标注采集日。
- 数据源默认 GA4（`neetpix-production` property）+ Google Search Console（GSC）+ 百度统计（_hmt）三路对账，差异 > 15% 须在变更日志备注原因。

### 2.1 CommandPalette i18n 修复（执行项 #1）

| 指标 | 基线（T+7） | 30 天目标（T+30） | 90 天目标（T+90） | 数据源 |
|------|-------------|-------------------|-------------------|--------|
| zh locale 下 CommandPalette 打开率（打开 UV / zh 总 UV） | TBD（部署后 7 天采集） | ≥ 8% | ≥ 12% | GA4（自定义事件 `command-palette-open`，需补埋） |
| zh locale 搜索 → 工具页跳转率（跳转次数 / 搜索次数） | TBD（部署后 7 天采集） | ≥ 55% | ≥ 65% | GA4（`command-palette-select`） |
| 中文关键词命中工具比例（命中数 / 搜索数） | TBD（部署后 7 天采集） | ≥ 90% | ≥ 95% | GA4（`command-palette-no-result` 反向计算） |

### 2.2 SEO 审计基线（执行项 #2）

| 指标 | 基线（T+7） | 30 天目标（T+30） | 90 天目标（T+90） | 数据源 |
|------|-------------|-------------------|-------------------|--------|
| SEO 成熟度评分（满分 100） | 62（已采集，2026-07-21） | ≥ 72 | ≥ 80 | 人工审计（按 `seo-audit-findings.md` 维度复评） |
| GSC 已收录 URL 数（site:neetpix.com） | TBD（部署后 7 天采集） | +10 | +25 | Google Search Console |
| GSC 总 impressions（近 28 天） | TBD（部署后 7 天采集） | +20% | +50% | Google Search Console |
| GSC 平均排名（加权） | TBD（部署后 7 天采集） | 提升 2 位 | 提升 5 位 | Google Search Console |
| GSC 平均 CTR | TBD（部署后 7 天采集） | +0.5pp | +1.5pp | Google Search Console |

### 2.3 Breadcrumb + BreadcrumbList JSON-LD（执行项 #3）

| 指标 | 基线（T+7） | 30 天目标（T+30） | 90 天目标（T+90） | 数据源 |
|------|-------------|-------------------|-------------------|--------|
| BreadcrumbList 富结果出现率（Rich Results Test 通过的 URL 数 / 35） | TBD（部署后 7 天采集） | ≥ 30 / 35 | 35 / 35 | Google Rich Results Test（抽样 35 个 URL） |
| GSC Breadcrumb 报告：有效条目数 | TBD（部署后 7 天采集） | ≥ 30 | 35 | Google Search Console → Enhancements |
| Breadcrumb 内链点击率（GA4 事件 `breadcrumb-click` / 工具页 PV） | TBD（部署后 7 天采集） | ≥ 3% | ≥ 6% | GA4（**需补埋** `breadcrumb-click` 事件） |

> ⚠️ 当前 Breadcrumb 组件未接 `trackEvent('breadcrumb-click')`，已在第 3 节登记后续执行项（#23）。

### 2.4 FAQPage JSON-LD（执行项 #4）

| 指标 | 基线（T+7） | 30 天目标（T+30） | 90 天目标（T+90） | 数据源 |
|------|-------------|-------------------|-------------------|--------|
| FAQPage 富结果出现率（Rich Results Test 通过工具页数 / 27） | TBD（部署后 7 天采集） | ≥ 20 / 27 | 27 / 27 | Google Rich Results Test |
| GSC FAQ 报告：有效条目数 | TBD（部署后 7 天采集） | ≥ 20 | 27 | Google Search Console → Enhancements |
| 工具页 FAQ 区块点击展开率（展开次数 / 工具页 PV） | TBD（部署后 7 天采集） | ≥ 15% | ≥ 25% | GA4（**需补埋** `faq-expand` 事件） |

### 2.5 工具页内容深度增强（执行项 #6）

| 指标 | 基线（T+7） | 30 天目标（T+30） | 90 天目标（T+90） | 数据源 |
|------|-------------|-------------------|-------------------|--------|
| 工具页平均停留时长 | TBD（部署后 7 天采集） | ≥ 90s | ≥ 120s | GA4 |
| 工具页跳出率 | TBD（部署后 7 天采集） | ≤ 60% | ≤ 50% | GA4 |
| 工具页自然搜索 CTR（GSC） | TBD（部署后 7 天采集） | +0.5pp | +1.5pp | Google Search Console |
| 工具页 useCases 区块滚动到达率 | TBD（部署后 7 天采集） | ≥ 40% | ≥ 55% | GA4（**需补埋** `usecases-view` 滚动事件） |
| 工具页平均字数（content 段） | 已达 ≥ 1500 字（27 工具） | 维持 | 维持 | 人工抽样 |

### 2.6 8 个程序化 SEO landing pages（执行项 #7）

| 指标 | 基线（T+7） | 30 天目标（T+30） | 90 天目标（T+90） | 数据源 |
|------|-------------|-------------------|-------------------|--------|
| 8 个 landing 总 UV | TBD（部署后 7 天采集） | ≥ 800 | ≥ 3000 | GA4 |
| landing → 工具页 CTA 点击率（`landing-cta-clicked` 事件 / landing PV） | TBD（部署后 7 天采集） | ≥ 12% | ≥ 20% | GA4（已埋点） |
| 关联工具页 UV 增量（vs 部署前 28 天基线） | TBD（部署后 7 天采集） | +5% | +15% | GA4 |
| 8 个 landing GSC 收录数 | TBD（部署后 7 天采集） | ≥ 5 / 8 | 8 / 8 | Google Search Console |
| 8 个 landing 关键词进入 GSC Top 100 数 | TBD（部署后 7 天采集） | ≥ 8 | ≥ 20 | Google Search Console |

### 2.7 4 类事件埋点（执行项 #8）

| 指标 | 基线（T+7） | 30 天目标（T+30） | 90 天目标（T+90） | 数据源 |
|------|-------------|-------------------|-------------------|--------|
| `tool-used` 总次数（按工具） | TBD（部署后 7 天采集） | ≥ 1500 | ≥ 5000 | GA4 + 百度统计（双路对账） |
| `tool-used` Top 3 工具占比 | TBD（部署后 7 天采集） | ≤ 60% | ≤ 50% | GA4（用于评估长尾工具激活） |
| `share-clicked` 总次数（按渠道分布） | TBD（部署后 7 天采集） | ≥ 200 | ≥ 800 | GA4 |
| `share-clicked` 渠道分布：copy / system / wechat / twitter / email | TBD（部署后 7 天采集） | 5 渠道均有数据 | wechat 渠道占比 ≥ 30% | GA4 |
| `feedback-clicked` 总次数 | TBD（部署后 7 天采集） | ≥ 30 | ≥ 100 | GA4 |
| `landing-cta-clicked` 总次数（按 8 slug × targetTool） | TBD（部署后 7 天采集） | ≥ 100 | ≥ 400 | GA4 |
| 埋点数据丢失率（GA4 vs 百度统计差异） | TBD（部署后 7 天采集） | ≤ 15% | ≤ 10% | 双路对账 |

### 2.8 SEO 整体（跨执行项）

| 指标 | 基线（T+7） | 30 天目标（T+30） | 90 天目标（T+90） | 数据源 |
|------|-------------|-------------------|-------------------|--------|
| sitemap 提交的 URL 总数 | 70（28 工具 × 2 locale + 首页 × 2 + 8 landing × 2 + 隐私/关于 × 2，最终以构建产物为准） | ≥ 70 | ≥ 90（新增 category hub 后） | `https://neetpix.com/sitemap.xml` |
| GSC indexed pages | TBD（部署后 7 天采集） | ≥ 60 | ≥ 80 | Google Search Console |
| 百度收录数 | TBD（部署后 7 天采集） | ≥ 30 | ≥ 50 | 百度站长平台 |
| GSC 总 clicks（近 28 天） | TBD（部署后 7 天采集） | +15% | +40% | Google Search Console |
| GSC 平均排名 | TBD（部署后 7 天采集） | 提升 2 位 | 提升 5 位 | Google Search Console |
| GSC 平均 CTR | TBD（部署后 7 天采集） | +0.5pp | +1.5pp | Google Search Console |
| 全站 UV（en + zh） | TBD（部署后 7 天采集） | +15% | +40% | GA4 |

---

## 3. 未执行项与后续执行条件

下表列出**本次 spec 范围外**的增长动作。每项均给出**具体可判的触发条件**——只有触发条件达成时才进入下一 sprint 排期，避免无序扩张。优先级标注 P0/P1/P2 与 [`site-audit-multi-perspective.md`](./site-audit-multi-perspective.md) 的 68 条问题清单对齐。

| # | 动作描述 | 类型 | 触发条件 | 预计执行时间 | 负责方 |
|---|----------|------|----------|--------------|--------|
| 1 | 多语言 SEO 扩展（日韩 / 东南亚 locale：ja / ko / vi / th） | SEO + 内容 | 月 UV 突破 5000 且 zh/en 之外的 GSC impressions 占比 ≥ 5% | 触发后 30 天内出 ja/ko MVP | 工程 + 内容 |
| 2 | /tools 总览页 + category hub 页（`/pdf-tools`、`/image-tools`） | SEO + 代码 | GSC 已收录 URL ≥ 60 且当前 28 工具有 ≥ 10 工具月 PV > 100 | 触发后 21 天内上线 | 工程 |
| 3 | 404 页面重设计（`[locale]/not-found.tsx` + 热门工具推荐） | 代码 + UX | GA4 404 PV 占总 PV ≥ 0.5%，或收到 ≥ 3 条用户反馈提及 404 体验差 | 触发后 14 天内 | 工程 |
| 4 | 安全响应头（CSP / HSTS / X-Frame-Options 等，详见审视报告 1.1.1） | 代码 | P0 项，部署后立即触发；建议与下一发布窗口同步 | T+7 内 | 工程 |
| 5 | 错误监控接入（@sentry/nextjs，详见审视报告 1.1.2） | 代码 | P0 项；或 GA4 自定义 `app-error` 事件 7 天内 ≥ 10 次 | T+14 内 | 工程 |
| 6 | /api/translate 速率限制（@upstash/ratelimit + redis，30 req/min + 200 req/day） | 代码 | P0 项；或 Vercel 日志显示该 endpoint 异常增长 ≥ 50%/天 | T+7 内 | 工程 |
| 7 | WASM 库按需加载（qpdf-wasm / onnxruntime-web / tesseract.js / pdfjs-dist / mammoth 改 `await import()`） | 代码 | Lighthouse Mobile 性能分 < 70，或首屏 JS > 300KB | 触发后 21 天内 | 工程 |
| 8 | `experimental.optimizePackageImports`（lucide-react 等）+ `@next/bundle-analyzer` | 代码 | 与 #7 同步触发 | 与 #7 合并 | 工程 |
| 9 | 文件大小限制策略调整（与"无文件大小限制"营销叙事对齐，详见审视报告 1.3.1） | 代码 + 内容 | 收到 ≥ 5 条用户反馈提及"上传被拒"，或差评中提及"文件大小"≥ 2 次 | 触发后 14 天内 | 产品 + 工程 |
| 10 | 暗色模式（prefers-color-scheme + 手动切换） | 代码 + UX | 用户调研中 ≥ 20% 提及"想要暗色"，或收到 ≥ 5 条反馈 | 触发后 30 天内 | 工程 |
| 11 | 外链交换与媒体合作（与 PDF/办公类博客互换 guest post） | 增长 | 30 天 KPI 复盘后 GSC 反向链接域名数 < 10 | 触发后 60 天内 | 运营 |
| 12 | 内容营销：知乎答题（PDF 工具 / 截图翻译类问题） | 增长 | zh locale UV 突破 1000 / 天 | 触发后立即启动，每周 ≥ 3 条答题 | 运营 |
| 13 | 内容营销：技术博客 + 小红书图文 | 增长 | zh locale UV 突破 2000 / 天且知乎渠道已稳定 4 周以上 | 触发后 30 天内启动 | 运营 |
| 14 | Product Hunt 发布 | 增长 | en locale UV 突破 500 / 天，且 ≥ 3 个核心工具 GA4 评分 ≥ 4.5（FeedbackBar 数据） | 触发后 14 天内发布 | 运营 + 创始人 |
| 15 | HackerNews Show HN | 增长 | en locale UV 突破 800 / 天且 Product Hunt 发布 7 天后无负面舆情 | 触发后 7 天内发布 | 创始人 |
| 16 | Reddit（r/pdf、r/SideProject、r/InternetIsBeautiful）发布 | 增长 | Product Hunt 发布完成 | 与 PH 同步 | 运营 |
| 17 | 用户裂变机制（邀请奖励 / 收藏夹同步 / 历史记录） | 增长 + 代码 | 30 天 MAU ≥ 5000 且 `tool-used` 复用率（同用户 7 天内 ≥ 2 次）≥ 30% | 触发后 45 天内出 MVP | 产品 + 工程 |
| 18 | PWA Service Worker（@serwist/next，离线复用已访问工具） | 代码 | 移动端 UV 占比 ≥ 40% 且移动端跳出率 ≥ 65% | 触发后 30 天内 | 工程 |
| 19 | per-tool og-image（@vercel/og 动态生成 1200×630 PNG） | SEO + 代码 | 社交渠道（wechat / twitter）`share-clicked` 总数 ≥ 200 / 月 | 触发后 21 天内 | 工程 |
| 20 | 自动化测试（Vitest，优先 lib/ 纯函数） | 代码 | 任何一次生产事故由工具库回归引起，或累计 PR ≥ 30 个 | 触发后 30 天内覆盖 30% | 工程 |
| 21 | CI/CD（GitHub Actions：lint + tsc + build 阻断） | 代码 | P1 项；建议与 #4/#5/#6 安全与监控同批落地 | T+14 内 | 工程 |
| 22 | staging 环境保护（Vercel Preview Deployment Protection） | 代码 | P1 项；与 #21 同步 | T+14 内 | 工程 |
| 23 | FAQ 区块与 Breadcrumb 组件补埋点（`faq-expand` / `breadcrumb-click` / `usecases-view`） | 监测 | 本追踪表第 2.3 / 2.4 / 2.5 节 KPI 需要数据时 | T+7 内（与部署同步） | 工程 |
| 24 | CommandPalette 补埋点（`command-palette-open` / `command-palette-select` / `command-palette-no-result`） | 监测 | 第 2.1 节 KPI 需要数据时 | T+7 内 | 工程 |
| 25 | sitemap lastModified 改为基于 git 修改时间（详见审视报告 1.1.7） | SEO + 代码 | GSC 报告 lastmod 信号失真或爬虫抓取频次异常下降 | T+30 内 | 工程 |
| 26 | 动态导入重型依赖（与 #7 合并） | 代码 | 见 #7 | 见 #7 | 工程 |
| 27 | manifest.json + Service Worker 注册 | 代码 | 见 #18 | 见 #18 | 工程 |
| 28 | 反馈邮件 / FeedbackBar 月度汇总流程 | 监测 + 运营 | `feedback-clicked` 月度 ≥ 30 次 | 触发后每月 1 日汇总 | 运营 |

> **触发条件判定节奏**：每月 1 日增长运营负责人统一回看上表触发条件，命中则进入当月 sprint 排期，未命中则保持待触发状态。

---

## 4. 监测节奏

### 4.1 每日（增长运营负责人 / 工程值班）

| 监测项 | 指标 | 阈值 / 异常告警 | 工具 |
|--------|------|-----------------|------|
| 实时 UV（en + zh） | GA4 Realtime UV | 跌幅 ≥ 50% 同比昨日同时段 → 告警 | GA4 Realtime |
| `tool-used` 事件 | 当日次数 | 跌幅 ≥ 40% → 排查工具可用性 | GA4 Realtime + 百度统计实时 |
| 404 错误 | 404 PV | 占总 PV ≥ 0.5% → 当日排查 | GA4（`page_fired` 路径 `/404`）+ Vercel Logs |
| 5xx 错误 | /api/* 5xx 比例 | ≥ 1% → 立即排查 | Vercel Logs（无 Sentry 期间） |
| WASM 加载失败 | `qpdf.wasm` / `onnxruntime-web` 加载失败次数 | ≥ 10 次/天 → 排查 CDN | Vercel Logs（待 #5 Sentry 落地后切换） |

### 4.2 每周（增长运营负责人，周一上午）

| 监测项 | 指标 | 行动 | 工具 |
|--------|------|------|------|
| GSC 新发现关键词 | 近 7 天新进入 Top 100 的关键词数 | 若 ≥ 5 条，登记到关键词库 | Google Search Console |
| landing pages UV | 8 个 landing 周 UV | 周环比 < -10% → 排查收录状态 | GA4 |
| 跳出率 | 工具页平均跳出率 | 周环比 > 5pp → 排查内容相关性 | GA4 |
| `share-clicked` 渠道分布 | 5 渠道周分布 | 单渠道占比 < 5% 持续 2 周 → 评估是否优化该渠道 UX | GA4 |
| `feedback-clicked` 反馈数 | 周累计 | 若 ≥ 10 条 → 当周整理到月度汇总 | GA4 |
| sitemap 状态 | sitemap.xml 抓取错误 | GSC 报错 → 24h 内修复 | Google Search Console → Sitemaps |

### 4.3 每月（增长运营负责人 + 工程负责人，每月 1 日）

| 监测项 | 指标 | 行动 | 工具 |
|--------|------|------|------|
| GSC indexed pages | 总数 + 月增量 | 增量 < 5 → 排查收录障碍 | Google Search Console |
| GSC 平均排名 | 加权平均 | 月环比退步 ≥ 2 位 → 排查内容/外链 | Google Search Console |
| Top 10 工具使用次数 | `tool-used` 排名 | 与上月对比，长尾工具占比下降 → 评估首页推荐位 | GA4 + 百度统计 |
| 反馈邮件汇总 | FeedbackBar + 邮箱反馈 | 分类整理（bug / feature / 内容），形成月度反馈简报 | GA4 + 邮箱 |
| KPI 复盘 | 本表第 2 节所有 KPI | 实测值填入"基线"列；30/90 天目标按实测趋势调整 | 本文档 |
| 未执行项触发条件复评 | 第 3 节 28 项触发条件 | 命中项进入当月 sprint | 本文档 |

### 4.4 每季（增长运营负责人 + 工程负责人 + 产品负责人，每季度首月 1 日）

| 监测项 | 指标 | 行动 | 工具 |
|--------|------|------|------|
| SEO 成熟度复评 | 评分（满分 100） | 按 `seo-audit-findings.md` 维度重新审计；目标：每季度 +10 分 | 人工审计 |
| KPI 战略复盘 | 30 / 90 天目标达成率 | 达成率 < 60% → 重排优先级，可能下调后续目标 | 本文档 |
| 多视角审视复评 | 68 条问题闭环率 | 目标：每季度 P0 闭环率 100%、P1 ≥ 70% | `site-audit-multi-perspective.md` |
| 增长渠道复盘 | 各渠道（HN / PH / 知乎 / Reddit 等）UV 贡献 | ROI < 1 的渠道降级 | GA4 渠道归因 |
| 优先级重排 | 下季度 sprint 排期 | 基于上述复盘输出新 spec | 本文档 + spec 库 |

---

## 5. 数据采集与对账规则

1. **GA4 主源、百度统计副源**：所有 `trackEvent` 事件双写（`analytics.ts` 已实现），月度对账差异 ≤ 15% 视为正常，> 15% 须排查埋点丢失。
2. **GSC 数据滞后 3 天**：周报采集时取 T-3 ~ T-9 窗口；月报取 T-3 ~ T-33 窗口。
3. **抽样验证**：每月对 5 个工具页跑一次 Google Rich Results Test，确认 BreadcrumbList + FAQPage schema 仍通过；不通过则当周修复。
4. **基线替换流程**：T+7 当日由增长运营负责人把所有 `TBD（部署后 7 天采集）` 替换为实测值，并在变更日志追加一行。
5. **目标调整规则**：30 天目标达成率 < 50% 时，90 天目标下调至"30 天实测值 × 1.5"；达成率 > 120% 时，90 天目标上调 20%。

---

## 6. 变更日志

| 日期 | 变更人 | 变更内容 |
|------|--------|----------|
| 2026-07-21 | 增长运营负责人 | 文档初版创建，登记 9 项已完成执行项、28 项未执行项、4 级监测节奏。所有基线占位 `TBD（部署后 7 天采集）` 待部署后 T+7 日采集。 |

---

## 7. 附：与现有文档的索引关系

- [`seo-audit-findings.md`](./seo-audit-findings.md) → SEO 62/100 基线与 Top 10 修复项（本次执行项 #2 / #3 / #4 / #5 的依据）
- [`site-audit-multi-perspective.md`](./site-audit-multi-perspective.md) → 68 条问题清单（本表第 3 节未执行项的依据）
- [`marketing-and-growth-strategy.md`](./marketing-and-growth-strategy.md) → 渠道优先级与叙事锚点（本表第 3 节 #11–#16 增长动作的依据）
- [`product-strategy.md`](./product-strategy.md) → 产品定位与扩张路径
- [`growth-and-membership-strategy.md`](./growth-and-membership-strategy.md) → 长期增长与会员体系规划
- [`user-research-and-expansion-roadmap.md`](./user-research-and-expansion-roadmap.md) → 用户调研基线
- [`tool-roadmap-update.md`](./tool-roadmap-update.md) → 工具扩展路线图
