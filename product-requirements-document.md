# Neetpix — 产品需求文档 (PRD)

> 版本: v0.1 (MVP)
> 编制日期: 2026-07-09
> 状态: 初稿

---

## 1. 产品概述

### 1.1 核心定位

**Neetpix（尼特派）** 是一个"办公/多媒体软件付费墙功能免费化"的 Web 工具站。

把 WPS、Office、Adobe 等软件放在付费墙后面的常用功能，做成免费、好看、好用的在线工具。

### 1.2 品牌信息

| 项目 | 内容 |
|------|------|
| 英文品牌名 | Neetpix |
| 中文品牌名 | 尼特派（ní tè pài） |
| 域名 | neetpix.com（已注册） |
| 品牌口号 | EN: "Unpay the tools" / CN: "解付工具" |
| 品牌定位 | "别人收费的功能，我们免费给你用" |
| 视觉风格 | Apple 级设计品质，Teal + Coral 配色 |

### 1.3 目标用户

- **海外用户（Primary）**: 付费意愿高，习惯 SaaS 工具，搜索 "remove background" 等英文关键词
- **中文用户（Secondary）**: 熟悉 WPS 付费墙，寻找免费替代方案，搜索"在线去背景"等中文关键词
- **特征**: 办公人群、学生、自媒体创作者、跨境工作者

### 1.4 核心指标（MVP 阶段）

| 指标 | 目标 | 衡量方式 |
|------|------|---------|
| 日活用户（DAU） | ≥ 500 | 网站分析 |
| 工具完成率 | ≥ 70% | 上传→处理→下载 漏斗 |
| 品牌回访率 | ≥ 15% | 直接访问 / 总访问 |
| 免费版满意度 | ≥ 4.0/5.0 | 工具内反馈 |

---

## 2. MVP 范围

### 2.1 首发 4 个工具（按优先级）

| 优先级 | 工具名称 | 核心价值 | 技术方案 | 前端/后端 |
|--------|---------|---------|---------|----------|
| P0 | 移除背景 (Remove Background) | 视觉冲击力最强，自带传播性 | @xenova/transformers (RMBG-1.4 ONNX)，浏览器本地推理 | 纯前端 |
| P1 | 截图翻译 (Screenshot Translate) | 中英双语差异化，高频使用 | Tesseract.js (OCR) + 翻译 API 代理 | 前端 + 轻量 API |
| P2 | PDF 转 Word (PDF to Word) | 搜索量最大，SEO 入口 | PDF.js 预览 + LibreOffice 后端转换 | 前端 + VPS 后端 |
| P3 | 图片压缩 (Image Compress) | 技术最简单，使用场景高频 | browser-image-compression + Canvas API | 纯前端 |

### 2.2 每个工具的核心功能

#### 移除背景

- [x] 上传图片（拖拽/点击上传）
- [x] 支持 JPG、PNG、WebP 格式
- [x] 浏览器端 AI 本地推理，不留存服务器
- [x] 原图 vs 结果对比显示
- [x] 下载结果（免费版：1024px + 水印，每日 5 次）
- [x] 双语界面（EN / ZH）
- [ ] 免费版限制：Pro 输出无损 + 无水印 + 无限次（MVP 后实现）

#### 截图翻译

- [x] 上传截图 / 粘贴截图
- [x] 自动 OCR 识别文字
- [x] 翻译为指定语言（EN ↔ ZH）
- [x] 逐句对照显示
- [x] 复制翻译结果

#### PDF 转 Word

- [x] 上传 PDF 文件
- [x] 服务端转换（LibreOffice）
- [x] 保留基础格式（文字、段落）
- [x] 下载 .docx 文件
- [x] 文件处理完自动删除（隐私承诺）

#### 图片压缩

- [x] 上传图片
- [x] 实时调整压缩质量/尺寸
- [x] 原图 vs 压缩后大小对比
- [x] 下载压缩结果

### 2.3 非 MVP 范围（明确不做）

- 用户账户系统（将来做）
- 付费/订阅系统（将来做）
- 桌面端应用（看产品反馈再定）
- 批量处理（将来做）
- 历史记录（将来做）
- 第三方登录（将来做）

---

## 3. 技术架构方案

