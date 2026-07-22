# Weekly Log — Listing Ready

OIM3690 Final Project · Shiv Motwani

Each entry records what I did, decisions I made, and — per the assignment — how I
used AI tools and where I had to steer or override them.

---

## Week of July 21–24, 2026 — build week

### What I did
- Pivoted my final project to **Listing Ready**, a VIN-to-listing car-selling
  assistant, after deciding the earlier concept (an Indian credit-card rewards app)
  had no free, reliable data source. Listing Ready is built on the NHTSA vPIC API,
  which is genuinely free and needs no key — that de-risks the whole project.
- Confirmed the API shape by hitting `DecodeVinValues` with a real Honda VIN and
  reading the actual JSON fields (`ModelYear`, `Make`, `Model`, `Trim`,
  `DisplacementL`, `EngineCylinders`, `DriveType`, `BodyClass`, `ErrorCode`, …).
- Built the first version in a single `index.html`: VIN input with live validation,
  the fetch + decode flow, a spec grid, a manual-details form, and the
  live-updating listing generator with a Copy button and three tones.
- Tested end-to-end in the browser against the live API — clean decode (Honda),
  a check-digit warning path, and a hard-fail path (unregistered manufacturer).
- Deployed to GitHub Pages and wrote the README, this log, and the proposal.

### Decisions
- **Sentence assembly instead of an LLM** for generating the listing. It keeps the
  app free, fully client-side, and deterministic (the same inputs always produce
  the same listing), which matters for a demo and for GitHub Pages.
- **Warn, don't reject, on check-digit mismatches.** NHTSA still returns useful
  data when position-9 doesn't validate, so I show it with a warning rather than
  blocking the user — sellers mistype one character all the time.
- **Hide empty / "Not Applicable" fields** so a sparse decode still looks clean.

### How I used AI (and where I steered it)
- I used **Claude (Claude Code)** as a pair programmer to scaffold the single-file
  app and the docs.
- **Where I had to correct it:** its first set of sample VINs were made up, and
  four of the five failed NHTSA's check-digit test (`ErrorCode 1`) or decoded to a
  make with no model — which would look broken in a demo. I had it verify every
  sample against the live API and compute valid check digits, so all five now
  decode cleanly (`ErrorCode 0`) and cover a sedan, truck, EV, SUV, and compact.
- **A judgment call it raised and I made:** the folder already had an unrelated
  `index.html`; I decided to replace it and reuse the filename so GitHub Pages
  serves the app at the site root.
- **What I verified myself rather than trusting:** I read the real API response
  and manually checked the generated listing text for all three tones and for the
  error/warning states, instead of assuming the generator "just worked."

### Build session 2 — three additions (same week)
- **VIN-to-VIN comparison:** added a second VIN entry point that reuses the
  existing decode function (no duplication) and renders a side-by-side spec table.
  Recall/complaint data isn't wired up, so I left it out and labeled that clearly
  rather than faking it.
- **Cost of ownership:** integrated the fueleconomy.gov API (combined MPG + annual
  fuel cost, editable $/gal). Their data is XML, so I parse it with `DOMParser`.
- **Visual redesign:** committed to an automotive window-sticker (Monroney)
  identity — graphite + one safety-yellow accent, Oswald + IBM Plex Mono, hairline
  rules, and a live Code 39 VIN barcode as the signature element.

### How I used AI (session 2, and where I steered it)
- **I made it prove the APIs before designing.** Before writing any UI, I had it
  verify fueleconomy.gov actually allows browser calls (CORS) and confirm the XML
  fields — good thing, because it exposed the real problem below.
- **The mismatch it caught and I had it solve:** NHTSA calls the truck `F-150` but
  fueleconomy.gov calls it `F150 Pickup 4WD`, so a naïve lookup returns nothing.
  I had it build a fuzzy fallback (normalize the name, prefix-match the model list,
  then disambiguate by drivetrain). Verified it now matches the Ford, Jeep, etc.
- **I required design sign-off first.** For the redesign I made it state exact hex
  values, fonts, and the single signature element and wait for my approval before
  writing code — so the direction was my call, not a default.
- **Bugs I caught in review:** a CSS specificity clash made the price-per-gallon
  box stretch full-width, and the EV listing read "a Electric engine" — both fixed
  after I checked the rendered output rather than trusting it looked right.

### Still to do before final submission (Fri 7/24)
- [x] Deploy to GitHub Pages — live at https://smotwani1.github.io/Final-Project/
- [ ] Paste the live URL into the README and proposal.
- [ ] Get 1–2 people to read a generated listing and confirm it sounds human.
- [ ] Stretch: `localStorage` so an in-progress listing survives a refresh.
- [ ] Consider wiring in the NHTSA recalls API for the comparison view.
- [ ] Final pass on mobile layout.
