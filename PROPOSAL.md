# Final Project Proposal — Listing Ready

**Course:** OIM3690, Babson College
**Author:** Shiv Motwani
**Live app:** <https://smotwani1.github.io/Final-Project/>
**Repository:** <https://github.com/smotwani1/Final-Project>

## What I'm building

**Listing Ready** is a mobile-friendly web app that helps a private-party car seller write a good listing fast. You type in your car's VIN, the app decodes the real factory specs from the free U.S. government NHTSA database, you add the handful of things only you know (mileage, price, condition), and it generates a clean, honest, copy-paste-ready listing description and title for Facebook Marketplace, Craigslist, or Autotrader.

## Who it's for / why I chose this

Anyone selling a used car themselves. When people sell privately they usually either (a) write a two-line listing that buyers don't trust ("2003 Honda, runs good, $8k"), or (b) stare at a blank box not knowing what details matter. Meanwhile the exact factory specs a buyer wants — trim, engine, drivetrain, transmission, body style — are all sitting inside the 17-character VIN, and there's a free government API that returns them. The gap is that nobody stitches "decode the VIN" and "write the listing" together. That's the whole product.

I picked this because it's a real, narrow problem with a genuinely free, no-auth data source, and the value is obvious in a 60-second demo: paste a VIN, get a listing.

## Core features (3–5)

1. **VIN decode** — enter a 17-character VIN; the app validates it (17 chars, no I/O/Q) and calls the NHTSA vPIC `DecodeVinValues` endpoint. No API key, no backend.
2. **Clear spec sheet** — the decoded year / make / model / trim / body style / engine / drivetrain / transmission / fuel are shown in a clean grid, with empty and "Not Applicable" fields hidden so it never looks broken.
3. **Manual details** — a form for the things the VIN can't know: mileage, asking price, condition, title status, colors, number of owners, location, notable features, honest condition notes, and contact info.
4. **Auto-generated listing** — the decoded specs and the manual fields are folded into a natural-language description plus a suggested title, with a one-click **Copy** button. Three tone options (Friendly / Concise / Detailed).
5. **Graceful failure** — invalid VINs, VINs NHTSA can't decode, check-digit warnings, and network errors all show a clear, specific message instead of a blank screen.

## Tech

Plain HTML, CSS, and vanilla JavaScript in a single `index.html`. No framework, no build step, no backend — it deploys as a static file to GitHub Pages. The only external dependency at runtime is the NHTSA API call, made client-side with `fetch`.

## What I don't know yet / risks

- **NHTSA data completeness varies by make and year.** Some VINs return a rich trim + engine; others return only make/model. The app is built to degrade gracefully (hide blanks), but I need to test across a spread of vehicles so the demo doesn't land on a sparse one.
- **Check digits.** Real VINs have a check digit in position 9; the API flags a mismatch with a non-zero `ErrorCode`. I decided to still show whatever data comes back but warn the user, rather than hard-reject — a judgment call I want to confirm is the right one.
- **Listing quality is subjective.** "Clean, copy-paste-ready" is a taste call. I'm using a sentence-assembly approach (not an LLM, to keep it free and offline-capable), so the phrasing is deterministic — I need a couple of people to read the output and tell me if it reads like a human wrote it.
- **No persistence yet.** Right now nothing is saved between sessions. A stretch goal is `localStorage` so a half-finished listing survives a refresh.

## Stretch goals (if time allows)

- Save-in-progress with `localStorage`.
- A "fair price" sanity hint based on year + mileage.
- Export to a formatted block for specific platforms.
