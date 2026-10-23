"""Unit tests for pipeline/finance.py. Run: python3 tests/test_finance.py"""
import copy, json, os, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(R, "pipeline"))
import finance as F

fails = []
def check(name, cond, info=""):
    print(("PASS " if cond else "FAIL ") + name + (f"  ({info})" if info and not cond else ""))
    if not cond: fails.append(name)

# formulas against independent calculations
check("fv_monthly matches the month-by-month simulation",
      abs(F.fv_monthly(300, .07, 5) - F.monthly_schedule(300, .07, 60)[-1][2]) < 1e-6)
check("fv_monthly textbook value ($100/mo, 10%, 10 yrs = 20,484.50)", abs(F.fv_monthly(100, .10, 10) - 20484.50) < 0.01)
check("fv_monthly begin-of-month is one period of growth more",
      abs(F.fv_monthly(300, .07, 5, "begin") - F.fv_monthly(300, .07, 5) * (1 + .07 / 12)) < 1e-6)
check("zero rate is plain sum", F.fv_monthly(300, 0, 5) == 18000)
check("loan payment ($20k, 6%, 60 mo = 386.66)", abs(F.loan_payment(20000, .06, 60) - 386.66) < 0.01)
check("annual deposits ($1,250/yr, 7%, 10 yrs = 17,270.56)", abs(F.fv_annual_deposits(1250, .07, 10) - 17270.56) < 0.01)
check("parse_money handles −$12,500 and $17k", F.parse_money("−$12,500") == -12500 and F.parse_money("$17k") == 17000)

# the proof-of-concept facts
poc = json.load(open(os.path.join(R, "stories/same300/facts.json")))
spec = {"facts": poc["facts"], "story": {"scenes": [{"els": [
    {"type": "small", "text": "Hypothetical 7%/yr · compounded monthly · not guaranteed"},
    {"type": "split", "left": {"title": "SPENDS $300", "steps": [{"v": 18000}]}, "right": {"title": "INVESTS $300", "steps": [{"v": 21478}]}},
    {"type": "headline", "html": "+$3,478 of growth"}]}]},
    "captions": {"long": "Hypothetical 7% nominal annual return. Compounded monthly, deposits at the end of each month. Not guaranteed. Not financial advice. No fees, taxes or inflation included."}}
r = F.check_facts(spec)
bad = [x for x in r if x["status"] == "fail"]
check("Same $300 facts all verify", not bad, json.dumps(bad, indent=1))
vals = {}
for k, v in poc["facts"]["values"].items(): vals[k] = F.evaluate(v["formula"], vals)
print(f"     Same $300 figures: spent {F.fmt_money(vals['spent'])}, invested {F.fmt_money(vals['invested'])}, "
      f"growth {F.fmt_money(vals['growth'])}, after 1 year {F.fmt_money(vals['year1'])}")

# deliberate mistakes must fail with a fix
s2 = copy.deepcopy(spec); s2["facts"]["values"]["invested"]["display"] = "$21,600"
r = [x for x in F.check_facts(s2) if x["id"] == "finance.value.invested"][0]
check("wrong display is caught", r["status"] == "fail" and "$21,478" in r["fix"], r)
s3 = copy.deepcopy(spec); s3["story"]["scenes"][0]["els"].append({"type": "headline", "html": "That's $25,000!"})
check("hand-typed amount on screen is caught",
      any(x["id"] == "finance.unverified_amount" and "$25,000" in x["message"] for x in F.check_facts(s3)))
s4 = copy.deepcopy(spec); s4["story"]["scenes"][0]["els"][0]["text"] = "Hypothetical 7%/yr · compounded monthly"
check("missing on-screen assumption is caught",
      any(x["id"] == "finance.assumption.guarantee" and x["status"] == "fail" for x in F.check_facts(s4)))
s5 = copy.deepcopy(spec); del s5["facts"]["assumptions"]
check("facts without assumptions fail", any(x["id"] == "finance.assumptions" for x in F.check_facts(s5)))
check("formulas cannot run code", any(x["status"] == "fail" for x in F.check_facts(
    {"facts": {"assumptions": [{"text": "x"}], "values": {"x": {"formula": "__import__('os')"}}}})))

s6 = copy.deepcopy(spec); s6["captions"]["long"] = "No fees, taxes or inflation included."
check("short label on screen but full wording missing from description is caught",
      any(x["id"] == "finance.assumption.rate" and x["status"] == "fail" and "description" in x["message"] for x in F.check_facts(s6)))
s7 = copy.deepcopy(spec); s7["story"]["scenes"][0]["els"].append({"type": "counter", "fact": "invested_typo"})
check("reference to an undefined fact is caught", any(x["id"] == "finance.reference" and x["status"] == "fail" for x in F.check_facts(s7)))
c = F.compute(poc["facts"])
check("series end equals the fact (chart and counter agree)", abs(c["series"]["invested_curve"][-1] - c["values"]["invested"]) < 1e-6)

# existing Shorts without a facts block: reported as unverified (skip), never break the daily build
for n in ("pilot_game", "pilot_futures", "test_raise"):
    r = F.check_facts(json.load(open(os.path.join(R, f"days/{n}.json"))))
    check(f"{n}: no facts block -> skip with a fix", r[0]["status"] == "skip" and r[0]["fix"], r)

print("FINANCE TESTS", "FAILED: " + ", ".join(fails) if fails else "PASSED")
sys.exit(1 if fails else 0)
