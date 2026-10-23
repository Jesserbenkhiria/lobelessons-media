"""Financial math + fact verification for Lobe Lessons specs.

Every number shown on screen must come from a formula here, never typed by hand.

Spec block (top level of a Short spec or a long-form story spec):

  "facts": {
    "assumptions": [
      {"id": "rate", "text": "7% yearly return (hypothetical)", "on_screen": true},
      {"id": "monthly", "text": "compounded monthly, deposits at month end", "on_screen": false}
    ],
    "values": {
      "invested": {"formula": "fv_monthly(300, 0.07, 5)", "display": "$21,478", "round": 0},
      "spent":    {"formula": "300 * 12 * 5",             "display": "$18,000"}
    }
  }

`check_facts(spec)` recomputes every formula, checks the display string against the result,
checks every money amount on screen is covered by a fact (or listed in facts.inputs), and checks
assumptions marked on_screen really appear in on-screen text (or in the description otherwise).
"""
import math, re

# ---------------------------------------------------------------- formulas

def fv_monthly(pmt, annual_rate, years, timing="end"):
    """Future value of a fixed monthly deposit, nominal annual rate compounded monthly."""
    n = round(years * 12); r = annual_rate / 12
    if r == 0:
        return pmt * n
    fv = pmt * ((1 + r) ** n - 1) / r
    return fv * (1 + r) if timing == "begin" else fv


def fv_lump(pv, annual_rate, years, per_year=12):
    """Future value of a single amount compounded `per_year` times a year."""
    return pv * (1 + annual_rate / per_year) ** (per_year * years)


def fv_annual_deposits(pmt, annual_rate, years, timing="end"):
    """Future value of a fixed yearly deposit compounded yearly."""
    fv = pmt * ((1 + annual_rate) ** years - 1) / annual_rate if annual_rate else pmt * years
    return fv * (1 + annual_rate) if timing == "begin" else fv


def monthly_schedule(pmt, annual_rate, months, timing="end"):
    """Balance after each month: [(month, contributed, balance)], for charts and timelines."""
    r = annual_rate / 12; bal = 0.0; out = []
    for m in range(1, months + 1):
        if timing == "begin": bal += pmt
        bal *= 1 + r
        if timing == "end": bal += pmt
        out.append((m, pmt * m, bal))
    return out


def loan_payment(principal, annual_rate, months):
    """Fixed monthly payment of an amortizing loan."""
    r = annual_rate / 12
    return principal / months if r == 0 else principal * r / (1 - (1 + r) ** -months)


def total_paid(payment, months):
    return payment * months


SAFE = {k: v for k, v in globals().items() if k in (
    "fv_monthly", "fv_lump", "fv_annual_deposits", "loan_payment", "total_paid", "monthly_schedule")}
SAFE.update({"round": round, "min": min, "max": max, "abs": abs, "math": math})


def evaluate(formula, values=None):
    """Evaluate a formula string; it may reference earlier facts by id (e.g. `invested - spent`)."""
    if re.search(r"__|import|lambda|open|exec|eval", formula):
        raise ValueError(f"formula not allowed: {formula}")
    return eval(formula, {"__builtins__": {}}, {**SAFE, **(values or {})})

# ---------------------------------------------------------------- display parsing

MONEY = re.compile(r"[−-]?\$\s?\d[\d,]*(?:\.\d+)?\s?[kKmM]?")


def parse_money(s):
    s = s.replace("−", "-").replace(" ", "")
    neg = s.startswith("-"); s = s.lstrip("-").lstrip("$")
    mult = {"k": 1e3, "m": 1e6}.get(s[-1].lower(), 1) if s[-1].isalpha() else 1
    v = float(s.rstrip("kKmM").replace(",", "")) * mult
    return -v if neg else v


def fmt_money(v, decimals=0):
    return ("−" if v < 0 else "") + "$" + f"{abs(v):,.{decimals}f}"

# ---------------------------------------------------------------- spec scanning

TAG = re.compile(r"<[^>]+>")


def on_screen_texts(spec):
    """All strings a viewer can read in a Short spec (elements, cover, counters) with where they come from."""
    out = []
    def walk(o, where):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in ("html", "text", "big", "sub", "tag", "title", "label", "l", "r") and isinstance(v, str):
                    out.append((TAG.sub(" ", v), f"{where}.{k}"))
                elif k == "steps" and isinstance(v, list):
                    pre = o.get("prefix", "$")
                    for i, st in enumerate(v):
                        if pre == "$" and isinstance(st.get("v"), (int, float)):
                            out.append((fmt_money(st["v"]), f"{where}.steps[{i}]"))
                        if st.get("label"): out.append((st["label"], f"{where}.steps[{i}].label"))
                else:
                    walk(v, f"{where}.{k}")
        elif isinstance(o, list):
            for i, v in enumerate(o): walk(v, f"{where}[{i}]")
    sh = spec.get("short") or spec.get("story") or {}
    walk(sh.get("scenes", []), "scenes")
    walk(sh.get("cover", {}), "cover")
    return out


def description_text(spec):
    c = spec.get("captions", {})
    return " ".join(str(c.get(k, "")) for k in ("short", "long", "youtube_title"))


def _norm(s):
    return re.sub(r"[^a-z0-9%$.]+", " ", s.lower().replace("−", "-")).strip()


