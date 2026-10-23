---
name: financial-fact-checker
description: Verify every number, financial claim and assumption in a Lobe Lessons script or spec, compute figures with pipeline/finance.py, write the facts block, and block publication of anything wrong or misleading. Use whenever a script, spec, title, thumbnail or description contains a number or a money claim.
---

# Financial Fact Checker

You make sure nothing false or misleading reaches the screen. Every number must be **computed or sourced**, never remembered or typed.

Read first: `docs/channel.md` → "Non-negotiables", and the docstring of `pipeline/finance.py` (facts block format).

## Process
1. **List every claim** in the script, on-screen text, title, thumbnail and description. Classify each:
   - *Computed* (e.g. "$300/month for 5 years at 7% = $21,478") → formula.
   - *Given input* (a price, a monthly amount, a period) → `facts.inputs`.
   - *Factual claim* (history, statistics, quotes, book content: "Buffett made 99% of his wealth after 50") → needs sources.
2. **Computed values:** write each as a `facts.values` entry with a formula using `pipeline/finance.py` functions (`fv_monthly`, `fv_lump`, `fv_annual_deposits`, `loan_payment`, `total_paid`, `monthly_schedule`) or plain arithmetic on earlier fact ids. Set `display` to exactly what is shown and `round`; use `"approx": 500` when the script says "about $17,000".
3. **Make the model explicit:** rate (nominal annual), compounding frequency, deposit timing (end/begin of period), period length, and what is excluded (fees, taxes, inflation). The formula must match the words: "$5 per workday" is 250 days a year, not 365; "monthly" deposits need monthly compounding unless stated otherwise.
4. **Factual claims:** find at least two reputable sources (official data, the book itself, major publications) with WebSearch; record them in `facts.sources` as `{"claim", "url", "accessed"}`. If sources disagree or the claim is a popular myth, rewrite it or cut it.
5. **Assumptions on screen:** list them in `facts.assumptions`; `on_screen: true` for the rate, the "hypothetical / not guaranteed" label, and anything that would change the answer. The rest may live in the description.
6. **Run the checks:**
   - `python3 pipeline/finance.py SPEC_OR_FACTS.json` → must end with `FACTS OK`.
   - After render: `qa/video_qa.py ... --spec SPEC` repeats the checks against what is actually on screen.
7. **Verdict:** a table of every claim with status `verified` / `fixed` / `cut`, and the facts block.

## Wording rules
- Investment growth is always "hypothetical", with the rate, and "not guaranteed". Never "you will have".
- No advice to a specific person ("you should buy..."); illustrate choices instead.
- Use "about" when rounding to thousands, and round consistently (the QA allows the stated `approx`).
- Compare like with like: total spent vs value invested (both after the same period); say when one side includes growth.
- Do not hide costs: if one path has a cost the other avoids (home-brewed coffee, insurance), mention it or adjust the numbers.

## Common traps (check every time)
- Annual vs monthly compounding mixed up; deposits at start vs end of period.
- 365 days vs workdays; 4 weeks vs 4.33 weeks per month.
- Nominal vs real (after inflation) returns presented as the same thing.
- "Interest" on a loan computed as simple when it amortizes.
- Rounding a sum after rounding its parts (shown parts no longer add up).

## Example: "Same $300. Two Different Futures"
`stories/same300/facts.json`: $300/month for 5 years, hypothetical 7% nominal annual return, compounded monthly, end-of-month deposits.
```
spent     = 300 * 12 * 5                    -> $18,000
invested  = fv_monthly(300, 0.07, 5)        -> $21,478 (21,477.87)
growth    = invested - deposited            -> $3,478
year1     = fv_monthly(300, 0.07, 1)        -> $3,718
```
A hand-typed "$3,719" for year 1 was caught by the checker during setup: exactly the kind of error this skill exists for.

## Quality bar
- [ ] `finance.py` prints `FACTS OK`; no amount on screen is unverified.
- [ ] Every factual claim has two sources or was removed.
- [ ] The assumptions that change the answer are on screen in the reveal shot.
- [ ] Title and thumbnail numbers match the facts (rounded the same way).
