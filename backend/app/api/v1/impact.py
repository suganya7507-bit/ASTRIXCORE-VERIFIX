"""Design Impact Analysis API endpoints."""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

router = APIRouter(prefix="/impact", tags=["Design Impact Analysis"])


class ImpactAnalysisRequest(BaseModel):
    old_rtl: str
    new_rtl: str
    old_version: str = "v1"
    new_version: str = "v2"


class RTLChangeResponse(BaseModel):
    change_id: str
    change_type: str
    module_name: str
    location: Dict[str, int]
    old_code: str
    new_code: str
    affected_signals: List[str]
    affected_parameters: List[str]
    affected_ports: List[str]
    affected_states: List[str]
    description: str


class ImpactAssessmentResponse(BaseModel):
    change_id: str
    severity: str
    verification_impacts: List[str]
    affected_requirements: List[str]
    affected_assertions: List[str]
    affected_tests: List[str]
    affected_coverage_points: List[str]
    recommended_actions: List[str]
    risk_score: float


class DesignImpactReportResponse(BaseModel):
    comparison_id: str
    old_version: str
    new_version: str
    total_changes: int
    changes_by_type: Dict[str, int]
    changes_by_module: Dict[str, int]
    changes: List[RTLChangeResponse]
    impact_assessments: List[ImpactAssessmentResponse]
    overall_risk_score: float
    summary: str
    generated_at: str


@router.post("/analyze", response_model=DesignImpactReportResponse)
async def analyze_design_impact(request: ImpactAnalysisRequest):
    """Analyze design impact between two RTL versions."""
    from app.engines.impact_analyzer.analyzer import DesignImpactAnalyzer, DesignImpactReport

    analyzer = DesignImpactAnalyzer()
    report = analyzer.analyze_impact(
        request.old_rtl,
        request.new_rtl,
        request.old_version,
        request.new_version,
    )

    return DesignImpactReportResponse(
        comparison_id=report.comparison_id,
        old_version=report.old_version,
        new_version=report.new_version,
        total_changes=report.total_changes,
        changes_by_type=report.changes_by_type,
        changes_by_module=report.changes_by_module,
        changes=[
            RTLChangeResponse(
                change_id=c.change_id,
                change_type=c.change_type.value,
                module_name=c.module_name,
                location=c.location,
                old_code=c.old_code,
                new_code=c.new_code,
                affected_signals=c.affected_signals,
                affected_parameters=c.affected_parameters,
                affected_ports=c.affected_ports,
                affected_states=c.affected_states,
                description=c.description,
            )
            for c in report.changes
        ],
        impact_assessments=[
            ImpactAssessmentResponse(
                change_id=a.change_id,
                severity=a.severity.value,
                verification_impacts=[v.value for v in a.verification_impacts],
                affected_requirements=a.affected_requirements,
                affected_assertions=a.affected_assertions,
                affected_tests=a.affected_tests,
                affected_coverage_points=a.affected_coverage_points,
                recommended_actions=a.recommended_actions,
                risk_score=a.risk_score,
            )
            for a in report.impact_assessments
        ],
        overall_risk_score=report.overall_risk_score,
        summary=report.summary,
        generated_at=report.generated_at,
    )


@router.post("/analyze-files")
async def analyze_design_impact_files(
    old_file: UploadFile = File(...),
    new_file: UploadFile = File(...),
    old_version: str = Form("v1"),
    new_version: str = Form("v2"),
):
    """Analyze design impact from uploaded RTL files."""
    old_content = (await old_file.read()).decode("utf-8", errors="ignore")
    new_content = (await new_file.read()).decode("utf-8", errors="ignore")

    request = ImpactAnalysisRequest(
        old_rtl=old_content,
        new_rtl=new_content,
        old_version=old_version,
        new_version=new_version,
    )

    return await analyze_design_impact(request)


@router.get("/risk-score/{module_name}")
async def get_module_risk_score(module_name: str, rtl_content: str):
    """Get risk score for a specific module based on its complexity and change history."""
    from app.engines.rtl_parser.parser import RTLParser

    parser = RTLParser()
    modules = parser.parse(rtl_content)

    module = next((m for m in modules if m.name == module_name), None)
    if not module:
        raise HTTPException(status_code=404, detail=f"Module '{module_name}' not found")

    # Calculate risk based on module complexity
    risk_factors = {
        "port_count": len(module.ports),
        "signal_count": len(module.signals),
        "parameter_count": len(module.parameters),
        "always_block_count": len(module.always_blocks),
        "instance_count": len(module.instances),
        "fsm_count": len(module.fsm_info),
        "fsm_state_count": sum(len(fsm.states) for fsm in module.fsm_info),
    }

    # Calculate weighted risk score
    weights = {
        "port_count": 2,
        "signal_count": 1,
        "parameter_count": 1,
        "always_block_count": 5,
        "instance_count": 3,
        "fsm_count": 10,
        "fsm_state_count": 2,
    }

    risk_score = sum(risk_factors[k] * weights.get(k, 1) for k in risk_factors)
    risk_score = min(risk_score, 100)

    # Determine risk level
    if risk_score >= 80:
        risk_level = "critical"
    elif risk_score >= 60:
        risk_level = "high"
    elif risk_score >= 30:
        risk_level = "medium"
    else:
        risk_level = "low"

    return {
        "module_name": module_name,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "recommendations": _get_risk_recommendations(risk_level, risk_factors),
    }


def _get_risk_recommendations(risk_level: str, factors: Dict[str, int]) -> List[str]:
    """Generate recommendations based on risk level and factors."""
    recommendations = []

    if risk_level in ["critical", "high"]:
        recommendations.append("Consider splitting complex module into smaller submodules")
        recommendations.append("Increase assertion coverage for complex state machines")
        recommendations.append("Add formal verification for critical control logic")

    if factors.get("fsm_state_count", 0) > 20:
        recommendations.append("Consider breaking large FSM into hierarchical FSMs")

    if factors.get("always_block_count", 0) > 10:
        recommendations.append("Review always block complexity; consider refactoring")

    if factors.get("instance_count", 0) > 15:
        recommendations.append("Verify submodule interfaces with interface assertions")

    if factors.get("port_count", 0) > 50:
        recommendations.append("Consider interface abstraction (e.g., bundle ports into structs)")

    if not recommendations:
        recommendations.append("Module complexity is manageable with standard verification practices")

    return recommendations