# Neetpix — 项目状态纪要

> 生成日期：2026-07-09
> 说明：产品方向、品牌名、中文名、视觉系统均已确定。Logo 已确认方向 B。MVP 开发进行中。

---

## 已完成决策

| 决策项 | 状态 | 内容 |
|-------|------|------|
| ✅ 产品方向 | 已确定 | 办公/多媒体付费墙功能免费化工具站（Web 优先） |
| ✅ 品牌名 | 已确定 | **Neetpix**（neetpix.com · 已注册） |
| ✅ 中文名 | 已确定 | **尼特派**（ní tè pài） |
| ✅ 首发工具 | 已确认 | 去背景 / 截图翻译 / PDF转Word / 图片压缩 |
| ✅ 双语策略 | 已确认 | 同域名 /en/ /zh/ 子路径 |
| ✅ 桌面端 | 已确认 | 看产品反馈再定节奏 |
| ✅ 视觉系统 | 定稿 | 配色 / 字体 / Logo方向B / 设计原则 / UI 参考 |
| ✅ Logo 方向 | **已确认** | **方向 B：「N+方块」** Teal 底 + 白色 N + 珊瑚色方块 |

## 最新进展 (2026-07-09)

| 工作项 | 状态 | 说明 |
|-------|------|------|
| 技术方案选定 | ✅ 完成 | **Next.js 14 + Tailwind CSS + next-intl + @xenova/transformers** |
| 产品需求文档 | ✅ 完成 | 见 `product-requirements-document.md` |
| 开发计划 | ✅ 完成 | 见 `development-plan.md`（6 周周期） |
| 项目脚手架 | ✅ 完成 | Next.js App Router + TypeScript + Tailwind v4 |
| 国际化 | ✅ 完成 | next-intl 集成，中英双语路由 /en/ /zh/ |
| 品牌视觉实现 | ✅ 完成 | Logo SVG、品牌色 CSS token、Header/Footer |
| 首页 | ✅ 完成 | Hero + 工具网格 + 隐私承诺 |
| 移除背景工具 | ✅ 完成 | 上传/拖拽 → 浏览器处理 → 对比 → 下载 |
| 开发服务器 | ✅ 运行中 | http://localhost:3000 |

## 本目录文件清单

| 文件名 | 说明 |
|--------|------|
| neetpix-brand-style-guide.html | 品牌视觉系统指南（Logo B 已确认标记） |
| product-requirements-document.md | 产品需求文档（MVP v0.1） |
| development-plan.md | 开发计划（6 周周期） |
| project-handoff-document.md | 完整项目交接文档 |
| office-paywall-features-catalog.md | 94 个付费墙功能全集 |
| office-paywall-prioritization.md | 优先级排序与增长策略 |
| chrome-extension-opportunity-list.md | 早期探索存档 |
| chrome-extension-web-scraper-deep-dive.md | 早期探索存档 |
| README.md | 本文件 |
| web/ | Next.js 项目源码目录 |

## 下一步待推进

1. 集成 @xenova/transformers（RMBG-1.4 模型）到移除背景工具，实现真正的 AI 去背景
2. 开始截图翻译工具开发
3. 购买配置 VPS（Hetzner 香港）
4. GitHub 仓库创建 + Vercel 部署
