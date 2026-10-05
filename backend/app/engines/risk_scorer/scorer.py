"""Verification Risk Scoring & Prioritization Engine.

Quantifies verification risk across multiple dimensions to prioritize
verification effort and resources.
"""

import statistics
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any, Set, Tuple
from enum import Enum
from datetime import datetime
from collections import defaultdict
import hashlib


class RiskCategory(str, Enum):
    FUNCTIONAL = "functional"
    TIMING = "timing"
    POWER = "power"
    SECURITY = "security"
    INTEGRATION = "integration"
    REGRESSION = "regression"


class RiskLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NEGLIGIBLE = "negligible"


class PriorityTier(str, Enum):
    IMMEDIATE = "immediate"       # Do now
    THIS_SPRINT = "this_sprint"   # Within current sprint
    NEXT_SPRINT = "next_sprint"   # Next sprint
    BACKLOG = "backlog"           # When capacity allows
    DEFER = "defer"               # Defer or skip


@dataclass
class RiskFactor:
    """Individual risk factor contributing to overall risk score."""
    name: str
    category: RiskCategory
    weight: float  # 0-1, sum of all weights should be 1
    score: float   # 0-100
    evidence: List[str] = field(default_factory=list)
    description: str = ""


@dataclass
class VerificationRisk:
    """Complete risk assessment for a verification target."""
    target_id: str
    target_name: str
    target_type: str  # module, feature, interface, etc.

    # Risk factors
    factors: List[RiskFactor] = field(default_factory=list)

    # Computed scores
    overall_score: float = 0.0  # 0-100
    risk_level: RiskLevel = RiskLevel.NEGLIGIBLE

    # Prioritization
    priority_tier: PriorityTier = PriorityTier.BACKLOG
    priority_rank: int = 0  # Lower = higher priority

    # Metadata
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    tags: List[str] = field(default_factory=list)
    notes: str = ""


@dataclass
class PrioritizationResult:
    """Result of prioritization across multiple verification targets."""
    targets: List[VerificationRisk]
    total_targets: int
    by_priority: Dict[PriorityTier, List[VerificationRisk]]
    by_risk_level: Dict[str, List[VerificationRisk]]
    summary: str
    generated_at: datetime = field(default_factory=datetime.utcnow)


class RiskScoringEngine:
    """Computes verification risk scores based on multiple dimensions."""

    # Default weights for risk categories
    DEFAULT_WEIGHTS = {
        RiskCategory.FUNCTIONAL: 0.25,
        RiskCategory.TIMING: 0.20,
        RiskCategory.POWER: 0.10,
        RiskCategory.SECURITY: 0.15,
        RiskCategory.INTEGRATION: 0.15,
        RiskCategory.REGRESSION: 0.15,
    }

    def __init__(self, weights: Optional[Dict[RiskCategory, float]] = None):
        self.weights = weights or self.DEFAULT_WEIGHTS
        self._normalize_weights()

    def _normalize_weights(self):
        """Ensure weights sum to 1.0."""
        total = sum(self.weights.values())
        if total > 0:
            self.weights = {k: v / total for k, v in self.weights.items()}

    def score_target(self, target: VerificationRisk) -> VerificationRisk:
        """Compute risk score for a single verification target."""
        if not target.factors:
            target.overall_score = 0.0
            target.risk_level = RiskLevel.NEGLIGIBLE
            return target

        # Calculate weighted score
        weighted_sum = 0.0
        total_weight = 0.0

        for factor in target.factors:
            weight = self.weights.get(factor.category, 0.0)
            weighted_sum += factor.score * weight
            total_weight += weight

        if total_weight > 0:
            target.overall_score = weighted_sum / total_weight
        else:
            target.overall_score = 0.0

        # Determine risk level
        target.risk_level = self._score_to_level(target.overall_score)

        # Determine priority tier
        target.priority_tier = self._score_to_priority(target.overall_score, target.factors)

        target.updated_at = datetime.utcnow()
        return target

    def _score_to_level(self, score: float) -> RiskLevel:
        if score >= 80:
            return RiskLevel.CRITICAL
        elif score >= 60:
            return RiskLevel.HIGH
        elif score >= 40:
            return RiskLevel.MEDIUM
        elif score >= 20:
            return RiskLevel.LOW
        return RiskLevel.NEGLIGIBLE

    def _score_to_priority(self, score: float, factors: List[RiskFactor]) -> PriorityTier:
        """Determine priority tier based on score and critical factors."""
        # Check for critical factors
        has_critical_functional = any(
            f.category == RiskCategory.FUNCTIONAL and f.score >= 80
            for f in factors
        )
        has_critical_security = any(
            f.category == RiskCategory.SECURITY and f.score >= 80
            for f in factors
        )
        has_critical_timing = any(
            f.category == RiskCategory.TIMING and f.score >= 80
            for f in factors
        )

        if score >= 80 or has_critical_functional or has_critical_security:
            return PriorityTier.IMMEDIATE
        elif score >= 60 or has_critical_timing:
            return PriorityTier.THIS_SPRINT
        elif score >= 40:
            return PriorityTier.NEXT_SPRINT
        elif score >= 20:
            return PriorityTier.BACKLOG
        return PriorityTier.DEFER