def check_facts(spec):
    """Returns a list of check dicts: {id, status: pass|fail|skip, message, fix}."""
    F = spec.get("facts")
    texts = on_screen_texts(spec)
    shown = [(m.group(0), where) for t, where in texts for m in MONEY.finditer(t)]
    if not F:
        if shown:
            return [{"id": "finance.facts_block", "status": "skip",
                     "message": f"{len(shown)} money amounts on screen are not verified (no `facts` block), e.g. "
                                + ", ".join(sorted({s for s, _ in shown})[:5]),
                     "fix": "add a `facts` block (see pipeline/finance.py docstring) so every amount is recomputed"}]
        return [{"id": "finance.facts_block", "status": "skip", "message": "no money amounts on screen", "fix": ""}]
    res, vals = [], {}
    for fid, f in F.get("values", {}).items():
        try:
            v = evaluate(f["formula"], vals); vals[fid] = v
        except Exception as e:
            res.append({"id": f"finance.value.{fid}", "status": "fail",
                        "message": f"formula for '{fid}' does not evaluate: {f.get('formula')} ({e})",
                        "fix": "fix the formula; it may only use pipeline/finance.py functions and earlier fact ids"})
            continue
        d = f.get("display")
        if d is None: continue
        tol = f.get("tolerance", 0.5 * 10 ** -f.get("round", 0) + 1e-9)
        try:
            shown_v = parse_money(d) if "$" in d else float(re.sub(r"[^\d.\-]", "", d))
        except ValueError:
            res.append({"id": f"finance.value.{fid}", "status": "fail", "message": f"display '{d}' is not a number",
                        "fix": "display must be the formatted number, e.g. $21,478"}); continue
        if f.get("approx"):  # "about $17,000": allow the stated rounding granularity
            tol = max(tol, f["approx"])
        if abs(shown_v - v) > tol:
            res.append({"id": f"finance.value.{fid}", "status": "fail",
                        "message": f"'{fid}' shows {d} but {f['formula']} = {v:,.2f}",
                        "fix": f"change the display to {fmt_money(v, f.get('round', 0))} (or fix the formula)"})
        else:
            res.append({"id": f"finance.value.{fid}", "status": "pass",
                        "message": f"{d} matches {f['formula']} = {v:,.2f}", "fix": ""})
    allowed = [parse_money(f["display"]) for f in F.get("values", {}).values() if f.get("display", "").count("$")]
    allowed += [float(x) for x in F.get("inputs", [])]
    approx = {parse_money(f["display"]): f.get("approx", 0) for f in F.get("values", {}).values() if "$" in f.get("display", "")}
    for s, where in shown:
        v = parse_money(s)
        if not any(abs(v - a) <= max(0.5, approx.get(a, 0)) or abs(abs(v) - a) <= 0.5 for a in allowed):
            res.append({"id": "finance.unverified_amount", "status": "fail",
                        "message": f"{s} at {where} is not produced by any fact or listed input",
                        "fix": "add it to facts.values with a formula, or to facts.inputs if it is a given (e.g. a price)"})
    if F.get("values") and not F.get("assumptions"):
        res.append({"id": "finance.assumptions", "status": "fail", "message": "facts have no assumptions listed",
                    "fix": "list the rate, compounding, timing and 'hypothetical / not guaranteed' in facts.assumptions"})
    screen = _norm(" ".join(t for t, _ in texts)); desc = _norm(description_text(spec))
    for a in F.get("assumptions", []):
        txt = _norm(a["text"]); hay = screen if a.get("on_screen") else screen + " " + desc
        if txt not in hay:
            res.append({"id": f"finance.assumption.{a.get('id', txt[:20])}", "status": "fail",
                        "message": f"assumption '{a['text']}' is not visible {'on screen' if a.get('on_screen') else 'on screen or in the description'}",
                        "fix": "add it as on-screen fine print (`small` element) or to the description, word for word"})
        else:
            res.append({"id": f"finance.assumption.{a.get('id', txt[:20])}", "status": "pass",
                        "message": f"assumption shown: {a['text']}", "fix": ""})
    return res


if __name__ == "__main__":
    # python3 pipeline/finance.py SPEC.json  -> verifies the spec's facts; exit 1 on any failure
    import json, sys
    if len(sys.argv) != 2:
        sys.exit("usage: python3 pipeline/finance.py SPEC.json")
    spec = json.load(open(sys.argv[1]))
    facts_only = "facts" in spec and not ("short" in spec or "story" in spec)
    if facts_only:
        spec = {"facts": spec["facts"]}
    vals = {}
    for k, f in spec.get("facts", {}).get("values", {}).items():
        try:
            vals[k] = evaluate(f["formula"], vals); print(f"  {k:12s} = {vals[k]:>14,.2f}   shown {f.get('display', '-')}")
        except Exception as e:
            print(f"  {k:12s} ERROR {e}")
    res = check_facts(spec)
    if facts_only:  # no scenes yet: the math is checked now, assumption placement once the storyboard exists
        for c in res:
            if c["id"].startswith("finance.assumption.") and c["status"] == "fail":
                c["status"] = "skip"; c["message"] = "not placed yet (facts file only): " + c["message"].split("'")[1]
                c["fix"] = "the storyboard must show it; QA re-checks the full spec"
    for c in res:
        if c["status"] != "pass":
            print(f"{c['status'].upper():5s} {c['id']}: {c['message']}" + (f"\n      fix: {c['fix']}" if c["fix"] else ""))
    bad = [c for c in res if c["status"] == "fail"]
    print("FACTS", "FAIL" if bad else "OK", f"({sum(c['status'] == 'pass' for c in res)} verified)")
    sys.exit(1 if bad else 0)
