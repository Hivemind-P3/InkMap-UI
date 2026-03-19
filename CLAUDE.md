# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # Install dependencies (requires Node.js v25.7.0)
npm start          # Dev server at http://localhost:4200 (auto-reloads on changes)
npm run build      # Production build
npm run watch      # Development build with watch mode
npm test           # Run tests with vitest via Angular CLI
```

To generate a new component:
```bash
ng generate component pages/component-name
```

## Architecture

Angular 21 standalone components app (no NgModules). Bootstrap 5 is included globally via `angular.json` styles array.

**Routing** (`src/app/app.routes.ts`): Pages are mapped as top-level routes. New pages go in `src/app/pages/<page-name>/`.

**App bootstrap**: `src/main.ts` → `appConfig` (`src/app/app.config.ts`) → `app.routes.ts`. The root `App` component just hosts `<router-outlet>`.

**Current routes**:
- `/` → `Landing` component (`src/app/pages/landing/`)
- `/login` → `Login` component (`src/app/pages/login/`)

**Testing**: Tests use Angular `TestBed` with `ComponentFixture`. Each component's spec file lives alongside the component (e.g., `login.spec.ts` next to `login.ts`).

**Styling**: SCSS is used for all component styles. `src/styles.scss` is the global stylesheet. Component style budget is 4kB warning / 8kB error.

## Code Style

Prettier is configured (`.prettierrc`): 100-char print width, single quotes, Angular HTML parser for templates.

## Branch & PR Workflow

- Branch off `dev`, naming: `[developer-name]-[brief-feature-description]`
- PR to `test` first → code review by Jose Daniel Steller (support) or Axel Jiménez (dev)
- A second developer writes test cases using the team's Google Sheets template and attaches to the Jira story
- PR from `test` → `main` after test cases are approved
