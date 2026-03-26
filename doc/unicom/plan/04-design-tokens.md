# 04 - 设计令牌系统

## CSS-first @theme

在 `app/globals.css` 中用 `@theme {}` 定义所有设计令牌，一处修改全局生效。

```css
@import "tailwindcss";
@theme {
  --color-primary: #1e0eff;
  --color-primary-hover: #1a0bdd;
  --color-primary-light: #eff6ff;
  --color-secondary: #1F2124;
  --color-light: #F9FAFB;
  --color-sidebar-bg: #F8F9FA;
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --spacing-mini-nav: 72px;
  --spacing-sidebar: 420px;
  --spacing-header: 68px;
  --width-a4: 210mm;
  --height-a4: 297mm;
  --shadow-card: 0 8px 30px rgb(0,0,0,0.08);
  --radius-card: 12px;
  --radius-button: 9999px;
  --animate-fade: fade 0.3s ease-in-out;
}
```

## 从原型提取的设计值

| 令牌 | 来源 | 值 |
|------|------|-----|
| `--color-primary` | 按钮主色、链接色 | `#1e0eff` |
| `--color-secondary` | 标题文字色 | `#1F2124` |
| `--color-light` | 页面背景色 | `#F9FAFB` |
| `--color-sidebar-bg` | 侧栏背景色 | `#F8F9FA` |
| `--font-sans` | 全局字体 | Inter |
| `--spacing-mini-nav` | MiniNav 宽度 | `72px` |
| `--spacing-sidebar` | Sidebar 展开宽度 | `420px` |
| `--spacing-header` | DashboardHeader 高度 | `68px` |
| `--width-a4` | A4 纸张宽度 | `210mm` |
| `height-a4` | A4 纸张高度 | `297mm` |
| `--shadow-card` | 模板卡片阴影 | `0 8px 30px rgb(0,0,0,0.08)` |
| `--radius-card` | 卡片圆角 | `12px` |
| `--radius-button` | 按钮圆角（胶囊） | `9999px` |

## 使用方式

```tsx
// 直接在 Tailwind 类中使用
<div className="bg-primary text-white rounded-button">按钮</div>
<div className="w-[var(--spacing-sidebar)]">侧栏</div>
<div className="w-[var(--width-a4)] h-[var(--height-a4)]">A4 页面</div>
```

## 关键布局参数

- **三栏布局**：MiniNav 72px + Sidebar 420px（可收起至 72px）+ Content 自适应
- **A4 页面**：210mm x 297mm，居中显示，带 box-shadow
- **Sticky Filter Bar**：`sticky top-0`（注意：header 在滚动容器外部，所以 top-0 不是 top-[68px]）
- **模板卡片宽高比**：`aspect-[1/1.414]`（A4 比例）
