# Neetpix SEO 审计报告

**审计日期**：2026-07-21
**审计范围**：https://neetpix.com 全站（en + zh）
**审计人**：SEO 顾问
**技术栈**：Next.js 16 App Router + next-intl（localePrefix: "as_needed"，en/zh）+ Tailwind CSS v4

## 总览

- 当前 SEO 成熟度评分：**62/100**
- 主要优势：
  - 已建立完整的 i18n 框架（en/zh + x-default hreflang 全覆盖）
  - 所有 27 个工具页均含 canonical、openGraph、twitter、JSON-LD（WebApplication）+ FAQPage 双 schema
  - 工具列表与 sitemap、RelatedTools、Header 菜单三处一致（28 条工具，无遗漏）
  - 隐私定位（"100% 本地处理"）+ AES-256 加密等卖点可在内容中被反复强调，差异化竞品
  - next-intl `localePrefix: "as_needed"` 默认 en 不带前缀，对英文 SEO 友好
- 主要不足：
  - **缺面包屑 UI + BreadcrumbList JSON-LD**（站内导航与结构化数据双缺）
  - **内容严重过薄**：工具页文案约 500–800 字，远低于 ILovePDF / Smallpdf 同类的数千字
  - **404 页面断布局**：仅根级 `not-found.tsx`，无 `[locale]/not-found.tsx`，无 Header/Footer，无热门工具推荐，h1="404"
  - **图片全部用 `<img>` 而非 `next/image`**，丧失自动 WebP/AVIF/lazy/responsive 优化
  - **重型依赖未做动态导入**（transformers、onnxruntime-web、tesseract.js、pdfjs-dist、qpdf-wasm），首屏 JS 过大
  - **OG 图片全站统一 `/og-image.png`**，无 per-tool 差异化，缺 width/height/alt
  - **未补齐 WebSite + Organization JSON-LD 全站输出**（Organization 仅在 /about 单页输出）
  - **FAQ 渲染被 `[1,2,3].map` 写死**，qr-decode（4 条）/ file-transfer（6 条）实际只能展示 3 条
  - **未做 category hub 页**（/pdf-tools、/image-tools）、未做 /tools 总览页
  - **sitemap lastModified = new Date()**，全站共享一个 build 时间戳，每次部署都"刷新全部"，弱化爬虫信号

---

## 维度 1: Sitemap 完整性

### 现状
文件：`web/src/app/sitemap.ts`

- 共声明 31 条路由：1 首页 + 28 工具 + `/privacy` + `/about`
- 双 locale 循环输出：en（无前缀）+ zh（/zh 前缀），共 62 条 URL
- 与 `web/src/lib/tools-metadata.ts` 中 `TOOL_LIST`（28 条）逐一比对，**无遗漏、无冗余**
- 每条 entry 包含：`url`、`lastModified: new Date()`、`changeFrequency: "weekly"`、`priority: route === "" ? 1 : 0.8`

### 问题清单
- **[P1] lastModified 全站共享 build 时间戳**：`new Date()` 在 `sitemap()` 执行时（即 build 时）求值，所有 URL 共享同一时间戳。每次部署即便内容未改，lastmod 也会被刷新，稀释爬虫信任度，且无法让爬虫识别"真正更新"的页面。
- **[P1] changeFrequency 一刀切 "weekly"**：首页应为 `daily`/`always`；工具页应为 `monthly`（功能稳定）；`/privacy`、`/about` 应为 `yearly`。
- **[P2] priority 二档制（1 / 0.8）**：未区分 hot 工具（pdfToWord/wordToPdf/removeBackground）与新工具（badge: "new"）。建议 hot=0.9、普通=0.7、privacy/about=0.3。
- **[P2] 未声明 sitemap image extension**：对图片搜索无信号。
- **[P2] 未生成 sitemap index**：62 条尚可单文件承载，未来若引入博客/分类页需切分。

### 修复建议
1. 将 `lastModified` 改为基于路由最近修改时间（可用 git log 或自定义 content manifest），或对每条路由维护一个常量日期。
2. 为路由配置优先级表，例如：
   ```ts
   const META: Record<string, { freq; priority }> = {
     "": { freq: "daily", priority: 1 },
     "/about": { freq: "yearly", priority: 0.3 },
     "/privacy": { freq: "yearly", priority: 0.3 },
   };
   // 默认工具页：{ freq: "monthly", priority: 0.7 }；hot 工具：0.9
   ```
3. 加入 `images` 字段（参考 `MetadataRoute.Sitemap` 的 images 字段）引用每页的 og-image。

---

## 维度 2: robots.txt

### 现状
- 文件：`web/src/app/robots.ts`（动态生成；**`web/public/robots.txt` 不存在**）
- 规则极简：`userAgent: "*", allow: "/"`
- 已声明 sitemap：`https://neetpix.com/sitemap.xml` ✓

