"""
Dynamic Knowledge Evaluation (DKE)
FastAPI-integrated implementation for Learnora

Implements a hybrid assessment system:
  • Adaptive Testing (IRT/CAT)
  • Knowledge Tracing (BKT; pluggable DKT hook)
  • AI-powered analysis (LLM rubric interface; rule-based fallback)
  • Quizzes, self-assessment & concept-map scoring
  • Feedback/dashboards emitted as structured JSON

This is adapted from the reference implementation for production use with FastAPI.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Tuple
import math
import random
import numpy as np
import pandas as pd

# ----------------------------
# Utilities
# ----------------------------

EPS = 1e-8


def logistic(x: float) -> float:
    """Logistic function with overflow protection."""
    x = max(-500, min(500, x))
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    else:
        exp_x = math.exp(x)
        return exp_x / (1.0 + exp_x)


# ----------------------------
# IRT Item Bank + CAT Engine (2PL)
# ----------------------------

@dataclass
class Item:
    """Assessment item with IRT 2PL parameters."""
    id: str
    skill: str  # skill/knowledge component tag
    a: float    # discrimination
    b: float    # difficulty
    text: str   # stem/prompt
    choices: Optional[List[str]] = None
    correct_index: Optional[int] = None

    def p_correct(self, theta: float) -> float:
        """2PL model probability of correct response.
        P = 1/(1+exp(-a*(theta-b)))
        """
        return logistic(self.a * (theta - self.b))


@dataclass
class ItemBank:
    """Repository of assessment items."""
    items: Dict[str, Item] = field(default_factory=dict)

    def add(self, item: Item):
        self.items[item.id] = item

    def by_skill(self, skill: str) -> List[Item]:
        return [it for it in self.items.values() if it.skill == skill]

    def all(self) -> List[Item]:
        return list(self.items.values())


@dataclass
class CATConfig:
    """Configuration for Computerized Adaptive Testing."""
    max_items: int = 10
    se_stop: float = 0.35  # stop when SE(theta) below this
    start_theta: float = 0.0


@dataclass
class CATState:
    """State tracking for CAT session."""
    asked: List[str] = field(default_factory=list)
    responses: Dict[str, int] = field(default_factory=dict)  # 1 correct, 0 wrong
    theta: float = 0.0
    se: float = float("inf")


class CATEngine:
    """Computerized Adaptive Testing engine using 2PL IRT.
    
    Item selection via Fisher information at current theta,
    ability update via 2PL MLE with Newton-Raphson.
    """

    def __init__(self, bank: ItemBank, config: CATConfig):
        self.bank = bank
        self.cfg = config

    @staticmethod
    def information(item: Item, theta: float) -> float:
        """Fisher information for 2PL model."""
        p = item.p_correct(theta)
        q = 1 - p
        return (item.a ** 2) * p * q

    def select_next(self, state: CATState) -> Optional[Item]:
        """Select next item with maximum information at current ability estimate."""
        candidates = [it for it in self.bank.all() if it.id not in state.asked]
        if not candidates:
            return None
        best = max(candidates, key=lambda it: self.information(it, state.theta))
        return best

    def update_theta(self, state: CATState, max_iter: int = 25) -> Tuple[float, float]:
        """Update ability estimate using Newton-Raphson MLE."""
        theta = state.theta
        for _ in range(max_iter):
            L1 = 0.0  # log-likelihood first derivative
            L2 = 0.0  # log-likelihood second derivative
            for iid, u in state.responses.items():
                it = self.bank.items[iid]
                p = it.p_correct(theta)
                L1 += it.a * (u - p)
                L2 -= (it.a ** 2) * p * (1 - p)
            if abs(L2) < EPS:
                break
            step = L1 / L2
            theta_new = theta - step
            if abs(step) < 1e-3:
                theta = theta_new
                break
            theta = theta_new
        se = math.sqrt(1.0 / max(EPS, -L2)) if L2 < -EPS else float("inf")
        return theta, se

    def run(self, oracle: Callable[[Item], int]) -> CATState:
        """Run adaptive test until stopping criteria met."""
        state = CATState(theta=self.cfg.start_theta)
        while len(state.asked) < self.cfg.max_items and state.se > self.cfg.se_stop:
            item = self.select_next(state)
            if not item:
                break
            u = oracle(item)  # get user response (1=correct, 0=incorrect)
            state.asked.append(item.id)
            state.responses[item.id] = u
            state.theta, state.se = self.update_theta(state)
        return state


# ----------------------------
# Knowledge Tracing (BKT per skill)
# ----------------------------

@dataclass
class BKTParams:
    """Parameters for Bayesian Knowledge Tracing."""
    p_init: float = 0.2   # initial mastery probability
    p_transit: float = 0.2  # learning rate between opportunities
    p_slip: float = 0.1   # probability of error despite mastery
    p_guess: float = 0.2  # probability of correct answer without mastery


@dataclass
class BKTState:
    """State for Bayesian Knowledge Tracing."""
    mastery: Dict[str, float] = field(default_factory=dict)  # skill -> P(known)


class KnowledgeTracer:
    """Bayesian Knowledge Tracing with per-skill priors.
    
    Updates mastery probability after each item response.
    """

    def __init__(self, skills: List[str], params: Optional[BKTParams] = None):
        self.skills = skills
        self.p = params or BKTParams()
        self.state = BKTState({s: self.p.p_init for s in skills})

    def update(self, skill: str, correct: int):
        """Update mastery probability for a skill based on response."""
        p_k = self.state.mastery[skill]
        # Bayesian update
        if correct:
            num = p_k * (1 - self.p.p_slip)
            den = num + (1 - p_k) * self.p.p_guess
        else:
            num = p_k * self.p.p_slip
            den = num + (1 - p_k) * (1 - self.p.p_guess)
        p_k_given = num / max(EPS, den)
        # Learning transition
        p_next = p_k_given + (1 - p_k_given) * self.p.p_transit
        self.state.mastery[skill] = p_next

    def mastery_snapshot(self) -> Dict[str, float]:
        """Get current mastery probabilities for all skills."""
        return dict(self.state.mastery)


# ----------------------------
# LLM-powered analysis (interface + fallback rubric)
# ----------------------------

@dataclass
class Rubric:
    """Assessment rubric with criteria and weights."""
    criteria: Dict[str, List[str]]  # criterion -> keywords list
    weights: Dict[str, float]       # criterion -> weight


class LLMGrader:
    """Interface for LLM-based grading with offline fallback scorer.

    Usage:
      grader = LLMGrader(model_fn=None)  # fallback rubric
      score = grader.grade(response, rubric, reference_text)

    If `model_fn` is provided, it should be a callable(text_prompt)->dict
    returning {criterion: score_0_to_1}.
    """

    def __init__(self, model_fn: Optional[Callable[[str], Dict[str, float]]] = None):
        self.model_fn = model_fn

    @staticmethod
    def _fallback_rubric_score(response: str, rubric: Rubric, reference_text: str) -> Dict[str, float]:
        """Simple keyword-based rubric scoring."""
        text = response.lower()
        ref = reference_text.lower()
        out = {}
        for crit, kws in rubric.criteria.items():
            if not kws:
                out[crit] = 0.5
                continue
            # Coverage: proportion of keywords present
            hits = 0
            for kw in kws:
                if kw.lower() in text and kw.lower() in ref:
                    hits += 1
            out[crit] = hits / max(1, len(kws))
        return out

    def grade(self, response: str, rubric: Rubric, reference_text: str) -> Tuple[float, Dict[str, float]]:
        """Grade a response using LLM or fallback rubric."""
        if self.model_fn is not None:
            crit_scores = self.model_fn(response)
        else:
            crit_scores = self._fallback_rubric_score(response, rubric, reference_text)
        # Weighted sum
        total_w = sum(rubric.weights.values())
        final = sum(rubric.weights[c] * crit_scores.get(c, 0.0) for c in rubric.weights) / max(EPS, total_w)
        return final, crit_scores


# ----------------------------
# Self-assessment & concept map
# ----------------------------

@dataclass
class SelfAssessment:
    """Self-reported confidence levels for skills."""
    confidence: Dict[str, int]  # skill -> 1..5 Likert scale

    def to_scores(self) -> Dict[str, float]:
        """Normalize confidence to 0..1 scale."""
        return {k: (v - 1) / 4.0 for k, v in self.confidence.items()}


class ConceptMapScorer:
    """Scorer for concept map completeness."""
    
    @staticmethod
    def score(edges: List[Tuple[str, str]], required_edges: List[Tuple[str, str]]) -> float:
        """Calculate precision over required concept relations (0..1)."""
        req = set((a.lower(), b.lower()) for a, b in required_edges)
        got = set((a.lower(), b.lower()) for a, b in edges)
        if not req:
            return 0.5
        return len(req & got) / len(req)


# ----------------------------
# Orchestrator: DKE Pipeline
# ----------------------------

@dataclass
class DKEResult:
    """Comprehensive assessment result."""
    theta: float
    theta_se: float
    item_log: pd.DataFrame
    mastery: Dict[str, float]
    llm_scores: Dict[str, float]
    llm_overall: float
    self_assessment: Dict[str, float]
    concept_map_score: float
    dashboard: Dict[str, any]


class DKEPipeline:
    """Main Dynamic Knowledge Evaluation pipeline.
    
    Orchestrates adaptive testing, knowledge tracing, and multi-modal assessment.
    """

    def __init__(
        self,
        bank: ItemBank,
        cat_cfg: CATConfig,
        skills: List[str],
        bkt_params: Optional[BKTParams] = None,
        rubric: Optional[Rubric] = None,
        model_fn: Optional[Callable[[str], Dict[str, float]]] = None,
    ):
        self.bank = bank
        self.cat = CATEngine(bank, cat_cfg)
        self.kt = KnowledgeTracer(skills, bkt_params)
        self.grader = LLMGrader(model_fn=model_fn)
        # Default rubric
        self.rubric = rubric or Rubric(
            criteria={
                "context_relevance": ["define", "apply", "example"],
                "factual_accuracy": ["theory", "model", "parameter"],
                "completeness": ["assumption", "limitation", "implication"],
                "logical_consistency": ["because", "therefore", "however"],
            },
            weights={
                "context_relevance": 0.25,
                "factual_accuracy": 0.35,
                "completeness": 0.20,
                "logical_consistency": 0.20,
            },
        )

    def run(
        self,
        response_free_text: str,
        reference_text: str,
        self_assess: SelfAssessment,
        concept_edges: List[Tuple[str, str]],
        required_edges: List[Tuple[str, str]],
        oracle: Callable[[Item], int],
    ) -> DKEResult:
        """Execute complete assessment pipeline."""
        # 1) Adaptive testing
        cat_state = self.cat.run(oracle)

        # 2) Update knowledge tracing
        for iid, u in cat_state.responses.items():
            self.kt.update(self.bank.items[iid].skill, u)

        mastery = self.kt.mastery_snapshot()

        # 3) LLM grading on free-text response
        llm_overall, llm_scores = self.grader.grade(response_free_text, self.rubric, reference_text)

        # 4) Self-assessment & concept map
        sa_scores = self_assess.to_scores()
        cm_score = ConceptMapScorer.score(concept_edges, required_edges)

        # Build item log
        rows = []
        for iid in cat_state.asked:
            it = self.bank.items[iid]
            rows.append({
                "item_id": iid,
                "skill": it.skill,
                "a": it.a,
                "b": it.b,
                "correct": cat_state.responses[iid],
                "p_at_theta": round(it.p_correct(cat_state.theta), 3),
            })
        item_log = pd.DataFrame(rows)

        # 5) Generate dashboard
        dash = {
            "ability_estimate": round(cat_state.theta, 3),
            "ability_se": round(cat_state.se, 3),
            "mastery": {k: round(v, 3) for k, v in mastery.items()},
            "llm_scores": {k: round(v, 3) for k, v in llm_scores.items()},
            "llm_overall": round(llm_overall, 3),
            "self_assessment": {k: round(v, 3) for k, v in sa_scores.items()},
            "concept_map_score": round(cm_score, 3),
            "recommendations": self._recommendations(cat_state.theta, mastery, llm_scores, sa_scores, cm_score),
        }

        return DKEResult(
            theta=cat_state.theta,
            theta_se=cat_state.se,
            item_log=item_log,
            mastery=mastery,
            llm_scores=llm_scores,
            llm_overall=llm_overall,
            self_assessment=sa_scores,
            concept_map_score=cm_score,
            dashboard=dash,
        )

    def _recommendations(
        self,
        theta: float,
        mastery: Dict[str, float],
        llm_scores: Dict[str, float],
        sa_scores: Dict[str, float],
        cm_score: float,
    ) -> List[str]:
        """Generate personalized learning recommendations."""
        recs = []
        low_skills = [s for s, p in mastery.items() if p < 0.6]
        if low_skills:
            recs.append(f"Practice items for skills: {', '.join(low_skills)} (BKT < 0.60)")
        if theta < -0.3:
            recs.append("Assign easier adaptive items (theta below cohort mean)")
        if llm_scores.get("factual_accuracy", 1.0) < 0.6:
            recs.append("Provide targeted reading to improve factual accuracy")
        if cm_score < 0.5:
            recs.append("Concept-map activity to connect core relations")
        for s, v in sa_scores.items():
            if v < 0.5:
                recs.append(f"Confidence low for {s}: add reflective quiz + hints")
        return recs or ["Keep progressing to more challenging material"]
