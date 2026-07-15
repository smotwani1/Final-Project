# PRD — Credit Card Rewards Maximiser (India Edition)

**Author:** Shiv Motwani · **Course:** OIM3690 Final Project · **Date:** July 15, 2026 · **Status:** Draft v1
**Stack:** Vanilla HTML/CSS/JS, fully static, deployed on GitHub Pages. No frameworks, no backend, no external APIs.

---

## 1. Problem

Indian credit card rewards are structured to be unusable at the moment of decision. Rates are merchant-specific (a Swiggy card, an Amazon card, a Flipkart card), accelerated rates carry monthly caps that silently stop paying, entire categories (fuel, rent, wallet loads, often utilities and insurance) are excluded, and banks devalue programmes several times a year. The result: people with 3–5 cards default to one card for everything and lose thousands of rupees a year.

**Primary user:** my dad — a business owner in India with multiple cards who pays mostly by phone and will never read a bank's MITC PDF. **Secondary users:** family and friends in India with 2+ cards.

## 2. Goals

1. Answer "which card do I use right now?" in under 3 taps, with the actual ₹ value shown.
2. Track monthly caps so the recommendation stays correct through the month, not just on the 1st.
3. Show the user their annual "money left on the table" number.
4. Work well on a phone — that's where the decision happens.

**Success (for this project):** deployed URL works live on Demo Day; my dad uses it for real purchases during the build week and at least one card choice changes because of it.

## 3. Non-goals (v1)

- No accounts, logins, or server — all state lives in localStorage on the user's device.
- No bank linking, statement scraping, or transaction imports.
- No card application links, affiliate content, or "which card should I get" advice (except the stretch gap-suggestion).
- No US cards. No real-time offers (Diwali promos, merchant coupons).

## 4. Core user flows

1. **First visit:** open app → "Build your wallet" → tap cards you own from the database → wallet saved locally.
2. **Repeat visit (the main loop):** open app → tap spend context (e.g., Swiggy) → enter amount (₹800) → see ranked cards with ₹ earned → optionally tap "I used this card" to log it against caps.
3. **Cap hit:** a logged card crosses its monthly cap → next recommendation reroutes and explains why.
4. **Insights:** enter rough monthly spend per category once → see annual rewards (current habit vs. optimal) and the gap.

## 5. Functional requirements

### F1 — My Wallet
- Card picker rendered from `cards.json`-style data embedded in JS (static site, so data ships in a JS file).
- Wallet persists in localStorage; survives refresh and revisit; removable per card; "reset all" available.
- **Accept when:** add/remove works, wallet persists after closing the browser, empty-wallet state prompts setup.

### F2 — Best Card Finder
- Inputs: spend context (merchant/category chips: Amazon, Flipkart, Swiggy/Zomato, groceries, fuel, utility bills, dining out, travel, UPI, other) + ₹ amount.
- Output: ranked list of wallet cards. Each row: card name, effective rate, ₹ reward, one-line reason ("5% partner rate", "excluded — earns ₹0", "cap reached — base rate applies").
- Indian number formatting throughout (`toLocaleString('en-IN')` → ₹1,00,000 style).
- **Accept when:** for a known test wallet and 5 scripted purchases, rankings match hand-calculated answers, including one exclusion case and one cap case.

### F3 — Cap tracker
- "I used this card" logs {cardId, ruleId, amount, month} to localStorage and decrements that rule's remaining cap headroom.
- Reward math respects remaining headroom: reward = capped portion at accelerated rate + spillover at base rate.
- Counters reset on calendar-month change (documented simplification vs. statement cycles).
- Wallet screen shows a small cap meter per card (e.g., "₹640 / ₹1,000 5% cap used").
- **Accept when:** logging purchases visibly changes the next recommendation once a cap is crossed.

### F4 — "Money left on the table" estimator
- One-time inputs: approx. monthly spend per category + which single card the user currently defaults to.
- Output: annual rewards (default-card habit) vs. annual rewards (optimal card every time) vs. the ₹ gap, with a simple bar comparison.
- **Accept when:** the math is reproducible by hand from the card data and stated point values.

### F5 — Custom card builder (stretch — build only if F1–F4 are done and deployed)
- Form: name, reward type, base rate, up to 2 accelerated rules (merchants, rate, monthly cap), exclusions. Saved to localStorage alongside database cards.

## 6. Card database

Ships as a JS array. Every rate is **indicative and must be re-verified against the bank's current product page/MITC before Demo Day** — Indian issuers devalue frequently (multiple caps/devaluations announced in 2026 alone). Each card carries a `lastVerified` date shown in the UI.

### Schema
```js
{
  id: "hdfc-millennia",
  name: "HDFC Millennia",
  bank: "HDFC Bank",
  network: "visa",            // visa | mastercard | rupay | amex
  upiEligible: false,          // true only for RuPay cards
  rewardType: "cashback",     // cashback | points
  pointValueINR: 1.0,          // ₹ per point; 1.0 for cashback
  baseRatePct: 1.0,
  rules: [
    { id: "partner5", label: "5% partner brands",
      merchants: ["amazon","flipkart","myntra","swiggy","zomato","uber","bookmyshow"],
      categories: [], ratePct: 5.0, monthlyCapINR: 1000, capBasis: "reward" }
  ],
  exclusions: ["fuel","rent","wallet"],
  feeINR: 1000,
  lastVerified: "2026-07-16",
  notes: "Cashback as CashPoints; verify current partner list"
}
```