### 问题清单
- **[P1] 未显式 disallow `/api/`**：`/api/translate` 等 endpoint 不应被收录。
- **[P2] 未 disallow `/_next/`、`/private/`**：Next.js 通常会自动处理，但显式声明更稳妥。
- **[P2] 无 `host` 指令**（可省略，但有助于指定主域）。
- **[P2] 无 crawl-delay 或 max-image-px** 等优化指令。
- **[P2] 缺少 disallow 查询参数变体**（如 `?utm_*`、`?fbclid=*`），未来投放广告时易出现重复 URL 被收录。

### 修复建议
更新 `robots.ts`：
```ts
return {
  rules: [
    { userAgent: "*", allow: "/", disallow: ["/api/", "/_next/", "/private/"] },
    { userAgent: "*", disallow: ["/*?utm_*", "/*?fbclid=*"] },
  ],
  sitemap: "https://neetpix.com/sitemap.xml",
  host: "https://neetpix.com",
};
```

---

## 维度 3: canonical URL 覆盖

### 现状
- 工具函数：`web/src/lib/seo.ts` 的 `buildI18nMetadata(route, locale)`
  ```ts
  const enUrl = `${baseUrl}${route}`;
  const zhUrl = `${baseUrl}/zh${route}`;
  const canonical = locale === "en" ? enUrl : zhUrl;
  return { canonical, languages: { en: enUrl, zh: zhUrl, "x-default": enUrl } };
  ```
- 抽查 10 个工具页 `generateMetadata`：
  | 工具 | route 参数 | 是否设置 alternates |
  |---|---|---|
  | pdf-merge | `/tools/pdf-merge` | ✓ |
  | pdf-to-word | `/tools/pdf-to-word` | ✓ |
  | pdf-split | `/tools/pdf-split` | ✓ |
  | pdf-encrypt | `/tools/pdf-encrypt` | ✓ |
  | pdf-page-numbers | `/tools/pdf-page-numbers` | ✓ |
  | pdf-rotate | `/tools/pdf-rotate` | ✓ |
  | pdf-compress | `/tools/pdf-compress` | ✓ |
  | image-compress | `/tools/image-compress` | ✓ |
  | image-to-pdf | `/tools/image-to-pdf` | ✓ |
  | image-exif | `/tools/image-exif` | ✓ |
  | image-resize | `/tools/image-resize` | ✓ |
  | image-blur | `/tools/image-blur` | ✓ |
  | image-watermark | `/tools/image-watermark` | ✓ |
  | remove-background | `/tools/remove-background` | ✓ |
  | screenshot-translate | `/tools/screenshot-translate` | ✓ |
  | qr-code | `/tools/qr-code` | ✓ |
  | qr-decode | `/tools/qr-decode` | ✓ |
  | chart-generator | `/tools/chart-generator` | ✓ |
  | file-transfer | `/tools/file-transfer` | ✓ |
  | word-to-pdf | `/tools/word-to-pdf` | ✓ |
  - 首页 `buildI18nMetadata("", locale)` ✓
  - /about、/privacy 同样调用 ✓
- **canonical 实现正确**，与 localePrefix:"as_needed" 策略一致。

### 问题清单
- **[P2] 工具页未显式设置 `openGraph.url`**：Next.js 默认会用 canonical，但显式声明更稳。
- **[P2] `metadataBase` 已在 root layout 设置为 `new URL("https://neetpix.com")`**，与 buildI18nMetadata 中的硬编码 baseUrl 重复，存在双源风险。
- **[P2] 末尾斜杠策略未文档化**：canonical 不带尾斜杠，需确保 Next.js `trailingSlash: false`（默认）且 301 重定向到无斜杠版本。

### 修复建议
1. 工具页 `generateMetadata` 在 openGraph 中显式添加 `url: locale === "en" ? enUrl : zhUrl`。
2. 将 `buildI18nMetadata` 中的 baseUrl 抽取到 env 或常量文件，与 root layout 共用，避免双源。
3. 在 next.config.ts 显式声明 `trailingSlash: false`（已是默认，但建议显式）。

---

## 维度 4: hreflang alternates

### 现状
- `buildI18nMetadata` 返回 `languages: { en, zh, "x-default": en }`，每页通过 `alternates: buildI18nMetadata(...)` 注入
- 所有 27 工具页 + 首页 + /about + /privacy 均覆盖 ✓
- en URL 不带前缀（默认 locale），zh URL 带 `/zh` 前缀，x-default 指向 en URL

### 问题清单
- **[P2] 缺少区域性变体**：未声明 `en-US`、`zh-CN`、`zh-Hant`。对于面向中文用户（含港台）的产品，建议补 `zh-CN` 与 `zh-Hant`（若计划繁体支持）。
- **[P2] x-default 硬编码为 en URL**：Google 官方建议 x-default 指向"不针对特定 locale 的页面"（通常是英文版或自动检测页）。当前实现可接受，但若未来接入自动检测逻辑需调整。
- **[P2] 未输出 `og:locale` 与 `og:locale:alternate`**：Next.js Metadata API 支持 `openGraph.locale` 与 `openGraph.alternateLocales`，但当前未设置。

