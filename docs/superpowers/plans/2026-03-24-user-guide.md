# User Guide & Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add documentation for two audiences — a rewritten README.md for developers setting up the system, and a `/dashboard/help` page for SEO team members learning to use the dashboard.

**Architecture:** README.md is a standalone markdown file at the project root. The help page is a Next.js server component at `src/app/dashboard/help/page.tsx` with purely static content (no API calls, no hooks). The sidebar gets one new standalone link at the bottom pointing to `/dashboard/help`.

**Tech Stack:** Next.js 15 App Router (server component), Tailwind CSS, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `README.md` | Rewrite | Developer setup guide: prerequisites, quick start, env vars, architecture |
| `src/app/dashboard/help/page.tsx` | Create | Static help page: onboarding tutorial + quick reference |
| `src/components/dashboard/sidebar.tsx` | Modify | Add Help link at bottom of nav, outside existing groups |

---

## Task 1: Rewrite README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README.md with project-specific content**

Replace the entire file with:

```markdown
# SEO AI Monitor

Track how AI platforms (ChatGPT, Perplexity, Gemini) mention your brand. Monitor visibility scores, detect changes, and receive alerts when your brand appears or disappears from AI responses.

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL + Redis)
- At least one AI API key (OpenAI, Google, or Perplexity)

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/gonnarich88-design/seoai.git
cd seoai

# 2. Install dependencies
npm install

# 3. Copy and fill in environment variables
cp .env.example .env
# Edit .env — see Environment Variables below

# 4. Start PostgreSQL and Redis
npm run services:up

# 5. Create database tables
npx drizzle-kit migrate

# 6. Start the app (two terminals required)
# Terminal 1:
npm run dev

# Terminal 2:
npm run worker:dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the password you set in `AUTH_PASSWORD`.

## Environment Variables

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | `postgresql://postgres:dev@localhost:5432/seoai` | PostgreSQL connection string |
| `REDIS_URL` | ✅ | `redis://localhost:6379` | Redis connection string |
| `AUTH_PASSWORD` | ✅ | `mysecretpassword` | Login password (min 8 chars) |
| `OPENAI_API_KEY` | one required | `sk-...` | OpenAI API key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | one required | `AI...` | Google Gemini API key |
| `PERPLEXITY_API_KEY` | one required | `pplx-...` | Perplexity API key |
| `DAILY_BUDGET_OPENAI` | ❌ | `1.0` | Daily spend cap in USD (default: $1.00) |
| `DAILY_BUDGET_PERPLEXITY` | ❌ | `1.0` | Daily spend cap in USD (default: $1.00) |
| `DAILY_BUDGET_GEMINI` | ❌ | `1.0` | Daily spend cap in USD (default: $1.00) |
| `CHECK_SCHEDULE_CRON` | ❌ | `0 0 * * *` | When to run daily checks (default: midnight) |
| `WEEKLY_REPORT_CRON` | ❌ | `0 9 * * 1` | When to send weekly report (default: Monday 9am) |
| `SMTP_HOST` | ❌ | `smtp.gmail.com` | SMTP server for email alerts |
| `SMTP_PORT` | ❌ | `587` | SMTP port |
| `SMTP_SECURE` | ❌ | `false` | Use TLS (true for port 465) |
| `SMTP_USER` | ❌ | `you@gmail.com` | SMTP username |
| `SMTP_PASS` | ❌ | `your-app-password` | SMTP password or app password |
| `SMTP_FROM` | ❌ | `SEO Monitor <noreply@you.com>` | From address for emails |
| `ALERT_EMAIL_TO` | ❌ | `team@company.com` | Where to send alert emails |

> Email variables are optional but required for alerts and weekly reports to work.

## Architecture

Two processes must run simultaneously:

1. **Next.js app** (`npm run dev`) — UI dashboard + REST API at `http://localhost:3000`
2. **BullMQ worker** (`npm run worker:dev`) — background job processor for AI queries

**Data pipeline:**
```
Scheduler / on-demand trigger
  → AI query (ChatGPT, Perplexity, Gemini × 3 runs)
  → Brand detection (mention, position, sentiment)
  → Daily snapshot (visibility score aggregation)
  → Alert detection (appeared, disappeared, rank changed)
  → Email notification
```

## Available Commands