class PrioritizationEngine:
    """Prioritizes verification targets based on risk scores."""

    def __init__(self, scoring_engine: RiskScoringEngine = None):
        self.scoring_engine = scoring_engine or RiskScoringEngine()

    def prioritize(
        self,
        targets: List[VerificationRisk],
        capacity: Optional[int] = None
    ) -> PrioritizationResult:
        """Prioritize verification targets by risk score."""
        # Score all targets
        scored = [self.scoring_engine.score_target(t) for t in targets]

        # Sort by priority tier, then by score (descending)
        tier_order = {
            PriorityTier.IMMEDIATE: 0,
            PriorityTier.THIS_SPRINT: 1,
            PriorityTier.NEXT_SPRINT: 2,
            PriorityTier.BACKLOG: 3,
            PriorityTier.DEFER: 4,
        }

        scored.sort(key=lambda t: (tier_order[t.priority_tier], -t.overall_score))

        # Assign priority ranks
        for i, target in enumerate(scored):
            target.priority_rank = i + 1

        # Apply capacity constraint if specified
        if capacity and len(scored) > capacity:
            # Mark lowest priority as deferred
            for target in scored[capacity:]:
                target.priority_tier = PriorityTier.DEFER

        # Group by priority
        by_priority = defaultdict(list)
        for t in scored:
            by_priority[t.priority_tier].append(t)

        # Group by risk level
        by_risk = defaultdict(list)
        for t in scored:
            by_risk[t.risk_level.value].append(t)

        return PrioritizationResult(
            targets=scored,
            total_targets=len(scored),
            by_priority=dict(by_priority),
            by_risk_level=dict(by_risk),
            summary=self._generate_summary(scored),
        )

    def _generate_summary(self, targets: List[VerificationRisk]) -> str:
        immediate = len([t for t in targets if t.priority_tier == PriorityTier.IMMEDIATE])
        this_sprint = len([t for t in targets if t.priority_tier == PriorityTier.THIS_SPRINT])
        next_sprint = len([t for t in targets if t.priority_tier == PriorityTier.NEXT_SPRINT])
        backlog = len([t for t in targets if t.priority_tier == PriorityTier.BACKLOG])
        deferred = len([t for t in targets if t.priority_tier == PriorityTier.DEFER])

        critical = len([t for t in targets if t.risk_level == RiskLevel.CRITICAL])
        high = len([t for t in targets if t.risk_level == RiskLevel.HIGH])

        return (
            f"Prioritization Summary ({len(targets)} targets)\n"
            f"=" * 50 + "\n"
            f"By Priority:\n"
            f"  Immediate: {immediate}\n"
            f"  This Sprint: {this_sprint}\n"
            f"  Next Sprint: {next_sprint}\n"
            f"  Backlog: {backlog}\n"
            f"  Deferred: {deferred}\n"
            f"\n"
            f"By Risk Level:\n"
            f"  Critical: {critical}\n"
            f"  High: {high}\n"
            f"  Medium: {len([t for t in targets if t.risk_level == RiskLevel.MEDIUM])}\n"
            f"  Low: {len([t for t in targets if t.risk_level == RiskLevel.LOW])}\n"
            f"  Negligible: {len([t for t in targets if t.risk_level == RiskLevel.NEGLIGIBLE])}\n"
            f"\n"
            f"Top Priority Targets:\n" +
            "\n".join(f"  {i+1}. {t.target_name} (Score: {t.overall_score:.1f}, {t.priority_tier.value})"
                     for i, t in enumerate(targets[:5]))
        )