### 修复建议
扩展 `buildI18nMetadata` 返回值，并让调用方注入 openGraph.locale：
```ts
return {
  canonical,
  languages: { en: enUrl, "en-US": enUrl, zh: zhUrl, "zh-CN": zhUrl, "x-default": enUrl },
  // 新增：便于调用方注入 OG
  locale: locale === "en" ? "en_US" : "zh_CN",
  alternateLocales: [locale === "en" ? "zh_CN" : "en_US"],
};
```
调用方：
```ts
openGraph: { ..., locale: meta.locale, alternateLocales: meta.alternateLocales }
```

---

## 维度 5: OG / Twitter Card 覆盖

### 现状
- 抽查 10+ 工具页 `generateMetadata`，**全部包含 `openGraph` 与 `twitter`**：
  ```ts
  openGraph: { title: t("title") + " - Neetpix", description: t("description"), images: ["/og-image.png"] },
  twitter: { card: "summary_large_image", title: ..., description: ..., images: ["/og-image.png"] },
  ```
- Root layout 已设默认 `openGraph.type: "website"`、`siteName: "Neetpix"`、`images: ["/og-image.png"]`
- Root layout 已设 `twitter.card: "summary_large_image"`
- `web/public/og-image.png` 存在 ✓

### 问题清单
- **[P0] og:image 全站统一为 `/og-image.png`**：分享任意工具页到社交，看到的都是同一个图，无法体现工具差异，CTR 受损。竞品（ILovePDF、Smallpdf）通常有 per-tool OG image。
- **[P1] og:image 未声明 width/height/alt**：未给社交平台提供尺寸提示，可能导致预览渲染延迟。
- **[P2] 缺 `twitter:site` 与 `twitter:creator`**：未声明 Neetpix 官方 Twitter handle。
- **[P2] 工具页未声明 `openGraph.url`、`openGraph.type`、`openGraph.locale`**。
- **[P2] 未声明 `openGraph.siteName`（工具页）**：根 layout 已设默认，但工具页 metadata 会覆盖整个 openGraph 对象，可能导致 siteName 丢失（需验证）。
- **[P2] 缺 `openGraph.modifiedTime`、`publishedTime`、`author`**（对 article 类型适用，WebApplication 不强制）。

### 修复建议
1. 用 `@vercel/og` 或 Satori 生成 per-tool 动态 OG 图（路由如 `/api/og?tool=pdf-merge&locale=en`），把工具名 + 卖点（"100% local · No upload · Free"）渲染成图。
2. 工具页 metadata 补全：
   ```ts
   openGraph: {
     title, description,
     url: ...,            // 新增
     type: "website",     // 显式
     locale: "en_US",     // 新增
     alternateLocales: ["zh_CN"],
     siteName: "Neetpix", // 显式避免继承丢失
     images: [{ url: `/api/og?tool=pdf-merge&locale=${locale}`, width: 1200, height: 630, alt: t("title") + " - Neetpix" }],
   },
   twitter: {
     card: "summary_large_image",
     site: "@neetpix",      // 新增
     creator: "@neetpix",   // 新增
     title, description, images,
   }
   ```

---

## 维度 6: JSON-LD 结构化数据覆盖

### 现状
- `web/src/components/seo/JsonLd.tsx`：输出 `WebApplication` schema
  ```ts
  { "@context": "https://schema.org", "@type": "WebApplication",
    name, description, url, applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    brand: { "@type": "Brand", name: "Neetpix" }, inLanguage: locale }
  ```
- `web/src/components/seo/Faq.tsx`：输出 `FAQPage` schema（3 条 Q/A）+ 可见 HTML
- `web/src/app/[locale]/about/page.tsx`：**仅此页**输出 `Organization` schema
- `file-transfer/page.tsx`：通过 `type="SoftwareApplication"` 切换 schema 类型 ✓
- 所有 27 工具页均渲染 `<JsonLd>` + `<Faq>`，但 `qr-code`、`qr-decode`、`chart-generator`、`file-transfer` 因 FAQ 条目可能未齐备，使用 `hasFaq` 条件渲染（4 页可能少 FAQ schema）

