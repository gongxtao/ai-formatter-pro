# TODOS

## Design Debt

### TODO 1: Responsive dashboard layout
- **What:** The sidebar (72px collapsed / 420px expanded) has no responsive behavior. On tablets it wastes space; on phones it's unusable.
- **Why:** Users on tablets/mobile cannot effectively use the dashboard. This blocks any mobile usage of the editor.
- **Pros:** Enables tablet/mobile usage, improves UX on smaller screens.
- **Cons:** Significant architecture work — requires sidebar collapse/overlay pattern, responsive editor layout, touch-friendly toolbar.
- **Context:** Pre-existing constraint, not introduced by Phase 6. The entire dashboard was built desktop-only. The History grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) has responsive breakpoints but they're inside a fixed-width sidebar layout.
- **Depends on:** Broader dashboard responsive phase.

### TODO 2: Create DESIGN.md
- **What:** Run `/design-consultation` to create a formal DESIGN.md design system document.
- **Why:** Color tokens, typography, spacing, and component specs are scattered across `globals.css`, individual components, and implicit patterns. As the project grows, inconsistencies accumulate and new components drift from the established vocabulary.
- **Pros:** Single source of truth for design decisions. Prevents component drift. Onboards new contributors faster.
- **Cons:** Time investment upfront. Needs maintenance as the design evolves.
- **Context:** Phase 6 design review found multiple components not reusing existing UI primitives (ExportDropdown, HistoryView search, ErrorBoundary button). A DESIGN.md would make these patterns explicit and prevent future drift.
- **Depends on:** None.

### TODO 3: Landing page accessibility audit
- **What:** Fix pre-existing a11y gaps on the landing page.
- **Why:** Missing ARIA attributes, no keyboard navigation for interactive elements, no skip-to-content link. Screen reader users cannot effectively navigate the landing page.
- **Pros:** Improves accessibility compliance, enables screen reader usage, better keyboard navigation.
- **Cons:** Moderate effort across multiple landing page components.
- **Context:** Specific gaps identified: Navbar hamburger lacks `aria-label`/`aria-expanded`, FAQ accordion lacks `aria-expanded`/`aria-controls`, ChatBox textarea lacks `aria-label`, no skip-to-content link, no visible focus indicators on many interactive elements.
- **Depends on:** None.

### TODO 4: Test infrastructure
- **What:** Set up Jest or Vitest with React Testing Library. Write tests for Zustand stores (useHistoryStore, useDashboardStore), the Toast system, ExportDropdown keyboard navigation, and ErrorBoundary.
- **Why:** Zero test coverage exists. State logic bugs (like the deleteDocument ghost-data issue just fixed) go undetected. Keyboard navigation in ExportDropdown is complex enough to regress silently.
- **Pros:** Catches regressions in store logic and complex UI interactions. Enables confident refactoring.
- **Cons:** Initial setup effort (config, mocking next-intl, etc.). Ongoing maintenance of tests.
- **Context:** Phase 6 eng review flagged this. Priority targets: useHistoryStore (save/delete/load with quota errors), ExportDropdown keyboard nav, ErrorBoundary retry behavior, Toast auto-dismiss.
- **Depends on:** None.