class RiskFactorLibrary:
    """Pre-defined risk factors for common verification scenarios."""

    @staticmethod
    def get_standard_factors() -> Dict[str, List[RiskFactor]]:
        """Get standard risk factor templates."""
        return {
            "new_module": [
                RiskFactor(
                    name="New RTL - No verification history",
                    category=RiskCategory.FUNCTIONAL,
                    weight=0.3,
                    score=85,
                    evidence=["New RTL module", "No existing assertions", "No coverage data"],
                    description="Brand new RTL with no prior verification"
                ),
                RiskFactor(
                    name="Complex state machine",
                    category=RiskCategory.FUNCTIONAL,
                    weight=0.2,
                    score=70,
                    evidence=["FSM with >20 states", "Complex transitions"],
                    description="Complex FSM increases functional bug risk"
                ),
            ],
            "interface_change": [
                RiskFactor(
                    name="Interface modification",
                    category=RiskCategory.INTEGRATION,
                    weight=0.3,
                    score=75,
                    evidence=["Port added/removed", "Protocol version changed"],
                    description="Interface changes affect all connected modules"
                ),
                RiskFactor(
                    name="Protocol version upgrade",
                    category=RiskCategory.INTEGRATION,
                    weight=0.25,
                    score=70,
                    evidence=["New protocol version", "Backward compatibility required"],
                ),
            ],
            "timing_critical": [
                RiskFactor(
                    name="High-frequency clock domain",
                    category=RiskCategory.TIMING,
                    weight=0.3,
                    score=80,
                    evidence=["Clock >500MHz", "Multi-cycle paths", "Tight setup/hold"],
                    description="High-frequency timing closure risk"
                ),
                RiskFactor(
                    name="Multiple clock domains",
                    category=RiskCategory.TIMING,
                    weight=0.2,
                    score=65,
                    evidence=["CDC paths", "Asynchronous interfaces"],
                    description="CDC metastability risk"
                ),
            ],
            "security_sensitive": [
                RiskFactor(
                    name="Cryptographic module",
                    category=RiskCategory.SECURITY,
                    weight=0.4,
                    score=90,
                    evidence=["AES/RSA implementation", "Side-channel resistance required"],
                    description="Crypto implementation bugs are critical"
                ),
                RiskFactor(
                    name="Secure boot / key management",
                    category=RiskCategory.SECURITY,
                    weight=0.3,
                    score=85,
                    evidence=["Key storage", "Attestation", "Anti-tamper"],
                ),
            ],
            "legacy_integration": [
                RiskFactor(
                    name="Legacy IP integration",
                    category=RiskCategory.INTEGRATION,
                    weight=0.25,
                    score=60,
                    evidence=["Third-party IP", "No source access", "Limited documentation"],
                ),
                RiskFactor(
                    name="Legacy testbench migration",
                    category=RiskCategory.REGRESSION,
                    weight=0.2,
                    score=55,
                    evidence=["Legacy testbench", "Language migration", "Methodology change"],
                ),
            ],
        }

    @staticmethod
    def create_target_from_template(
        target_id: str,
        target_name: str,
        target_type: str,
        template_names: List[str]
    ) -> VerificationRisk:
        """Create a risk target from standard templates."""
        all_factors = RiskFactorLibrary.get_standard_factors()
        factors = []
        for template in template_names:
            if template in all_factors:
                factors.extend(all_factors[template])

        return VerificationRisk(
            target_id=target_id,
            target_name=target_name,
            target_type=target_type,
            factors=factors,
        )


