# 03 - 项目目录结构

```
ai-formatter-v2/
├── app/
│   ├── globals.css                          # Tailwind directives + @theme 设计令牌
│   ├── layout.tsx                          # Root layout (字体、metadata)
│   ├── not-found.tsx
│   ├── [locale]/
│   │   ├── layout.tsx                      # Locale + Providers
│   │   ├── page.tsx                        # Landing Page
│   │   ├── pricing/page.tsx
│   │   ├── legal/...
│   │   ├── (marketing)/                    # SEO 页面路由组
│   │   │   ├── [docType]/page.tsx
│   │   │   └── templates/...
│   │   └── (dashboard)/                    # Dashboard 路由组
│   │       ├── layout.tsx                  # 三栏布局壳 (MiniNav + Sidebar + Content)
│   │       ├── dashboard/
│   │       │   ├── page.tsx              # Home 视图 (hero + chat + 卡片)
│   │       │   ├── templates/page.tsx     # 模板浏览视图
│   │       │   └── history/page.tsx
│   │       └── editor/page.tsx             # 编辑器页面
│   └── api/
│       ├── ai/ (generate, chat, recommend)
│       ├── documents/ (CRUD, content)
│       ├── templates/ (list, detail, categories)
│       ├── export/ (pdf, word)
│       ├── auth/callback
│       └── upload/image
├── components/
│   ├── ui/                                  # 通用 UI 原语
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Skeleton.tsx
│   │   └── DropdownMenu.tsx
│   ├── layout/                              # 布局组件
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── MiniNav.tsx
│   │   ├── SidebarShell.tsx
│   │   └── DashboardHeader.tsx
│   ├── landing/                             # Landing Page 组件
│   │   ├── HeroSection.tsx
│   │   ├── DocumentTypeTags.tsx
│   │   ├── FeaturesGrid.tsx
│   │   ├── FAQSection.tsx
│   │   ├── IntroSection.tsx
│   │   └── CTASection.tsx
│   ├── dashboard/                           # Dashboard 组件
│   │   ├── HomeHero.tsx
│   │   ├── ChatInput.tsx
│   │   ├── TemplateCard.tsx
│   │   ├── TemplateCardsGrid.tsx
│   │   ├── FilterBar.tsx
│   │   └── DocTypesList.tsx
│   ├── editor/                              # 复用现有编辑器组件
│   │   ├── EditablePreview.tsx              # 主组件（contenteditable + iframe）
│   │   ├── EditorToolbar.tsx                # 格式化工具栏
│   │   ├── FloatingImageLayer.tsx           # 可拖拽浮动图片层
│   │   ├── ImageResizer.tsx                # 图片缩放手柄
│   │   ├── Sidebar.tsx                     # 编辑器侧栏
│   │   ├── hooks/
│   │   │   ├── useEditablePreviewInteractions.ts
│   │   │   └── useEditablePreviewContentSync.ts
│   │   ├── utils/
│   │   │   └── table.ts
│   │   ├── toolbar/                         # 34 个文件
│   │   │   ├── config/
│   │   │   │   ├── buttonConfigs.ts
│   │   │   │   ├── constants.ts
│   │   │   │   └── toolbarConfig.ts
│   │   │   ├── core/
│   │   │   │   ├── ButtonRenderer.tsx
│   │   │   │   ├── ToolbarRow.tsx
│   │   │   │   └── ToolbarSection.tsx
│   │   │   ├── buttons/
│   │   │   │   ├── CommandButton.tsx
│   │   │   │   ├── ToggleButton.tsx
│   │   │   │   └── ToolbarButton.tsx
│   │   │   ├── groups/
│   │   │   │   ├── ToolbarGroup.tsx
│   │   │   │   └── ToolbarSeparator.tsx
│   │   │   ├── pickers/
│   │   │   │   ├── ColorGrid.tsx
│   │   │   │   ├── ColorPicker.tsx
    │   │   │   ├── ImagePicker.tsx
│   │   │   │   ├── LineSpacingPicker.tsx
│   │   │   │   ├── PickerDropdown.tsx
│   │   │   │   └── TablePicker.tsx
│   │   │   ├── inputs/
│   │   │   │   ├── ToolbarDropdown.tsx
│   │   │   │   └── ToolbarSelect.tsx
│   │   │   └── hooks/
│   │   │       ├── useDropdownState.ts
│   │   │       ├── useEditorCommands.ts
│   │   │       └── useEditorState.ts
│   │   ├── icons/                           # 28 个 SVG 图标组件
│   │   │   ├── index.ts
│   │   │   └── IconProps.ts
│   │   ├── BackgroundColorPicker.tsx
│   │   ├── ColorPicker.tsx
│   │   ├── TablePicker.tsx
│   │   ├── ToolbarGroup.tsx
│   │   ├── ToolbarSelect.tsx
│   │   ├── ImagePicker.tsx
│   │   ├── SmartContextMenu.tsx
│   │   └── TableSmartToolbar.tsx
│   └── ai/                                  # AI 相关组件
│       ├── ChatMessage.tsx
│       ├── ChatStream.tsx
│       └── GeneratingIndicator.tsx
├── lib/
│   ├── db/
│   │   ├── supabase-client.ts
│   │   └── supabase-server.ts
│   ├── editor-core/                          # 复用现有编辑器核心库
│   │   ├── index.ts
│   │   ├── README.md
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── command/
│   │   │   ├── CommandManager.ts
│   │   │   ├── commands.ts
│   │   │   └── index.ts
│   │   ├── state/
│   │   │   ├── StateManager.ts
│   │   │   └── index.ts
│   │   ├── history/
│   │   │   ├── HistoryManager.ts
│   │   │   └── index.ts
│   │   ├── plugin/
│   │   │   ├── PluginManager.ts
│   │   │   ├── EventBus.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── config/
│   │   │   ├── ConfigManager.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── theme/
│   │       ├── ThemeManager.ts
│   │       └── index.ts
│   ├── ai/
│   │   ├── ai-provider.ts
│   │   ├── document-generator.ts
│   │   ├── chat-handler.ts
│   │   ├── prompt-templates.ts
│   │   └── stream-formatter.ts
│   ├── templates/
│   │   ├── template-service.ts
│   │   └── document-types.ts
│   ├── documents/
│   │   └── document-service.ts
│   ├── export/
│   │   ├── pdf-generator.ts
│   │   └── word-generator.ts
│   ├── storage/
│   │   └── r2-client.ts
│   ├── seo/
│   │   ├── metadata.ts
│   │   └── schema-org.ts
│   └── utils/
│       ├── cn.ts
│       ├── format.ts
│       └── validators.ts
├── hooks/
│   ├── use-sidebar.ts
│   ├── use-ai-chat.ts
│   └── use-document-editor.ts
├── stores/
│   ├── sidebar-store.ts
│   ├── editor-store.ts
│   └── chat-store.ts
├── types/
│   ├── database.ts
│   ├── api.ts
│   ├── ai.ts
│   ├── editor.ts
│   └── cms.ts
├── config/
│   ├── document-types.ts
│   ├── ai-models.ts
│   └── site.ts
├── supabase/migrations/
│   └── 001_initial_schema.sql
├── messages/
│   ├── en.json
│   └── zh.json
├── __tests__/
├── middleware.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local
```