```bash
# Development
npm run dev           # Next.js with Turbopack
npm run worker:dev    # Background worker (separate terminal)
npm run services:up   # Start PostgreSQL + Redis via Docker Compose

# Build & Lint
npm run build         # Production build
npm run lint          # ESLint

# Database
npx drizzle-kit generate   # Generate migration from schema changes
npx drizzle-kit migrate    # Apply migrations

# Tests
npx vitest --run           # Run all tests
npx vitest --watch         # Watch mode
```
```

- [ ] **Step 2: Verify the README renders correctly**

Preview the markdown in your editor or on GitHub. Confirm:
- Table of environment variables is formatted correctly
- Code blocks have correct syntax highlighting markers
- No broken markdown (unclosed backticks, misaligned table columns)

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README with setup guide and architecture overview"
```

---

## Task 2: Create Help Page

**Files:**
- Create: `src/app/dashboard/help/page.tsx`

- [ ] **Step 1: Create the help page file**

Create `src/app/dashboard/help/page.tsx` with this content:

```tsx
// NOTE: const arrays are declared BEFORE the component to avoid ReferenceError
// (const is not hoisted — declaring after the function that uses them causes a runtime error)

const steps = [
  {
    number: 1,
    title: 'เพิ่มแบรนด์ของคุณ',
    description:
      'ไปที่ Brands → กด Add Brand → ใส่ชื่อแบรนด์และ alias (ชื่อย่อ, ชื่อสินค้า) ที่ AI อาจใช้เรียกแบรนด์คุณ เพิ่มคู่แข่งได้ด้วยโดยปิด "This is my brand"',
  },
  {
    number: 2,
    title: 'เพิ่ม Keyword',
    description:
      'ไปที่ Keywords → กด Add Keyword → ตั้งชื่อ label และเขียน prompt ที่ต้องการให้ AI ตอบ เช่น "แนะนำซอฟต์แวร์ CRM ที่ดีที่สุดสำหรับธุรกิจขนาดเล็ก"',
  },
  {
    number: 3,
    title: 'รัน Check ครั้งแรก',
    description:
      'ไปที่ Keywords → กดปุ่ม "Run Check Now" ระบบจะส่ง prompt ไปถาม ChatGPT, Perplexity และ Gemini (3 ครั้งต่อแพลตฟอร์มเพื่อความแม่นยำ) ใช้เวลาสักครู่',
  },
  {
    number: 4,
    title: 'ดูผลที่ Overview',
    description:
      'เลือก keyword จาก dropdown ด้านซ้าย แล้วไปที่ Overview จะเห็น Visibility Score ว่าแบรนด์คุณถูก AI พูดถึงกี่ % ในแต่ละแพลตฟอร์ม และเทียบกับคู่แข่งอย่างไร',
  },
  {
    number: 5,
    title: 'รับ Alert อัตโนมัติ',
    description:
      'ตั้งค่า SMTP_HOST, SMTP_USER, SMTP_PASS และ ALERT_EMAIL_TO ใน .env เพื่อรับอีเมลเมื่อ visibility เปลี่ยนแปลง ระบบจะส่ง daily check ตามเวลาที่ตั้งไว้ใน CHECK_SCHEDULE_CRON',
  },
];

const pages = [
  {
    icon: '📊',
    name: 'Overview',
    description: 'ดู Visibility Score ของแบรนด์คุณต่อ platform (ChatGPT, Perplexity, Gemini) และตารางเทียบกับคู่แข่ง พร้อมกราฟ trend 7 วัน',
    whenToUse: 'เปิดทุกวันเพื่อเช็ก status',
  },
  {
    icon: '⚔️',
    name: 'Competitors',
    description: 'ตาราง full comparison แสดง visibility score ของทุกแบรนด์ เทียบกันในทุก platform และทุก keyword',
    whenToUse: 'เมื่อต้องการวิเคราะห์คู่แข่งเชิงลึก',
  },
  {
    icon: '📈',
    name: 'Trends',
    description: 'กราฟแสดงการเปลี่ยนแปลง visibility score ตามเวลา กรองตาม brand และ time range (7/30/90 วัน)',
    whenToUse: 'เมื่อต้องการดูแนวโน้มระยะยาว',
  },
  {
    icon: '📁',
    name: 'Archive',
    description: 'ดู AI response เต็มๆ ทุก response ที่เคยได้รับ พร้อม highlight ชื่อแบรนด์ที่ถูกพูดถึง',
    whenToUse: 'เมื่อต้องการอ่านว่า AI พูดอะไรจริงๆ',
  },
  {
    icon: '🔔',
    name: 'Alerts',
    description: 'รายการแจ้งเตือนเมื่อแบรนด์ปรากฏ/หายไปจาก AI response หรือเปลี่ยน rank มี unread badge บน sidebar',
    whenToUse: 'เมื่อได้รับแจ้งเตือนทางอีเมล',
  },
  {
    icon: '🏷️',
    name: 'Keywords',
    description: 'จัดการ prompt ที่ใช้ถาม AI เพิ่ม/แก้ไข/ลบ/toggle active และรัน on-demand check ได้',
    whenToUse: 'เมื่อต้องการเพิ่มหรือแก้ไข prompt',
  },
  {
    icon: '🏢',
    name: 'Brands',
    description: 'จัดการแบรนด์ตัวเองและคู่แข่ง กำหนด alias ที่ AI อาจใช้เรียก เช่น ชื่อย่อหรือชื่อสินค้า',
    whenToUse: 'เมื่อต้องการเพิ่มคู่แข่งหรือแก้ไข alias',
  },
];

export default function HelpPage() {
  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Help & Guide</h2>
      <p className="text-gray-500 mb-8">วิธีการใช้งาน SEO AI Monitor</p>

      {/* Getting Started */}
      <section className="mb-10">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          เริ่มต้นใช้งาน
        </h3>
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-4 p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {step.number}
              </div>
              <div>
                <p className="font-medium text-gray-900">{step.title}</p>
                <p className="text-sm text-gray-500 mt-1">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Reference */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          แต่ละหน้าทำอะไร
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {pages.map((page) => (
            <div key={page.name} className="p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{page.icon}</span>
                <span className="font-medium text-gray-900">{page.name}</span>
              </div>
              <p className="text-sm text-gray-500">{page.description}</p>
              <p className="text-xs text-blue-600 mt-2">{page.whenToUse}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page builds without errors**

```bash
npm run build
```

Expected: build completes with no errors (ignore any prerender warnings about dynamic routes)

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/help/page.tsx
git commit -m "feat: add /dashboard/help page with onboarding guide and quick reference"
```

