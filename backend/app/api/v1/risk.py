"""Verification Risk Scoring & Prioritization API endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

router = APIRouter(prefix="/risk", tags=["Verification Risk Scoring"])


class RiskFactorRequest(BaseModel):
    name: str
    category: str
    weight: float
    score: float
    evidence: List[str] = []
    description: str = ""


class VerificationTargetRequest(BaseModel):
    target_id: str
    target_name: str
    target_type: str
    factors: List[RiskFactorRequest] = []
    templates: List[str] = []
    tags: List[str] = []
    notes: str = ""


class RiskFactorResponse(BaseModel):
    name: str
    category: str
    weight: float
    score: float
    evidence: List[str]
    description: str


class VerificationRiskResponse(BaseModel):
    target_id: str
    target_name: str
    target_type: str
    factors: List[RiskFactorResponse]
    overall_score: float
    risk_level: str
    priority_tier: str
    priority_rank: int
    created_at: str
    updated_at: str
    tags: List[str]
    notes: str


class PrioritizationRequest(BaseModel):
    targets: List[VerificationTargetRequest]
    capacity: Optional[int] = None
    weights: Optional[Dict[str, float]] = None


class PrioritizationResponse(BaseModel):
    targets: List[VerificationRiskResponse]
    total_targets: int
    by_priority: Dict[str, List[VerificationRiskResponse]]
    by_risk_level: Dict[str, List[VerificationRiskResponse]]
    summary: str


class CoverageGapRequest(BaseModel):
    coverage_data: Dict[str, Any]
    threshold: float = 80.0


class TestResultsRequest(BaseModel):
    test_results: List[Dict[str, Any]]


class RiskFactorsResponse(BaseModel):
    factors: List[RiskFactorResponse]


# Pre-defined templates
TEMPLATES = {
    "new_module": "New RTL module with no verification history",
    "interface_change": "Interface modification or protocol change",
    "timing_critical": "High-frequency or multi-clock domain design",
    "security_sensitive": "Cryptographic or security-critical module",
    "legacy_integration": "Legacy IP or testbench integration",
}


@router.get("/templates")
async def list_templates():
    """List available risk factor templates."""
    return {"templates": TEMPLATES}


@router.post("/score", response_model=VerificationRiskResponse)
async def score_target(request: VerificationTargetRequest):
    """Score a single verification target."""
    from app.engines.risk_scorer.scorer import (
        RiskScoringEngine, VerificationRisk, RiskFactor, RiskCategory
    )

    # Convert factors
    factors = []
    for f in request.factors:
        try:
            category = RiskCategory(f.category)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid category: {f.category}")

        factors.append(RiskFactor(
            name=f.name,
            category=category,
            weight=f.weight,
            score=f.score,
            evidence=f.evidence,
            description=f.description,
        ))

    # Add template factors
    if request.templates:
        from app.engines.risk_scorer.scorer import RiskFactorLibrary
        for template in request.templates:
            if template in RiskFactorLibrary.get_standard_factors():
                factors.extend(RiskFactorLibrary.get_standard_factors()[template])

    target = VerificationRisk(
        target_id=request.target_id,
        target_name=request.target_name,
        target_type=request.target_type,
        factors=factors,
        tags=request.tags,
        notes=request.notes,
    )

    engine = RiskScoringEngine()
    scored = engine.score_target(target)

    return VerificationRiskResponse(
        target_id=scored.target_id,
        target_name=scored.target_name,
        target_type=scored.target_type,
        factors=[
            RiskFactorResponse(
                name=f.name,
                category=f.category.value,
                weight=f.weight,
                score=f.score,
                evidence=f.evidence,
                description=f.description,
            )
            for f in scored.factors
        ],
        overall_score=round(scored.overall_score, 2),
        risk_level=scored.risk_level.value,
        priority_tier=scored.priority_tier.value,
        priority_rank=scored.priority_rank,
        created_at=scored.created_at.isoformat(),
        updated_at=scored.updated_at.isoformat(),
        tags=scored.tags,
        notes=scored.notes,
    )


@router.post("/prioritize", response_model=PrioritizationResponse)
async def prioritize_targets(request: PrioritizationRequest):
    """Prioritize multiple verification targets."""
    from app.engines.risk_scorer.scorer import (
        PrioritizationEngine, RiskScoringEngine, VerificationRisk, RiskFactor, RiskCategory
    )

    # Build targets
    targets = []
    for req in request.targets:
        factors = []
        for f in req.factors:
            try:
                category = RiskCategory(f.category)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid category: {f.category}")
            factors.append(RiskFactor(
                name=f.name,
                category=category,
                weight=f.weight,
                score=f.score,
                evidence=f.evidence,
                description=f.description,
            ))

        # Add template factors
        for template in req.templates:
            from app.engines.risk_scorer.scorer import RiskFactorLibrary
            if template in RiskFactorLibrary.get_standard_factors():
                factors.extend(RiskFactorLibrary.get_standard_factors()[template])

        target = VerificationRisk(
            target_id=req.target_id,
            target_name=req.target_name,
            target_type=req.target_type,
            factors=factors,
            tags=req.tags,
            notes=req.notes,
        )
        targets.append(target)

    engine = PrioritizationEngine(
        RiskScoringEngine(weights=request.weights) if request.weights else None
    )

    result = engine.prioritize(targets, request.capacity)

    return PrioritizationResponse(
        targets=[
            VerificationRiskResponse(
                target_id=t.target_id,
                target_name=t.target_name,
                target_type=t.target_type,
                factors=[
                    RiskFactorResponse(
                        name=f.name,
                        category=f.category.value,
                        weight=f.weight,
                        score=f.score,
                        evidence=f.evidence,
                        description=f.description,
                    )
                    for f in t.factors
                ],
                overall_score=round(t.overall_score, 2),
                risk_level=t.risk_level.value,
                priority_tier=t.priority_tier.value,
                priority_rank=t.priority_rank,
                created_at=t.created_at.isoformat(),
                updated_at=t.updated_at.isoformat(),
                tags=t.tags,
                notes=t.notes,
            )
            for t in result.targets
        ],
        total_targets=result.total_targets,
        by_priority={k.value: v for k, v in result.by_priority.items()},
        by_risk_level={k: v for k, v in result.by_risk_level.items()},
        summary=result.summary,
    )


@router.post("/coverage-gaps", response_model=RiskFactorsResponse)
async def analyze_coverage_gaps(request: CoverageGapRequest):
    """Analyze coverage data for risk factors."""
    from app.engines.risk_scorer.scorer import CoverageRiskAnalyzer

    analyzer = CoverageRiskAnalyzer()
    factors = analyzer.analyze_coverage_gaps(request.coverage_data, request.threshold)

    return RiskFactorsResponse(
        factors=[
            RiskFactorResponse(
                name=f.name,
                category=f.category.value,
                weight=f.weight,
                score=f.score,
                evidence=f.evidence,
                description=f.description,
            )
            for f in factors
        ]
    )


@router.post("/test-failures", response_model=RiskFactorsResponse)
async def analyze_test_failures(request: TestResultsRequest):
    """Analyze test failure patterns for risk factors."""
    from app.engines.risk_scorer.scorer import CoverageRiskAnalyzer

    analyzer = CoverageRiskAnalyzer()
    factors = analyzer.analyze_test_failures(request.test_results)

    return RiskFactorsResponse(
        factors=[
            RiskFactorResponse(
                name=f.name,
                category=f.category.value,
                weight=f.weight,
                score=f.score,
                evidence=f.evidence,
                description=f.description,
            )
            for f in factors
        ]
    )


@router.post("/from-template", response_model=VerificationRiskResponse)
async def create_from_template(
    target_id: str,
    target_name: str,
    target_type: str,
    templates: List[str]
):
    """Create a risk target from pre-defined templates."""
    from app.engines.risk_scorer.scorer import RiskScoringEngine, RiskFactorLibrary

    target = RiskFactorLibrary.create_target_from_template(
        target_id, target_name, target_type, templates
    )

    engine = RiskScoringEngine()
    scored = engine.score_target(target)

    return VerificationRiskResponse(
        target_id=scored.target_id,
        target_name=scored.target_name,
        target_type=scored.target_type,
        factors=[
            RiskFactorResponse(
                name=f.name,
                category=f.category.value,
                weight=f.weight,
                score=f.score,
                evidence=f.evidence,
                description=f.description,
            )
            for f in scored.factors
        ],
        overall_score=round(scored.overall_score, 2),
        risk_level=scored.risk_level.value,
        priority_tier=scored.priority_tier.value,
        priority_rank=scored.priority_rank,
        created_at=scored.created_at.isoformat(),
        updated_at=scored.updated_at.isoformat(),
        tags=scored.tags,
        notes=scored.notes,
    )