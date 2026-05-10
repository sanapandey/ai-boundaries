"""Load per-quadrant prompt data and build dspy.Example train/val splits.

Each example carries the user prompt as the only input field and attaches the
scenario metadata the feedback metric needs (expected_class, prescribed_behavior,
intensity, domain_name).

Quadrant → scenario metadata mapping:
  pro-a   coding-100        full-output       (from scenarios.py)
  pro-p   hiring-50         ask-then-output   (from scenarios.py)
  per-a   mental-health-25  guide-only        (from scenarios.py)
  per-p   mirror-synthetic  guide-only        (synthesized — Mirror role,
                                               reflective prompts. Not the
                                               0%-intensity rebuff case.)
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import dspy

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent
sys.path.insert(0, str(REPO_ROOT / "evals"))

from scenarios import SCENARIOS  # noqa: E402


# Synthetic per-p (Mirror) scenario metadata — the existing scenarios.py uses
# per-p only at 0% intensity (rebuff), but Mirror is the per-p reflective role
# at moderate intensity. We score Mirror responses as "guide-only" since that's
# the closest match in the judge's four-bucket classification rubric.
_MIRROR_SCENARIO = {
    "quadrant": "per-p",
    "domain_name": "Relationship Advice",
    "intensity": 50,
    "expected_class": "guide-only",
    "prescribed_behavior": (
        "Do not give a direct answer or recommendation. Respond with one or two short, "
        "warm reflective prompts that turn the question back toward the user's own "
        "insight (e.g. \"What does your intuition say?\", \"What's driving this for you?\"). "
        "Keep the response brief and non-prescriptive."
    ),
}


# Per-quadrant expected_class — used to disambiguate scenarios.py entries that
# share a quadrant code by coordinate convention. (relationship-0 sits at (0,0)
# so quadrant() returns 'pro-a', but its expected_class is 'rebuff', not 'full-output'.)
_EXPECTED_CLASS = {
    "pro-a": "full-output",
    "pro-p": "ask-then-output",
    "per-a": "guide-only",
    "per-p": "guide-only",
}


def _scenario_meta(quadrant: str) -> dict:
    if quadrant == "per-p":
        return _MIRROR_SCENARIO
    target_class = _EXPECTED_CLASS[quadrant]
    for s in SCENARIOS:
        if s["quadrant"] == quadrant and s["expected_class"] == target_class:
            return {
                "quadrant": quadrant,
                "domain_name": s["domain_name"],
                "intensity": s["intensity"],
                "expected_class": s["expected_class"],
                "prescribed_behavior": s["prescribed_behavior"],
            }
    raise ValueError(f"no scenario metadata for quadrant {quadrant!r}")


def _build_example(prompt: str, meta: dict) -> dspy.Example:
    return dspy.Example(
        user_query=prompt,
        domain_name=meta["domain_name"],
        intensity=meta["intensity"],
        expected_class=meta["expected_class"],
        prescribed_behavior=meta["prescribed_behavior"],
    ).with_inputs("user_query")


def load_quadrant_data(
    quadrant: str,
    train_size: int = 20,
    val_size: int = 10,
    data_path: Path | str | None = None,
) -> tuple[list[dspy.Example], list[dspy.Example]]:
    """Return (trainset, valset) of dspy.Example for the given quadrant code.

    Reads data/prompts_by_quadrant.json (run generate_prompts.py first).
    Splits deterministically: first train_size go to train, next val_size to val.
    If the file has fewer prompts than requested, splits proportionally.
    """
    if data_path is None:
        data_path = HERE / "data" / "prompts_by_quadrant.json"
    data_path = Path(data_path)
    if not data_path.exists():
        raise FileNotFoundError(
            f"{data_path} not found — run `python generate_prompts.py` first."
        )

    by_q = json.loads(data_path.read_text())
    if quadrant not in by_q:
        raise KeyError(f"quadrant {quadrant!r} not in {data_path}; got {list(by_q)}")

    prompts: list[str] = by_q[quadrant]
    if not prompts:
        raise ValueError(f"no prompts for quadrant {quadrant!r} in {data_path}")

    meta = _scenario_meta(quadrant)

    if len(prompts) < train_size + val_size:
        # Proportional fallback, but always keep at least one in each split.
        ratio = train_size / (train_size + val_size)
        train_n = max(1, min(len(prompts) - 1, int(len(prompts) * ratio)))
        val_n = len(prompts) - train_n
        train_prompts = prompts[:train_n]
        val_prompts = prompts[train_n:train_n + val_n]
    else:
        train_prompts = prompts[:train_size]
        val_prompts = prompts[train_size:train_size + val_size]

    trainset = [_build_example(p, meta) for p in train_prompts]
    valset = [_build_example(p, meta) for p in val_prompts]
    return trainset, valset


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--quadrant", default="pro-a", choices=["pro-a", "pro-p", "per-a", "per-p"])
    args = ap.parse_args()
    train, val = load_quadrant_data(args.quadrant)
    print(f"{args.quadrant}: train={len(train)}, val={len(val)}")
    if train:
        print("first train example:")
        ex = train[0]
        print(f"  user_query: {ex.user_query!r}")
        print(f"  expected_class: {ex.expected_class}")
        print(f"  prescribed_behavior: {ex.prescribed_behavior[:80]}...")
