# Neetpix — 开发计划 (Development Plan)

> 版本: v0.1 (MVP)
> 编制日期: 2026-07-09
> 预计周期: 5-6 周（单人 + AI 辅助）
> 技术栈: Next.js 14 + Tailwind CSS + next-intl + @xenova/transformers

---

## 整体节奏

```
周次    1         2         3         4         5         6
Phase   Foundation  Tool #1   Tool #3   Tool #2   Tool #4   Launch
                    Remove    Image     Scr.Tr.   PDF→Word Polish
        ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐
基础架构  ════╗
设计系统  ════╝
移背工具  ══════╗
图片压缩  ═══════╝
截图翻译          ══════╗
PDF转换                  ══════╗
上线准备                         ══════╗
```

---

## Phase 0: 环境准备 (Day 1)

| 任务 | 预估时间 | 产出 |
|------|---------|------|
| GitHub 仓库创建 | 0.5h | neetpix/neetpix-web |
| Next.js 项目初始化 | 0.5h | `npx create-next-app` with App Router + TypeScript |
| 依赖安装 | 0.5h | tailwindcss, next-intl, 等核心依赖 |
| Vercel 关联仓库 | 0.5h | 自动部署通道 |
| VPS 购买 + 基础配置 | 1h | Hetzner CX22, Docker/nginx |
| CICD 配置 | 0.5h | GitHub → Vercel auto-deploy |
| **总计时长** | **3.5h** | |

---

## Phase 1: 基础框架搭建 (Week 1)

### Day 1-2: 项目脚手架

| 任务 | 产出 |
|------|------|
| App Router 路由结构 | `/en /zh` 区域路由, `tools/*` 工具页面 |
| next-intl 集成 | 中英翻译文件, 路由中间件 |
| Tailwind 配置 | 品牌色 token (teal/coral/gray), 字体栈 |
| 全局样式 | CSS变量、基础组件样式 |
| Layout + Header + Footer | 双语导航、品牌 Logo、语言切换 |

### Day 3-4: 设计系统实现

| 任务 | 产出 |
|------|------|
| Logo SVG 组件 | 方向 B 的 SVG 实现 (Teal 底 + 白色 N + 珊瑚色方块) |
| 品牌色 CSS 变量 | 所有颜色映射到 Tailwind 主题扩展 |
| 基础组件库 | Button, UploadZone, ComparisonSlider, Spinner, ProgressBar |
| 工具页面模板 | 上传→处理→下载 的标准流程模板 |

### Day 5: 首页

| 任务 | 产出 |
|------|------|
| Hero 区域 | 品牌标语 + CTA |
| 工具网格 | 4 个工具卡片 (标题、描述、演示 GIF/图片) |
| 品牌承诺 | 隐私、免费说明区块 |
| SEO 基础 | `<head>` meta, OG tags, 结构化数据 |
| 响应式适配 | 移动端 + 桌面端 |

### Day 6-7: 缓冲/修复

| 任务 | 说明 |
|------|------|
| Bug 修复 | 跨浏览器测试 (Chrome, Safari, Firefox, Edge) |
| 性能优化 | Lighthouse 评分达标 |
| 国际化检查 | 所有 UI 文本完成中英翻译 |

### 里程碑: Week 1 结束 → 基础框架可运行, 首页可访问

---

## Phase 2: 移除背景工具 (Week 2)

### Day 8-9: 模型集成

| 任务 | 技术细节 |
|------|---------|
| @xenova/transformers 集成 | 通过 transformers.js 加载 RMBG-1.4 ONNX 模型 |
| 模型加载管理 | 懒加载 + 进度提示 + fallback 策略 |
| WebGPU / WebGL 支持 | 优先 WebGPU, 回退 WebGL |

### Day 10-11: 工具 UI

| 任务 | 说明 |
|------|------|
| 上传区域 | 拖拽 + 点击, 文件类型/大小校验 |
| 处理状态 | 加载动画 (spinner + 进度指示) |
| 结果展示 | 原图 vs 去背景 对比滑块 (ComparisonSlider) |
| 下载按钮 | 免费版: 1024px + 水印; 每日限制 (localStorage) |

### Day 12: 精度优化

| 任务 | 说明 |
|------|------|
| 预/后处理 | 图像缩放优化推理速度 |
| 边缘裁剪 | 自动去除多余透明区域 |
| 预览优化 | 半透明背景网格增强对比效果 |

### Day 13-14: 测试 + 缓冲

| 任务 | 说明 |
|------|------|
| 不同图片类型测试 | 人物、物品、图形 |
| 大文件测试 | 20MB+ 图片的内存管理 |
| 移动端适配 | 触摸操作流畅 |

### 里程碑: Week 2 结束 → 移除背景工具上线可测

---

## Phase 3: 图片压缩工具 (Week 3)

### Day 15-16: 核心压缩

| 任务 | 说明 |
|------|------|
| browser-image-compression 集成 | 质量/尺寸/格式控制 |
| Canvas API 预览 | 实时显示压缩效果 |
| 大小对比 | 原图 vs 压缩后文件大小对比条 |

### Day 17: 质量控制

| 任务 | 说明 |
|------|------|
| 质量滑块 | 1-100% 质量调节 |
| 尺寸缩放 | 百分比/像素尺寸缩放 |
| 格式选择 | JPG / PNG / WebP 输出 |

### Day 18-19: 批量能力简化版

| 任务 | 说明 |
|------|------|
| 单次多图 | 可上传多张图片分别压缩 |
| 批量下载 | Zip 打包下载 (JSZip) |

### Day 20-21: 收尾

