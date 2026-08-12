# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repositorY.

## Commands

```bash
npm run dev          # Start development server (Vite)
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build
npm run lint         # ESLint
npm run format       # Prettier (writes in place)
```

There is no test runner configured.

## Architecture

**Aris Solar CRM** — a solar installation CRM. Built on the TanStack ecosystem (React Start, Router, Query), backed by Supabase, deployed to Cloudflare Workers and Vercel.

### Routing

File-based routing via TanStack React Router. All routes live in [src/routes/](src/routes/). The file [src/routes/routeTree.gen.ts](src/routes/routeTree.gen.ts) is **auto-generated** — never edit it manually. The router plugin regenerates it on every `vite dev`/`vite build` run.

Route conventions:
- `__root.tsx` — root shell layout (sidebar + topnav + `QueryClientProvider` + `ThemeProvider`)
- `index.tsx` — dashboard
- `customers_.$id.tsx` — dynamic segment routes use a trailing underscore + `.$param` naming to opt out of the parent route's layout (e.g. `customers_.$id_.payments.tsx`)

### Data layer: types in `data/`, I/O in `lib/`

Data is split into two layers that mirror each other by domain (customers, registration, finance, dispatch, installation, net-metering, subsidy, inventory, etc.):

- **`src/data/*Store.ts`** — TypeScript types/interfaces for each domain plus small pure helpers (id generation, status lists). These are **not** in-memory data stores despite the name; the underlying arrays are empty stubs. Treat them as the type-definition layer.
- **`src/lib/*Service.ts`** — actual data access, talking to Supabase via the client in [src/lib/supabase.ts](src/lib/supabase.ts). Each service owns the `fromDB`/`toDB` mapping between Postgres snake_case columns and the camelCase domain types defined in the matching store file (e.g. `customerService.ts` maps `Customer` from `customersStore.ts`).

When adding a field to a domain object: update the type in the `*Store.ts` file, the `fromDB`/`toDB` mapping in the matching `*Service.ts`, and the Supabase schema (see `supabase/*.sql` for examples of existing table schemas — there is no migration tool, schemas are plain `.sql` files applied manually).

TanStack React Query (`QueryClient` from [src/router.tsx](src/router.tsx)) wraps service calls for caching/invalidation in route components.

### Supabase query tracking

[src/lib/supabase.ts](src/lib/supabase.ts) wraps the real Supabase client in a `Proxy` that intercepts `.from(table).select/insert/update/upsert/delete(...)` chains and reports each query to [src/lib/queryTracker.ts](src/lib/queryTracker.ts). [QueryTrackerPanel.tsx](src/components/crm/QueryTrackerPanel.tsx) reads from that tracker to show live DB query activity in the UI. Any new direct Supabase usage automatically gets tracked as long as it goes through the exported `supabase` client — don't bypass it with a raw `createClient` call.

### Kanban-style pipelines

Several domains (registration, finance, feasibility, dispatch, installation, net-metering, subsidy) model a stage-based pipeline as a Kanban board. Each has a `*KanbanStore.ts` (stage/column types) and `*KanbanService.ts` (stage transition + persistence logic). See [docs/customer-flow.md](docs/customer-flow.md) for the full cross-domain pipeline diagram — a customer moves through Registration → Feasibility/Finance → Waiting Floor → Dispatch → Installation → Intimation → Net Metering → Subsidy, with branching based on phase (single/three) and funding type (self-funded/loan).

### UI Components

Two layers:
1. **`src/components/ui/`** — shadcn/ui components (new-york style, slate base color, Radix UI primitives). Generated via shadcn CLI; treat as vendor code.
2. **`src/components/crm/`** — CRM-specific layout components (`DataPage`, `StatCard`, `PageHeader`, `AppSidebar`, `TopNav`, `ThemeProvider`, `QueryTrackerPanel`, `CrmSelect`, `DatePicker`).

The `cn()` utility from [src/lib/utils.ts](src/lib/utils.ts) combines `clsx` + `tailwind-merge` — use it for all className construction.

### Path Aliases

`@/*` maps to `./src/*` (configured in both `tsconfig.json` and `vite.config.ts`).

### Code Style

- **Prettier**: double quotes, semicolons, trailing commas everywhere, 100-char print width
- **TypeScript**: strict mode, target ES2022
- No comments unless the WHY is non-obvious

### Deployment

- Cloudflare Workers via `wrangler.jsonc` (entry `src/server.ts`)
- Vercel via `vercel.json`
- Prerendering enabled (`crawlLinks: true` in vite config)
