# Feature Research

**Domain:** AI SEO / Answer Engine Optimization (AEO) Monitoring
**Researched:** 2026-03-20
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Multi-platform AI monitoring | Every competitor covers at least ChatGPT, Perplexity, and Google AI Overviews. Users won't adopt a tool that only covers one platform. | HIGH | Start with ChatGPT + Perplexity + Gemini (per PROJECT.md). Google AI Overviews is increasingly expected too. Each platform needs its own API integration or scraping approach. |
| Brand mention detection | The core value proposition of every AEO tool. Binary question: does the AI mention your brand or not? | MEDIUM | Query AI with target prompts, parse responses for brand/keyword mentions. Must handle variations (brand name misspellings, abbreviations). |
| Prompt-based tracking | Users define search prompts (e.g., "best CRM software") and track whether their brand appears in AI responses. This is the fundamental unit of measurement in every tool surveyed. | LOW | CRUD for prompts + scheduled execution. Otterly, Peec, Profound all center their UX around prompt management. |
| Competitor comparison | Otterly, Peec, BrandRank, and Profound all offer competitive benchmarking. Users need to see "I appear in 40% of answers, competitor X appears in 70%." | MEDIUM | Track multiple brands/domains per prompt. Requires defining competitor list per project. |
| Visibility score/percentage | Every tool provides a numeric visibility metric (percentage of prompts where brand appears). This is the primary KPI users track. | LOW | Simple calculation: (mentions / total checks) * 100. Can be broken down per platform. |
| Historical trend tracking | Users need to see visibility changes over time. "Are we improving?" is the second question after "Where do we stand?" | MEDIUM | Store every check result with timestamp. Chart data over days/weeks/months. Requires consistent data collection schedule. |
| Dashboard with overview | Every tool (Peec, Otterly, BrandRank, Profound) leads with a dashboard showing current visibility status, recent changes, and competitor positioning. | MEDIUM | Single-screen summary: visibility score per platform, competitor ranking table, recent mention highlights. |
| Scheduled automated checks | All tools run checks on a schedule (daily is standard, some offer weekly). Manual-only checking is a dealbreaker. | MEDIUM | Cron/scheduler for prompt execution. Daily is the expected frequency. Peec does daily; Otterly does daily-to-weekly. |
| Manual on-demand checks | Users want to check visibility after making content changes without waiting for the next scheduled run. | LOW | "Check now" button per prompt or batch. Just triggers the same pipeline outside the schedule. |
| CSV/data export | Otterly, Profound, and others offer CSV export. Stakeholders need data in spreadsheets for reporting. | LOW | Export query results, visibility scores, and trends to CSV. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Sentiment analysis | Profound and BrandRank track not just whether you are mentioned, but how positively. A brand mentioned negatively is worse than not mentioned. Scored -1 to +1. | MEDIUM | Use LLM to classify sentiment of the AI response toward the target brand. Can be done as a post-processing step on collected responses. |
| Citation/source tracking | Otterly tracks which URLs are cited in AI responses. Knowing which of your pages AI references helps optimize content strategy. | MEDIUM | Parse AI responses for URLs. Track which domains/pages get cited most. Otterly calls this "Website Citations Gap Analysis." |
| Full response archiving | Store the complete AI response text, not just mention/no-mention. Enables deeper analysis and debugging. | LOW | Store raw response alongside parsed results. Peec shows "full chat context" for each mention. |
| GEO/optimization recommendations | Profound and Otterly offer actionable recommendations: what to change to improve AI visibility. Most tools only monitor. | HIGH | Requires analyzing why content is/isn't cited and generating actionable advice. This is Peec's biggest noted weakness -- it monitors but doesn't optimize. |
| Multi-language/multi-region support | Otterly supports 40+ countries, Peec offers regional tracking. Important for international brands. | MEDIUM | Same prompts run with different language/locale settings. Multiplies API costs. |
| Alert/notification system | Email or Slack alerts when visibility changes (brand appears/disappears from AI responses). Change detection is what makes monitoring actionable. | MEDIUM | Compare current check vs previous, detect meaningful changes (appearance, disappearance, position change, sentiment shift). Send via email/Slack webhook. |
| Mention position/ranking | Track where in the AI response your brand appears (first mentioned, third mentioned, etc.). Earlier mention = stronger recommendation. | LOW | Parse response for ordered brand mentions. Track position changes over time. Otterly calls this "Answer Rankings." |
| AI platform response comparison | Show how different AI platforms answer the same prompt differently. "ChatGPT recommends us but Perplexity doesn't" reveals platform-specific optimization opportunities. | LOW | Side-by-side display of responses from different platforms for the same prompt. Natural output of multi-platform monitoring. |
| Conversation Explorer / prompt research | Profound's differentiator: discover what prompts people actually use related to your industry, beyond the ones you manually define. | HIGH | Would require either integrating with search volume APIs or using AI to generate related prompt variations. Profound calls this revealing "previously invisible" search volume data. |
| White-label/branded reports | Generate reports with custom branding for stakeholder presentations. Agencies value this heavily. | LOW | PDF/HTML report generation with customizable logo and colors. Out of scope for an internal tool, but trivial to add later. |
| Google Looker Studio integration | Otterly offers direct Looker Studio integration for custom dashboards. Power users want BI tool connectivity. | MEDIUM | Requires building a data connector or API endpoint that Looker can consume. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time monitoring | "I want to know immediately when AI changes its answer about my brand." | AI responses are non-deterministic -- the same prompt can give different answers each time. Real-time monitoring creates noise, not signal. Also massively increases API costs. PROJECT.md already marks this out of scope. | Daily scheduled checks with on-demand manual triggers. Average results across multiple checks to reduce noise. |
| Content generation/optimization engine | Profound offers "one-click AI content generation." Users want the tool to also fix their visibility problems. | Turns a focused monitoring tool into a bloated content platform. Different problem domain, different expertise. Peec was criticized for NOT doing this, but staying focused is the right call for an internal tool. | Surface actionable insights (which pages to update, what topics to cover) but leave content creation to dedicated tools. |
| Multi-tenant user management | "Different team members need different access levels." | PROJECT.md explicitly marks this out of scope. For an internal team tool, auth complexity adds development time without proportional value. | Single shared access. If needed later, add basic role-based access with minimal overhead. |
| Mobile app | "I want to check visibility on my phone." | PROJECT.md marks this out of scope. Responsive web dashboard covers mobile use cases adequately for an internal tool. | Responsive web design for the dashboard. |
| Tracking 10+ AI platforms | Peec tracks 10 platforms. Seems like more is better. | Each platform requires separate integration, maintenance, and API costs. Many platforms (Llama, DeepSeek) are niche and unlikely to be used by your target audience. Diminishing returns after the top 3-4. | Start with ChatGPT, Perplexity, Gemini (the three in PROJECT.md). Add Google AI Overviews and Claude only if validated by actual need. |
| Web scraping as primary data collection | "Scraping gives real user-like responses." Peec uses UI scraping. | Scraping is fragile (UI changes break scrapers), legally ambiguous, and harder to maintain. Rate limiting and anti-bot measures cause reliability issues. | Use official APIs as primary method (OpenAI, Google Gemini, Perplexity all have APIs). Fall back to scraping only when API doesn't exist or lacks features. PROJECT.md already specifies this hybrid approach. |
| Attempting deterministic results from non-deterministic AI | "Show me THE answer AI gives for this query." | AI responses vary per request. Presenting a single response as "the answer" is misleading. Users may make decisions based on an anomalous response. | Run each prompt multiple times (3-5x), aggregate results. Show mention frequency (e.g., "mentioned in 4/5 checks") rather than treating any single response as definitive. |

