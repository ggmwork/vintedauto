# Vinted Auto Documentation Index

Last updated: 2026-04-30

This folder captures current product context, market research, MVP scope, and technical direction for the desktop-first Vinted listing assistant.

Important:

- documents `01` through `11` include the original MVP path and the first batch-workstation iteration
- documents `12` through `15` capture the watched-folder ingest pivot
- documents `16` through `18` capture the original auto-grouping target
- documents `19` through `21` capture the current recovery plan after testing the watched-folder workflow
- documents `22` through `25` capture the current shift toward safe Vinted autofill, multi-account admin, and profit tracking
- documents `26` through `28` capture the recommended multi-provider AI research and implementation plan
- documents `29` through `32` capture the Vinted extension MVP research, architecture, field contract, and implementation plan
- document `33` captures the current repo-state checkpoint and recommended next implementation step
- for extension/admin work, treat `22` through `25` as the source of truth
- for AI provider routing work, treat `26` through `28` as the source of truth
- for the actual Vinted extension build, treat `29` through `32` as the source of truth
- for deciding what to implement next, start with `33`

Documents:

- [01-project-context.md](./01-project-context.md) - product framing, goals, constraints, and future fit inside GGM Admin
- [02-competition-scan.md](./02-competition-scan.md) - competitor findings and product implications
- [03-mvp-spec.md](./03-mvp-spec.md) - agreed MVP scope for the first usable version
- [04-stack-and-architecture.md](./04-stack-and-architecture.md) - recommended stack, architecture, and implementation boundaries
- [05-roadmap.md](./05-roadmap.md) - phased execution plan from scaffold to launchable MVP
- [06-implementation-plan.md](./06-implementation-plan.md) - detailed execution plan for the first working vertical slice
- [07-ux-audit-and-simplification.md](./07-ux-audit-and-simplification.md) - UX critique, audit findings, and simplification changes for the original desktop workflow
- [08-seller-workflow-analysis.md](./08-seller-workflow-analysis.md) - real seller workflow breakdown, bottlenecks, and product implications
- [09-product-direction-batch-workstation.md](./09-product-direction-batch-workstation.md) - earlier product framing after MVP proof
- [10-next-phase-roadmap.md](./10-next-phase-roadmap.md) - current high-level roadmap after the watched-folder pivot
- [11-feature-decisions-and-open-questions.md](./11-feature-decisions-and-open-questions.md) - current sequencing guidance and open decisions
- [12-product-pivot-watched-inbox.md](./12-product-pivot-watched-inbox.md) - product reset from manual import to watched-folder ingest
- [13-watched-folder-and-ingest-architecture.md](./13-watched-folder-and-ingest-architecture.md) - recommended technical architecture for automatic local ingest
- [14-ux-reset-and-information-architecture.md](./14-ux-reset-and-information-architecture.md) - simplified IA, page model, and UX cleanup rules
- [15-implementation-plan-watched-ingest.md](./15-implementation-plan-watched-ingest.md) - detailed implementation plan for the next build cycle
- [16-auto-grouping-target-workflow.md](./16-auto-grouping-target-workflow.md) - target workflow for automatic grouping and stock creation
- [17-auto-grouping-architecture.md](./17-auto-grouping-architecture.md) - technical shape for descriptor extraction, clustering, and confidence-based stock commits
- [18-implementation-plan-auto-grouping.md](./18-implementation-plan-auto-grouping.md) - step-by-step implementation plan for the next automation phase
- [19-ingest-reliability-diagnosis.md](./19-ingest-reliability-diagnosis.md) - what is actually broken in the current auto-ingest flow and why
- [20-hybrid-grouping-strategy.md](./20-hybrid-grouping-strategy.md) - product direction for automatic grouping plus fast manual correction
- [21-implementation-plan-reliable-ingest-and-grouping.md](./21-implementation-plan-reliable-ingest-and-grouping.md) - next implementation plan: reliable ingest first, manual grouping second, stronger clustering third
- [22-safe-vinted-extension-strategy.md](./22-safe-vinted-extension-strategy.md) - current product reset toward reviewed Vinted web autofill and manual final submit
- [23-dotb-feature-map-and-scope.md](./23-dotb-feature-map-and-scope.md) - safe feature mapping from Dotb into build-now, build-later, and avoid buckets
- [24-multi-account-operations-and-finance.md](./24-multi-account-operations-and-finance.md) - internal multi-account control, stock, order, and profit model
- [25-implementation-plan-extension-and-admin.md](./25-implementation-plan-extension-and-admin.md) - phased implementation plan for extension, account admin, orders, and finance
- [26-ai-provider-research.md](./26-ai-provider-research.md) - official-doc-backed research on OpenAI, Anthropic, and Ollama integration strategy
- [27-ai-provider-architecture.md](./27-ai-provider-architecture.md) - recommended task-based provider routing architecture
- [28-implementation-plan-multi-provider-ai.md](./28-implementation-plan-multi-provider-ai.md) - phased implementation plan for model and provider switching
- [29-vinted-extension-research.md](./29-vinted-extension-research.md) - current research baseline for the safe Vinted extension MVP
- [30-vinted-extension-architecture.md](./30-vinted-extension-architecture.md) - recommended MV3 extension shape, handoff flow, and adapter boundaries
- [31-vinted-extension-field-contract.md](./31-vinted-extension-field-contract.md) - MVP field contract between the app and the extension
- [32-implementation-plan-vinted-extension-mvp.md](./32-implementation-plan-vinted-extension-mvp.md) - step-by-step implementation plan for the extension MVP
- [33-current-state-and-next-step.md](./33-current-state-and-next-step.md) - current repo-state checkpoint and recommended next implementation step

Current product decision:

- Build the Vinted assistant first.
- Target desktop only.
- Target Vinted web in browser, not the native mobile app.
- Keep copy/export as a valid success path.
- Keep manual final submit as a hard safety boundary.
- Next major implementation cycle is:
  - finalize the Vinted extension contract
  - build Chrome extension autofill MVP
  - add internal multi-account management
  - add orders and profit tracking
