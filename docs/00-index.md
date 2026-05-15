# Vinted Auto Documentation Index

Last updated: 2026-05-15

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
- documents `43` through `45` capture the simplified UX reset, user-flow reference, and implementation reference
- documents `46` through `50` capture the live Vinted category resolver roadmap, phased implementation plans, and technical reference
- documents `51` through `53` capture the local CLI provider research, implementation plan, and command reference
- for extension/admin work, treat `22` through `25` as the source of truth
- for AI provider routing work, treat `26` through `28` as the source of truth
- for the implemented Vinted extension MVP and remaining hardening, treat `29` through `38` as the source of truth
- for Vinted dynamic profile fields, treat `39` through `41` as the source of truth
- for live Vinted category automation, start with `46`, then implement `47`
- for local CLI AI provider work, start with `51`, then implement `52`
- for the current simplified UX implementation phase, start with `43`

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
- [32-implementation-plan-vinted-extension-mvp.md](./32-implementation-plan-vinted-extension-mvp.md) - implemented extension MVP plan and remaining hardening reference
- [33-current-state-and-next-step.md](./33-current-state-and-next-step.md) - current repo-state checkpoint and recommended next implementation step
- [34-vinted-extension-dom-smoke-test.md](./34-vinted-extension-dom-smoke-test.md) - selector repair and live smoke-test checklist for the supported Vinted page
- [35-vinted-extension-handoff-research-2026-05-03.md](./35-vinted-extension-handoff-research-2026-05-03.md) - app-to-extension launch and handoff research
- [36-vinted-extension-recommended-bridge-architecture.md](./36-vinted-extension-recommended-bridge-architecture.md) - direct bridge architecture and fallback route
- [37-vinted-extension-message-reference.md](./37-vinted-extension-message-reference.md) - extension/app protocol, storage keys, and state machine
- [38-vinted-extension-stable-id-setup.md](./38-vinted-extension-stable-id-setup.md) - stable unpacked extension ID setup guide
- [39-vinted-dynamic-fields-research.md](./39-vinted-dynamic-fields-research.md) - research for Vinted category-dependent field behavior
- [40-vinted-dynamic-field-reference-pt.md](./40-vinted-dynamic-field-reference-pt.md) - PT dynamic field catalog and profile reference
- [41-vinted-dynamic-fields-rollout.md](./41-vinted-dynamic-fields-rollout.md) - rollout notes for category-dependent Vinted fields
- [42-code-quality-baseline.md](./42-code-quality-baseline.md) - project identity, current verification status, and code-quality risk baseline
- [43-simplified-ux-redesign-plan.md](./43-simplified-ux-redesign-plan.md) - implementation plan for reducing UX complexity around one seller workbench
- [44-simplified-ux-flow-reference.md](./44-simplified-ux-flow-reference.md) - flow diagrams, screen responsibilities, and simplified IA reference
- [45-simplified-ui-implementation-reference.md](./45-simplified-ui-implementation-reference.md) - component-level implementation guidance and verification checklist
- [46-vinted-live-category-automation-roadmap.md](./46-vinted-live-category-automation-roadmap.md) - roadmap for live Vinted category automation with manual final control
- [47-implementation-plan-vinted-category-phase-1.md](./47-implementation-plan-vinted-category-phase-1.md) - Phase 1 implementation plan for image-first fill and live category resolver
- [48-implementation-plan-vinted-category-phase-2.md](./48-implementation-plan-vinted-category-phase-2.md) - Phase 2 implementation plan for manual correction capture
- [49-implementation-plan-vinted-category-phase-3.md](./49-implementation-plan-vinted-category-phase-3.md) - Phase 3 implementation plan for local taxonomy memory
- [50-vinted-category-resolver-reference.md](./50-vinted-category-resolver-reference.md) - scoring, diagnostics, manual override, and resolver behavior reference
- [51-local-cli-ai-provider-research.md](./51-local-cli-ai-provider-research.md) - research on using local Codex/Claude CLIs through subscription-authenticated command adapters
- [52-implementation-plan-local-cli-provider.md](./52-implementation-plan-local-cli-provider.md) - phased implementation plan for an experimental `local-cli` AI provider
- [53-local-cli-provider-reference.md](./53-local-cli-provider-reference.md) - command contracts, env vars, safety rules, and test path for local CLI provider work

Current product decision:

- Build the Vinted assistant first.
- Target desktop only.
- Target Vinted web in browser, not the native mobile app.
- Keep copy/export as a valid success path.
- Keep manual final submit as a hard safety boundary.
- Current extension priority is live category automation Phase 1:
  - upload images before resolving category
  - use live Vinted suggestions/options
  - skip uncertain categories instead of guessing
  - let user manually edit before final submit
  - preserve simplified UX docs for later UI work
- Current AI subscription-use path is experimental local CLI provider work:
  - use official non-interactive CLI modes, not browser chat automation
  - start with Codex CLI because it is installed locally and supports schema/image flags
  - keep grouping on Ollama until local CLI listing quality is verified