---

## Task 3: Add Help Link to Sidebar

**Files:**
- Modify: `src/components/dashboard/sidebar.tsx`

- [ ] **Step 1: Add the Help link at the bottom of the nav**

In `src/components/dashboard/sidebar.tsx`, add the Help link after the closing `</Link>` of the last `managementLinks` map, but before the closing `</nav>` tag.

Current nav structure (lines 48–80):
```tsx
<nav className="flex-1 overflow-y-auto px-3 py-4">
  {/* Data group */}
  ...
  {/* Management group */}
  {managementLinks.map(...)}
</nav>
```

Add after the `managementLinks` map block, before `</nav>`:

```tsx
        <div className="mt-6 border-t border-gray-200 pt-4">
          <Link
            href="/dashboard/help"
            className={linkClassName('/dashboard/help')}
          >
            Help
          </Link>
        </div>
```

Full updated `<nav>` block for reference (orientation only — do NOT copy-paste this wholesale; use it to verify the diff above was applied correctly):

```tsx
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-3">
          Data
        </p>
        {dataLinks.map((link) => (
          <Link
            key={link.href}
            href={dataHref(link.href)}
            className={linkClassName(link.href)}
          >
            {link.label === 'Alerts' ? (
              <span className="flex items-center justify-between w-full">
                {link.label}
                <AlertBadge />
              </span>
            ) : (
              link.label
            )}
          </Link>
        ))}
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-3 mt-6">
          Management
        </p>
        {managementLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={linkClassName(link.href)}
          >
            {link.label}
          </Link>
        ))}
        <div className="mt-6 border-t border-gray-200 pt-4">
          <Link
            href="/dashboard/help"
            className={linkClassName('/dashboard/help')}
          >
            Help
          </Link>
        </div>
      </nav>
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: build completes with no errors (ignore any prerender warnings about dynamic routes)

- [ ] **Step 3: Run existing tests to confirm nothing broken**

```bash
npx vitest --run
```

Expected: all tests pass (sidebar is a UI component — no unit tests — but ensure no import errors propagated)

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/sidebar.tsx
git commit -m "feat: add Help link to sidebar navigation"
```

---

## Task 4: Final Verification

- [ ] **Step 1: Start the dev server and verify visually**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard/help` in a browser. Confirm:
- The page loads without errors
- "Help" link appears at the bottom of the sidebar with a divider above it
- "Help" link highlights correctly when on `/dashboard/help`
- Getting Started tutorial shows 5 numbered steps
- Quick Reference shows 7 cards (Overview, Competitors, Trends, Archive, Alerts, Keywords, Brands)
- All text is readable (gray-900 on white)

- [ ] **Step 2: Verify README renders on GitHub (or locally)**

Open `README.md` in a markdown viewer. Confirm:
- Table of environment variables is formatted correctly
- Code blocks render with correct syntax
- Quick Start steps are numbered and clear

- [ ] **Step 3: Push branch and update PR**

```bash
git push origin fix/form-readability-and-docs
```

The existing open PR (#1) will automatically include these commits.