### Seed cards (~10, indicative — verify each)
| Card | Type | Headline structure (to verify) | Watch for |
|---|---|---|---|
| HDFC Millennia | Cashback | 5% on partner brands (Amazon, Flipkart, Swiggy, Zomato, Myntra…), 1% other | Monthly cap on 5% |
| SBI Cashback | Cashback | 5% online (merchant-agnostic), 1% offline | Monthly online-spend cap (recently reduced); utility/fuel/rent exclusions |
| Amazon Pay ICICI | Cashback | 5% Amazon (Prime), 3% non-Prime, 2% Amazon Pay partners, 1% other | Famously uncapped, LTF |
| Axis Ace | Cashback | ~2% flat post-devaluation (was 5% bills / 4% food delivery) | Verify current structure carefully |
| Flipkart Axis | Cashback | 5% Flipkart, 4% preferred partners, 1% other | Partner list shrank in devaluations |
| Tata Neu Infinity HDFC | Points (NeuCoins ≈ ₹1) | 5% on Tata Neu brands (BigBasket, Croma, 1mg…), 1.5% other | RuPay variant earns on UPI |
| Swiggy HDFC | Cashback | 10% Swiggy, 5% select online, 1% other | Per-bucket monthly caps |
| SBI SimplyCLICK | Points | 10x on partner sites, 5x other online | Point value ~₹0.25 |
| Amex MRCC | Points | ~1 pt/₹50 + monthly milestone bonuses | Acceptance gaps; milestone logic out of v1 scope |
| HDFC Infinia | Points (≈ ₹1) | ~3.3% base, up to 10x via SmartBuy | Premium/invite-only; SmartBuy caps |

## 7. Recommendation engine (core logic)

```
for each card in wallet:
  if purchase.category in card.exclusions:
      value = 0; reason = "excluded"
  else:
      rule = best match (merchant match > category match > none)
      rate = rule ? rule.ratePct : card.baseRatePct
      headroom = rule ? (rule.monthlyCapINR - usedThisMonth(card, rule)) : Infinity
      accelerated = min(amount, headroomAsSpend) * rate%
      spillover  = max(0, amount - headroomAsSpend) * card.baseRatePct%
      value = (accelerated + spillover) * card.pointValueINR
sort wallet by value desc; render with reasons
```

Special case: `purchase.category == "UPI"` → cards with `upiEligible: false` earn ₹0 with reason "Visa/MC cards don't earn on UPI".

## 8. Screens & UX

Three-tab, single-page app: **Best Card** (default) · **Wallet** · **Insights**.
- Mobile-first (~380px), large tap targets, chips instead of dropdowns where possible — the target user is a 50-something on a phone at a counter.
- The answer card is visually loud: card name + "₹40 back on this purchase" — everything else is secondary.
- All amounts in ₹ with en-IN grouping. Footer: "Rates last verified <date>. Rewards are estimates — banks change terms."

## 9. localStorage design

- `cmx.wallet` → `["hdfc-millennia", "sbi-cashback", {customCard…}]`
- `cmx.usage.2026-07` → `{ "hdfc-millennia:partner5": 640, … }` (₹ reward used per rule per month; stale months ignored)
- `cmx.spendProfile` → `{ amazon: 5000, swiggy: 3000, fuel: 4000, … , defaultCard: "sbi-cashback" }`
- Wrap access in try/catch; if localStorage is unavailable, run in-memory with a visible "won't be saved" notice.

## 10. Edge cases

Empty wallet → route to setup. Amount blank → rank by rate, show per-₹100 value. Everything excluded (e.g., fuel with no fuel card) → say "no card earns here; pick by other benefits." Tie values → stable order, note the tie. Month rollover mid-session → recompute headroom on each render.

## 11. Milestones (proposal → final submission)

| Date | Deliverable |
|---|---|
| Wed 7/15 | New public repo `card-maximiser-india`, GitHub Pages live with shell page, PROPOSAL.md + PRD.md committed, Canvas link submitted |
| Thu 7/16 | Card database drafted; rates verified against bank pages; wallet picker UI |
| Fri 7/17 | localStorage wallet persistence done; deploy checkpoint; log entry |
| Sat 7/18 | Recommendation engine + Best Card screen with ₹ math (F2 = demo-critical core) |
| Sun 7/19 | Cap tracker + purchase logging (F3) |
| Mon 7/20 | Estimator (F4); mobile polish; Dad test #1 — collect real feedback |
| Tue 7/21 | Fix feedback; README; feature freeze; rehearse 2-min demo |
| Wed 7/22 | **Demo Day** |
| Thu–Fri 7/23–24 | Weekly logs + AI-collaboration notes finalised; final commit; submission |

## 12. Demo plan (2 minutes)

1. Open live URL, build a 4-card wallet in ~20 seconds.
2. "₹800 Swiggy order — which card?" → app answers with ₹ math and reasons.
3. Log two purchases, cross a cap → same question now reroutes to a different card. (The moment that shows this isn't a lookup table.)
4. Insights tab: the annual "money left on the table" number.

## 13. Open questions

1. Statement-cycle caps vs. calendar month — confirming the calendar-month simplification is acceptable to state openly.
2. One assumed ₹ value per points programme — where to source defensible defaults.
3. How much UPI/RuPay logic v1 needs beyond the eligibility flag.
4. Whether milestone-based benefits (Amex) are worth modelling or explicitly out of scope.