### 3.1 架构总览

                      ┌──────────────────────┐
                      │   Cloudflare DNS     │
                      └──────┬───────────────┘
                             │
                      ┌──────▼───────────────┐
                      │   Vercel (Edge)       │
                      │   ┌───────────────┐  │
                      │   │ Next.js 14    │  │
                      │   │ App Router    │  │
                      │   │ SSR / ISR     │  │
                      │   └───────┬───────┘  │
                      │           │          │
                      │   ┌───────▼───────┐  │
                      │   │ API Routes   │  │
                      │   │ (Serverless) │  │
                      │   └───────┬───────┘  │
                      └──────────┼──────────┘
                                 │
               ┌─────────────────┼─────────────────┐
               │                                  │
    ┌──────────▼──────────┐        ┌──────────────▼──────────┐
    │  Browser (Client)    │        │  VPS (Hetzner HK)       │
    │  ┌───────────────┐   │        │  ┌───────────────────┐  │
    │  │ Transformers.js│   │        │  │ Python FastAPI   │  │
    │  │ (RMBG-1.4)     │   │        │  │ LibreOffice CLI  │  │
    │  │ Tesseract.js   │   │        │  │ (PDF转换)         │  │
    │  │ Canvas API     │   │        │  │ Translation Proxy│  │
    │  └───────────────┘   │        │  └───────────────────┘  │
    └──────────────────────┘        └─────────────────────────┘

### 3.2 技术选型表

| 层级 | 技术选型 | 理由 |
|------|---------|------|
| **框架** | Next.js 14 (App Router) | SSR 对 SEO 友好，文件路由支持 /en/ /zh/ 直接映射，Serverless API 内置 |
| **语言** | TypeScript | 类型安全，AI 工具补全效果好 |
| **UI 框架** | Tailwind CSS 3 | 快速构建，与 Apple 设计语言一致，设计 token 可维护 |
| **i18n** | next-intl | 支持 /en/ /zh/ 子路径路由，类型安全翻译 |
| **AI 推理** | @xenova/transformers | 浏览器内 ONNX 推理，RMBG-1.4 模型，零服务器成本 |
| **OCR** | Tesseract.js | 浏览器内 OCR，支持中英文 |
| **图片处理** | Canvas API + browser-image-compression | 纯前端，无服务器压力 |
| **PDF 处理** | pdf-lib + LibreOffice (后端) | 前端预览 + 后端转换保质量 |
| **部署** | Vercel (Hobby) + Hetzner VPS | 前端免费，后端极低成本 |
| **版本控制** | GitHub | 标准协作流程 |

### 3.3 前端架构

```
app/
├── [locale]/                    # 国际化路由 (en, zh)
│   ├── layout.tsx               # 区域布局 + 导航/页脚
│   ├── page.tsx                 # 首页（品牌介绍 + 工具列表）
│   ├── tools/
│   │   ├── remove-background/
│   │   │   ├── page.tsx         # 工具页面
│   │   │   └── components/      # 工具组件
│   │   ├── screenshot-translate/
│   │   ├── pdf-to-word/
│   │   └── image-compress/
│   ├── privacy/
│   └── about/
├── api/
│   ├── translate/route.ts       # 翻译代理
│   ├── pdf/convert/route.ts     # PDF 转换
│   └── health/route.ts          # 健康检查
├── components/
│   ├── ui/                      # 共享 UI 组件
│   │   ├── Button.tsx
│   │   ├── UploadZone.tsx
│   │   ├── ComparisonSlider.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── ToolCard.tsx
│   └── tools/                   # 工具组件
│       ├── RemoveBackground/
│       └── ...
├── lib/
│   ├── models/                  # 模型加载
│   ├── image-processing/        # 图片处理工具
│   └── utils/                   # 通用工具
├── messages/                    # 翻译文件
│   ├── en.json
│   └── zh.json
└── styles/
    └── globals.css              # Tailwind + 品牌 token
```

### 3.4 部署架构

| 资源 | 服务商 | 配置 | 月费 | 用途 |
|------|-------|------|------|------|
| 前端托管 | Vercel (Hobby) | Edge Network, 100GB 带宽 | $0 | 静态 + SSR + API Routes |
| VPS | Hetzner CX22 | 2 vCPU, 4GB RAM, 40GB SSD | ~€4 | PDF 转换 + 翻译代理 |
| 域名 | Cloudflare | DNS + CDN 代理 | $0 | 域名管理 + 安全 |
| 源码 | GitHub | 私有仓库 | $0 | 版本控制 |

### 3.5 性能目标

| 指标 | 目标 |
|------|------|
| 首页 LCP | < 1.5s |
| 工具页面加载 | < 2s |
| 移除背景处理 | < 5s (WebGPU) / < 15s (WebGL fallback) |
| 图片压缩处理 | < 1s |
| PDF 转 Word 转换 | < 30s (含上传) |
| Lighthouse 评分 | > 90 所有页面 |