### 问题清单
- **[P0] 缺 BreadcrumbList JSON-LD**：全站无面包屑 UI，也无 BreadcrumbList schema。这是工具类站点的关键 schema，能命中 Google 富结果展示。
- **[P0] 缺 WebSite schema**：根 layout 未输出 WebSite JSON-LD（含 `potentialAction: SearchAction`），无 Sitelinks Search Box 资格。
- **[P1] Organization schema 仅在 /about 输出**：未在 root layout 全站输出，错失 Knowledge Graph 卡片机会。
- **[P1] WebApplication schema 缺 `aggregateRating` / `review`**：未来上线评分系统后可补。
- **[P1] WebApplication schema 缺 `author` / `datePublished` / `image`**。
- **[P1] FAQPage 只渲染 3 条**：`Faq.tsx` 第 14 行 `const questions = [1, 2, 3].map(...)`。`qr-decode`（4 条）、`file-transfer`（6 条）i18n 文案被截断，结构化数据丢失内容。
- **[P2] FAQPage `Question` 缺 `@id`**：无法在 SERP 中跳锚。
- **[P2] 多个 JSON-LD script 标签未用 `@graph` 聚合**：每页 2 个独立 script（WebApplication + FAQPage），Google 接受但聚合更规范。
- **[P2] `inLanguage` 仅字符串，未用 Language 类型**：建议 `"en-US"` 而非 `"en"`。

### 修复建议
1. 在 `web/src/app/layout.tsx` 或 `[locale]/layout.tsx` 注入 WebSite + Organization 全站 JSON-LD：
   ```ts
   const websiteLd = {
     "@context": "https://schema.org", "@type": "WebSite",
     name: "Neetpix", url: "https://neetpix.com",
     potentialAction: {
       "@type": "SearchAction",
       target: "https://neetpix.com/?q={search_term_string}",
       "query-input": "required name=search_term_string"
     }
   };
   const orgLd = { "@type": "Organization", name: "Neetpix", url: "https://neetpix.com", logo: "https://neetpix.com/icon.png", ... };
   ```
2. 创建 `<Breadcrumbs>` 组件（UI + BreadcrumbList JSON-LD），在所有工具页渲染 `Home > PDF Tools > PDF Merge`。
3. 修改 `Faq.tsx` 让 questions 数量动态：
   ```ts
   const n = [1,2,3,4,5,6,7,8].filter(i => messages.faq[`${tool}${i}`]).length;
   const questions = Array.from({length: n}, (_, i) => ({ q: t(`${tool}${i+1}`), a: t(`${tool}${i+1}a`) }));
   ```
4. 给 WebApplication 加 `image` 字段（指向工具截图或 og-image）。
5. 将 WebApplication + FAQPage + BreadcrumbList 合并到 `@graph` 数组输出。

---

## 维度 7: heading hierarchy

### 现状
- 抽查工具页 Client 组件（grep `<h1`）：**全部 27 个工具 Client 都有且仅有 1 个 h1**（如 `PdfMergeClient.tsx:183`、`ImageCompressClient.tsx:250` 等）✓
- 工具页结构：h1（工具名）→ h2（FAQ / RelatedTools / ShareBar section 标题）→ h3（FAQ 问题、相关工具名）✓
- 首页 `[locale]/page.tsx`：1 个 h1（`hero.title`，line 104），h2（`tools.title` line 128、`hero.privacyTitle` line 157），h3（分类名 line 134）✓
- `/about`：1 h1 + 多 h2 ✓
- `/privacy`：1 h1 + 多 h2 ✓
- `MyToolsSection.tsx`：仅在有收藏时显示，h2 line 19 ✓

### 问题清单
- **[P0] 404 页面 h1 = "404"**：`web/src/app/not-found.tsx:9` `<h1>404</h1>`，h2 才是"Page Not Found / 页面未找到"。h1 应描述页面内容（"404 - Page Not Found"），数字 "404" 单独放在 h1 是 SEO 误用。
- **[P2] `ImageWatermarkClient.tsx:1070` 有 sr-only 的 h2**（`watermark-preview-title`），不可见但爬虫会读，可能干扰内容层级判断。
- **[P2] `ChartGeneratorClient.tsx:910` 有 h2 `chart-import-title`**（仅在弹窗内显示），可能被爬虫误读为正文小标题。
- **[P2] Home page 的分类 h3 在 h2 之前**：先 h2 (tools.title) 再 h3 (分类名)，再 h2 (hero.privacyTitle)。结构虽合法，但 privacyTitle 与 tools.title 是同级 section，h3 嵌在 tools section 内是合理的。

### 修复建议
1. 404 页面改为 `<h1>Page Not Found / 页面未找到</h1>`，将 "404" 作为视觉装饰元素（`<span aria-hidden="true">404</span>` 或保留为视觉但不放 h1）。
2. sr-only 的 h2（watermark-preview-title）改为 `<span class="sr-only" role="heading" aria-level="2">` 或直接删除并依赖 aria-label。
3. 弹窗内的 chart-import-title 不应使用 h2，改为 `<p class="font-semibold">`。

---

## 维度 8: 图片 alt 文本

