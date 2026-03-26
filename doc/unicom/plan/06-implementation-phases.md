# 06 - 分阶段实施计划

## Phase 1: 基础搭建（第 1-2 周）

- [ ] 初始化 Next.js 15 + TypeScript + TailwindCSS 4 项目
- [ ] 配置 `globals.css` 设计令牌系统
- [ ] 执行 Supabase 数据库迁移（4 表 DDL + 触发器，无 Auth）
- [ ] 配置 `next-intl` i18n 路由
- [ ] 搭建 Jest + RTL + Playwright 测试框架
- [ ] 创建 `utils/cn.ts`、类型定义、Supabase 客户端工厂
- [ ] 实现匿名 user_id 生成与持久化（localStorage UUID）
- [ ] 迁移 `lib/editor-core/`（18 个文件）
- [ ] 迁移 `components/editor/`（44 个文件）
- [ ] 构建 UI 原语组件（Button, Input, Modal, Badge, Skeleton, DropdownMenu）

**原型参考：** `doc/unicom/proptype/dashboard.html`

---

## Phase 2: Landing Page（第 3 周）

- [ ] Navbar 组件（固定顶栏，Logo/搜索/Pricing/Login/Sign Up）
- [ ] HeroSection（AI 聊天框：textarea + 文件上传 + 工具下拉 + 语音 + 生成按钮）
- [ ] DocumentTypeTags（水平滚动文档类型标签）
- [ ] FeaturesGrid（15+ 特性卡片）
- [ ] IntroSection、FAQSection、CTASection
- [ ] Footer
- [ ] SEO metadata + Schema.org + sitemap

**原型参考：** `doc/unicom/proptype/index.html`

---

## Phase 3: Dashboard 三栏布局 + Home 视图（第 4-5 周）

- [ ] Dashboard Layout（三栏壳：MiniNav + SidebarShell + Content）
- [ ] MiniNav 组件（72px 图标导航：Home/Document/Templates/History）
- [ ] SidebarShell + 展开/收起动画（72px <-> 420px）
- [ ] DocumentTypesList（搜索 + 分类列表，active 高亮）
- [ ] DashboardHeader
- [ ] HomeHero（动态标题 + AI 聊天输入 + 生成按钮 + 文档类型标签）
- [ ] TemplateCard（缩略图 + hover "Use Template" 浮层）
- [ ] TemplateCardsGrid（fade-out/shuffle/fade-in 切换动画）
- [ ] TemplatesFilterBar（sticky top-0）
- [ ] Templates 浏览视图

**原型参考：** `doc/unicom/proptype/dashboard.html`

---

## Phase 4: Editor 编辑器页面（第 6-7 周）

- [ ] 集成 EditablePreview 到编辑器页面
- [ ] EditorToolbar 顶栏（返回模板、保存、下载）
- [ ] A4PageCanvas（210mm x 297mm，居中阴影）
- [ ] AIChatSidebar（编辑器内 AI 聊天侧栏）
- [ ] DocTypesOverlay（滑入文档类型面板）
- [ ] EditorTemplatesGrid（编辑器内模板网格视图）
- [ ] 自动保存到 localStorage（5s 防抖）
- [ ] 保存到 user_history API（上传 R2 + 记录 DB）

**原型参考：** `doc/unicom/proptype/editor.html`

---

## Phase 5: AI 集成（第 8 周）

- [ ] AI Provider 抽象层（OpenAI协议 多模型切换）
- [ ] 每种文档类型的 prompt 模板
- [ ] 文档生成流式 API（SSE：content/status/completion/done）
- [ ] 聊天流式 API
- [ ] ChatStream 客户端组件（实时渲染流式文本）
- [ ] GeneratingIndicator（进度条/百分比）
- [ ] Dashboard Home 视图接入 AI 生成
- [ ] Editor 侧栏接入 AI 聊天
- [ ] A4 页面悬浮 "Ask AI" 按钮

---

## Phase 6: 导出 & 完善（第 9-10 周）

- [ ] PDF 导出（Puppeteer + Chromium）
- [ ] DOCX 导出（docx 库）
- [ ] 历史记录页面
- [ ] 全局 Loading 状态（Skeleton）
- [ ] 错误边界
- [ ] 性能优化（图片、代码分割）
- [ ] 响应式适配

---

## 验证方式

1. **单元测试**：每个组件和工具函数都有对应 `__tests__/` 测试，`npm test` 全部通过
2. **E2E 测试**：Playwright 覆盖三个核心流程：
   - Landing Page 加载 → SEO 验证
   - Dashboard 侧栏切换 → 卡片动画 → 模板选择
   - Editor 打开 → 编辑文档 → AI 聊天 → 保存 → 导出
3. **视觉验证**：对照原型 HTML 在浏览器中逐像素对比
4. **构建验证**：`npm run build` 无报错，Lighthouse 性能 >= 90
5. **数据库验证**：所有表创建成功，触发器正常工作