## Feature Dependencies

```
[Prompt Management (CRUD)]
    |
    +--requires--> [AI Platform Integration (API calls)]
    |                  |
    |                  +--requires--> [Response Parsing (mention detection)]
    |                                     |
    |                                     +--enables--> [Visibility Score Calculation]
    |                                     +--enables--> [Mention Position Tracking]
    |                                     +--enables--> [Sentiment Analysis]
    |                                     +--enables--> [Citation/URL Extraction]
    |                                     +--enables--> [Full Response Archiving]
    |
    +--requires--> [Scheduled Execution (cron)]
    |                  |
    |                  +--enables--> [Historical Data Accumulation]
    |                                     |
    |                                     +--enables--> [Trend Charts]
    |                                     +--enables--> [Change Detection]
    |                                          |
    |                                          +--enables--> [Alert Notifications]
    |
    +--enhances--> [Competitor Configuration]
                       |
                       +--enables--> [Competitor Comparison Views]
                       +--enables--> [Brand Visibility Index]

[Dashboard]
    +--requires--> [Visibility Score Calculation]
    +--requires--> [Historical Data]
    +--requires--> [Competitor Comparison]

[CSV Export]
    +--requires--> [Historical Data]
```

### Dependency Notes

- **Response Parsing requires AI Platform Integration:** You cannot parse what you haven't collected. Platform integrations must be built first.
- **Change Detection requires Historical Data:** Detecting changes means comparing current state to previous state. Need at least 2 data points.
- **Alert Notifications require Change Detection:** Alerts fire when changes are detected. Change detection logic must exist first.
- **Dashboard requires Visibility Scores + Historical Data + Competitors:** The dashboard is a presentation layer over computed data. All computation must exist before the dashboard is useful.
- **Sentiment Analysis enhances Response Parsing:** Sentiment is a secondary analysis pass on already-collected responses. Can be added independently after basic mention detection works.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed to validate the concept.

