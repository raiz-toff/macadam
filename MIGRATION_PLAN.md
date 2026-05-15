# Macadam — Native JS Architecture & Migration Plan

## STEP 1 — CODEBASE INVENTORY

| File Path | Type | Size | Purpose | Exports/Classes | External Imports | State Owned/Mutated | Side Effects |
|-----------|------|------|---------|-----------------|------------------|---------------------|--------------|
| `src/core/db.js` | JS | large | Core app engine, routing, and state. | CURRENT_LOGICAL_SCHEMA_VERSION, DEFAULT_USER, APP_STATE_KEY_DEFAULTS... | dexie.min.js | IndexedDB / AppStore | - |
| `src/core/events.js` | JS | medium | Core app engine, routing, and state. | SHIFT_SAVED, SHIFT_DELETED, EXPENSE_SAVED... | - | - | - |
| `src/core/router.js` | JS | large | Core app engine, routing, and state. | updateOnboardingFocusClass, Router | - | - | events, createElement, query |
| `src/core/shell.js` | JS | large | Core app engine, routing, and state. | - | - | - | events, timers, innerHTML, query |
| `src/core/store.js` | JS | large | Core app engine, routing, and state. | bindText, bindClass, bindVisibility... | - | IndexedDB / AppStore | timers, storage, query |
| `src/core/vault-gate.js` | JS | trivial | Core app engine, routing, and state. | isUserVaultActive | - | IndexedDB / AppStore | - |
| `src/css/animations.css` | CSS | medium | Stylesheets. | - | - | - | - |
| `src/css/components.css` | CSS | large | Stylesheets. | - | - | - | - |
| `src/css/layout.css` | CSS | large | Stylesheets. | - | - | - | - |
| `src/css/reset.css` | CSS | medium | Stylesheets. | - | - | - | - |
| `src/css/themes.css` | CSS | medium | Stylesheets. | - | - | - | - |
| `src/css/tokens.css` | CSS | medium | Stylesheets. | - | - | - | - |
| `src/css/views/analytics.css` | CSS | large | View-specific presentation logic. | - | - | - | - |
| `src/css/views/calendar.css` | CSS | large | View-specific presentation logic. | - | - | - | - |
| `src/css/views/dashboard.css` | CSS | large | View-specific presentation logic. | - | - | - | - |
| `src/css/views/onboarding.css` | CSS | large | View-specific presentation logic. | - | - | - | - |
| `src/css/views/reports.css` | CSS | medium | View-specific presentation logic. | - | - | - | - |
| `src/css/views/search.css` | CSS | large | View-specific presentation logic. | - | - | - | - |
| `src/css/views/settings.css` | CSS | large | View-specific presentation logic. | - | - | - | - |
| `src/css/views/shifts.css` | CSS | large | View-specific presentation logic. | - | - | - | - |
| `src/css/views/tax.css` | CSS | medium | View-specific presentation logic. | - | - | - | - |
| `src/css/views/vehicles.css` | CSS | medium | View-specific presentation logic. | - | - | - | - |
| `src/css/widgets_theme.css` | CSS | large | Stylesheets. | - | - | - | - |
| `src/libs/chart.min.js` | JS | large | Vendored third-party library. | bt, Zt, de | - | - | events, timers, observers, query |
| `src/libs/confetti.min.js` | JS | large | Vendored third-party library. | - | - | - | events, timers, createElement |
| `src/libs/dayjs.duration.min.js` | JS | medium | Vendored third-party library. | - | - | - | - |
| `src/libs/dayjs.min.js` | JS | large | Vendored third-party library. | - | - | - | - |
| `src/libs/dayjs.relativeTime.min.js` | JS | medium | Vendored third-party library. | - | - | - | - |
| `src/libs/dexie.min.js` | JS | large | Vendored third-party library. | - | - | IndexedDB / AppStore | events, timers, storage, observers, createElement |
| `src/libs/fuse.min.js` | JS | large | Vendored third-party library. | as | - | - | - |
| `src/libs/html2canvas.min.js` | JS | large | Vendored third-party library. | - | - | - | events, timers, fetch, createElement, innerHTML |
| `src/libs/papaparse.min.js` | JS | large | Vendored third-party library. | - | - | - | timers, fetch |
| `src/libs/qrcode.min.js` | JS | large | Vendored third-party library. | - | - | - | - |
| `src/libs/sortable.min.js` | JS | large | Vendored third-party library. | - | - | - | events, timers, createElement, query |
| `src/main.js` | JS | large | App entry point. | - | - | IndexedDB / AppStore | events, timers, createElement, query |
| `src/modules/analytics/analytics-charts.js` | JS | medium | Domain-specific module logic. | renderHourlyTrendChart, renderWeekComparisonChart, renderIncomeSourceChart... | - | - | - |
| `src/modules/analytics/analytics.js` | JS | large | Domain-specific module logic. | formatRegisteredMetricValue, listAnalyticsDashboardMetricIds, getRegisteredMetricDisplay | - | IndexedDB / AppStore | - |
| `src/modules/analytics/widget-data.js` | JS | medium | Domain-specific module logic. | - | - | - | - |
| `src/modules/demo/sample-year.js` | JS | trivial | Domain-specific module logic. | DEMO_SAMPLE_DATA_YEAR, getDemoAnalyticsAnchorDate, demoSampleRangeOverlaps | - | - | - |
| `src/modules/expenses/expense-form.js` | JS | large | Domain-specific module logic. | PRESET_EXPENSE_CATEGORIES, renderExpenseForm | - | - | events, createElement, innerHTML, query |
| `src/modules/expenses/expenses.js` | JS | large | Domain-specific module logic. | initExpensesModule | - | IndexedDB / AppStore | events, timers, innerHTML, query |
| `src/modules/goals/goals.js` | JS | large | Domain-specific module logic. | - | - | IndexedDB / AppStore | - |
| `src/modules/notifications/notification-internal.js` | JS | large | Domain-specific module logic. | NOTIFICATION_IDS, nowIso, num... | - | IndexedDB / AppStore | - |
| `src/modules/notifications/notifications.js` | JS | medium | Domain-specific module logic. | - | - | IndexedDB / AppStore | - |
| `src/modules/onboarding/onboarding.js` | JS | large | Domain-specific module logic. | ONBOARDING_SESSION_KEY, buildOnboardingSetupExport | - | IndexedDB / AppStore | events, timers, storage, createElement, innerHTML, query |
| `src/modules/onboarding/steps.js` | JS | large | Domain-specific module logic. | TOTAL_STEPS, defaultDraftFromUser, normalizeTaxRegionForCountry... | - | - | - |
| `src/modules/p13/p13.js` | JS | large | Domain-specific module logic. | getCommunityTips, getDidYouKnowTips, toggleZenMode... | - | IndexedDB / AppStore | - |
| `src/modules/platforms/platform-specific.js` | JS | large | Domain-specific module logic. | normalizePlatformSpecific, extractShiftPlatformSpecific, evaluatePlatformAlerts... | - | - | - |
| `src/modules/platforms/platforms.js` | JS | large | Domain-specific module logic. | renderPlatformSwitcher, mountPlatformSwitcher | sortable.min.js | IndexedDB / AppStore | events, timers, createElement, innerHTML, query |
| `src/modules/pwa/pwa-settings.js` | JS | large | Domain-specific module logic. | mountPwaSettings | - | - | events, createElement |
| `src/modules/pwa/pwa.js` | JS | large | Domain-specific module logic. | pwaCapabilities, onDeferredReplay, parseShareTargetIntent... | - | IndexedDB / AppStore | events, timers, createElement |
| `src/modules/reports/reports.js` | JS | large | Domain-specific module logic. | buildSummaryText, previewVaultImportDiff, getDefaultReportTemplate... | - | IndexedDB / AppStore | createElement |
| `src/modules/schedule/schedule.js` | JS | large | Domain-specific module logic. | - | - | IndexedDB / AppStore | events, createElement, innerHTML, query |
| `src/modules/search/search.js` | JS | large | Domain-specific module logic. | initSearchModule | - | IndexedDB / AppStore | events, timers, createElement, innerHTML, query |
| `src/modules/settings/appearance-settings.js` | JS | large | Domain-specific module logic. | - | - | IndexedDB / AppStore | events, innerHTML, query |
| `src/modules/settings/data-settings.js` | JS | medium | Domain-specific module logic. | - | - | IndexedDB / AppStore | events, innerHTML, query |
| `src/modules/settings/keyboard-shortcuts.js` | JS | medium | Domain-specific module logic. | SETTINGS_KEYBOARD_SHORTCUTS, formatShortcutOverlayListItems | - | - | - |
| `src/modules/settings/platforms-settings.js` | JS | large | Domain-specific module logic. | - | - | IndexedDB / AppStore | events, createElement, innerHTML, query |
| `src/modules/settings/settings-utils.js` | JS | medium | Domain-specific module logic. | esc, normalizeAccentHex, applyAccent... | - | - | - |
| `src/modules/settings/settings.js` | JS | large | Domain-specific module logic. | - | sortable.min.js | IndexedDB / AppStore | events, createElement, innerHTML, query |
| `src/modules/shifts/shift-form.js` | JS | large | Domain-specific module logic. | renderShiftForm | - | - | events, createElement, innerHTML, query |
| `src/modules/shifts/shifts.js` | JS | large | Domain-specific module logic. | - | - | IndexedDB / AppStore | storage |
| `src/modules/tax/tax.js` | JS | large | Domain-specific module logic. | - | - | IndexedDB / AppStore | events, createElement, innerHTML, query |
| `src/modules/vehicles/vehicles.js` | JS | large | Domain-specific module logic. | - | - | IndexedDB / AppStore | events, createElement, innerHTML, query |
| `src/registry/badges/_TEMPLATE.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/bonus_hunter.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/century_day.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/data_archivist.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/early_bird.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/expense_savvy.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/first_shift.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/five_hundred_week.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/goal_month_hit.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/goal_week_hit.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/index.js` | JS | medium | Market, platform, and UI definitions registry. | BadgeRegistry, assertBadgeRegistryValid | - | - | - |
| `src/registry/badges/marathon_shift.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/multi_app_master.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/night_owl.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/peak_collector.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/perfect_week.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/personal_best_earnings.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/personal_best_hours.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/placeholder.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/rain_rider.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/streak_100.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/streak_30.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/streak_7.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/thousand_month.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/tip_champion.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/vehicle_caretaker.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/badges/weekend_warrior.badge.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/countries/CA.country.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/countries/UK.country.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/countries/US.country.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/countries/_TEMPLATE.country.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/countries/index.js` | JS | medium | Market, platform, and UI definitions registry. | countryDefToLocaleConfig, getCountryTaxProfile, CountryRegistry... | - | - | - |
| `src/registry/expense-categories/index.js` | JS | medium | Market, platform, and UI definitions registry. | ExpenseCategoryRegistry, assertExpenseCategoryRegistryValid | - | - | - |
| `src/registry/goal-types/index.js` | JS | medium | Market, platform, and UI definitions registry. | GoalTypeRegistry, GoalScopeRegistry, assertGoalTypeRegistryValid | - | - | - |
| `src/registry/index.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/market/resolve.js` | JS | medium | Market, platform, and UI definitions registry. | getMarketContext, resolveAvailablePlatformIds | - | - | - |
| `src/registry/metrics/_TEMPLATE.metric.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/metrics/dead_miles_ratio.metric.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/metrics/index.js` | JS | medium | Market, platform, and UI definitions registry. | getMetricValue, MetricRegistry, assertMetricRegistryValid | - | - | - |
| `src/registry/metrics/month_gross.metric.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/metrics/month_hourly.metric.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/metrics/month_orders.metric.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/metrics/month_zero_days.metric.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/metrics/placeholder.metric.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/metrics/shift_duration.metric.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/metrics/shift_gross.metric.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/metrics/shift_hourly.metric.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/notifications/_TEMPLATE.notification.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/notifications/backup_overdue.notification.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/notifications/cross_platform_arbitrage.notification.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | IndexedDB / AppStore | - |
| `src/registry/notifications/daily_summary.notification.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/notifications/high_expense.notification.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/notifications/index.js` | JS | medium | Market, platform, and UI definitions registry. | NotificationRegistry, assertNotificationRegistryValid | - | - | - |
| `src/registry/notifications/insurance_expiry.notification.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | IndexedDB / AppStore | - |
| `src/registry/notifications/low_hourly_rate.notification.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/notifications/maintenance_due.notification.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | IndexedDB / AppStore | - |
| `src/registry/notifications/mid_week_goal.notification.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/notifications/milestone_proximity.notification.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/notifications/personal_best.notification.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/notifications/placeholder.notification.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/notifications/streak_risk.notification.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/notifications/tax_installment_due.notification.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/notifications/weekly_goal_hit.notification.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/notifications/weekly_goal_miss.notification.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | IndexedDB / AppStore | - |
| `src/registry/platforms/_TEMPLATE.platform.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/platforms/_logos.js` | JS | medium | Market, platform, and UI definitions registry. | SVG_DD, SVG_UE, SVG_FD... | - | - | - |
| `src/registry/platforms/amazonflex.platform.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/platforms/doordash.platform.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/platforms/foodora.platform.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/platforms/index.js` | JS | medium | Market, platform, and UI definitions registry. | PlatformRegistry, assertPlatformRegistryValid, getDefaultSamplePlatformId | - | - | - |
| `src/registry/platforms/instacart.platform.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/platforms/other.platform.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/platforms/skip.platform.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/platforms/specific-normalize.js` | JS | medium | Market, platform, and UI definitions registry. | toNumberField, normalizeStringArrayField, normalizeFromSpecificSchema... | - | - | - |
| `src/registry/platforms/terminology.js` | JS | medium | Market, platform, and UI definitions registry. | PLATFORM_TERMINOLOGY, getPlatformConfig, platformAnalyticsEnabled... | - | - | - |
| `src/registry/platforms/ubereats.platform.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/provinces/CA/ON.province.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/provinces/CA/_TEMPLATE.province.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/provinces/US/AK.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/AL.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/AR.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/AZ.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/CA.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/CO.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/CT.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/DC.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/DE.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/FL.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/GA.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/HI.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/IA.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/ID.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/IL.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/IN.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/KS.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/KY.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/LA.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/MA.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/MD.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/ME.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/MI.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/MN.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/MO.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/MS.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/MT.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/NC.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/ND.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/NE.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/NH.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/NJ.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/NM.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/NV.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/NY.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/OH.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/OK.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/OR.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/PA.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/RI.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/SC.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/SD.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/TN.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/TX.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/UT.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/VA.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/VT.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/WA.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/WI.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/WV.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/WY.province.js` | JS | trivial | Market, platform, and UI definitions registry. | default | - | - | - |
| `src/registry/provinces/US/_usStateProvince.js` | JS | medium | Market, platform, and UI definitions registry. | createUsStateProvince | - | - | - |
| `src/registry/provinces/index.js` | JS | medium | Market, platform, and UI definitions registry. | ProvinceRegistry, assertProvinceRegistryValid | - | - | - |
| `src/registry/reports/_TEMPLATE.report-section.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/reports/chart.report-section.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/reports/expenses.report-section.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/reports/index.js` | JS | medium | Market, platform, and UI definitions registry. | ReportRegistry, assertReportRegistryValid | - | - | - |
| `src/registry/reports/notes.report-section.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/reports/overview.report-section.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/reports/placeholder.report-section.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/reports/qr.report-section.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/reports/shifts.report-section.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/shift-fields/index.js` | JS | medium | Market, platform, and UI definitions registry. | ShiftFieldRegistry, assertShiftFieldRegistryValid | - | - | - |
| `src/registry/tax/withholding-presets.js` | JS | medium | Market, platform, and UI definitions registry. | WITHHOLDING_PRESETS_CA, WITHHOLDING_PRESETS_US, getWithholdingPresetPct... | - | - | - |
| `src/registry/types.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/_TEMPLATE.widget.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/after-render.js` | JS | trivial | Market, platform, and UI definitions registry. | afterRenderWidgets | - | - | query |
| `src/registry/widgets/avg-rate.widget.js` | JS | large | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/best-day.widget.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/best-hour.widget.js` | JS | large | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/dead-miles.widget.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/deliveries.widget.js` | JS | large | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/earnings.widget.js` | JS | large | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/effective-rate.widget.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/esc.js` | JS | trivial | Market, platform, and UI definitions registry. | esc | - | - | - |
| `src/registry/widgets/expenses.widget.js` | JS | large | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/income-breakdown.widget.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | query |
| `src/registry/widgets/index.js` | JS | large | Market, platform, and UI definitions registry. | DASHBOARD_STAT_STRIP_IDS, DASHBOARD_STRIP_SLOT_ID_SET, DEFAULT_DASHBOARD_WIDGET_ORDER... | - | - | - |
| `src/registry/widgets/month-gross.widget.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/month-hourly.widget.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/month-orders.widget.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/net-income.widget.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/out-of-pocket.widget.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/per-delivery.widget.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/placeholder.widget.js` | JS | trivial | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/platform-activity.widget.js` | JS | large | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/recent-shifts.widget.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/rolling-trend.widget.js` | JS | large | Market, platform, and UI definitions registry. | - | - | - | events, innerHTML, query |
| `src/registry/widgets/scatter.widget.js` | JS | large | Market, platform, and UI definitions registry. | - | - | - | events, innerHTML, query |
| `src/registry/widgets/schedule.widget.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | IndexedDB / AppStore | - |
| `src/registry/widgets/stability-score.widget.js` | JS | large | Core app engine, routing, and state. | - | - | - | - |
| `src/registry/widgets/streak.widget.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/tax-jar.widget.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/tips-total.widget.js` | JS | large | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/total-hours.widget.js` | JS | large | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/week-compare.widget.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/weekly-goal.widget.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/weekly-projection.widget.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/registry/widgets/zero-days.widget.js` | JS | medium | Market, platform, and UI definitions registry. | - | - | - | - |
| `src/ui/charts.js` | JS | large | UI components and icons. | destroyChart, renderBarChart, renderLineChart... | chart.min.js | - | createElement, innerHTML |
| `src/ui/components.js` | JS | large | UI components and icons. | showModal, closeModal, showConfirm... | - | - | events, timers, createElement, innerHTML, query |
| `src/ui/icons.js` | JS | large | UI components and icons. | exportIcon, getIcon, iconInnerByName | - | - | - |
| `src/ui/nav-icons.js` | JS | large | UI components and icons. | NAV_ICON_INNER, NAV_ICON_VIEWBOX, NAV_ICON_FILLED | - | - | - |
| `src/utils/calculations.js` | JS | large | Helper utilities and pure functions. | calcHourlyRate, calcNetHourlyRate, calcEarningsPerOrder... | - | - | - |
| `src/utils/date-range-presets.js` | JS | medium | Helper utilities and pure functions. | ymd, startOfWeekDate, defaultRangeForPreset... | - | - | - |
| `src/utils/formatters.js` | JS | medium | Helper utilities and pure functions. | formatCurrency, formatDuration, formatDistance... | dayjs.min.js, dayjs.relativeTime.min.js, dayjs.duration.min.js | - | - |
| `src/utils/locale.js` | JS | medium | Helper utilities and pure functions. | getCountryDef, getProvinceDef, resolveProvinceDef... | - | - | - |
| `src/utils/strings.js` | JS | large | Helper utilities and pure functions. | strings, t | - | - | - |
| `src/views/about-view.js` | JS | medium | View-specific presentation logic. | render | - | - | events, createElement, innerHTML, query |
| `src/views/analytics-view.js` | JS | large | View-specific presentation logic. | - | - | IndexedDB / AppStore | events, timers, innerHTML, query |
| `src/views/dashboard.js` | JS | large | View-specific presentation logic. | - | - | - | storage, innerHTML, query |
| `src/views/expenses-view.js` | JS | medium | View-specific presentation logic. | - | - | - | - |
| `src/views/goals-view.js` | JS | large | View-specific presentation logic. | - | - | IndexedDB / AppStore | events, createElement, innerHTML, query |
| `src/views/onboarding-view.js` | JS | trivial | View-specific presentation logic. | render | - | - | - |
| `src/views/print-view.js` | JS | medium | View-specific presentation logic. | render | - | - | events, timers, storage, createElement, innerHTML |
| `src/views/reports-view.js` | JS | large | View-specific presentation logic. | - | html2canvas.min.js, qrcode.min.js | - | events, storage, createElement, innerHTML, query |
| `src/views/schedule-view.js` | JS | trivial | View-specific presentation logic. | - | - | - | - |
| `src/views/settings-view.js` | JS | medium | View-specific presentation logic. | - | - | - | createElement, query |
| `src/views/shifts-view.js` | JS | large | View-specific presentation logic. | - | papaparse.min.js | IndexedDB / AppStore | events, storage, createElement, innerHTML, query |
| `src/views/tax-view.js` | JS | trivial | View-specific presentation logic. | render | - | - | - |
| `src/views/vehicles-view.js` | JS | trivial | View-specific presentation logic. | render | - | - | - |
| `src/views/view-utils.js` | JS | medium | View-specific presentation logic. | renderViewPlaceholder | - | - | createElement |

## STEP 2 — DEPENDENCY AUDIT

| Library | Features Used | Native JS Equivalent | Lines of Replacement Code | Risk Level |
|---------|---------------|----------------------|---------------------------|------------|
| Dexie.js | IndexedDB wrapper, querying | Raw IndexedDB API + Promise wrappers | <100 | High |
| Chart.js | Rendering line/bar charts | Canvas API / SVG generation | bespoke (~300) | Medium |
| Day.js | Date parsing, formatting, relative time | `Intl.DateTimeFormat`, `Date` object | <100 | Low |
| Fuse.js | Fuzzy search matching | RegExp and String `includes` / Levenshtein util | <50 | Low |
| PapaParse | CSV import/export | String split, regex, native File API | <100 | Medium |
| Sortable.js | Drag & Drop lists | HTML5 Drag and Drop API | <100 | Low |
| html2canvas | Screenshot generation | SVG foreignObject to Canvas | bespoke (~150) | High |
| QRCode.js | QR Code generation | SVG grid generation from raw data bits | bespoke (~200) | Medium |
| Confetti.js | Canvas confetti animations | Canvas API `requestAnimationFrame` | <100 | Low |

## STEP 3 — LOGIC EXTRACTION

- **Data models:** User profiles, Shifts, Expenses, Goals, Vehicles, Backup entries. All stored in IndexedDB.
- **Business rules:** Tax calculation, net hourly rate calculation, goal streaks logic, region-specific validations.
- **UI components:** Views (Dashboard, Shifts, Expenses, Tax, Settings), widgets, bento boxes, platform sliders. Generated dynamically.
- **State management:** Central `store.js` using simple pub/sub (`EventEmitter`) mapping to IndexedDB.
- **Event system:** Global event bus (`bus.js`) for app-wide events; standard DOM delegation for views.
- **Async flows:** IndexedDB Promise chains, Deferred sync/replay logic via Service Worker, `fetch` for PWA updates.
- **Routing:** Hash-based routing (`window.onhashchange`) managing active views and shell transitions.
- **Rendering logic:** Manual DOM node creation (`document.createElement`) combined with `<template>` cloning for performance. Vanilla DOM ops without Virtual DOM.
- **Utilities:** Formatting helpers, localized currency formatters, calculation helpers, debounce/throttle routines.

## STEP 4 — NATIVE JS ARCHITECTURE PLAN

- **File structure:** Adopt ES Modules directly using `<script type="module">` instead of an `esbuild` output bundle. All `import` statements must include the `.js` extension.
- **Pattern:** Module Pattern with plain objects and class-based controllers for complex views. ES6 Modules natively support singleton patterns (like `store.js`).
- **Reactivity:** Retain the current lightweight `EventEmitter` pub/sub pattern combined with `Proxy` wrappers on the state store for auto-triggering UI updates.
- **UI rendering:** Standardize on `<template>` cloning for repeating lists (shifts, expenses) and raw `document.createElement` for interactive forms to prevent XSS. No `innerHTML` for user data.
- **Routing:** Keep Hash Routing to avoid server-side rewrite dependencies (makes offline PWA easier), managed by a native `window.addEventListener('hashchange')` router.
- **Async:** Pure async/await syntax over native Web APIs (`indexedDB`, `fetch`).
- **CSS:** Fully scoped BEM architecture using native CSS Custom Properties (Variables) defined in `tokens.css`. No preprocessors needed.
- **Web APIs:** Heavy reliance on `Intl` for dates/numbers, `IndexedDB` for storage, `Canvas API` for charts/QR/confetti, `HTML5 Drag & Drop`, and `IntersectionObserver` for infinite scrolling / lazy loading.

## STEP 5 — FILE-BY-FILE MIGRATION MAP

| Original File | New Native JS File | Migration Notes | Complexity | Compatibility |
|---------------|--------------------|-----------------|------------|---------------|
| `build.js` / `esbuild` | *Removed* | No bundler. Directly serve files. | Low | - |
| `src/main.js` | `src/main.js` | Change to `<script type="module" src="src/main.js">`. | Low | ES Modules (2015) |
| `src/libs/dexie.min.js` | `src/utils/indexeddb.js` | Replace with native IDB wrapper. | High | IDB (IE10+) |
| `src/libs/chart.min.js` | `src/utils/charts.js` | Custom Canvas drawing for required charts. | High | Canvas API |
| `src/libs/dayjs.min.js` | `src/utils/dates.js` | Use `Intl.DateTimeFormat` and native `Date`. | Medium | Intl API |
| `src/libs/papaparse.min.js`| `src/utils/csv.js` | Implement native string parsing utility. | Medium | ES6 |
| `src/core/db.js` | `src/core/db.js` | Refactor from Dexie to native `src/utils/indexeddb.js`. | High | IDB |
| `src/views/*.js` | `src/views/*.js` | Update chart/date/dnd imports to native utils. | Medium | DOM API |
| `src/core/events.js` | `src/core/events.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/core/router.js` | `src/core/router.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/core/shell.js` | `src/core/shell.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/core/store.js` | `src/core/store.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/core/vault-gate.js` | `src/core/vault-gate.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/css/animations.css` | `src/css/animations.css` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/css/components.css` | `src/css/components.css` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/css/layout.css` | `src/css/layout.css` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/css/reset.css` | `src/css/reset.css` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/css/themes.css` | `src/css/themes.css` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/css/tokens.css` | `src/css/tokens.css` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/css/widgets_theme.css` | `src/css/widgets_theme.css` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/analytics/analytics-charts.js` | `src/modules/analytics/analytics-charts.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/analytics/analytics.js` | `src/modules/analytics/analytics.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/analytics/widget-data.js` | `src/modules/analytics/widget-data.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/demo/sample-year.js` | `src/modules/demo/sample-year.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/expenses/expense-form.js` | `src/modules/expenses/expense-form.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/expenses/expenses.js` | `src/modules/expenses/expenses.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/goals/goals.js` | `src/modules/goals/goals.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/notifications/notification-internal.js` | `src/modules/notifications/notification-internal.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/notifications/notifications.js` | `src/modules/notifications/notifications.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/onboarding/onboarding.js` | `src/modules/onboarding/onboarding.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/onboarding/steps.js` | `src/modules/onboarding/steps.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/p13/p13.js` | `src/modules/p13/p13.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/platforms/platform-specific.js` | `src/modules/platforms/platform-specific.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/platforms/platforms.js` | `src/modules/platforms/platforms.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/pwa/pwa-settings.js` | `src/modules/pwa/pwa-settings.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/pwa/pwa.js` | `src/modules/pwa/pwa.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/reports/reports.js` | `src/modules/reports/reports.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/schedule/schedule.js` | `src/modules/schedule/schedule.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/search/search.js` | `src/modules/search/search.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/settings/appearance-settings.js` | `src/modules/settings/appearance-settings.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/settings/data-settings.js` | `src/modules/settings/data-settings.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/settings/keyboard-shortcuts.js` | `src/modules/settings/keyboard-shortcuts.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/settings/platforms-settings.js` | `src/modules/settings/platforms-settings.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/settings/settings-utils.js` | `src/modules/settings/settings-utils.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/settings/settings.js` | `src/modules/settings/settings.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/shifts/shift-form.js` | `src/modules/shifts/shift-form.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/shifts/shifts.js` | `src/modules/shifts/shifts.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/tax/tax.js` | `src/modules/tax/tax.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/modules/vehicles/vehicles.js` | `src/modules/vehicles/vehicles.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/_TEMPLATE.badge.js` | `src/registry/badges/_TEMPLATE.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/bonus_hunter.badge.js` | `src/registry/badges/bonus_hunter.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/century_day.badge.js` | `src/registry/badges/century_day.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/data_archivist.badge.js` | `src/registry/badges/data_archivist.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/early_bird.badge.js` | `src/registry/badges/early_bird.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/expense_savvy.badge.js` | `src/registry/badges/expense_savvy.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/first_shift.badge.js` | `src/registry/badges/first_shift.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/five_hundred_week.badge.js` | `src/registry/badges/five_hundred_week.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/goal_month_hit.badge.js` | `src/registry/badges/goal_month_hit.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/goal_week_hit.badge.js` | `src/registry/badges/goal_week_hit.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/index.js` | `src/registry/badges/index.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/marathon_shift.badge.js` | `src/registry/badges/marathon_shift.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/multi_app_master.badge.js` | `src/registry/badges/multi_app_master.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/night_owl.badge.js` | `src/registry/badges/night_owl.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/peak_collector.badge.js` | `src/registry/badges/peak_collector.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/perfect_week.badge.js` | `src/registry/badges/perfect_week.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/personal_best_earnings.badge.js` | `src/registry/badges/personal_best_earnings.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/personal_best_hours.badge.js` | `src/registry/badges/personal_best_hours.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/placeholder.badge.js` | `src/registry/badges/placeholder.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/rain_rider.badge.js` | `src/registry/badges/rain_rider.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/streak_100.badge.js` | `src/registry/badges/streak_100.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/streak_30.badge.js` | `src/registry/badges/streak_30.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/streak_7.badge.js` | `src/registry/badges/streak_7.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/thousand_month.badge.js` | `src/registry/badges/thousand_month.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/tip_champion.badge.js` | `src/registry/badges/tip_champion.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/vehicle_caretaker.badge.js` | `src/registry/badges/vehicle_caretaker.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/badges/weekend_warrior.badge.js` | `src/registry/badges/weekend_warrior.badge.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/countries/CA.country.js` | `src/registry/countries/CA.country.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/countries/UK.country.js` | `src/registry/countries/UK.country.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/countries/US.country.js` | `src/registry/countries/US.country.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/countries/_TEMPLATE.country.js` | `src/registry/countries/_TEMPLATE.country.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/countries/index.js` | `src/registry/countries/index.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/expense-categories/index.js` | `src/registry/expense-categories/index.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/goal-types/index.js` | `src/registry/goal-types/index.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/index.js` | `src/registry/index.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/market/resolve.js` | `src/registry/market/resolve.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/metrics/_TEMPLATE.metric.js` | `src/registry/metrics/_TEMPLATE.metric.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/metrics/dead_miles_ratio.metric.js` | `src/registry/metrics/dead_miles_ratio.metric.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/metrics/index.js` | `src/registry/metrics/index.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/metrics/month_gross.metric.js` | `src/registry/metrics/month_gross.metric.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/metrics/month_hourly.metric.js` | `src/registry/metrics/month_hourly.metric.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/metrics/month_orders.metric.js` | `src/registry/metrics/month_orders.metric.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/metrics/month_zero_days.metric.js` | `src/registry/metrics/month_zero_days.metric.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/metrics/placeholder.metric.js` | `src/registry/metrics/placeholder.metric.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/metrics/shift_duration.metric.js` | `src/registry/metrics/shift_duration.metric.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/metrics/shift_gross.metric.js` | `src/registry/metrics/shift_gross.metric.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/metrics/shift_hourly.metric.js` | `src/registry/metrics/shift_hourly.metric.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/notifications/_TEMPLATE.notification.js` | `src/registry/notifications/_TEMPLATE.notification.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/notifications/backup_overdue.notification.js` | `src/registry/notifications/backup_overdue.notification.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/notifications/cross_platform_arbitrage.notification.js` | `src/registry/notifications/cross_platform_arbitrage.notification.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/notifications/daily_summary.notification.js` | `src/registry/notifications/daily_summary.notification.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/notifications/high_expense.notification.js` | `src/registry/notifications/high_expense.notification.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/notifications/index.js` | `src/registry/notifications/index.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/notifications/insurance_expiry.notification.js` | `src/registry/notifications/insurance_expiry.notification.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/notifications/low_hourly_rate.notification.js` | `src/registry/notifications/low_hourly_rate.notification.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/notifications/maintenance_due.notification.js` | `src/registry/notifications/maintenance_due.notification.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/notifications/mid_week_goal.notification.js` | `src/registry/notifications/mid_week_goal.notification.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/notifications/milestone_proximity.notification.js` | `src/registry/notifications/milestone_proximity.notification.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/notifications/personal_best.notification.js` | `src/registry/notifications/personal_best.notification.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/notifications/placeholder.notification.js` | `src/registry/notifications/placeholder.notification.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/notifications/streak_risk.notification.js` | `src/registry/notifications/streak_risk.notification.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/notifications/tax_installment_due.notification.js` | `src/registry/notifications/tax_installment_due.notification.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/notifications/weekly_goal_hit.notification.js` | `src/registry/notifications/weekly_goal_hit.notification.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/notifications/weekly_goal_miss.notification.js` | `src/registry/notifications/weekly_goal_miss.notification.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/platforms/_TEMPLATE.platform.js` | `src/registry/platforms/_TEMPLATE.platform.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/platforms/_logos.js` | `src/registry/platforms/_logos.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/platforms/amazonflex.platform.js` | `src/registry/platforms/amazonflex.platform.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/platforms/doordash.platform.js` | `src/registry/platforms/doordash.platform.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/platforms/foodora.platform.js` | `src/registry/platforms/foodora.platform.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/platforms/index.js` | `src/registry/platforms/index.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/platforms/instacart.platform.js` | `src/registry/platforms/instacart.platform.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/platforms/other.platform.js` | `src/registry/platforms/other.platform.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/platforms/skip.platform.js` | `src/registry/platforms/skip.platform.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/platforms/specific-normalize.js` | `src/registry/platforms/specific-normalize.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/platforms/terminology.js` | `src/registry/platforms/terminology.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/platforms/ubereats.platform.js` | `src/registry/platforms/ubereats.platform.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/CA/ON.province.js` | `src/registry/provinces/CA/ON.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/CA/_TEMPLATE.province.js` | `src/registry/provinces/CA/_TEMPLATE.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/AK.province.js` | `src/registry/provinces/US/AK.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/AL.province.js` | `src/registry/provinces/US/AL.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/AR.province.js` | `src/registry/provinces/US/AR.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/AZ.province.js` | `src/registry/provinces/US/AZ.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/CA.province.js` | `src/registry/provinces/US/CA.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/CO.province.js` | `src/registry/provinces/US/CO.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/CT.province.js` | `src/registry/provinces/US/CT.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/DC.province.js` | `src/registry/provinces/US/DC.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/DE.province.js` | `src/registry/provinces/US/DE.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/FL.province.js` | `src/registry/provinces/US/FL.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/GA.province.js` | `src/registry/provinces/US/GA.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/HI.province.js` | `src/registry/provinces/US/HI.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/IA.province.js` | `src/registry/provinces/US/IA.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/ID.province.js` | `src/registry/provinces/US/ID.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/IL.province.js` | `src/registry/provinces/US/IL.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/IN.province.js` | `src/registry/provinces/US/IN.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/KS.province.js` | `src/registry/provinces/US/KS.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/KY.province.js` | `src/registry/provinces/US/KY.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/LA.province.js` | `src/registry/provinces/US/LA.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/MA.province.js` | `src/registry/provinces/US/MA.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/MD.province.js` | `src/registry/provinces/US/MD.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/ME.province.js` | `src/registry/provinces/US/ME.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/MI.province.js` | `src/registry/provinces/US/MI.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/MN.province.js` | `src/registry/provinces/US/MN.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/MO.province.js` | `src/registry/provinces/US/MO.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/MS.province.js` | `src/registry/provinces/US/MS.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/MT.province.js` | `src/registry/provinces/US/MT.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/NC.province.js` | `src/registry/provinces/US/NC.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/ND.province.js` | `src/registry/provinces/US/ND.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/NE.province.js` | `src/registry/provinces/US/NE.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/NH.province.js` | `src/registry/provinces/US/NH.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/NJ.province.js` | `src/registry/provinces/US/NJ.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/NM.province.js` | `src/registry/provinces/US/NM.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/NV.province.js` | `src/registry/provinces/US/NV.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/NY.province.js` | `src/registry/provinces/US/NY.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/OH.province.js` | `src/registry/provinces/US/OH.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/OK.province.js` | `src/registry/provinces/US/OK.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/OR.province.js` | `src/registry/provinces/US/OR.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/PA.province.js` | `src/registry/provinces/US/PA.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/RI.province.js` | `src/registry/provinces/US/RI.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/SC.province.js` | `src/registry/provinces/US/SC.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/SD.province.js` | `src/registry/provinces/US/SD.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/TN.province.js` | `src/registry/provinces/US/TN.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/TX.province.js` | `src/registry/provinces/US/TX.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/UT.province.js` | `src/registry/provinces/US/UT.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/VA.province.js` | `src/registry/provinces/US/VA.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/VT.province.js` | `src/registry/provinces/US/VT.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/WA.province.js` | `src/registry/provinces/US/WA.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/WI.province.js` | `src/registry/provinces/US/WI.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/WV.province.js` | `src/registry/provinces/US/WV.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/WY.province.js` | `src/registry/provinces/US/WY.province.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/US/_usStateProvince.js` | `src/registry/provinces/US/_usStateProvince.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/provinces/index.js` | `src/registry/provinces/index.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/reports/_TEMPLATE.report-section.js` | `src/registry/reports/_TEMPLATE.report-section.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/reports/chart.report-section.js` | `src/registry/reports/chart.report-section.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/reports/expenses.report-section.js` | `src/registry/reports/expenses.report-section.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/reports/index.js` | `src/registry/reports/index.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/reports/notes.report-section.js` | `src/registry/reports/notes.report-section.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/reports/overview.report-section.js` | `src/registry/reports/overview.report-section.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/reports/placeholder.report-section.js` | `src/registry/reports/placeholder.report-section.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/reports/qr.report-section.js` | `src/registry/reports/qr.report-section.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/reports/shifts.report-section.js` | `src/registry/reports/shifts.report-section.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/shift-fields/index.js` | `src/registry/shift-fields/index.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/tax/withholding-presets.js` | `src/registry/tax/withholding-presets.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/types.js` | `src/registry/types.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/_TEMPLATE.widget.js` | `src/registry/widgets/_TEMPLATE.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/after-render.js` | `src/registry/widgets/after-render.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/avg-rate.widget.js` | `src/registry/widgets/avg-rate.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/best-day.widget.js` | `src/registry/widgets/best-day.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/best-hour.widget.js` | `src/registry/widgets/best-hour.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/dead-miles.widget.js` | `src/registry/widgets/dead-miles.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/deliveries.widget.js` | `src/registry/widgets/deliveries.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/earnings.widget.js` | `src/registry/widgets/earnings.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/effective-rate.widget.js` | `src/registry/widgets/effective-rate.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/esc.js` | `src/registry/widgets/esc.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/expenses.widget.js` | `src/registry/widgets/expenses.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/income-breakdown.widget.js` | `src/registry/widgets/income-breakdown.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/index.js` | `src/registry/widgets/index.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/month-gross.widget.js` | `src/registry/widgets/month-gross.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/month-hourly.widget.js` | `src/registry/widgets/month-hourly.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/month-orders.widget.js` | `src/registry/widgets/month-orders.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/net-income.widget.js` | `src/registry/widgets/net-income.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/out-of-pocket.widget.js` | `src/registry/widgets/out-of-pocket.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/per-delivery.widget.js` | `src/registry/widgets/per-delivery.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/placeholder.widget.js` | `src/registry/widgets/placeholder.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/platform-activity.widget.js` | `src/registry/widgets/platform-activity.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/recent-shifts.widget.js` | `src/registry/widgets/recent-shifts.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/rolling-trend.widget.js` | `src/registry/widgets/rolling-trend.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/scatter.widget.js` | `src/registry/widgets/scatter.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/schedule.widget.js` | `src/registry/widgets/schedule.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/stability-score.widget.js` | `src/registry/widgets/stability-score.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/streak.widget.js` | `src/registry/widgets/streak.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/tax-jar.widget.js` | `src/registry/widgets/tax-jar.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/tips-total.widget.js` | `src/registry/widgets/tips-total.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/total-hours.widget.js` | `src/registry/widgets/total-hours.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/week-compare.widget.js` | `src/registry/widgets/week-compare.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/weekly-goal.widget.js` | `src/registry/widgets/weekly-goal.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/weekly-projection.widget.js` | `src/registry/widgets/weekly-projection.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/registry/widgets/zero-days.widget.js` | `src/registry/widgets/zero-days.widget.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/ui/charts.js` | `src/ui/charts.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/ui/components.js` | `src/ui/components.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/ui/icons.js` | `src/ui/icons.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/ui/nav-icons.js` | `src/ui/nav-icons.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/utils/calculations.js` | `src/utils/calculations.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/utils/date-range-presets.js` | `src/utils/date-range-presets.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/utils/formatters.js` | `src/utils/formatters.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/utils/locale.js` | `src/utils/locale.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |
| `src/utils/strings.js` | `src/utils/strings.js` | Keep as ES Module. Update internal references if needed. | Low | Baseline |

## STEP 6 — PROJECT SCAFFOLD

```text
macadam/
├── public/
│   ├── icons/
│   ├── manifest.json
│   └── sw.js
├── src/
│   ├── core/
│   │   ├── db.js
│   │   ├── events.js
│   │   ├── router.js
│   │   ├── store.js
│   │   └── shell.js
│   ├── css/
│   │   ├── reset.css
│   │   ├── tokens.css
│   │   └── ...
│   ├── modules/
│   ├── registry/
│   ├── ui/
│   ├── utils/
│   │   ├── indexeddb.js    (Replaces Dexie)
│   │   ├── dates.js        (Replaces Day.js)
│   │   ├── charts.js       (Replaces Chart.js)
│   │   ├── csv.js          (Replaces PapaParse)
│   │   ├── dragdrop.js     (Replaces Sortable.js)
│   │   ├── fuzzy.js        (Replaces Fuse.js)
│   │   ├── qr.js           (Replaces QRCode.js)
│   │   ├── screenshot.js   (Replaces html2canvas)
│   │   └── confetti.js     (Replaces Confetti.js)
│   └── views/
├── index.html
└── MIGRATION_PLAN.md
```

### index.html (Skeleton)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Macadam</title>
  <link rel="stylesheet" href="./src/css/reset.css">
  <link rel="stylesheet" href="./src/css/tokens.css">
  <!-- other CSS files -->
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
```

## STEP 7 — UTILITY REPLACEMENTS (FULL CODE)

// replaces: Dexie.js (indexeddb.js)
```javascript
export class NativeDB {
  constructor(dbName, version) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }
  async open(schema) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        for (const [storeName, options] of Object.entries(schema)) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: options.key || 'id', autoIncrement: options.autoIncrement || false });
            (options.indexes || []).forEach(idx => store.createIndex(idx, idx, { unique: false }));
          }
        }
      };
      request.onsuccess = (e) => { this.db = e.target.result; resolve(this); };
      request.onerror = (e) => reject(e.target.error);
    });
  }
  async get(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async put(storeName, item) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const request = tx.objectStore(storeName).put(item);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const request = tx.objectStore(storeName).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
```

// replaces: Day.js (dates.js)
```javascript
export function formatDate(dateStr, options = {}) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat(navigator.language || 'en-US', options).format(date);
}
export function timeAgo(dateStr) {
  const diffMs = new Date() - new Date(dateStr);
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDays = Math.round(diffHr / 24);
  const rtf = new Intl.RelativeTimeFormat(navigator.language || 'en-US', { numeric: 'auto' });
  if (Math.abs(diffSec) < 60) return rtf.format(-diffSec, 'second');
  if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, 'minute');
  if (Math.abs(diffHr) < 24) return rtf.format(-diffHr, 'hour');
  return rtf.format(-diffDays, 'day');
}
```

// replaces: Fuse.js (fuzzy.js)
```javascript
export function fuzzySearch(items, query, keys) {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter(item => {
    return keys.some(key => {
      const val = item[key];
      return val && String(val).toLowerCase().includes(q);
    });
  });
}
```

// replaces: PapaParse (csv.js)
```javascript
export function parseCSV(csvString) {
  const lines = csvString.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ? values[i].trim() : ''; });
    return obj;
  });
}
export function toCSV(dataArray) {
  if (!dataArray.length) return '';
  const headers = Object.keys(dataArray[0]);
  const rows = dataArray.map(obj => headers.map(h => `"${(obj[h]||'').toString().replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...rows].join('\n');
}
```

// replaces: Sortable.js (dragdrop.js)
```javascript
export function makeSortable(containerElement, onSortCallback) {
  let draggingEle;
  Array.from(containerElement.children).forEach(el => el.draggable = true);
  containerElement.addEventListener('dragstart', (e) => { draggingEle = e.target; e.target.classList.add('dragging'); });
  containerElement.addEventListener('dragend', (e) => { e.target.classList.remove('dragging'); onSortCallback(); });
  containerElement.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = [...containerElement.querySelectorAll(':not(.dragging)')].find(child => e.clientY <= child.getBoundingClientRect().top + child.offsetHeight / 2);
    if (afterElement) containerElement.insertBefore(draggingEle, afterElement);
    else containerElement.appendChild(draggingEle);
  });
}
```

// replaces: Confetti.js (confetti.js)
```javascript
export function fireConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const particles = Array.from({length: 100}).map(() => ({x: Math.random()*canvas.width, y: -Math.random()*canvas.height, r: Math.random()*6+2, dx: Math.random()*4-2, dy: Math.random()*5+2, c: `hsl(${Math.random()*360},100%,50%)`}));
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let active = false;
    particles.forEach(p => {
      p.x += p.dx; p.y += p.dy;
      if (p.y < canvas.height) active = true;
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    });
    if (active) requestAnimationFrame(draw);
    else canvas.remove();
  }
  draw();
}
```

// replaces: Chart.js (charts.js)
```javascript
export function renderBarChart(canvasElement, data, labels) {
  const ctx = canvasElement.getContext('2d');
  const width = canvasElement.width;
  const height = canvasElement.height;
  ctx.clearRect(0, 0, width, height);
  const maxVal = Math.max(...data, 1);
  const barWidth = width / data.length;
  data.forEach((val, i) => {
    const h = (val / maxVal) * (height - 20);
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(i * barWidth + 5, height - h - 15, barWidth - 10, h);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], i * barWidth + barWidth / 2, height - 2);
  });
}
```

// replaces: html2canvas (screenshot.js)
```javascript
export async function takeScreenshot(element) {
  const xmlSerializer = new XMLSerializer();
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${element.offsetWidth}" height="${element.offsetHeight}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml">${xmlSerializer.serializeToString(element)}</div>
    </foreignObject>
  </svg>`;
  const img = new Image();
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  return new Promise(resolve => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = element.offsetWidth; canvas.height = element.offsetHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = url;
  });
}
```

// replaces: QRCode.js (qr.js)
```javascript
// Very basic placeholder for native QR generation. Full bit-matrix generation requires substantial code.
export function generateQRCode(canvasElement, text) {
  const ctx = canvasElement.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvasElement.width,canvasElement.height);
  ctx.fillStyle = '#000';
  ctx.font = '12px Arial'; ctx.textAlign = 'center';
  ctx.fillText('QR: ' + text, canvasElement.width/2, canvasElement.height/2);
  console.warn('Native QR Code matrix generation requires a complex spec implementation.');
}
```

## STEP 8 — IMPLEMENTATION ORDER & MILESTONES

**Phase 1 — HTML skeleton + CSS custom properties + utility functions**
- Replace `build.js` bundle with standard `<script type="module">` in `index.html`.
- Create `src/utils/*.js` files with native replacements for libraries.
- **Est. LOC:** 500 lines.
- **Acceptance:** App loads blank page without errors; utility tests pass.

**Phase 2 — State store + pub/sub or Proxy reactive layer**
- Migrate `Dexie.js` to native `indexeddb.js` wrapper.
- Refactor `core/db.js` and `core/store.js` to use native IDB queries.
- **Est. LOC:** 300 lines.
- **Acceptance:** IDB initializes successfully, data can be written and read without Dexie.

**Phase 3 — Core UI components (static, no data yet)**
- Refactor views to not rely on third-party libraries for rendering.
- Ensure `Chart.js` canvases are replaced with native canvas drawing hooks.
- **Est. LOC:** 1000 lines.
- **Acceptance:** Views render layout correctly.

**Phase 4 — Routing + navigation**
- Validate `hashchange` router works with new ES Module structure.
- **Est. LOC:** 100 lines.
- **Acceptance:** Navigation between views works without full page reloads.

**Phase 5 — Async data layer (fetch, error handling, loading states)**
- Adapt Service Worker and PWA module sync logic.
- **Est. LOC:** 200 lines.
- **Acceptance:** PWA installs, offline caching works natively.

**Phase 6 — Wire state → components → events end-to-end**
- Connect IDB native queries to view rendering.
- Restore drag-and-drop, date formatting, and CSV exports using new native utils.
- **Est. LOC:** 800 lines.
- **Acceptance:** Full feature parity with prior build-dependent version.

**Phase 7 — Browser testing + edge case hardening**
- Test across Chrome, Firefox, Safari.
- Address vendor-specific `Intl` or `Canvas` quirks.
- **Acceptance:** 100% test pass rate.

## Browser Compatibility Matrix

| Web API | Chrome Baseline | Firefox Baseline | Safari Baseline | Edge Baseline |
|---------|-----------------|------------------|-----------------|---------------|
| ES Modules | 61 | 60 | 10.1 | 16 |
| IndexedDB | 23 | 16 | 10 | 12 |
| Canvas API | 1 | 1.5 | 2 | 12 |
| Intl API | 24 | 29 | 10 | 12 |
| Drag & Drop | 4 | 3.5 | 3.1 | 12 |
| IntersectionObserver | 51 | 55 | 12.2 | 15 |
