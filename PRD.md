# Product Requirements Document — Listing Ready

**Course:** OIM3690, Babson College
**Author:** Shiv Motwani
**Live app:** <https://smotwani1.github.io/Final-Project/>
**Repository:** <https://github.com/smotwani1/Final-Project>

> **Background:** This PRD replaces my original concept (an Indian credit-card
> rewards optimizer), which I abandoned because its reward data is not available
> from any free, public, no-auth API. Listing Ready is built on two free U.S.
> government APIs, so it is fully client-side and deployable to GitHub Pages. The
> full pivot story is documented in my weekly log.

---

## 1. Overview

Listing Ready is a static, client-side web app that turns a car's 17-character
VIN into (a) a clean factory spec sheet, (b) a fuel-economy and annual-cost
estimate, (c) an optional side-by-side comparison with a second vehicle, and
(d) a copy-paste-ready listing description for private-party sale.

## 2. Problem statement

Private-party car sellers write weak listings. They either post two vague lines
buyers don't trust, or freeze at a blank text box unsure which details matter.
Yet the exact specs buyers want — trim, engine, drivetrain, transmission, body
style — are encoded in the VIN and retrievable for free. No consumer tool joins
"decode the VIN" to "write the listing." Listing Ready closes that gap, and adds
the buy-side question every seller-who-is-also-shopping asks: *how does the car
I'm considering compare, and what will it cost to run?*

## 3. Goals & non-goals

**Goals**
- Decode any U.S.-market VIN and present its specs clearly.
- Generate a natural, honest, copy-paste listing in seconds.
- Estimate combined MPG and annual fuel cost.
- Compare two vehicles side by side.
- Ship as a free, static, no-backend site on GitHub Pages.

**Non-goals (v1)**
- Vehicle valuation / pricing guidance.
- Recall & complaint history (noted as future work).
- User accounts, saved listings, or a server/database.
- Non-U.S. markets (VIN decoding and fuel data are U.S.-centric).

## 4. Target users

- **Primary:** an individual selling a used car privately (Facebook Marketplace,
  Craigslist, Autotrader) who wants a credible listing without effort.
- **Secondary:** a buyer comparing two candidate vehicles on specs and running cost.

## 5. User stories

1. As a seller, I enter my VIN and immediately see my car's decoded specs.
2. As a seller, I add mileage, price, and condition and get a polished description
   I can copy straight into a marketplace.
3. As a seller/buyer, I see estimated MPG and annual fuel cost, and I can change
   the price-per-gallon assumption.
4. As a buyer, I decode a second VIN and compare both cars side by side.
5. As any user on a phone, the app is readable and usable at mobile width.

## 6. Functional requirements

### 6.1 VIN decode
- Accept a 17-character VIN; validate length and character set (no I/O/Q); block
  decode until valid.
- Call NHTSA vPIC `DecodeVinValues/{VIN}?format=json`.
- Display year, make, model, trim, body style, engine, drivetrain, transmission,
  fuel, doors, and assembly plant. Hide empty / "Not Applicable" fields.
- On a non-zero NHTSA `ErrorCode` (e.g. bad check digit) show a warning but still
  render whatever data returned; on a hard failure or network error show a clear
  message, not a blank screen.

### 6.2 Cost of ownership
- Look up combined MPG via fueleconomy.gov (`/menu/options` → `/vehicle/{id}`, XML).
- Match the correct vehicle by engine (cylinders + displacement) and transmission;
  fall back to fuzzy model matching when NHTSA and EPA names differ
  (e.g. `F-150` → `F150 Pickup 4WD`).
- Estimate annual fuel cost at 12,000 mi/yr with a user-editable price-per-gallon
  (default $3.50). Handle electric vehicles (MPGe + EPA cost estimate).
- When no EPA match exists, show "not available for this exact trim" — never error.

### 6.3 Manual details
- Optional inputs: mileage, asking price, condition, title status, exterior/interior
  color, owners, location, features, condition notes, contact.

### 6.4 Listing generation
- Assemble a description and a suggested title from decoded specs + manual details,
  updating live on every edit. Three tones: Friendly, Concise, Detailed.
- One-click copy of title + description to the clipboard.

### 6.5 VIN-to-VIN comparison
- Accept a second VIN; reuse the same decode + fuel-lookup logic (no duplication).
- Render a side-by-side table: year, make, model, trim, engine, drivetrain, body
  class, fuel type, combined economy, estimated annual fuel cost — highlighting the
  more efficient / cheaper-to-run vehicle.

## 7. Data sources

| Source | Endpoint | Auth | Format |
| --- | --- | --- | --- |
| NHTSA vPIC | `decodevinvalues/{VIN}` | none | JSON |
| fueleconomy.gov | `/vehicle/menu/options`, `/vehicle/{id}` | none | XML |

## 8. Technical requirements

- Plain HTML, CSS, and vanilla JavaScript in **separate files**
  (`index.html`, `style.css`, `script.js`) — no framework, no build step.
- All API calls are client-side `GET` requests via `fetch`; XML parsed with
  `DOMParser`. Listing text is built by deterministic string assembly (no LLM),
  so it is free and reproducible.
- Deployable to GitHub Pages as static files.
- Responsive down to ~360px; visible keyboard focus states; AA contrast.

## 9. Success metrics

- A first-time user produces a copy-ready listing in under 60 seconds.
- Every sample VIN decodes cleanly and returns fuel data (or a graceful "n/a").
- No blank/error dead-ends across invalid, undecodable, and offline cases.

## 10. Risks & mitigations

- **API data gaps** (sparse trims, name mismatches) → hide blanks, fuzzy-match,
  graceful "not available."
- **Listing reads robotic** → sentence variety + three tones; manual review before posting.
- **API downtime** → clear error state; the rest of the UI stays usable.

## 11. Future work

- NHTSA recalls API in the comparison view.
- `localStorage` to persist an in-progress listing.
- Platform-specific export formatting; a rough fair-price sanity hint.
