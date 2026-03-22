# Phase 3: Dashboard - Research

**Researched:** 2026-03-22
**Domain:** Next.js 15 App Router dashboard UI with Recharts, Tailwind CSS, Drizzle ORM
**Confidence:** HIGH

## Summary

Phase 3 builds a web dashboard for viewing AI visibility data. The project already has a complete backend: API routes for keywords/brands CRUD, a `dailySnapshots` table with `mentionRate`/`avgPosition`/`avgSentiment` per keyword/brand/provider/date, `brandMentions` with `contextSnippet`/`sentiment`/`position`, and `queryRuns` with full `rawResponse` text. The dashboard needs to surface this data through a sidebar layout with a global keyword selector, overview cards, competitor table, trend charts, response archive, and keyword/brand management forms.

The tech stack is fully established: Next.js 15.5.14 App Router, Tailwind CSS 4.2.2 (no component library), Drizzle ORM 0.45.1 with PostgreSQL, React 19.1.0. The only new dependency is Recharts for trend charts. The existing login page establishes the Tailwind-only UI pattern. All CRUD APIs already exist -- the dashboard calls them from the client side.

**Primary recommendation:** Build a `/dashboard` route group with layout.tsx containing sidebar + content area. Use URL search params (`?keyword=<id>`) for global keyword selection (shareable, SSR-friendly). Add 2-3 new API routes for dashboard-specific aggregated data (overview stats, trend data, archive with pagination). Use Recharts `LineChart` for trends. Keep everything as simple Tailwind-styled components.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Sidebar + content area layout -- sidebar left, content area right
- Sidebar has 2 groups: Data views (Overview, Competitors, Trends, Archive) and Management (Keywords, Brands)
- Global keyword selector (dropdown) at top of sidebar -- like Linear/Vercel project switcher
- Selecting a keyword changes context for all data view pages; Management pages are independent
- Overview page: visibility score cards per platform (ChatGPT/Perplexity/Gemini) as primary content, competitor comparison table + mini trend chart below
- Trends as separate page using Recharts library
- Line chart showing visibility score over time per platform for selected keyword
- Tailwind CSS only (no component library)
- Internal tool, desktop-first

### Claude's Discretion
- Response archive UX (DASH-04): filter/search design, brand mention highlight approach, pagination vs infinite scroll
- Management forms (DASH-05, DASH-06): modal vs inline edit vs dedicated sub-page
- Color scheme and exact styling
- Empty states and loading states
- Mobile responsiveness (desktop-first sufficient)
- Competitor comparison table layout details

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | User sees overview dashboard with current visibility scores per platform and key metrics | `dailySnapshots` table has `mentionRate` per keyword/brand/provider/date; new API route aggregates latest snapshots into overview cards |
| DASH-02 | User sees competitor comparison table showing visibility scores side-by-side | Query `dailySnapshots` grouped by brand for selected keyword; display as HTML table with Tailwind |
| DASH-03 | User sees trend charts showing visibility score changes over time per keyword per platform | Recharts `LineChart` with `dailySnapshots` time series; new API route returns date-series data |
| DASH-04 | User can browse full AI response archive with brand mentions highlighted | `queryRuns.rawResponse` + `brandMentions.contextSnippet` provide data; paginated API route, client-side text highlighting |
| DASH-05 | User can manage keywords (add, edit, delete, toggle active/inactive) | Existing `/api/keywords` CRUD routes (GET, POST, PUT, DELETE) fully support this; UI calls existing APIs |
| DASH-06 | User can manage brands (own brand + competitors with aliases) | Existing `/api/brands` CRUD routes (GET, POST, PUT, DELETE) fully support this; UI calls existing APIs |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Installed Version | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| next | 15.5.14 | App Router, SSR, API routes | Project foundation |
| react | 19.1.0 | UI components | Project foundation |
| tailwindcss | 4.2.2 | Styling (no component library) | Locked decision |
| drizzle-orm | 0.45.1 | Database queries | Project foundation |
| date-fns | 4.1.0 | Date formatting/manipulation | Already in project |
| zod | 3.25.76 | Schema validation | Already in project |

### New Dependency
| Library | Latest Version | Purpose | Why |
|---------|---------------|---------|-----|
| recharts | 3.8.0 | Trend line charts | Locked decision from user; React-native SVG charts, lightweight |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js / Nivo / Tremor | Recharts is locked decision; good fit for simple line charts in React |
| No component library | shadcn/ui / Radix | User explicitly chose Tailwind-only; keeps bundle small for internal tool |