- [ ] Prompt management -- CRUD for search prompts to track (e.g., "best project management tool")
- [ ] ChatGPT API integration -- Query OpenAI API with prompts, get responses
- [ ] Perplexity API integration -- Query Perplexity API with prompts, get responses
- [ ] Gemini API integration -- Query Google Gemini API with prompts, get responses
- [ ] Brand/keyword mention detection -- Parse AI responses for target brand/keyword presence
- [ ] Visibility score calculation -- Percentage of prompts where brand is mentioned per platform
- [ ] Basic competitor tracking -- Track 2-3 competitor brands alongside your own
- [ ] Scheduled daily checks -- Automated daily execution of all prompt checks
- [ ] Manual check trigger -- "Check now" button for immediate execution
- [ ] Simple dashboard -- Visibility scores per platform, competitor comparison table, last check timestamp
- [ ] Historical data storage -- Store all check results with timestamps for trend analysis

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Trend charts -- Line charts showing visibility over time per platform and per prompt
- [ ] Change detection + alerts -- Detect when brand appears/disappears and notify via email or Slack
- [ ] Mention position tracking -- Track where in the response the brand is mentioned (1st, 2nd, 3rd)
- [ ] Full response archiving with browsable UI -- View the actual AI response for any check
- [ ] Multi-prompt execution with noise reduction -- Run each prompt 3-5 times, aggregate for accuracy
- [ ] CSV export -- Export data for external reporting
- [ ] Sentiment analysis -- Classify AI response sentiment toward the brand (-1 to +1)

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Citation/source URL tracking -- Parse which URLs AI platforms cite in responses
- [ ] GEO optimization recommendations -- Suggest content changes to improve visibility
- [ ] Prompt research/discovery -- Suggest new prompts to track based on industry
- [ ] Multi-language/multi-region support -- Track prompts in different languages/locales
- [ ] Google AI Overviews integration -- Add as 4th platform
- [ ] Looker Studio or BI tool integration -- For advanced custom reporting
- [ ] Weekly summary email reports -- Automated digest of visibility changes

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Prompt management (CRUD) | HIGH | LOW | P1 |
| ChatGPT API integration | HIGH | MEDIUM | P1 |
| Perplexity API integration | HIGH | MEDIUM | P1 |
| Gemini API integration | HIGH | MEDIUM | P1 |
| Brand mention detection | HIGH | MEDIUM | P1 |
| Visibility score calculation | HIGH | LOW | P1 |
| Competitor tracking | HIGH | LOW | P1 |
| Scheduled daily checks | HIGH | MEDIUM | P1 |
| Manual check trigger | MEDIUM | LOW | P1 |
| Dashboard overview | HIGH | MEDIUM | P1 |
| Historical data storage | HIGH | LOW | P1 |
| Trend charts | HIGH | MEDIUM | P2 |
| Change detection + alerts | HIGH | MEDIUM | P2 |
| Multi-run noise reduction | HIGH | LOW | P2 |
| Mention position tracking | MEDIUM | LOW | P2 |
| Full response archive UI | MEDIUM | LOW | P2 |
| CSV export | MEDIUM | LOW | P2 |
| Sentiment analysis | MEDIUM | MEDIUM | P2 |
| Citation/URL tracking | MEDIUM | MEDIUM | P3 |
| GEO recommendations | HIGH | HIGH | P3 |
| Prompt discovery | MEDIUM | HIGH | P3 |
| Multi-language/region | LOW | MEDIUM | P3 |
| Google AI Overviews | MEDIUM | HIGH | P3 |
| Weekly summary reports | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Otterly.ai ($29-489/mo) | Profound ($99-399+/mo) | Peec AI ($99-530+/mo) | BrandRank.ai (enterprise) | Our Approach (internal tool) |
|---------|------------------------|----------------------|---------------------|--------------------------|----------------------------|
| Platform coverage | 6 platforms (ChatGPT, Perplexity, AIO, AI Mode, Gemini, Copilot) | 7+ platforms (ChatGPT, Perplexity, AIO, Gemini, Copilot, Claude, Grok) | 10 platforms (ChatGPT, Gemini, Perplexity, Claude, AIO, AI Mode, Copilot, DeepSeek, Grok, Llama) | Major AI platforms (ChatGPT, AIO, others) | 3 platforms (ChatGPT, Perplexity, Gemini) -- focused, lower cost |
| Data collection | API-based | API-based | UI scraping (simulates real users) | API-based | API-first, scraping fallback |
| Refresh frequency | Daily to weekly | Daily | Daily | Continuous | Daily scheduled + manual on-demand |
| Competitor tracking | Yes, with Brand Visibility Index | Yes, with "share of voice" | Yes, with industry ranking table | Yes, with competitive benchmarking | Yes, basic comparison table |
| Sentiment analysis | No (not prominently featured) | Yes, -1 to +1 scale | Limited | Yes | Deferred to v1.x |
| Citation/URL tracking | Yes, with gap analysis | Yes, 5M+ citations daily | Limited | Limited | Deferred to v2 |
| Optimization tools | GEO Audit with SWOT | Content generation + optimization | No (monitoring only) | Actionable insights | Insights only, no content generation |
| Reporting | CSV export, Looker Studio integration, branded reports | CSV/JSON export, custom dashboards | Regional reporting, multi-user | Brand health reports | CSV export |
| Alerting | Not prominently featured | Not prominently featured | Refresh countdown timer | Real-time monitoring | Email/Slack alerts (v1.x) |
| Prompt research | AI Keyword Research Tool | Conversation Explorer (unique) | Not featured | Not featured | Deferred to v2 |
| Multi-language | 40+ countries | 18+ countries | By region | Not featured | Not in scope |
| Pricing model | Per-prompt tiers | Per-prompt tiers | Per-prompt tiers | Enterprise custom | Internal (API cost only) |

