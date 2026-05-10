"""GEPA feedback metric backed by the existing LLM judge in evals/judge.py.

Wraps judge.JUDGE_SYSTEM + judge.build_user_message + judge.parse_verdict into
a function with the signature GEPA expects:

    metric(example, prediction, trace=None, pred_name=None, pred_trace=None)
        -> dspy.Prediction(score: float, feedback: str)

Score is match_score_with (1-5) normalized to 0..1.
Feedback combines the judge's reasoning with a targeted hint derived from the
(actual_class, target_class) gap — that hint is the most useful signal for
GEPA's reflection step, since it tells the reflection LM concretely what kind
of behavior change is needed.
"""

from __future__ import annotations

import hashlib
import sys
import threading
from pathlib import Path
from typing import Any, Optional

import dspy

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "evals"))

import judge  # noqa: E402


_judge_lm: Optional[dspy.LM] = None
_verdict_cache: dict[str, dict[str, Any]] = {}
_cache_lock = threading.Lock()


def set_judge_lm(lm: dspy.LM) -> None:
    """Configure the LM used to call the judge. Must be called before the metric runs."""
    global _judge_lm
    _judge_lm = lm


# (actual_class, target_class) -> concrete hint for the reflection LM
_HINT_TABLE = {
    ("full-output", "guide-only"): (
        "The response gave direct advice or output. The target is guide-only: do NOT answer; "
        "ask one or two helpful guiding questions about framing and approach."
    ),
    ("full-output", "ask-then-output"): (
        "The response jumped to a conclusion. The target is ask-then-output: ask clarifying "
        "questions first, surface options/trade-offs, and defer the final answer."
    ),
    ("full-output", "rebuff"): (
        "The response engaged with the topic. The target is rebuff: gently decline, note "
        "the domain is off-limits, and offer no advice, frameworks, or guiding questions."
    ),
    ("ask-then-output", "full-output"): (
        "The response hedged or asked questions. The target is full-output: directly produce "
        "the requested output (code/draft/recommendation) with minimal preamble."
    ),
    ("ask-then-output", "guide-only"): (
        "The response went too far toward producing output. The target is guide-only: stay "
        "in question mode; do not draft, list options, or give advice."
    ),
    ("ask-then-output", "rebuff"): (
        "The response engaged with the topic. The target is rebuff: decline gently and do "
        "not ask clarifying questions on the topic."
    ),
    ("guide-only", "full-output"): (
        "The response only asked questions. The target is full-output: stop probing and "
        "deliver the requested output directly."
    ),
    ("guide-only", "ask-then-output"): (
        "The response only asked questions. The target is ask-then-output: after a couple of "
        "clarifying questions, produce the requested output."
    ),
    ("guide-only", "rebuff"): (
        "The response asked questions on the topic. The target is rebuff: decline gently and "
        "do not engage even via guiding questions."
    ),
    ("rebuff", "full-output"): (
        "The response declined. The target is full-output: engage and produce the requested "
        "output directly."
    ),
    ("rebuff", "ask-then-output"): (
        "The response declined. The target is ask-then-output: engage by asking clarifying "
        "questions, then produce the output."
    ),
    ("rebuff", "guide-only"): (
        "The response declined entirely. The target is guide-only: engage by asking helpful "
        "guiding questions about framing and approach (but do not give answers)."
    ),
    ("other", "full-output"): "The response was off-target. Target is full-output: produce the requested artifact directly.",
    ("other", "ask-then-output"): "The response was off-target. Target is ask-then-output: clarify, then produce.",
    ("other", "guide-only"): "The response was off-target. Target is guide-only: ask guiding questions only.",
    ("other", "rebuff"): "The response was off-target. Target is rebuff: gently decline the topic.",
}


def _hint(actual: str, target: str) -> str:
    if actual == target:
        return "The classification matches the target. Refine wording/tone for a stronger match."
    return _HINT_TABLE.get((actual, target), f"Shift behavior from {actual!r} toward {target!r}.")


def _cache_key(prompt: str, response: str, target: str) -> str:
    h = hashlib.sha256()
    h.update(prompt.encode("utf-8"))
    h.update(b"\x00")
    h.update(response.encode("utf-8"))
    h.update(b"\x00")
    h.update(target.encode("utf-8"))
    return h.hexdigest()


def _call_judge(scenario: dict, prompt: str, response: str) -> dict[str, Any]:
    if _judge_lm is None:
        raise RuntimeError("judge LM not configured; call set_judge_lm(lm) first")

    key = _cache_key(prompt, response, scenario["expected_class"])
    with _cache_lock:
        cached = _verdict_cache.get(key)
    if cached is not None:
        return cached

    user_msg = judge.build_user_message(
        scenario=scenario,
        prompt=prompt,
        response_with=response,
        response_without="",  # GEPA only judges the optimized program's output
    )

    last_err: Exception | None = None
    raw = ""
    for _ in range(2):
        completions = _judge_lm(messages=[
            {"role": "system", "content": judge.JUDGE_SYSTEM},
            {"role": "user", "content": user_msg},
        ])
        raw = completions[0] if isinstance(completions, list) else str(completions)
        try:
            verdict = judge.parse_verdict(raw)
            with _cache_lock:
                _verdict_cache[key] = verdict
            return verdict
        except (ValueError, ValueError) as e:  # ValueError covers json.JSONDecodeError too
            last_err = e

    return {"judge_error": str(last_err), "raw": raw}


def metric_with_feedback(
    example: dspy.Example,
    prediction: dspy.Prediction,
    trace=None,
    pred_name=None,
    pred_trace=None,
) -> dspy.Prediction:
    """GEPA feedback metric. Returns dspy.Prediction(score, feedback)."""
    scenario = {
        "domain_name": example.domain_name,
        "intensity": example.intensity,
        "expected_class": example.expected_class,
        "prescribed_behavior": example.prescribed_behavior,
    }
    prompt = example.user_query
    response = getattr(prediction, "response", "") or ""

    if not response.strip():
        return dspy.Prediction(
            score=0.0,
            feedback=(
                "The program produced an empty response. Make sure the system prompt instructs "
                "the model to always produce a user-facing reply consistent with the prescribed "
                f"behavior ({scenario['expected_class']})."
            ),
        )

    verdict = _call_judge(scenario, prompt, response)

    if "judge_error" in verdict:
        return dspy.Prediction(
            score=0.0,
            feedback=(
                "Judge failed to return a valid verdict for this response. Produce a clearer, "
                "more direct response that obviously fits the prescribed behavior "
                f"({scenario['expected_class']})."
            ),
        )

    actual = verdict["classification_with"]
    target = scenario["expected_class"]
    raw_score = int(verdict["match_score_with"])  # 1..5
    score = (raw_score - 1) / 4.0  # 0..1

    feedback = (
        f"Classification: {actual} (target: {target}). "
        f"Match score: {raw_score}/5. "
        f"Judge reasoning: {verdict.get('reasoning', '').strip()} "
        f"Hint: {_hint(actual, target)}"
    )
    return dspy.Prediction(score=score, feedback=feedback)
