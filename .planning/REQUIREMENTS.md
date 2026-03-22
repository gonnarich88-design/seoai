# Requirements: SEO AI Monitor (AEO)

**Defined:** 2026-03-21
**Core Value:** ผู้ใช้สามารถรู้ได้ว่า AI platforms พูดถึงแบรนด์/คีย์เวิร์ดของตนอย่างไร และเปลี่ยนแปลงไปอย่างไรเมื่อเวลาผ่านไป

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data Collection

- [x] **DATA-01**: User can create, edit, and delete keyword/prompt entries for tracking
- [x] **DATA-02**: User can query ChatGPT (OpenAI API) with tracking prompts and receive normalized responses
- [x] **DATA-03**: User can query Perplexity API with tracking prompts and receive normalized responses with citations
- [x] **DATA-04**: User can query Gemini API with tracking prompts and receive normalized responses
- [x] **DATA-05**: System runs each prompt 3 times per check cycle to reduce non-deterministic noise
- [x] **DATA-06**: System tracks API cost per query run and displays cumulative cost per keyword/platform
- [x] **DATA-07**: System stores raw AI responses for re-analysis and auditing
- [x] **DATA-08**: System tracks prompt template versions so methodology changes are visible in trend data

### Analysis

- [x] **ANLS-01**: System detects brand/keyword mentions in AI responses using alias-aware matching
- [x] **ANLS-02**: System calculates visibility score (% of runs where brand is mentioned) per keyword per platform
- [x] **ANLS-03**: User can define competitor brands and system tracks their mentions alongside own brand
- [x] **ANLS-04**: System tracks mention position (1st, 2nd, 3rd recommended) in AI responses
- [x] **ANLS-05**: System classifies mention sentiment as positive, neutral, or negative
- [x] **ANLS-06**: System stores full response text with brand mention highlighting for browsing

### Automation

- [x] **AUTO-01**: System runs scheduled daily checks for all active keywords across all platforms at configurable time
- [x] **AUTO-02**: User can trigger on-demand check for a specific keyword or all keywords
- [x] **AUTO-03**: System enforces daily budget cap per platform and pauses checks when exceeded
- [x] **AUTO-04**: System implements rate limiting per AI provider to respect API limits

### Dashboard

- [ ] **DASH-01**: User sees overview dashboard with current visibility scores per platform and key metrics
- [ ] **DASH-02**: User sees competitor comparison table showing visibility scores side-by-side
- [ ] **DASH-03**: User sees trend charts showing visibility score changes over time per keyword per platform
- [ ] **DASH-04**: User can browse full AI response archive with brand mentions highlighted
- [ ] **DASH-05**: User can manage keywords (add, edit, delete, toggle active/inactive)
- [ ] **DASH-06**: User can manage brands (own brand + competitors with aliases)

### Alerts & Reports

- [ ] **ALRT-01**: System detects meaningful changes in brand visibility (appeared, disappeared, rank changed)
- [ ] **ALRT-02**: System sends email notifications when alerts are triggered
- [ ] **ALRT-03**: User sees alert feed in dashboard with read/unread state
- [ ] **ALRT-04**: System generates weekly summary report of visibility changes
- [ ] **ALRT-05**: User can export data to CSV for external reporting

### Infrastructure

- [x] **INFR-01**: System uses Next.js 15 with App Router and TypeScript
- [x] **INFR-02**: System uses PostgreSQL 16 with Drizzle ORM for data persistence
- [x] **INFR-03**: System uses BullMQ with Redis for job scheduling and retry logic
- [x] **INFR-04**: System uses Vercel AI SDK for unified AI provider interface
- [x] **INFR-05**: System has simple authentication (Auth.js or middleware-based) to prevent unauthorized access

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Analysis

- **ADV-01**: System uses LLM-based extraction (GPT-4o-mini) for improved mention detection accuracy
- **ADV-02**: System tracks citation/source URLs that AI platforms reference in responses
- **ADV-03**: System provides GEO optimization recommendations based on visibility gaps

### Extended Platforms

- **EXT-01**: System monitors Google AI Overviews as 4th platform
- **EXT-02**: System supports multi-language/multi-region prompt tracking

### Advanced Reporting

- **RPT-01**: System generates automated weekly summary email reports
- **RPT-02**: System provides Looker Studio / BI tool integration via API endpoint
- **RPT-03**: System supports prompt research/discovery (suggest new prompts based on industry)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time monitoring | AI responses are non-deterministic; real-time creates noise, not signal. Daily checks sufficient. |
| Multi-tenant user management | Internal team tool; shared access with simple auth is sufficient |
| Mobile app | Responsive web dashboard covers mobile use cases |
| Content generation/optimization engine | Different problem domain; monitoring tool should stay focused |
| 10+ AI platform support | Diminishing returns after top 3; each adds integration and cost complexity |
| Web scraping as primary data source | Fragile, legally risky; API-first with scraping only as optional fallback |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 2 | Complete |
| DATA-03 | Phase 2 | Complete |
| DATA-04 | Phase 2 | Complete |
| DATA-05 | Phase 2 | Complete |
| DATA-06 | Phase 2 | Complete |
| DATA-07 | Phase 2 | Complete |
| DATA-08 | Phase 2 | Complete |
| ANLS-01 | Phase 2 | Complete |
| ANLS-02 | Phase 2 | Complete |
| ANLS-03 | Phase 2 | Complete |
| ANLS-04 | Phase 2 | Complete |
| ANLS-05 | Phase 2 | Complete |
| ANLS-06 | Phase 2 | Complete |
| AUTO-01 | Phase 2 | Complete |
| AUTO-02 | Phase 2 | Complete |
| AUTO-03 | Phase 2 | Complete |
| AUTO-04 | Phase 2 | Complete |
| DASH-01 | Phase 3 | Pending |
| DASH-02 | Phase 3 | Pending |
| DASH-03 | Phase 3 | Pending |
| DASH-04 | Phase 3 | Pending |
| DASH-05 | Phase 3 | Pending |
| DASH-06 | Phase 3 | Pending |
| ALRT-01 | Phase 4 | Pending |
| ALRT-02 | Phase 4 | Pending |
| ALRT-03 | Phase 4 | Pending |
| ALRT-04 | Phase 4 | Pending |
| ALRT-05 | Phase 4 | Pending |
| INFR-01 | Phase 1 | Complete |
| INFR-02 | Phase 1 | Complete |
| INFR-03 | Phase 1 | Complete |
| INFR-04 | Phase 1 | Complete |
| INFR-05 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after roadmap creation*