### Competitive Insights

1. **Every tool centers on prompts as the unit of tracking.** This is the universal model. We should adopt it.
2. **Daily refresh is standard.** Weekly is acceptable at low price tiers but daily is expected.
3. **Visibility percentage is the universal metric.** Every tool shows "X% of prompts mention your brand."
4. **Sentiment analysis is a differentiator, not table stakes.** Profound leads here; most tools focus on presence/absence first.
5. **Optimization recommendations separate premium tools from monitoring tools.** Profound charges $399+/mo for this. Peec explicitly lacks it and gets criticized for it.
6. **UI scraping vs API is a strategic divide.** Peec uses scraping for "real-world accuracy." Most others use APIs for reliability. APIs are the safer bet for an internal tool.
7. **The market is crowded at $99-500/mo.** Building internally makes sense since the core monitoring logic is straightforward; the value of commercial tools is in scale, polish, and platform breadth.

## Sources

- [Otterly.AI Features](https://otterly.ai/features) -- detailed feature page
- [Otterly.AI Pricing](https://otterly.ai/pricing) -- plan tiers and capabilities
- [Profound AI Review (Rankability)](https://www.rankability.com/blog/profound-ai-review/) -- comprehensive feature analysis
- [Peec AI](https://peec.ai/) -- platform overview and pricing
- [BrandRank.AI](https://www.brandrank.ai) -- platform capabilities
- [AI SEO Tracking Tools 2026 Comparative Analysis (Search Influence)](https://www.searchinfluence.com/blog/ai-seo-tracking-tools-2026-analysis-platforms/) -- 13+ platform comparison
- [Best AI Visibility Tools (SE Ranking)](https://visible.seranking.com/blog/best-ai-visibility-tools/) -- market overview
- [Best AI Search Monitoring Tools (Nightwatch)](https://nightwatch.io/blog/best-ai-search-monitoring-tools/) -- feature comparison
- [Otterly.AI Blog: 10 Best AI Search Monitoring Tools](https://otterly.ai/blog/10-best-ai-search-monitoring-and-llm-monitoring-solutions/) -- competitive landscape

---
*Feature research for: AI SEO / AEO Monitoring*
*Researched: 2026-03-20*
