"""DSPy signatures + programs for the four AI-boundary quadrants.

Each signature's docstring is the SEED system prompt that GEPA will evolve.
Seeds are lifted from evals/memory_md.py::quadrant_instructions() so the
optimizer starts from the current hand-written baseline.

The mapping:
    pro-a  →  Co-pilot     (Professional · Planning)
    pro-p  →  Researcher   (Professional · Polishing)
    per-a  →  Coach        (Personal · Planning)
    per-p  →  Mirror       (Personal · Polishing)
"""

from __future__ import annotations

import sys
from pathlib import Path

import dspy

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "evals"))

from memory_md import quadrant_instructions  # noqa: E402


class CoPilotResponse(dspy.Signature):
    __doc__ = quadrant_instructions("pro-a")
    user_query = dspy.InputField(desc="The user's request.")
    response = dspy.OutputField(desc="The assistant's user-facing reply.")


class ResearcherResponse(dspy.Signature):
    __doc__ = quadrant_instructions("pro-p")
    user_query = dspy.InputField(desc="The user's request.")
    response = dspy.OutputField(desc="The assistant's user-facing reply.")


class CoachResponse(dspy.Signature):
    __doc__ = quadrant_instructions("per-a")
    user_query = dspy.InputField(desc="The user's request.")
    response = dspy.OutputField(desc="The assistant's user-facing reply.")


class MirrorResponse(dspy.Signature):
    __doc__ = quadrant_instructions("per-p")
    user_query = dspy.InputField(desc="The user's request.")
    response = dspy.OutputField(desc="The assistant's user-facing reply.")


QUADRANT_TO_ROLE = {
    "pro-a": "copilot",
    "pro-p": "researcher",
    "per-a": "coach",
    "per-p": "mirror",
}

SIGNATURES = {
    "pro-a": CoPilotResponse,
    "pro-p": ResearcherResponse,
    "per-a": CoachResponse,
    "per-p": MirrorResponse,
}


def build_program(quadrant: str) -> dspy.Predict:
    """Return a fresh dspy.Predict for the given quadrant code."""
    if quadrant not in SIGNATURES:
        raise ValueError(f"unknown quadrant: {quadrant!r}; expected one of {list(SIGNATURES)}")
    return dspy.Predict(SIGNATURES[quadrant])


PROGRAMS = {q: build_program(q) for q in SIGNATURES}