### 现状
全站 `<img>` 标签扫描结果（不含 SVG）：
| 文件 | 行号 | alt | 评估 |
|---|---|---|---|
| `components/ShareBar.tsx` | 103 | `alt="QR Code"` | 通用，未描述上下文（应为"分享本文的微信二维码"） |
| `app/[locale]/tools/image-id-photo/ImageIdPhotoClient.tsx` | 214 | `alt="Original"` | 通用，未描述图片 |
| `app/[locale]/tools/image-id-photo/ImageIdPhotoClient.tsx` | 310 | `alt="Original"` | 通用 |
| `app/[locale]/tools/remove-background/RemoveBackgroundClient.tsx` | 192 | `alt="Original"` | 通用 |
| `app/[locale]/tools/remove-background/RemoveBackgroundClient.tsx` | 200 | `alt="Result"` | 通用 |
| `app/[locale]/tools/image-compress/ImageCompressClient.tsx` | 398 | `alt={item.file.name}` | ✓ 用文件名作 alt，较好 |
- 大量 SVG 图标在 Header/ToolCard/FeedbackBar/BookmarkHint 等组件中，多数已正确标注 `aria-hidden="true"` ✓
- `Logo.tsx` SVG 用 `aria-label="Neetpix logo"` ✓

### 问题清单
- **[P1] 全站未使用 `next/image`**：所有 `<img>` 均为原生标签，丧失：
  - 自动 WebP/AVIF 转换
  - `loading="lazy"` 默认开启
  - 响应式 srcset
  - blur placeholder
- **[P1] alt 文本过于通用**："Original"、"Result"、"QR Code" 这类 alt 对 SEO 与无障碍帮助有限。应描述具体内容，如 `alt="Original image before background removal"`、`alt="Processed image with transparent background"`。
- **[P2] og-image.png 在 metadata 中未声明 alt**（参见维度 5）。
- **[P2] 部分装饰性 SVG 未标 aria-hidden**（如 `ImageWatermarkClient` 中部分图标），但属于小问题。

### 修复建议
1. 将 `<img>` 替换为 `next/image` 的 `<Image>`：
   ```tsx
   import Image from "next/image";
   <Image src={qrDataUrl} alt="Share this page via WeChat QR code" width={192} height={192} />
   ```
2. 更新通用 alt 为描述性文案（i18n 化）：
   - "Original" → `t("alt.original")` 如 "Original image before processing"
   - "Result" → `t("alt.result")` 如 "Processed result with background removed"
3. 在 `next.config.ts` 配置 `images: { formats: ['image/avif', 'image/webp'] }`。

---

## 维度 9: 404 页面

### 现状
- 仅 `web/src/app/not-found.tsx`（根级），**无 `web/src/app/[locale]/not-found.tsx`**
- 内容：双语硬编码 `404` + "Page Not Found / 页面未找到" + "返回首页" Link
- 不在 `[locale]` 路由内 → **不渲染 Header / Footer / LocaleSwitcher / Feedback / CommandPalette / BookmarkHint**（这些在 `LocaleLayout` 中）
- 无热门工具推荐、无 sitemap 链接、无搜索框

### 问题清单
- **[P0] 404 页面缺 Header/Footer**：用户落地后无法导航到他处，跳出率极高。
- **[P0] h1 = "404"**（见维度 7）。
- **[P0] 无热门工具推荐**：错失内部链接传递权重与挽回用户的机会。
- **[P1] 无 locale 路由版本**：英文用户访问 `/zh/不存在的页` 会被回退到根级 404，丢失 locale 切换能力。
- **[P1] 无 `noindex` 头**：404 页面应 `<meta name="robots" content="noindex">` 防止被收录（Next.js `not-found.tsx` 默认会输出 404 状态码，但 meta 防御更稳）。
- **[P2] 无搜索框**：用户无法在 404 页直接搜索目标工具。
- **[P2] 文案过于冷淡**：缺品牌感（如品牌图标）。

### 修复建议
1. 创建 `web/src/app/[locale]/not-found.tsx`，复用 LocaleLayout（自动获得 Header/Footer/LocaleSwitcher），并：
   - h1 改为 `t("error.notFound")` = "Page Not Found"
   - 添加 `<meta name="robots" content="noindex">`（通过 `generateMetadata` 返回 `robots: { index: false }`）
   - 添加热门工具 grid（pdf-to-word、remove-background、image-compress 等前 6 个 hot 工具）
   - 添加 "Browse All Tools" 按钮（前提是先建 /tools 总览页）
2. 保留根级 `not-found.tsx` 作为最兜底（locale 解析失败时），但内容更精简。

---

## 维度 10: 性能

### 现状
- `web/next.config.ts` 极简：
  ```ts
  const nextConfig: NextConfig = {};
  export default withNextIntl(nextConfig);
  ```
  几乎未做任何性能调优。
- `web/package.json` 依赖（部分重型）：
  - `@xenova/transformers` ~5MB（含 models）
  - `onnxruntime-web` ~10MB（WASM + JS）
  - `tesseract.js` ~3MB（OCR WASM）
  - `pdfjs-dist` ~5MB
  - `@jspawn/qpdf-wasm` ~1MB
  - `mammoth`、`pdf-lib`、`docx`、`peerjs`、`qrcode`、`jszip`、`browser-image-compression`、`heic2any`、`exifr`、`jsqr`