**Installation:**
```bash
npm install recharts
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/
  dashboard/
    layout.tsx          # Sidebar + content area shell (Client Component for keyword state)
    page.tsx            # Overview page (DASH-01, DASH-02) -- redirect or default
    overview/
      page.tsx          # Visibility score cards + competitor table + mini chart
    competitors/
      page.tsx          # Competitor comparison table (DASH-02)
    trends/
      page.tsx          # Recharts line charts (DASH-03)
    archive/
      page.tsx          # Response archive browser (DASH-04)
    keywords/
      page.tsx          # Keyword management (DASH-05)
    brands/
      page.tsx          # Brand management (DASH-06)
  api/
    dashboard/
      overview/route.ts   # Aggregated overview data (latest snapshots per platform)
      trends/route.ts     # Time series data for charts
      archive/route.ts    # Paginated response archive with mention data
src/
  components/
    dashboard/
      sidebar.tsx         # Sidebar with keyword selector + nav links
      keyword-selector.tsx # Global keyword dropdown
      score-card.tsx      # Reusable visibility score card
      competitor-table.tsx # Competitor comparison table
      trend-chart.tsx     # Recharts wrapper
      archive-list.tsx    # Response archive with highlighting
      keyword-form.tsx    # Keyword add/edit form
      brand-form.tsx      # Brand add/edit form
```

### Pattern 1: Global Keyword Selection via URL Search Params
**What:** Store selected keyword ID in URL `?keyword=<id>` rather than React context/state
**When to use:** Always -- this is the global state for all data view pages
**Why:** Shareable URLs, works with SSR, survives page refresh, no context provider needed
**Example:**
```typescript
// In dashboard/layout.tsx (Client Component)
'use client';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const selectedKeyword = searchParams.get('keyword');
  // Pass selectedKeyword to sidebar and content area
}
```

### Pattern 2: Server Components for Data-Heavy Pages, Client Components for Interactivity
**What:** Use Server Components by default for pages that primarily display data. Use Client Components for interactive elements (forms, dropdowns, charts).
**When to use:** Overview and competitor pages can be Server Components that fetch data directly. Trends page needs Client Component for Recharts. Management pages need Client Components for forms.
**Example:**
```typescript
// dashboard/overview/page.tsx -- can be Server Component
import { db } from '@/lib/db';
import { dailySnapshots, brands, keywords } from '@/lib/db/schema';

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string }>;
}) {
  const { keyword } = await searchParams;
  if (!keyword) return <KeywordRequired />;

  // Direct DB query in Server Component -- no API route needed
  const latestSnapshots = await db.select()
    .from(dailySnapshots)
    .where(eq(dailySnapshots.keywordId, keyword))
    // ... order by date desc, limit to latest per provider/brand

  return <OverviewContent data={latestSnapshots} />;
}
```

### Pattern 3: Fetch from Existing API Routes for Client Components
**What:** Client Components (forms, charts) fetch data from existing or new API routes using `fetch()`
**When to use:** For interactive pages that need client-side state (Trends charts, Archive pagination, Management CRUD)
**Example:**
```typescript
// In a Client Component
'use client';
import { useEffect, useState } from 'react';

function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(url).then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, [url]);
  return { data, loading };
}
```

