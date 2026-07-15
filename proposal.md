# Final Project Proposal — Credit Card Rewards Maximiser (India Edition)

## What I'm building

A mobile-first web app that tells my dad which of his Indian credit cards to use for any purchase — factoring in the merchant-specific rewards, monthly caps, and category exclusions that make Indian cards genuinely hard to keep track of.

## Who it's for / why I chose this

My dad. He has multiple Indian credit cards and, like basically everyone I know there, defaults to the same card for everything. Indian cards are harder to optimise than US ones: rewards are tied to specific merchants instead of broad categories (there's a Swiggy card, an Amazon card, a Flipkart card, a Tata card), the accelerated rates come with monthly caps that silently stop paying once you cross them, whole categories like fuel, rent, and wallet loads are often excluded entirely, and banks devalue their reward structures multiple times a year. Nobody — including my dad — is tracking any of that while standing at a checkout.

I built a simple US-style card optimiser for Mini Project 2. This is a different product for a different market with fundamentally different mechanics (caps, exclusions, merchant-level rules, UPI-on-RuPay) — and this time I have a real user who will actually test it and tell me where it fails.

## Core features (3–5)

1. **My Wallet** — pick your cards from a built-in database of ~10–12 popular Indian cards (HDFC Millennia, SBI Cashback, Amazon Pay ICICI, Axis Ace, Flipkart Axis, Tata Neu Infinity, Swiggy HDFC, Amex MRCC, etc.). Saved with localStorage — no login, wallet is still there next visit. Points cards also display their transfer partners and ratios (e.g., points → airline miles), so you can see what the points are actually worth beyond plain cashback redemption.
2. **Best Card Finder** — pick where you're spending (Amazon, Flipkart, Swiggy/Zomato, groceries, fuel, utility bills, dining out, travel, UPI, everything else) plus a ₹ amount; the app ranks every card in the wallet and shows which one to use and the actual rupee value earned.
3. **Cap tracker** — log a purchase with one tap after you use a card; the app tracks monthly spend against each card's caps and reroutes you when an accelerated rate runs out ("Millennia's 5% cap is done this month — use SBI Cashback instead"). This is the feature a simple optimiser doesn't have.
4. **"Money left on the table" estimator** — enter rough monthly spend per category and see estimated annual rewards from current habits vs. always using the optimal card, in ₹.
5. **(Stretch — from peer feedback) EMI reality check** — every card my dad has pushes "convert to EMI" and "No Cost EMI" offers. This tool shows the true total cost of an EMI conversion — interest + processing fee + 18% GST + rewards you forfeit — versus paying in full, using the standard EMI formula. Same theme as the rest of the app: money quietly left on the table.

## What I don't know yet

- **There's no API for Indian card reward data.** The rules live in bank MITC PDFs and change constantly — banks have announced fresh caps and devaluations as recently as this month. I'll hard-code a JSON database with a "last verified" date per card and accept that it needs manual maintenance.
- **Point valuations and transfer partners.** Cashback is easy, but HDFC points are worth ₹0.30–₹1 depending on redemption, NeuCoins are ₹1, and transfer partners/ratios (points → airline miles or hotel points) shift often — one bank dropped a major hotel partner just this year. v1 will show partners and ratios as information, while the recommendation maths uses one disclosed, assumed ₹ value per programme.
- **EMI terms vary by bank.** Interest (~13–16% p.a.), processing fees, and what "No Cost" actually waives all differ by issuer — I need to decide whether the calculator uses editable inputs or per-bank presets.
- **How to model caps.** Statement cycle vs. calendar month, per-merchant vs. combined caps. I'll probably simplify to calendar month for v1 and say so clearly.
- **UPI-on-RuPay.** Only RuPay cards earn rewards on UPI payments, which is huge in India. Might just be a flag per card, but I haven't designed it yet.
- **localStorage for real state.** A structured wallet plus monthly counters that reset each month is more state than I've handled before.
- **User testing across the demo deadline.** Getting my dad to actually use it for a few days before Demo Day and tell me honestly where it's confusing.