# 01 - 项目概述

## 背景

现有 AI Formatter 项目积累了 168 个组件、50+ API、12 张数据库表，代码复杂度高。设计需要持续迭代，因此决定从零开始全新开发。

## 技术栈

| 层 | 选型 | 说明 |
|---|------|------|
| 框架 | Next.js 15 (App Router) + React 19 | RSC 优先 |
| 语言 | TypeScript 5.7+ | 全量类型 |
| 样式 | TailwindCSS 4 (CSS-first @theme) | 仅 Tailwind，无自定义 CSS |
| 数据库 | Supabase (PostgreSQL) | DB + Storage（MVP 无 Auth） |
| i18n | next-intl 4.x | 先英文，预留多语言 |
| 编辑器 | EditablePreview (contenteditable) | **复用现有组件**，非 TipTap |
| AI | OpenRouter (多模型) | GPT-4o / Claude / Gemini |
| 状态管理 | Zustand | 仅客户端交互状态 |
| 存储 | Cloudflare R2 | 文件/图片 |
| 测试 | Jest 30 + RTL + Playwright | TDD 强制 |
| 部署 | Vercel | 原生 Next.js |

## 关键架构决策

| 决策 | 理由 |
|------|------|
| **MVP 无 Auth** | 先跑通核心流程，user_id 用匿名 UUID（localStorage），后续加认证只需加 FK |
| **扁平化 category** | 不建 document_types 独立表，category 作为 TEXT 字段灵活扩展（image/video/design 等） |
| **编辑中存 localStorage** | 不存版本历史到数据库，只存用户手动保存的记录（user_history 单表） |
| **SEO 用 JSON 配置** | 不建 SEO 数据库表，用 `messages/*.json` 管理页面内容，后续需要时再迁移到数据库 |
| **极简 4 张表** | templates + user_history + ai_conversations + ai_messages，够用即可 |
| **复用 EditablePreview** | 已验证的 contenteditable 编辑器，含完整工具栏/图标/插件体系，省去数周开发 |
| **Zustand** 管理 sidebar/editor/chat 状态 | 跨组件树共享状态，selector 避免无效渲染 |
| **CSS-first @theme** 设计令牌 | 设计持续迭代时一处修改全局生效 |
| **不用 shadcn/ui** | 原型有定制设计语言，自定义 UI primitives 更灵活 |
| **SSE 流式 AI** | 生成文档时实时显示进度，UX 远优于等待 |
| **feature-based 目录** | 按功能域组织（landing/、dashboard/、editor/），而非按技术角色 |
| **HTML 字符串存储** | EditablePreview 使用 contenteditable + HTML，文档内容存储为 HTML 字符串（非 JSON） |

## 原型文件参考

| 文件 | 对应页面 |
|------|---------|
| `doc/unicom/proptype/dashboard.html` | Dashboard 三栏布局 + Home 视图 + Templates 视图 |
| `doc/unicom/proptype/editor.html` | Editor 编辑器页面 |
| `doc/unicom/proptype/index.html` | Landing Page |
