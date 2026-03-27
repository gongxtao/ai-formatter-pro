# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build (Turbopack + TypeScript check)
npm run lint         # ESLint
npm test             # Run Jest tests
npm test:watch       # Jest in watch mode
```

No test infrastructure is wired yet — `jest.config.ts` and `jest.setup.ts` exist but tests have not been written.

## Tech Stack

- **Next.js 16.2.1** with App Router (NOT the version in your training data — read `node_modules/next/dist/docs/` for breaking changes)
- **React 19.2.4**, TypeScript 5 (strict mode)
- **Tailwind CSS v4** — CSS-based config via `@theme` in `globals.css`, no `tailwind.config.ts`
- **Zustand 5** for all client state
- **next-intl 4.8** for i18n (locales: `zh` default, `en`)
- **Supabase** for server-side data (conversations, messages, templates)
- **OpenRouter** for all LLM calls (GPT-4o, Claude, Gemini, Llama models)

## Architecture

### Routes

```
[locale]/                          Landing page (Navbar, Hero, Features, FAQ, Footer)
[locale]/dashboard                 Dashboard shell (MiniNav + sidebar views)
[locale]/dashboard/editor          Editor shell (AI chat sidebar + A4 canvas)
```

Locale prefix mode is `as-needed` — Chinese gets no prefix, English gets `/en/...`.

### State Flow

Three Zustand stores coordinate the app:

- **`useDashboardStore`** — UI routing within dashboard/editor. Key bridge: `pendingEditorContent` carries generated HTML from dashboard to editor page; `currentEditorHtml` tracks live editor content for export.
- **`useChatStore`** — AI conversation state (messages, streaming). Used by `AIChatSidebar`.
- **`useHistoryStore`** — Document history in localStorage (CRUD, search filtering). `saveDocument` and `deleteDocument` return `boolean` — check the return value to detect localStorage quota errors.

### AI Pipeline

Two patterns, both stream SSE via OpenRouter:

1. **Single-shot generation**: Client → `POST /api/ai/generate` → `buildGenerationMessages` (prompt-builder) → OpenRouter → SSE stream → client accumulates HTML → `setPendingEditorContent` → navigate to editor
2. **Multi-turn chat**: Client → `POST /api/ai/chat` → load Supabase history → `buildChatMessages` → OpenRouter → SSE → `useChatStore.appendStreamingContent`

All API routes use `export const runtime = 'edge'`. System prompts are in `src/config/prompt-templates.ts` (20 document types, all output semantic HTML5).

### Editor

Custom `editor-core` engine (`src/lib/editor-core/`) with command pattern, plugin system, undo/redo history. Rendering uses `contentEditable` via `EditablePreview`. Auto-saves to localStorage with 5s debounce (`src/lib/editor-auto-save.ts`).

### Export

All client-side, no server involvement:
- **PDF**: `html2pdf.js` (offscreen div → html2canvas → jsPDF A4)
- **DOCX**: `docx` library (DOMParser → recursive HTML→docx conversion)
- **HTML**: Raw HTML Blob download

Content source is `useDashboardStore.currentEditorHtml`, synced from `A4PageCanvas.handleContentChange`.

### Persistence Layers

| Layer | Storage | Content |
|-------|---------|---------|
| Server | Supabase (PostgreSQL) | AI conversations, messages, templates, user_history table (future cloud sync) |
| Client | localStorage | Editor auto-save, document history, anonymous user ID |

## Key Conventions

- **Path alias**: `@/*` → `./src/*`
- **UI primitives**: `src/components/ui/` — Button (primary/secondary/outline/ghost/danger), Input, Modal, Badge, Skeleton, DropdownMenu, Toast. Use these, don't roll your own.
- **i18n**: Use `useTranslations('namespace')` from `next-intl`. Message files: `src/messages/en.json`, `src/messages/zh.json`. Namespaces: `common`, `nav`, `landing`, `editor`, `ai`, `dashboard`, `history`.
- **Toast notifications**: Use `useToast()` from `@/components/ui/Toast`. Variants: `success`, `error`, `info`. Auto-dismiss with configurable duration.
- **ErrorBoundary**: Class component wrapping the app in `[locale]/layout.tsx`. Accepts optional `fallback` prop.
- **Design tokens**: Defined in `globals.css` under `@theme`. Primary color: `#1e0eff`. Custom spacing tokens for nav (72px), sidebar (420px), header (68px), A4 dimensions (210mm × 297mm).
- **Component files**: `'use client'` directive on all interactive components. Server components for page shells.