| 任务 | 说明 |
|------|------|
| 隐私声明 | "100% 浏览器本地处理" |
| 测试 | 不同图片格式、尺寸、压缩比 |

### 里程碑: Week 3 结束 → 移除背景 + 图片压缩可用

---

## Phase 4: 截图翻译工具 (Week 3-4, 与 P3 并行)

### Day 18-19: OCR 集成

| 任务 | 说明 |
|------|------|
| Tesseract.js 初始化 | 加载中英文语言包 |
| 截图上传 | 支持粘贴 (Ctrl+V) + 拖拽上传 |
| 文字区域识别 | 在图片上高亮识别到的文字区域 |

### Day 20-21: 翻译集成

| 任务 | 说明 |
|------|------|
| 翻译 API 代理 | Next.js API Route → 翻译服务 |
| 段落对齐 | 源文 vs 译文逐句对照 |
| 复制结果 | 一键复制翻译结果 |

### Day 22-23: UI 完善

| 任务 | 说明 |
|------|------|
| 双语对照模式 | 左右/上下两种布局 |
| 语言方向选择 | 自动检测 / 手动选择 (EN↔ZH) |
| 历史记录 (MVP 简化) | 仅当前会话历史 |

### 里程碑: Week 4 结束 → 三个工具可用

---

## Phase 5: PDF 转 Word 工具 (Week 4-5)

### Day 24-25: 后端搭建

| 任务 | 说明 |
|------|------|
| Python FastAPI 服务 | 文件上传 → LibreOffice 转换 → 下载 |
| Docker 容器化 | Python + LibreOffice + 文件清理 cron |
| 文件安全 | 上传限制 50MB, 自动过期删除 (< 1h) |
| VPS 部署 | Hetzner CX22, Nginx 反向代理 |

### Day 26-27: 前端集成

| 任务 | 说明 |
|------|------|
| 上传 + 进度 | 大文件上传进度条 |
| PDF 预览 | PDF.js 嵌入预览 |
| 转换状态 | 轮询/WebSocket 状态更新 |
| 下载结果 | 自动触发 .docx 下载 |

### Day 28-29: 质量优化

| 任务 | 说明 |
|------|------|
| 格式保留测试 | 表格、列表、图片、字体 |
| 错误处理 | 转换失败提示、重试机制 |
| 多页文档处理 | 100 页以内文档充分测试 |

### 里程碑: Week 5 结束 → 全部 4 个工具可用

---

## Phase 6: 上线准备 (Week 5-6)

### Day 30-31: SEO 全面优化

| 任务 | 说明 |
|------|------|
| Sitemap 生成 | 中英文各一份，自动更新 |
| Meta 标签全面覆盖 | 每个工具页独立 SEO |
| 结构化数据 | Tool + WebApplication Schema |
| FAQ 页面 | 每个工具有 FAQ 内容块 |

### Day 32-33: 分析 + 监控

| 任务 | 说明 |
|------|------|
| 分析工具 | Plausible / Vercel Analytics（隐私友好） |
| 错误监控 | Sentry 集成 |
| 性能监控 | Vercel Speed Insights |

### Day 34-35: 最终测试

| 任务 | 说明 |
|------|------|
| 全流程测试 | 4 个工具完整使用路径 |
| 跨浏览器测试 | Chrome / Safari / Firefox / Edge |
| 移动端测试 | iOS Safari, Android Chrome |
| 压力测试 | 并发用户模拟 (PDF 后端) |

### Day 36-37: 上线

| 任务 | 说明 |
|------|------|
| 域名 DNS 切换 | Cloudflare → Vercel |
| SSL 证书 | 自动 (Vercel + Cloudflare) |
| 正式发布 | 公开访问 |
| 发布公告 | 社交媒体 + Product Hunt 准备 |

### 里程碑: Week 6 → MVP 正式上线

---

## 开发环境

### 本地开发

```
Node.js >= 18
pnpm (preferred) or npm
VS Code + ESLint + Prettier
GitHub Desktop or Git CLI
```

### 启动命令

```bash
cd neetpix
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # Production build
pnpm lint         # ESLint
```

### 推荐 VS Code 扩展

- Tailwind CSS IntelliSense
- ESLint
- Prettier
- i18n-ally (翻译文件管理)

---

## 风险与缓解

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|---------|
| RMBG-1.4 浏览器推理性能差 | 中 | 高 | 降级到服务器端推理，或使用更小模型 |
| Tesseract.js 中英文准确度不足 | 中 | 中 | 切换到 Google Vision API / Gemini API |
| PDF 转 Word 格式丢失严重 | 中 | 中 | 提供多种输出选项 (DOCX/ODT)，标注"需要微调" |
| Vercel 免费额度不足 | 低 | 高 | 迁移到 VPS 或 Hetzner 独立服务器 |
| 浏览器兼容性问题 | 低 | 中 | 渐进增强，不支持 WebGPU 时给出明确提示 |
| 模型文件过大影响加载 | 中 | 中 | 提供 CDN 分发，加载进度提示，缓存策略 |

---

## 用户验收标准

MVP 上线时，用户应当能够:

1. 访问 neetpix.com 并看到品牌首页
2. 在 EN / ZH 之间切换语言
3. 使用移除背景工具：上传图片 → 等待处理 → 下载结果
4. 使用图片压缩工具：上传 → 调整质量 → 下载
5. 使用截图翻译工具：上传截图 → 等待 OCR → 查看翻译
6. 使用 PDF 转 Word 工具：上传 PDF → 等待转换 → 下载 DOCX
7. 在移动端流畅使用所有工具
8. 页面加载速度合理，无卡顿