- 字体：未用 `next/font`，Tailwind 默认 system-ui 字体栈
- 图片：未用 `next/image`（见维度 8）
- 已集成 `@vercel/analytics`、`@vercel/speed-insights` ✓
- 工具 Client 组件通过 `import PdfMergeClient from "./PdfMergeClient"` 静态导入，但 App Router 自动按 route 分割 ✓
- `web/public/` 含 `qpdf.js`、`qpdf.wasm` 静态文件

### 问题清单
- **[P0] 重型依赖未动态导入**：每个工具页虽按 route 分割，但该 route 仍可能预加载不必要的大包。例如 `image-ocr` 路由会把 `tesseract.js` + `@xenova/transformers` + `onnxruntime-web` 一并打包进 client bundle。首屏 LCP 受损。
- **[P0] `next.config.ts` 无 `images` 配置**：默认 next/image 行为可用，但未声明 AVIF 优先格式，未配置 `remotePatterns`。
- **[P1] 无 `experimental.optimizeCss`**：Tailwind v4 + PostCSS 已处理，但未启用 CSS minimization 增强。
- **[P1] 无 `compiler.removeConsole`**：生产环境仍保留 `console.log` / `console.error`（PdfMergeClient 等代码中有 `console.error("Merge error:", err)`）。
- **[P1] 无 `poweredByHeader: false`**：暴露 X-Powered-By: Next.js（安全 + 微弱性能）。
- **[P1] 无 `reactStrictMode: true`**。
- **[P1] 无 `experimental.webVitalsAttribution`**：SpeedInsights 已收集，但缺归因到具体组件。
- **[P2] 无 `@next/bundle-analyzer`**：无法可视化观察 bundle 大小。
- **[P2] 字体策略**：默认 system font 对性能有利（无网络请求），但品牌一致性弱。如需品牌字体，建议 `next/font/google` 自托管。
- **[P2] 未声明 `cacheHeaders`**：`public/qpdf.wasm` 等静态文件无 `Cache-Control` 自定义。
- **[P2] WASM 文件较大**（`qpdf.wasm`）：CDN 缓存策略未优化。

### 修复建议
1. `next.config.ts` 增补：
   ```ts
   const nextConfig: NextConfig = {
     reactStrictMode: true,
     poweredByHeader: false,
     images: { formats: ['image/avif', 'image/webp'] },
     compiler: { removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false },
     experimental: { optimizeCss: true, webVitalsAttribution: ['JSX'] },
   };
   ```
2. 工具 Client 组件中将重型库动态导入：
   ```ts
   const PdfMergeClient = dynamic(() => import("./PdfMergeClient"), { ssr: false, loading: () => <Skeleton /> });
   ```
   或者更精细：在 `PdfMergeClient` 内部对 `pdf-lib` 用动态 import。
3. 安装 `@next/bundle-analyzer` 并配置 `analyze` 脚本。
4. 在 `vercel.json` 或 `next.config.ts.headers` 为 `qpdf.wasm` 等 wasm 文件加 `Cache-Control: public, max-age=31536000, immutable`。

---

## 维度 11: 内容深度

### 现状
- 抽查 3 个工具页结构（pdf-merge、image-compress、pdf-to-word）：
  ```
  PrivacyBadge (1 sentence)
  + Client UI (按钮、拖拽区，无文案)
  + Faq (3 Q/A, 每条约 50–100 字)
  + FeedbackBar (1 sentence)
  + RelatedTools (5–10 个工具卡)
  + ShareBar (无文案，仅按钮)
  ```
- 每工具页可见文案估算（en）：
  - 工具 title + description：约 30–60 字
  - 隐私徽章：约 5–15 字
  - FAQ 3 条问答：约 200–300 字
  - FeedbackBar + ShareBar：约 20 字
  - **总文案：约 250–400 字（HTML 字数）**
- i18n 文件：`web/src/messages/en.json` 共 1116 行，工具 namespace 平均 25 行文案/工具
- 竞品对比（估算）：ILovePDF 的 "Merge PDF" 页面约 800–1500 字 + "How to merge PDF files" 教程 + "Why use ILovePDF" + "User reviews" + "Available on" 等

### 问题清单
- **[P0] 工具页文案厚度严重不足**：250–400 字 vs 竞品 1500+ 字。差距巨大，难以在 SERP 中竞争 "merge pdf online"、"pdf to word converter" 等高商业价值关键词。
- **[P0] 缺关键 H2 section**：
  - "How to use [tool] in 3 steps" 教程
  - "Why Neetpix [tool] is different"（强调本地处理、零上传、免费）
  - "Use cases"（如 PDF Merge：合并合同、合并多份发票、合并简历）
  - "Supported formats"
  - "Features"（参数、批量、隐私等）
  - "Comparison vs [竞品]"
  - "Privacy & Security"
