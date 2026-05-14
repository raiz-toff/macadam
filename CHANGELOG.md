# Changelog

All notable changes to Macadam will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-05-14

### Added
- **Core Engine**: Fully offline-first, local storage architecture via IndexedDB and Dexie.js.
- **PWA Support**: Installable as a standalone app with a custom hand-written service worker.
- **Registry Architecture**: Modular system for defining platforms, countries, provinces, widgets, badges, and metrics.
- **Dashboard**: Customizable Bento grid dashboard with dynamic widgets.
- **Analytics**: Deep analytics engine with historical tracking, day-of-week trends, and hourly rate breakdown.
- **Shift Logging**: Advanced shift input form adapting to specific platforms (e.g. DoorDash vs Uber Eats).
- **Gamification**: Badges, streaks, and weekly goals with canvas-confetti celebrations.
- **Tax Tracking**: Canadian/US oriented tax set-aside calculations, including HST, CPP, and deductions.
- **Vehicle Management**: Expense tracking, maintenance logs, and actual-cost business deduction tracking.
- **Reports**: Shareable year-in-review generation, CSV data export, and print-ready formats.
- **Offline Reliability**: Works identically with or without a network connection. No data leaves the device unless exported.

### Changed
- Initial open-source release.