---

## 4. 用户体验要求

### 4.1 设计原则

1. **Clean**: 干净、克制、留白充足。Apple 级设计品质。
2. **Results**: 用户最关注"输出结果"，操作路径最短。
3. **Delight**: 微动效、过渡流畅、反馈即时。
4. **Privacy**: 所有处理说明"是否在本地完成"。
5. **Bilingual**: 中英双语 UI 等保，无翻译感。
6. **One Brand**: 所有工具视觉统一，品牌感知一致。

### 4.2 页面结构

**首页 (Landing Page)**
- Hero 区域：品牌标语 + CTA（"开始使用"）
- 工具网格：4 个首发工具卡片
- 品牌承诺：隐私、免费等
- Footer：版权、隐私政策

**工具页面 (Tool Page)**
- 标题 + 简短描述
- 上传区域（拖拽/点击）
- 处理结果展示（对比）
- 下载按钮
- 工具使用说明
- 隐私提示

### 4.3 错误处理

| 场景 | 用户看到 |
|------|---------|
| 上传格式不支持 | 清晰的错误提示 + 支持的格式列表 |
| 处理失败 | 重试按钮 + 错误原因说明 |
| 文件过大 | 大小限制提示 |
| 网络断开 | 离线提示（不支持离线处理时） |
| 模型加载失败 | 降级提示 + 建议刷新 |

---

## 5. 国际化要求

### 5.1 语言覆盖

| 语言 | 代码 | 优先级 | 范围 |
|------|------|--------|------|
| 英语 | en | P0 | 全部 UI + 工具 |
| 简体中文 | zh | P0 | 全部 UI + 工具 |

### 5.2 路由策略

- `/en/tools/remove-background` — 英文
- `/zh/tools/remove-background` — 中文
- 根路径 `/` 根据浏览器语言自动重定向
- 所有页面 `<html lang="en|zh">` 正确设置

### 5.3 翻译内容范围

- 导航、页脚等全局 UI
- 工具页面标题、描述、操作提示
- 错误提示、成功提示
- SEO meta 标签（title, description）
- 品牌描述、定价文案

---

## 6. SEO 要求

### 6.1 基础 SEO

| 要求 | 实现方式 |
|------|---------|
| 语义化 HTML | <header>, <main>, <nav>, <footer>, <article> |
| Meta 标签 | 每个页面独立 title / description / og: 标签 |
| 结构化数据 | Tool, WebApplication schema |
| Sitemap | /sitemap.xml 自动生成，中英文各一份 |
| robots.txt | 正确配置 |
| 规范 URL | 每个页面 <link rel="canonical"> |
| 响应式 | 移动端适配，Core Web Vitals 达标 |

### 6.2 内容策略

- 每个工具有独立 Landing Page（SEO 入口）
- 工具页面 H1 对齐高频搜索词
- 工具使用说明（FAQ 形式）丰富页面内容
- 英文内容优先覆盖头部搜索词

### 6.3 目标关键词（MVP 阶段）

| 工具 | 英文关键词 | 中文关键词 |
|------|-----------|-----------|
| Remove Background | remove background, remove bg, image background remover | 在线去背景, 图片去背景, 移除背景 |
| Screenshot Translate | screenshot translate, screenshot translator | 截图翻译, 图片翻译 |
| PDF to Word | pdf to word, pdf to docx | pdf转word, pdf 转 word |
| Image Compress | compress image, image compressor | 图片压缩, 在线压缩图片 |

---

## 7. 隐私与安全

### 7.1 数据声明

- **移除背景**: 所有处理在浏览器本地完成，不上传服务器
- **图片压缩**: 所有处理在浏览器本地完成，不上传服务器
- **截图翻译**: OCR 在浏览器本地完成；翻译调用 API 但数据不持久化
- **PDF 转 Word**: 文件上传至服务器转换，处理完立即删除（承诺不保留超过 1 小时）

### 7.2 隐私承诺

- 每个工具页面底部显示隐私提示
- 独立的隐私政策页面
- 不使用第三方分析工具（或仅用隐私友好的 Plausible/Fathom）

---

## 8. 后续迭代方向（MVP 后）

| 阶段 | 内容 |
|------|------|
| Phase 2 | 用户账户、免费额度管理、Pro 升级 |
| Phase 3 | 更多工具（PDF 合并/拆分/压缩、OCR、格式转换） |
| Phase 4 | 桌面端（Tauri）、批量处理 |
| Phase 5 | API 开放、Affiliate 计划 |