- **[P1] FAQ 仅 3 条**：竞品通常 8–10 条 FAQ 且每条更长。`qr-decode`（4 条）、`file-transfer`（6 条）i18n 已写好但被 `Faq.tsx` 写死截断。
- **[P1] 工具 description 单句过短**（如 pdf-decrypt："Remove password from PDF files." 仅 5 词），缺长尾关键词。
- **[P1] 首页文案薄**：除 hero + 工具卡列表外，无 "Why Neetpix"、"Privacy commitment"、"FAQ"、"Trust signals" 等长内容 section。
- **[P2] /about 与 /privacy 各约 200–400 字**，低于 Google EEAT 期望。
- **[P2] 缺 trust signals**：无用户评价、无媒体引用、无 badge（"Trusted by 1M+ users"）。
- **[P2] 缺内容更新信号**：无 blog、无更新日志、无新闻 section。

### 修复建议
1. 在每个工具页 Client 与 Faq 之间插入 `<ToolContent>` 服务端组件，渲染以下 section（i18n 化）：
   - `<h2>How to {tool.name} online</h2>` + `<ol>` 三步教程
   - `<h2>Why choose Neetpix {tool.name}</h2>` + 3 个卖点（本地处理、免费、无水印）
   - `<h2>Use cases</h2>` + 3–5 个场景
   - `<h2>Privacy & Security</h2>`
2. 扩展 `Faq.tsx` 动态读取所有可用 Q/A（i18n key 自增探测），目标每工具 5–8 条。
3. 重新撰写每工具的 `description` 为 2 句话（~160 字符内），含 1 个长尾关键词。
4. 在首页底部增加 `<h2>Why Neetpix</h2>` + `<h2>FAQ</h2>` section（全站级 FAQ）。
5. 中长期：建立 `/blog` 或 `/guides` 目录，每工具配一篇 1000+ 字深度教程（如 "Complete guide to merging PDF files in 2026"），内链到工具页。

---

## 维度 12: 内链结构

### 现状
- `web/src/components/seo/RelatedTools.tsx`：
  - 在所有 27+ 工具页底部渲染 4–10 个相关工具卡
  - 工具 key → slug 映射硬编码 `TOOL_ROUTES`，与 `TOOL_LIST` 重复定义（`web/src/lib/tools-metadata.ts` 中已有 `TOOL_LIST.href`）
  - 工具卡渲染 h3 + desc，链接到对应 locale 路径 ✓
- 首页 `web/src/app/[locale]/page.tsx`：5 个分类（PDF/Image/Translate/Generator/Network），每个分类列 1–12 个工具 ✓
- `Header.tsx`：桌面端 hover 下拉显示全 28 工具，移动端汉堡菜单展开 ✓
- `Footer.tsx`：仅 Privacy / About / Contact，**无工具链接**
- `MyToolsSection.tsx`：仅当用户有收藏时显示收藏工具卡
- **无面包屑组件**，工具页用户路径只有"返回浏览器"或"点击 Header logo 回首页"

### 问题清单
- **[P0] 无面包屑 UI + BreadcrumbList JSON-LD**：工具页无 "Home > PDF Tools > PDF Merge" 面包屑，用户（与爬虫）无法层级化理解站点结构。这是工具类站点的标配。
- **[P0] 无 category hub 页**：`/pdf-tools`、`/image-tools`、`/generators` 等不存在。错失 SEO 收录入口与站内权重传递节点。
- **[P0] 无 `/tools` 总览页**：用户无法浏览"所有工具"，爬虫无单一入口抓取所有工具链接。
- **[P1] Footer 无工具链接**：错失全站底部内链传递权重。建议 Footer 加 "Popular Tools" 列（pdf-to-word、remove-background、image-compress 等 6–8 个）。
- **[P1] RelatedTools 与 TOOL_LIST 数据双源**：`RelatedTools.tsx` 的 `TOOL_ROUTES`（40 行）与 `tools-metadata.ts` 的 `TOOL_LIST.href` 重复定义，未来易脱节。
- **[P2] 内链锚文本过短**：均使用工具名（"PDF Merge"），缺长尾变体（如 "merge pdf online free"、"combine multiple pdf files"）。
- **[P2] 无 "上一个/下一个工具" 导航**：用户看完一个工具无法顺次浏览。
- **[P2] 首页分类与 Header 分类一致性**：首页 `toolGroups` 与 Header `toolCategories` 各自维护，分类顺序略有差异（首页 Generator 列 qrDecode/qrCode/chartGenerator，Header 同序但 Label 不同）。

### 修复建议
1. 创建 `<Breadcrumbs>` 组件（UI + BreadcrumbList JSON-LD），在所有工具页与 /about、/privacy 顶部渲染：
   ```
   Home / PDF Tools / PDF Merge
   ```
   每级为可点击链接。
