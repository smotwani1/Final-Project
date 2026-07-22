# Listing Ready 🚗

Turn a VIN into a polished, copy-paste-ready car listing.

Listing Ready is a single-page web app for private-party car sellers. Enter your
vehicle's 17-character VIN and it decodes the factory specs from the free U.S.
government **NHTSA vPIC** database, then folds those specs together with the
details only you know (mileage, price, condition) into a clean listing
description and title — ready to paste into Facebook Marketplace, Craigslist, or
Autotrader.

Built as a final project for **OIM3690** at Babson College.

---

## ✨ Features

- **VIN decode, no API key** — calls the free [NHTSA vPIC](https://vpic.nhtsa.dot.gov/)
  `DecodeVinValues` endpoint directly from the browser.
- **Clean spec sheet** — year, make, model, trim, body style, engine, drivetrain,
  transmission, fuel, and where it was built. Empty and "Not Applicable" fields
  are hidden automatically.
- **Cost of ownership** — pulls combined MPG and estimated annual fuel cost from
  the free [fueleconomy.gov](https://www.fueleconomy.gov/) API (12,000 mi/yr, with
  an editable price-per-gallon). Handles electric vehicles (MPGe + EPA estimate)
  and shows "not available" when a trim isn't in the EPA database instead of erroring.
- **VIN-to-VIN comparison** — decode a second VIN (the car you're considering
  buying) and line the two up side by side: year, make, model, trim, engine,
  drivetrain, body class, fuel type, combined economy, and annual fuel cost, with
  the more efficient / cheaper-to-run vehicle highlighted.
- **Manual details form** — mileage, asking price, condition, title status,
  colors, owners, location, notable features, honest condition notes, and contact.
- **Auto-generated listing** — a natural-language description plus a suggested
  title, updated live as you type. Three tones: Friendly, Concise, Detailed.
- **One-click copy** — copies the title and description to your clipboard.
- **Graceful errors** — invalid VINs, undecodable VINs, check-digit warnings, and
  network failures all show a clear message instead of a blank screen.
- **100% client-side** — no backend, no account, no tracking. Nothing you type
  leaves your browser except the VIN sent to NHTSA and the year/make/model sent to
  fueleconomy.gov.

## 🎨 Design

Listing Ready is styled after an **automotive window sticker (Monroney label)** —
the dense, structured spec sheet on every new car. Graphite background with a
single safety-yellow accent, condensed industrial headers (Oswald) paired with a
monospace data readout (IBM Plex Mono), hairline-ruled rows, and a live **Code 39
VIN barcode plate** rendered in pure SVG beneath the VIN input.

## 🚀 Try it

**Live:** <https://smotwani1.github.io/Final-Project/>

**Locally:** the app is a single static file. Either open `index.html` directly,
or serve the folder (recommended, so the API call runs from an `http://` origin):

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. Click **Try a sample VIN** to see it work
instantly, or paste your own.

### Sample VINs to try

| VIN | Vehicle |
| --- | --- |
| `1HGCM82633A004352` | 2003 Honda Accord EX-V6 (sedan) |
| `1FTFW1ET9DFC10312` | 2013 Ford F-150 (truck) |
| `5YJ3E1EA5KF328931` | 2019 Tesla Model 3 (EV) |
| `1C4RJFAG0FC625797` | 2015 Jeep Grand Cherokee (SUV) |
| `2T1BURHE8JC123456` | 2018 Toyota Corolla (compact) |

## 🧱 How it works

```
VIN input ──▶ validate (17 chars, no I/O/Q)
          ──▶ fetch NHTSA vPIC DecodeVinValues ──▶ render spec grid ─┐
          │                                                          ├─▶ assemble listing ──▶ Copy
          └──▶ fetch fueleconomy.gov (MPG + cost) ──▶ fuel label ────┘   (live, on every edit)

second VIN ──▶ same decode + fuel path ──▶ side-by-side comparison table
```

The listing is built by **deterministic sentence assembly** — not an LLM — so it
works offline after the decode, costs nothing, and produces stable, predictable
output. The NHTSA decode function is reused for both VINs. Fuel economy uses the
fueleconomy.gov menu endpoint to find matching vehicle IDs (with a fuzzy fallback
for model-name mismatches like `F-150` → `F150 Pickup 4WD`), then the detail
endpoint for combined MPG and CO₂; all responses are XML, parsed with `DOMParser`.
All calls are `GET`-only.

## 🗂 Project structure

```
index.html      — markup / page structure
style.css       — all styling (window-sticker theme)
script.js       — all app logic (VIN decode, fuel, comparison, listing)
README.md       — this file
PROPOSAL.md     — project proposal
PRD.md          — product requirements document
```

## 🛠 Tech

Plain HTML, CSS, and vanilla JavaScript in three separate files — no framework, no
dependencies, no build tooling. Deploys to GitHub Pages as-is.

## 🌐 Deploying to GitHub Pages

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch.**
3. Select the `main` branch and `/ (root)` folder, then **Save**.
4. Your app goes live at `https://<username>.github.io/<repo>/` in a minute or two.

## 📊 Data sources & credits

- **NHTSA vPIC API** (<https://vpic.nhtsa.dot.gov/api/>) — free, public,
  no-auth VIN decoding from the U.S. National Highway Traffic Safety Administration.
- **fueleconomy.gov API** (<https://www.fueleconomy.gov/feg/ws/>) — free, public,
  no-auth fuel-economy data from the U.S. EPA / DOE.

## ⚠️ Notes & limitations

- NHTSA data completeness varies by make and model year; some VINs return only
  basic fields. The app hides whatever is missing.
- A non-zero NHTSA `ErrorCode` (e.g. a check-digit mismatch on a mistyped VIN)
  shows a warning but still displays any data that came back.
- Fuel economy is matched by year/make/model + engine; older or rare trims aren't
  always in the EPA database, in which case the app shows "not available" rather
  than a wrong number. Annual fuel cost assumes 12,000 mi/yr; EVs use the EPA's
  own annual-cost estimate.
- **Recall & complaint history is not included** in this version. (NHTSA offers a
  separate recalls API; wiring it into the comparison is a future enhancement.)
- The generated listing is a helpful draft — always review it before posting.
