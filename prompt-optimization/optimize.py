"""GEPA optimization driver for the four quadrant system prompts.

For each requested quadrant:
  1. Configure DSPy with claude-sonnet-4-6 as student/judge/reflection LMs.
  2. Build a dspy.Predict program seeded with the hand-written quadrant prompt.
  3. Load train/val splits from data/prompts_by_quadrant.json.
  4. Compile with dspy.GEPA(metric=metric_with_feedback, ...).
  5. Save:
       - optimized/{role}.md            (the evolved instructions)
       - optimized/programs/{role}.json (dspy program.save())
       - traces/gepa-{quadrant}-{ts}.json (GEPA detailed_results)

Usage:
    python optimize.py --quadrant pro-a
    python optimize.py --all
    python optimize.py --all --auto medium --num-threads 8
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except ImportError:
    pass

import dspy
from dspy import GEPA

HERE = Path(__file__).resolve().parent

import data
import feedback_metric
from quadrant_program import QUADRANT_TO_ROLE, build_program


def _now_ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _save_artifacts(quadrant: str, optimized_program, optimizer: GEPA, ts: str) -> None:
    role = QUADRANT_TO_ROLE[quadrant]

    md_dir = HERE / "optimized"
    prog_dir = md_dir / "programs"
    trace_dir = HERE / "traces"
    md_dir.mkdir(parents=True, exist_ok=True)
    prog_dir.mkdir(parents=True, exist_ok=True)
    trace_dir.mkdir(parents=True, exist_ok=True)

    # The evolved system prompt = the optimized signature's instructions.
    instructions = optimized_program.signature.instructions
    md_path = md_dir / f"{role}.md"
    md_path.write_text(
        f"# Optimized system prompt — {role} ({quadrant})\n\n"
        f"_Generated {ts} by dspy.GEPA._\n\n"
        f"---\n\n{instructions}\n"
    )
    print(f"  wrote {md_path}")

    prog_path = prog_dir / f"{role}.json"
    optimized_program.save(str(prog_path))
    print(f"  wrote {prog_path}")

    detailed = getattr(optimizer, "detailed_results", None)
    if detailed is not None:
        trace_path = trace_dir / f"gepa-{quadrant}-{ts}.json"
        try:
            trace_path.write_text(json.dumps(detailed, indent=2, default=str))
            print(f"  wrote {trace_path}")
        except (TypeError, ValueError) as e:
            print(f"  could not serialize GEPA trace: {e}", file=sys.stderr)


def optimize_quadrant(
    quadrant: str,
    model: str,
    reflection_model: str,
    auto: str,
    num_threads: int,
    reflection_minibatch_size: int,
) -> None:
    print(f"\n=== Optimizing {quadrant} ({QUADRANT_TO_ROLE[quadrant]}) ===", flush=True)

    student_lm = dspy.LM(model=f"anthropic/{model}", max_tokens=1024)
    dspy.configure(lm=student_lm)

    judge_lm = dspy.LM(model=f"anthropic/{model}", max_tokens=1024)
    feedback_metric.set_judge_lm(judge_lm)

    reflection_lm = dspy.LM(
        model=f"anthropic/{reflection_model}",
        temperature=1.0,
        max_tokens=8000,
    )

    program = build_program(quadrant)
    trainset, valset = data.load_quadrant_data(quadrant)
    print(f"  trainset={len(trainset)}, valset={len(valset)}", flush=True)

    optimizer = GEPA(
        metric=feedback_metric.metric_with_feedback,
        auto=auto,
        num_threads=num_threads,
        track_stats=True,
        reflection_minibatch_size=reflection_minibatch_size,
        reflection_lm=reflection_lm,
    )

    started = time.time()
    optimized = optimizer.compile(program, trainset=trainset, valset=valset)
    elapsed = time.time() - started
    print(f"  GEPA finished in {elapsed:.1f}s", flush=True)

    ts = _now_ts()
    _save_artifacts(quadrant, optimized, optimizer, ts)


def main() -> int:
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--quadrant", choices=["pro-a", "pro-p", "per-a", "per-p"],
                   help="Optimize a single quadrant.")
    g.add_argument("--all", action="store_true", help="Optimize all four quadrants sequentially.")
    ap.add_argument("--model", default=os.environ.get("OPT_MODEL", "claude-sonnet-4-6"),
                    help="Student/judge model (default: claude-sonnet-4-6).")
    ap.add_argument("--reflection-model",
                    default=os.environ.get("OPT_REFLECTION_MODEL", "claude-sonnet-4-6"),
                    help="GEPA reflection model (default: claude-sonnet-4-6).")
    ap.add_argument("--auto", default="light", choices=["light", "medium", "heavy"],
                    help="GEPA auto budget (default: light).")
    ap.add_argument("--num-threads", type=int, default=8)
    ap.add_argument("--reflection-minibatch-size", type=int, default=3)
    args = ap.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY not set", file=sys.stderr)
        return 1

    quadrants = ["pro-a", "pro-p", "per-a", "per-p"] if args.all else [args.quadrant]
    for q in quadrants:
        optimize_quadrant(
            quadrant=q,
            model=args.model,
            reflection_model=args.reflection_model,
            auto=args.auto,
            num_threads=args.num_threads,
            reflection_minibatch_size=args.reflection_minibatch_size,
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
