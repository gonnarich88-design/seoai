# SEO AI Monitor (AEO)

## What This Is

ระบบตรวจสอบและติดตามการพูดถึงแบรนด์/คีย์เวิร์ดใน AI platforms ต่างๆ (ChatGPT, Perplexity, Gemini) สำหรับงาน AI SEO และ Answer Engine Optimization (AEO) ใช้ภายในทีมเพื่อวิเคราะห์ว่า AI แนะนำแบรนด์หรือเนื้อหาของเราอย่างไร เทียบกับคู่แข่ง และติดตามแนวโน้มการเปลี่ยนแปลง

## Core Value

ผู้ใช้สามารถรู้ได้ว่า AI platforms พูดถึงแบรนด์/คีย์เวิร์ดของตนอย่างไร และเปลี่ยนแปลงไปอย่างไรเมื่อเวลาผ่านไป

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] ติดตาม keyword ใน ChatGPT, Perplexity, Gemini ว่าแบรนด์ถูกพูดถึงหรือไม่
- [ ] แสดง ranking/ลำดับการพูดถึงในแต่ละ AI platform
- [ ] เปรียบเทียบการพูดถึงกับคู่แข่ง
- [ ] แจ้งเตือนเมื่อมีการเปลี่ยนแปลง (ถูกพูดถึง/หายไป)
- [ ] สรุปรายงานรายสัปดาห์
- [ ] Dashboard แสดงภาพรวม + กราฟแนวโน้ม
- [ ] เช็คอัตโนมัติตาม schedule + กดเช็คเองได้
- [ ] เก็บข้อมูลผ่าน API + web scraping

### Out of Scope

- Mobile app — ใช้ภายในทีม web เพียงพอ
- Multi-tenant / user management — ใช้เองไม่ต้องมีระบบสมาชิกซับซ้อน
- Real-time monitoring — เช็ครายวันเพียงพอ ไม่ต้อง real-time

## Context

- AEO (Answer Engine Optimization) เป็นแนวคิดใหม่ที่เน้นการ optimize เนื้อหาให้ AI แนะนำ
- AI platforms แต่ละตัวมี API ที่แตกต่างกัน: OpenAI API, Google Gemini API, Perplexity API
- บาง platform อาจต้องใช้ web scraping แทน API ในบางกรณี
- ข้อมูลจาก AI มีความไม่แน่นอน (non-deterministic) ต้องเช็คหลายครั้งเพื่อความแม่นยำ
- ใช้เป็นเครื่องมือภายในทีม SEO ไม่ต้องมี auth ซับซ้อน

## Constraints

- **Tech Stack**: Next.js + PostgreSQL — ไม่ใช้ Supabase
- **AI APIs**: ต้องมี API keys สำหรับ OpenAI, Google, Perplexity
- **Cost**: API calls มีค่าใช้จ่าย ต้องจัดการ rate limiting และ budgeting
- **Data Accuracy**: AI responses เป็น non-deterministic ต้องเช็คซ้ำหลายครั้ง

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js + PostgreSQL | Full-stack JS, ไม่ต้องการ Supabase | — Pending |
| API + Scraping hybrid | API เป็นหลักเพื่อความเสถียร, scraping เป็นทางเลือก | — Pending |
| ChatGPT + Perplexity + Gemini | 3 AI หลักที่คนใช้มากที่สุดในปี 2025 | — Pending |
| Internal tool | ไม่ต้อง auth ซับซ้อน, โฟกัสที่ฟังก์ชันหลัก | — Pending |

---
*Last updated: 2026-03-22 after Phase 03 (Dashboard) completion*