### Pattern 4: Dashboard Layout with Fixed Sidebar
**What:** Fixed-width sidebar (e.g., 256px) with scrollable content area
**Example:**
```typescript
// dashboard/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r border-gray-200 flex flex-col bg-gray-50">
        <KeywordSelector />
        <nav className="flex-1 overflow-y-auto p-4">
          {/* Nav links */}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **React Context for keyword selection:** URL search params are simpler, shareable, and SSR-compatible. No need for a context provider.
- **One giant page component:** Split each section (overview, trends, archive, management) into its own route. The sidebar layout handles navigation.
- **Client-side data fetching for everything:** Server Components can query DB directly for read-only pages (overview, competitors). Only use client-side fetch for interactive features.
- **Building a custom chart library:** Recharts handles all charting needs. Do not hand-roll SVG charts.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Line/area charts | Custom SVG/canvas charts | Recharts `LineChart`, `AreaChart` | Axes, tooltips, responsiveness, legends are complex |
| Date formatting | Custom date logic | `date-fns` `format()`, `formatDistanceToNow()` | Timezone, locale, edge cases |
| Form validation | Manual if/else validation | Zod schemas (already in project) | Consistent with existing API validation |
| URL state management | Custom state sync | `useSearchParams` from next/navigation | Built-in, SSR-compatible |
| Text highlighting | Regex replace in JSX | Simple `mark` element approach with string split | Avoid dangerouslySetInnerHTML for security |

**Key insight:** The dashboard is a read-heavy UI over existing data. Most complexity is in data aggregation queries and chart rendering -- both solved by Drizzle and Recharts respectively. The UI itself is straightforward Tailwind.

## Common Pitfalls

### Pitfall 1: Recharts in Server Components
**What goes wrong:** Recharts components use browser APIs and React refs. They cannot render in Server Components.
**Why it happens:** Next.js App Router defaults to Server Components.
**How to avoid:** Always mark chart wrapper components with `'use client'` directive.
**Warning signs:** Hydration errors, "window is not defined" errors.

### Pitfall 2: searchParams is a Promise in Next.js 15
**What goes wrong:** In Next.js 15, `searchParams` in page components is a `Promise` that must be awaited. Accessing `.keyword` directly without `await` returns undefined.
**Why it happens:** Next.js 15 made params and searchParams async for performance (streaming).
**How to avoid:** Always `const { keyword } = await searchParams;` in Server Components. In Client Components, use `useSearchParams()` hook instead.
**Warning signs:** `searchParams.keyword` is always `undefined`.

### Pitfall 3: Tailwind CSS 4 Syntax Changes
**What goes wrong:** Tailwind CSS 4 uses `@import "tailwindcss"` instead of `@tailwind` directives. The project already uses v4 syntax in `globals.css`.
**Why it happens:** The project is on Tailwind CSS 4.2.2 which has different config approach.
**How to avoid:** Follow existing `globals.css` pattern. Do NOT add a `tailwind.config.js` -- Tailwind 4 uses CSS-based configuration via `@theme` blocks. The project already has this set up.
**Warning signs:** Styles not applying, config file being ignored.

### Pitfall 4: N+1 Queries in Overview/Competitor Pages
**What goes wrong:** Fetching snapshots per brand per provider in separate queries causes many DB round-trips.
**Why it happens:** Natural to loop over brands and fetch each separately.
**How to avoid:** Single query with JOINs or `WHERE IN` clause. Use Drizzle's `inArray()` operator.
**Warning signs:** Page load > 500ms on small datasets.

### Pitfall 5: Missing Empty States
**What goes wrong:** Dashboard shows broken UI when no keywords exist, no checks have been run, or a keyword has no snapshot data.
**Why it happens:** Developer tests with seed data, forgets about fresh installations.
**How to avoid:** Every data-displaying component needs an empty state. Check: no keywords, no brands, no snapshots for selected keyword, no archive entries.
**Warning signs:** Blank white areas, Recharts rendering empty chart with no axis labels.

### Pitfall 6: Recharts ResponsiveContainer Height
**What goes wrong:** `ResponsiveContainer` from Recharts requires an explicit height (or a parent with explicit height). Without it, the chart renders with 0 height.
**Why it happens:** `ResponsiveContainer` uses the parent's width but needs explicit height.
**How to avoid:** Always wrap `ResponsiveContainer` in a div with explicit height: `<div className="h-80"><ResponsiveContainer>...</ResponsiveContainer></div>`
**Warning signs:** Chart area is invisible/collapsed.

## Code Examples

### Dashboard Overview API Route
```typescript
// src/app/api/dashboard/overview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dailySnapshots, brands } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const keywordId = request.nextUrl.searchParams.get('keyword');
  if (!keywordId) {
    return NextResponse.json({ error: 'keyword param required' }, { status: 400 });
  }

  // Get latest snapshot per brand per provider for this keyword
  // Uses a subquery to find max date per provider/brand combo
  const latestSnapshots = await db
    .select()
    .from(dailySnapshots)
    .where(eq(dailySnapshots.keywordId, keywordId))
    .orderBy(desc(dailySnapshots.date));

  // Group by provider for score cards, by brand for competitor table
  return NextResponse.json({ snapshots: latestSnapshots });
}
```

### Recharts Line Chart for Trends
```typescript
// src/components/dashboard/trend-chart.tsx
'use client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface TrendPoint {
  date: string;
  chatgpt: number;
  perplexity: number;
  gemini: number;
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(v: number) => `${v}%`} />
          <Legend />
          <Line type="monotone" dataKey="chatgpt" stroke="#10b981" name="ChatGPT" />
          <Line type="monotone" dataKey="perplexity" stroke="#3b82f6" name="Perplexity" />
          <Line type="monotone" dataKey="gemini" stroke="#8b5cf6" name="Gemini" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Brand Mention Highlighting in Archive
```typescript
// src/components/dashboard/highlighted-text.tsx
'use client';

interface Props {
  text: string;
  highlights: string[]; // brand name + aliases
}

export function HighlightedText({ text, highlights }: Props) {
  if (!highlights.length) return <span>{text}</span>;

  const pattern = new RegExp(
    `(${highlights.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  );
  const parts = text.split(pattern);

  return (
    <span>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}
```

### Keyword Selector Dropdown
```typescript
// src/components/dashboard/keyword-selector.tsx
'use client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Keyword {
  id: string;
  label: string;
  isActive: boolean;
}