2. 创建 `/tools` 总览页（`[locale]/tools/page.tsx`）+ category hub 页（`[locale]/tools/category/[slug]/page.tsx` 或静态 `[locale]/pdf-tools/page.tsx`），形成层级化 URL 结构。
3. Footer 添加 "Popular Tools" 列与 "All Tools" 链接：
   ```tsx
   <div>
     <p>Tools</p>
     <Link href="/tools">All Tools</Link>
     <Link href="/tools/pdf-to-word">PDF to Word</Link>
     ...
   </div>
   ```
4. 重构 `RelatedTools.tsx` 复用 `TOOL_LIST`（去除 `TOOL_ROUTES` 硬编码）：
   ```ts
   import { TOOL_MAP } from "@/lib/tools-metadata";
   const slug = TOOL_MAP[key]?.href.replace("/tools/", "");
   ```
5. 在 RelatedTools 卡片标题外，增加 i18n 化的"长尾描述"作为子文本（如 "Merge multiple PDF files online, free and local"）。
6. 长期：引入 "Next/Prev tool" 在工具页底部，串联所有工具。

---

## Top 10 优先级修复项

| 排名 | 维度 | 问题 | 影响 | 修复成本 |
|------|------|------|------|---------|
| 1 | 11 | 工具页文案厚度严重不足（250–400 字 vs 竞品 1500+），缺 How to / Use cases / Why choose / Features 等 H2 section | 高（直接影响排名与转化） | 中（需为 27 工具 × en/zh 撰写文案，可分批） |
| 2 | 6 / 12 | 缺 BreadcrumbList JSON-LD + 面包屑 UI；缺 WebSite + Organization 全站 JSON-LD | 高（无 Sitelinks Search Box、无 Knowledge Graph、无层级化 SERP 富结果） | 低（新建 1 个组件 + 全局 layout 注入） |
| 3 | 9 | 404 页面断布局（无 Header/Footer），h1="404"，无热门工具推荐，无 `[locale]/not-found.tsx` | 高（用户体验差 + 内链权重传递断） | 低（新建 1 个文件 + 404 重设计） |
| 4 | 10 | 重型依赖（transformers、onnxruntime、tesseract、pdfjs）未动态导入；next.config 无性能调优 | 高（首屏 LCP/INP 受损，影响 Core Web Vitals 排名） | 中（需逐工具改造 dynamic import） |
| 5 | 12 | 无 `/tools` 总览页与 category hub 页（/pdf-tools、/image-tools） | 高（缺站内 hub 节点 + 缺内链入口） | 中（建若干新路由 + 文案） |
| 6 | 5 | og:image 全站统一为 `/og-image.png`，缺 width/height/alt，缺 twitter:site | 中（社交分享 CTR 低，无 per-tool 差异化） | 中（需用 @vercel/og 生成动态图） |
| 7 | 8 | 全站用原生 `<img>` 而非 `next/image`；alt 通用（"Original"/"Result"/"QR Code"） | 中（错失自动优化 + 图片 SEO 信号弱） | 低（替换为 Image + 重写 alt） |
| 8 | 6 | Faq.tsx 写死 `[1,2,3].map`，qr-decode（4 条）/ file-transfer（6 条）FAQ 被截断 | 中（FAQPage schema 不完整，少富结果机会） | 低（改 1 个组件） |
| 9 | 1 | sitemap `lastModified = new Date()` 全站共享 build 时间戳；changeFrequency/priority 一刀切 | 中（爬虫信任度弱化） | 低（改造 sitemap.ts） |
| 10 | 5 / 3 | 工具页 metadata 缺 openGraph.url/type/locale/alternateLocales；缺 og:url 显式 | 低-中（次要 OG 信号缺失） | 低（在 generateMetadata 中补全） |

---

## 附：审计未覆盖项（建议后续补充）

- **真实环境验证**：未实际部署后用 Google Search Console / Rich Results Test / PageSpeed Insights 验证渲染与性能。
- **Core Web Vitals 实测**：Vercel Speed Insights 已集成但未拉取历史数据。
- **反向链接档案**：未审计外链建设（domain authority、引用域名数）。
- **关键词排名现状**：未审计当前关键词在 Google/Baidu 的排名分布。
- **结构化数据富结果测试**：建议部署后用 [Rich Results Test](https://search.google.com/test/rich-results) 跑一遍。
- **国际 SEO**：未审计是否需要面向其他市场（如日韩、东南亚）扩展 locale。
- **品牌一致性**：未审计 Neetpix 品牌词在 Google 的 Knowledge Graph 卡片状态。

---

**报告完。所有问题均基于实际代码阅读得出，未做部署验证。建议按 Top 10 优先级逐项修复，每项修复后用 Search Console 监测 2–4 周再评估效果。**
