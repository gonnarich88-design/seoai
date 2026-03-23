# Design Spec: User Guide & Documentation

**Date:** 2026-03-24
**Status:** Approved

## Overview

Add user-facing documentation in two places:
1. **README.md** — rewritten for developers who need to set up and run the system
2. **`/dashboard/help`** — in-app guide for SEO team users who need to understand how to use the dashboard

## Audience

| Audience | Where they read | What they need |
|----------|----------------|----------------|
| Developer | README.md (GitHub) | Setup, environment variables, architecture |
| SEO Team | `/dashboard/help` | How to use each feature, onboarding tutorial |

## Approach

Static pages in Next.js (no DB required). Content lives directly in TSX. Fast, easy to maintain, deploys with the app.

---

## Part 1: README.md

Rewrite the existing boilerplate README with project-specific content.

### Sections

**Header**
- Project name + one-line description: "SEO/AEO monitoring tool that tracks how AI platforms (ChatGPT, Perplexity, Gemini) mention your brand"

**Prerequisites**
- Node.js 20+
- Docker (for PostgreSQL + Redis)
- At least one AI API key (OpenAI, Google, or Perplexity)

**Quick Start** (numbered steps)
1. `git clone` + `npm install`
2. `cp .env.example .env` — fill in required values
3. `npm run services:up` — starts PostgreSQL + Redis via Docker
4. `npx drizzle-kit migrate` — create database tables
5. Terminal 1: `npm run dev`
6. Terminal 2: `npm run worker:dev`
7. Open `http://localhost:3000`, login with `AUTH_PASSWORD`

**Environment Variables**
Table with columns: Variable | Required | Example | Description
Covers: DATABASE_URL, REDIS_URL, AUTH_PASSWORD, OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY (not GOOGLE_API_KEY), PERPLEXITY_API_KEY, DAILY_BUDGET_OPENAI/PERPLEXITY/GEMINI, CHECK_SCHEDULE_CRON, WEEKLY_REPORT_CRON, SMTP_HOST/PORT/SECURE/USER/PASS/FROM, ALERT_EMAIL_TO

**Architecture**
Short paragraph + two-process note:
- Next.js app (UI + API)
- BullMQ worker (background jobs)
- Data pipeline: keyword → AI query → brand detection → snapshot → alert → email

**Available Commands**
Reference to CLAUDE.md commands (dev, build, test, migrations)

---

## Part 2: `/dashboard/help` Page

New page at `src/app/dashboard/help/page.tsx`. Linked from sidebar.

### Layout

Two-section layout on single scrollable page:
1. **Getting Started** — tutorial for first-time users
2. **Page Reference** — quick reference for each dashboard section

### Section A: Getting Started Tutorial

Step-by-step cards, numbered 1–5:

| Step | Title | Description |
|------|-------|-------------|
| 1 | เพิ่มแบรนด์ของคุณ | ไปที่ Brands → Add Brand → ใส่ชื่อแบรนด์และ alias (ชื่อย่อ, ชื่อเล่น) ที่ AI อาจใช้ |
| 2 | เพิ่ม Keyword | ไปที่ Keywords → Add Keyword → เขียน prompt ที่คุณอยากรู้ว่า AI ตอบอะไร เช่น "แนะนำ CRM ที่ดีที่สุดสำหรับธุรกิจขนาดเล็ก" |
| 3 | รัน Check ครั้งแรก | กดปุ่ม "Run Check Now" บนหน้า Keywords — ระบบจะส่ง prompt ไปถาม AI ทุกแพลตฟอร์ม |
| 4 | ดูผลที่ Overview | ดู Visibility Score ว่าแบรนด์คุณถูก AI พูดถึงกี่ % และเทียบกับคู่แข่งอย่างไร |
| 5 | รับ Alert อัตโนมัติ | ตั้งค่า SMTP ใน .env เพื่อรับอีเมลเมื่อ visibility เปลี่ยนแปลง |

### Section B: Quick Reference

Card grid — one card per dashboard section:

| Page | Icon | When to use |
|------|------|-------------|
| Overview | 📊 | ดูภาพรวม score ทุก platform และเทียบคู่แข่งแบบย่อ |
| Competitors | ⚔️ | ตาราง full comparison เทียบ visibility score ของทุกแบรนด์ต่อทุก platform |
| Trends | 📈 | ดูว่า visibility เปลี่ยนไปอย่างไรในช่วง 7/30/90 วัน |
| Archive | 📁 | อ่าน response เต็มของ AI พร้อม highlight ชื่อแบรนด์ |
| Alerts | 🔔 | ดูการแจ้งเตือนเมื่อแบรนด์ปรากฏ/หายไป/เปลี่ยน rank |
| Keywords | 🏷 | เพิ่ม/แก้ไข/ลบ prompt ที่ใช้ถาม AI |
| Brands | 🏢 | จัดการแบรนด์ตัวเองและคู่แข่ง รวมถึง alias |

Each card includes: icon, page name, 2-sentence description, and "เหมาะเมื่อ..." guidance.

### Navigation

Add "Help" link to `src/components/dashboard/sidebar.tsx`. Place it as a standalone entry at the bottom of the nav list, outside the existing "Data" and "Management" groups — no group label, just a single link at the bottom.

---

## Implementation Notes

- Help page can be a server component (no client-side hooks needed — purely static content). Add `'use client'` only if needed for consistency, but it is not required.
- No new API routes needed
- Content is hardcoded in TSX (not fetched from DB)
- Sidebar link added alongside existing nav items
- README.md replaces existing boilerplate entirely

## Files to Create/Modify

| File | Action |
|------|--------|
| `README.md` | Rewrite |
| `src/app/dashboard/help/page.tsx` | Create |
| `src/components/dashboard/sidebar.tsx` | Add Help nav link (standalone at bottom, outside existing groups) |
