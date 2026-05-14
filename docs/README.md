# Macadam documentation

All project specification and architecture docs live in this folder.

| Document | Description |
|----------|-------------|
| [`Registry_arch.md`](Registry_arch.md) | Registry pattern: platforms, countries, engine boundaries. |
| [`feature_modularity.md`](feature_modularity.md) | Category A/B/C/D modularity and where to add global vs scoped features. |
| [`MacadamAPI.md`](MacadamAPI.md) | MacadamAPI / P13 local debug surface spec. |
| [`adding-a-country.md`](adding-a-country.md) | How to add a country (registry, tax profile, strings). |
| [`adding-a-province.md`](adding-a-province.md) | How to add a province / territory (registry + wiring). |
| [`adding-a-platform.md`](adding-a-platform.md) | How to add a new platform definition. |
| [`market_resolution.md`](market_resolution.md) | Country-first / province-override resolution, presets, identity, money boundaries. |

### Internal Planning Docs

| Document | Description |
|----------|-------------|
| [`internal/plan.md`](internal/plan.md) | Historical product / technical plan (features, file tree, conventions). |
| [`internal/planv3.md`](internal/planv3.md) | Historical v3.0 alignment (Ontario-first, registries, schema). |

Source code `@see` comments use paths like `docs/Registry_arch.md` relative to the **repository root**.