export function KeywordSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const selected = searchParams.get('keyword');

  useEffect(() => {
    fetch('/api/keywords').then(r => r.json()).then(setKeywords);
  }, []);

  const handleChange = (keywordId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('keyword', keywordId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="p-4 border-b border-gray-200">
      <select
        value={selected ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
      >
        <option value="">Select keyword...</option>
        {keywords.filter(k => k.isActive).map(k => (
          <option key={k.id} value={k.id}>{k.label}</option>
        ))}
      </select>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@tailwind base/components/utilities` | `@import "tailwindcss"` | Tailwind v4 (2025) | Project already on v4 -- do NOT use old syntax |
| `params: { id: string }` sync | `params: Promise<{ id: string }>` async | Next.js 15 (2024) | Must `await params` and `await searchParams` |
| Pages Router `getServerSideProps` | App Router Server Components | Next.js 13+ | Direct DB access in Server Components |
| `useRouter().query` | `useSearchParams()` hook | Next.js App Router | For reading URL params in Client Components |

**Deprecated/outdated:**
- Recharts 2.x API: v3 is current (3.8.0). The API is largely compatible but imports may differ for newer features.
- `tailwind.config.js`: Not used in Tailwind v4. Config via CSS `@theme` blocks.

## Open Questions

1. **Redirect root `/` to `/dashboard/overview`?**
   - What we know: Current `page.tsx` is the default Next.js template. Auth middleware protects all routes except `/login`.
   - What's unclear: Should `/` redirect to dashboard, or should dashboard live at `/`?
   - Recommendation: Make `page.tsx` redirect to `/dashboard/overview`. Keeps `/login` clean and allows dashboard route group.

2. **Archive pagination: cursor vs offset?**
   - What we know: `queryRuns` has `createdAt` index. Data grows linearly over time.
   - What's unclear: Total expected data volume for pagination strategy decision.
   - Recommendation: Use simple offset pagination (LIMIT/OFFSET) for simplicity. Internal tool with limited data volume. Page size of 20-50 entries.

3. **Overview "latest" data freshness**
   - What we know: `dailySnapshots` are upserted daily. Getting "latest" requires finding max date per provider/brand.
   - Recommendation: Query with `ORDER BY date DESC LIMIT 1` per group, or use a subquery for max date. Single query, not multiple.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `vitest.config.ts` (exists, node environment) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Overview API returns latest visibility scores per platform | unit | `npx vitest run src/app/api/dashboard/__tests__/overview.test.ts -x` | No -- Wave 0 |
| DASH-02 | Competitor table data grouped by brand | unit | `npx vitest run src/app/api/dashboard/__tests__/overview.test.ts -x` | No -- Wave 0 |
| DASH-03 | Trends API returns time-series data | unit | `npx vitest run src/app/api/dashboard/__tests__/trends.test.ts -x` | No -- Wave 0 |
| DASH-04 | Archive API returns paginated responses with mention data | unit | `npx vitest run src/app/api/dashboard/__tests__/archive.test.ts -x` | No -- Wave 0 |
| DASH-05 | Keyword management calls existing CRUD APIs | unit | `npx vitest run src/app/api/keywords/__tests__/keywords.test.ts -x` | Yes (existing) |
| DASH-06 | Brand management calls existing CRUD APIs | unit | `npx vitest run src/app/api/brands/__tests__/brands.test.ts -x` | No -- Wave 0 |

**Note on UI testing:** This is an internal tool with Tailwind-only styling. Component rendering tests (React Testing Library) add significant setup overhead (jsdom, render mocking) for limited value. Focus tests on API data layer -- the API routes that aggregate dashboard data. UI correctness is verified manually via `npm run dev`.

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/api/dashboard/__tests__/overview.test.ts` -- covers DASH-01, DASH-02
- [ ] `src/app/api/dashboard/__tests__/trends.test.ts` -- covers DASH-03
- [ ] `src/app/api/dashboard/__tests__/archive.test.ts` -- covers DASH-04
- [ ] `src/app/api/brands/__tests__/brands.test.ts` -- covers DASH-06 (brands CRUD tests missing)

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/lib/db/schema.ts`, `src/app/api/*/route.ts`, `src/app/login/page.tsx` -- directly examined
- `package.json` -- verified installed versions (Next 15.5.14, Tailwind 4.2.2, Drizzle 0.45.1, React 19.1.0)
- npm registry -- verified Recharts latest is 3.8.0

### Secondary (MEDIUM confidence)
- Recharts 3.x API -- based on training data knowledge of Recharts API patterns (LineChart, ResponsiveContainer, etc.). Core API stable between v2 and v3.
- Next.js 15 App Router patterns -- based on training data + project's own established patterns (async params in `[id]/route.ts`)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified in project or npm registry
- Architecture: HIGH -- follows established project patterns (App Router, Tailwind, Drizzle)
- Pitfalls: HIGH -- based on direct codebase analysis (Tailwind v4 config, Next.js 15 async params already used in project)
- Recharts API details: MEDIUM -- core API well-known but v3-specific features not verified against docs

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable stack, no fast-moving dependencies)