class CoverageRiskAnalyzer:
    """Analyzes coverage data to identify risk areas."""

    def __init__(self):
        pass

    def analyze_coverage_gaps(
        self,
        coverage_data: Dict[str, Any],
        threshold: float = 80.0
    ) -> List[RiskFactor]:
        """Analyze coverage gaps and convert to risk factors."""
        factors = []

        overall = coverage_data.get("overall_coverage", 100)
        if overall < threshold:
            gap = threshold - overall
            score = min(100, gap * 2)  # 50% gap = 100 score
            factors.append(RiskFactor(
                name=f"Overall coverage gap: {overall:.1f}% vs {threshold}% target",
                category=RiskCategory.FUNCTIONAL,
                weight=0.3,
                score=score,
                evidence=[f"Overall coverage: {overall:.1f}%"],
                description=f"Overall coverage {gap:.1f}% below target"
            ))

        # Per-type coverage gaps
        details = coverage_data.get("details", {})
        for cov_type, cov_data in details.items():
            if isinstance(cov_data, dict):
                cov_pct = cov_data.get("coverage_percentage", 100)
                if cov_pct < threshold:
                    gap = threshold - cov_pct
                    score = min(100, gap * 1.5)
                    factors.append(RiskFactor(
                        name=f"{cov_type} coverage gap: {cov_pct:.1f}%",
                        category=RiskCategory.FUNCTIONAL,
                        weight=0.1,
                        score=score,
                        evidence=[f"{cov_type} coverage: {cov_pct:.1f}%"],
                        description=f"{cov_type} coverage {gap:.1f}% below target"
                    ))

        # Coverage gaps
        gaps = coverage_data.get("gaps", [])
        if gaps:
            severity_counts = defaultdict(int)
            for gap in gaps:
                severity = gap.get("severity", "medium")
                severity_counts[severity] += 1

            for severity, count in severity_counts.items():
                score_map = {"critical": 90, "high": 70, "medium": 50, "low": 30, "warning": 40}
                score = score_map.get(severity.lower(), 40)
                factors.append(RiskFactor(
                    name=f"{count} {severity} coverage gaps",
                    category=RiskCategory.FUNCTIONAL,
                    weight=0.15,
                    score=min(100, score + count * 2),
                    evidence=[f"{count} gaps with {severity} severity"],
                    description=f"Uncovered areas with {severity} severity"
                ))

        return factors

    def analyze_test_failures(
        self,
        test_results: List[Dict]
    ) -> List[RiskFactor]:
        """Analyze test failure patterns for risk."""
        factors = []

        if not test_results:
            return factors

        total = len(test_results)
        failed = sum(1 for r in test_results if r.get("status") == "failed")
        error = sum(1 for r in test_results if r.get("status") == "error")

        fail_rate = (failed + error) / total if total > 0 else 0

        if fail_rate > 0.1:
            score = min(100, fail_rate * 500)
            factors.append(RiskFactor(
                name=f"High test failure rate: {fail_rate:.1%}",
                category=RiskCategory.REGRESSION,
                weight=0.2,
                score=score,
                evidence=[f"{failed+error}/{total} tests failing"],
                description=f"High failure rate indicates potential regressions"
            ))

        # Flaky tests
        flaky = sum(1 for r in test_results if r.get("flaky", False))
        if flaky > 0:
            flaky_rate = flaky / total
            score = min(100, flaky_rate * 300)
            factors.append(RiskFactor(
                name=f"Flaky tests detected: {flaky}/{total}",
                category=RiskCategory.REGRESSION,
                weight=0.15,
                score=score,
                evidence=[f"{flaky} flaky tests"],
                description="Flaky tests reduce confidence in results"
            ))

        return factors


# Convenience functions
def create_risk_target(
    target_id: str,
    target_name: str,
    target_type: str,
    templates: List[str] = None,
    custom_factors: List[RiskFactor] = None
) -> VerificationRisk:
    """Create a risk target from templates and custom factors."""
    target = RiskFactorLibrary.create_target_from_template(
        target_id, target_name, target_type, templates or []
    )
    if custom_factors:
        target.factors.extend(custom_factors)
    return target


def prioritize_verification_targets(
    targets: List[VerificationRisk],
    capacity: int = None
) -> PrioritizationResult:
    """Quick prioritization of verification targets."""
    engine = PrioritizationEngine()
    return engine.prioritize(targets, capacity)