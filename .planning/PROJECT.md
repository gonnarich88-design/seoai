# SEO AI Monitor (AEO)

## What This Is

ระบบตรวจสอบและติดตามการพูดถึงแบรนด์/คีย์เวิร์ดใน AI platforms ต่างๆ (ChatGPT, Perplexity, Gemini) สำหรับงาน AI SEO และ Answer Engine Optimization (AEO) ใช้ภายในทีมเพื่อวิเคราะห์ว่า AI แนะนำแบรนด์หรือเนื้อหาของเราอย่างไร เทียบกับคู่แข่ง และติดตามแนวโน้มการเปลี่ยนแปลง

## Core Value

ผู้ใช้สามารถรู้ได้ว่า AI platforms พูดถึงแบรนด์/คีย์เวิร์ดของตนอย่างไร เปลี่ยนแปลงไปอย่างไรตามเวลา และได้รับแจ้งเตือนเมื่อมีการเปลี่ยนแปลงสำคัญ

## Current State (v1.0 — Shipped 2026-03-23)

ระบบ MVP สมบูรณ์พร้อมใช้งาน:
- **Infrastructure**: Next.js 15, PostgreSQL, Drizzle ORM, BullMQ + Redis, Docker Compose
- **Data Pipeline**: Query engine (ChatGPT/Perplexity/Gemini), brand detection, visibility scoring, daily scheduler, budget caps
- **Dashboard**: Overview, Competitors, Trends (Recharts), Archive, Keywords/Brands management
- **Alerts**: Change detection (4 types), email notifications, alert feed, weekly report, CSV export
- **Codebase**: ~6,200 LOC TypeScript, 99 tests, 12 plans executed

## Requirements

### Validated (v1.0)

- ✓ ติดตาม keyword ใน ChatGPT, Perplexity, Gemini ว่าแบรนด์ถูกพูดถึงหรือไม่ — v1.0
- ✓ แสดง ranking/ลำดับการพูดถึงในแต่ละ AI platform — v1.0
- ✓ เปรียบเทียบการพูดถึงกับคู่แข่ง — v1.0
- ✓ แจ้งเตือนเมื่อมีการเปลี่ยนแปลง (ถูกพูดถึง/หายไป) — v1.0
- ✓ สรุปรายงานรายสัปดาห์ — v1.0
- ✓ Dashboard แสดงภาพรวม + กราฟแนวโน้ม — v1.0
- ✓ เช็คอัตโนมัติตาม schedule + กดเช็คเองได้ — v1.0
- ✓ เก็บข้อมูลผ่าน API — v1.0 (API เป็นหลัก, scraping ไม่จำเป็น)

### Active (v1.1+)

_(ยังไม่มี — รอผลจากการใช้งานจริงก่อนกำหนด requirements ถัดไป)_

### Out of Scope

- Mobile app — ใช้ภายในทีม web เพียงพอ
- Multi-tenant / user management — ใช้เองไม่ต้องมีระบบสมาชิกซับซ้อน
- Real-time monitoring — เช็ครายวันเพียงพอ
- Web scraping — API ทั้ง 3 platform พร้อมใช้งาน ไม่จำเป็นต้อง scrape

## Context

- AEO (Answer Engine Optimization) เป็นแนวคิดใหม่ที่เน้นการ optimize เนื้อหาให้ AI แนะนำ
- AI platforms แต่ละตัวมี API ที่แตกต่างกัน: OpenAI API, Google Gemini API, Perplexity API
- ข้อมูลจาก AI มีความไม่แน่นอน (non-deterministic) — ระบบเช็ค 3 ครั้งต่อ cycle และใช้ mention rate เป็น visibility score
- ใช้เป็นเครื่องมือภายในทีม SEO ไม่ต้องมี auth ซับซ้อน

## Constraints

- **Tech Stack**: Next.js 15 + PostgreSQL + Drizzle — ไม่ใช้ Supabase
- **AI APIs**: ต้องมี API keys สำหรับ OpenAI, Google, Perplexity
- **Cost**: API calls มีค่าใช้จ่าย — ระบบมี per-provider daily budget cap และ rate limiting
- **Data Accuracy**: AI responses เป็น non-deterministic — เช็ค 3 runs ต่อ cycle

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 15 + PostgreSQL | Full-stack JS, ไม่ต้องการ Supabase | ✓ Good — ทำงานได้ดี ไม่มีปัญหา |
| API only (ไม่ scrape) | API ทั้ง 3 platform พร้อมใช้งาน | ✓ Good — scraping ไม่จำเป็น |
| ChatGPT + Perplexity + Gemini | 3 AI หลักที่คนใช้มากที่สุด | ✓ Good — ครอบคลุม use case |
| Internal tool, simple auth | ไม่ต้อง multi-tenant | ✓ Good — ลด complexity มาก |
| BullMQ + Redis queue | Reliable job processing, retry support | ✓ Good — alert pipeline ทำงานถูกต้อง |
| 3 runs per check cycle | ลด non-deterministic noise | ✓ Good — visibility score แม่นยำกว่า |
| Nodemailer SMTP | ใช้ email provider ที่มีอยู่ | — Pending validation (ยังไม่ได้ทดสอบกับ email จริง) |

---
*Last updated: 2026-03-23 after v1.0 milestone complete*
