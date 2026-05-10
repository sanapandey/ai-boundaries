"""One-time synthesis of user prompts per quadrant.

For each of the four quadrants, generate ~25 natural-sounding user prompts
spanning the quadrant's typical domains. These prompts must NOT mention the
boundary system itself — they should read like real user requests so that
the GEPA optimizer learns to shift behavior via the system prompt alone.

Writes data/prompts_by_quadrant.json keyed by quadrant code.

Usage:
    python generate_prompts.py
    python generate_prompts.py --per-quadrant 30 --model claude-sonnet-4-6
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except ImportError:
    pass

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent
sys.path.insert(0, str(REPO_ROOT / "evals"))

from scenarios import SCENARIOS  # noqa: E402


# Per-quadrant context: representative domains + the role's behavior in one line.
QUADRANT_CONTEXT = {
    "pro-a": {
        "role": "Co-pilot",
        "behavior": (
            "User wants AI to take action and produce concrete output (code, drafts, "
            "recommendations) on professional/work tasks."
        ),
        "domains": ["Coding", "Email Drafting", "Career Planning", "Experimental Design",
                    "Financial Planning"],
    },
    "pro-p": {
        "role": "Researcher",
        "behavior": (
            "User wants AI to surface information, options, and trade-offs on professional "
            "decisions without pushing a final conclusion."
        ),
        "domains": ["Hiring", "Career Planning", "Financial Planning", "Experimental Design",
                    "Legal Matters"],
    },
    "per-a": {
        "role": "Coach",
        "behavior": (
            "User raises personal topics where they want guiding questions about framing, "
            "not direct advice or content."
        ),
        "domains": ["Mental Health", "Personal Development", "Health & Wellness",
                    "Communication Skills", "Ethics"],
    },
    "per-p": {
        "role": "Mirror",
        "behavior": (
            "User raises personal topics where AI should respond with reflective prompts "
            "(short, warm, non-prescriptive) rather than direct answers — turning the "
            "question back toward the user's own insight."
        ),
        "domains": ["Relationship Advice", "Dating Advice", "Family Relationships",
                    "Spirituality", "Parenting"],
    },
}


# Map quadrant code → the expected_class its scenarios should have. Used to
# filter out scenarios.py entries that are tagged with a quadrant code only by
# coordinate convention (e.g. relationship-0 sits at the origin so quadrant()
# returns 'pro-a' but its prescribed behavior is 'rebuff', not Co-pilot).
_EXEMPLAR_CLASS = {
    "pro-a": "full-output",
    "pro-p": "ask-then-output",
    "per-a": "guide-only",
    "per-p": "guide-only",
}


def _exemplar_prompts(quadrant: str) -> list[str]:
    target_class = _EXEMPLAR_CLASS[quadrant]
    return [
        p
        for s in SCENARIOS
        if s["quadrant"] == quadrant and s["expected_class"] == target_class
        for p in s["prompts"]
    ]


def _build_generation_prompt(quadrant: str, n: int) -> str:
    ctx = QUADRANT_CONTEXT[quadrant]
    exemplars = _exemplar_prompts(quadrant)
    exemplar_block = "\n".join(f"- {p}" for p in exemplars) if exemplars else "(none)"
    domain_block = ", ".join(ctx["domains"])

    return (
        f"Generate {n} natural-sounding user prompts that a real person might send to an AI assistant.\n\n"
        f"## Context\n"
        f"These prompts will be used to test how an AI assistant behaves in the **{ctx['role']}** "
        f"behavior mode. Behavior context: {ctx['behavior']}\n\n"
        f"## Domains to draw from\n{domain_block}\n\n"
        f"## Examples of the kind of prompt I want\n{exemplar_block}\n\n"
        f"## Requirements\n"
        f"- {n} prompts, diverse across the domains above.\n"
        f"- Each prompt should sound like a real user request — first person, casual, specific.\n"
        f"- Prompts must NOT mention boundaries, modes, AI involvement settings, or any meta-framework.\n"
        f"- Length: usually one or two sentences. Some can be longer if natural.\n"
        f"- No numbering, no preamble. Output exactly one prompt per line.\n"
        f"- Do not wrap prompts in quotes or markdown.\n"
    )


_LINE_NUMBER_RE = re.compile(r"^\s*(?:\d+[.\)]|[-*•])\s*")


def _parse_prompt_list(raw: str) -> list[str]:
    out: list[str] = []
    for line in raw.splitlines():
        s = line.strip()
        if not s:
            continue
        s = _LINE_NUMBER_RE.sub("", s)
        s = s.strip().strip('"').strip("'").strip()
        if not s:
            continue
        if len(s) < 8:  # skip stray fragments
            continue
        out.append(s)
    return out


def generate_for_quadrant(client, model: str, quadrant: str, n: int) -> list[str]:
    prompt = _build_generation_prompt(quadrant, n)
    msg = client.messages.create(
        model=model,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = "".join(b.text for b in msg.content if b.type == "text")
    prompts = _parse_prompt_list(raw)

    # Always include the curated exemplars at the front so they're guaranteed in the trainset.
    exemplars = _exemplar_prompts(quadrant)
    seen: set[str] = set()
    merged: list[str] = []
    for p in exemplars + prompts:
        key = p.lower().strip()
        if key in seen:
            continue
        seen.add(key)
        merged.append(p)
    return merged


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-quadrant", type=int, default=25,
                    help="Number of prompts to synthesize per quadrant (in addition to 5 curated).")
    ap.add_argument("--model", default=os.environ.get("PROMPT_GEN_MODEL", "claude-sonnet-4-6"))
    ap.add_argument("--out", default=str(HERE / "data" / "prompts_by_quadrant.json"))
    args = ap.parse_args()

    try:
        from anthropic import Anthropic  # type: ignore
    except ImportError:
        print("anthropic SDK not installed; run: pip install -r requirements.txt", file=sys.stderr)
        return 1
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY not set", file=sys.stderr)
        return 1

    client = Anthropic()
    result: dict[str, list[str]] = {}
    for q in ["pro-a", "pro-p", "per-a", "per-p"]:
        print(f"[generate] {q} ({QUADRANT_CONTEXT[q]['role']}) ...", flush=True)
        prompts = generate_for_quadrant(client, args.model, q, args.per_quadrant)
        print(f"  got {len(prompts)} prompts", flush=True)
        result[q] = prompts

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, indent=2))
    print(f"\nwrote {out_path}")
    for q, prompts in result.items():
        print(f"  {q}: {len(prompts)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
