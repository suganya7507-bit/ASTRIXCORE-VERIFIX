"""Flaky Test Detection & Regression Analytics API endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

router = APIRouter(prefix="/flaky", tags=["Flaky Test Detection & Regression Analytics"])


class TestExecutionRequest(BaseModel):
    test_id: str
    test_name: str
    status: str  # passed, failed, error, skipped
    duration_seconds: float
    timestamp: str
    simulation_id: Optional[str] = None
    project_id: Optional[str] = None
    error_message: Optional[str] = None
    stack_trace: Optional[str] = None
    logs: Optional[str] = None
    metadata: Dict[str, Any] = {}


class FlakyProfileResponse(BaseModel):
    test_id: str
    test_name: str
    total_runs: int
    pass_count: int
    fail_count: int
    flaky_score: float
    classification: str
    first_seen: str
    last_seen: str
    avg_duration: float
    duration_stddev: float
    failure_patterns: List[str]
    common_failure_times: List[int]
    associated_signals: List[str]
    associated_modules: List[str]
    recent_trend: str


class RegressionAlertResponse(BaseModel):
    alert_id: str
    regression_type: str
    test_id: str
    test_name: str
    detected_at: str
    severity: str
    description: str
    affected_simulations: List[str]
    suggested_actions: List[str]
    related_changes: List[str]


class FlakyAnalysisRequest(BaseModel):
    executions: List[TestExecutionRequest]
    min_runs: int = 10
    flaky_threshold: float = 0.05


class RegressionAnalysisRequest(BaseModel):
    current_executions: List[TestExecutionRequest]
    baseline_executions: List[TestExecutionRequest]
    rtl_changes: Optional[List[Dict[str, Any]]] = None


class FlakyAnalysisResponse(BaseModel):
    flaky_tests: List[FlakyProfileResponse]
    total_analyzed: int
    flaky_count: int


class RegressionAnalysisResponse(BaseModel):
    regression_alerts: List[RegressionAlertResponse]
    total_alerts: int
    critical_count: int
    high_count: int


class RegressionReportResponse(BaseModel):
    report_id: str
    generated_at: str
    period_start: str
    period_end: str
    total_tests: int
    total_runs: int
    flaky_tests: List[FlakyProfileResponse]
    regression_alerts: List[RegressionAlertResponse]
    pass_rate_trend: List[Dict[str, Any]]
    duration_trend: List[Dict[str, Any]]
    top_flaky_tests: List[FlakyProfileResponse]
    summary: str


@router.post("/analyze", response_model=FlakyAnalysisResponse)
async def analyze_flaky_tests(request: FlakyAnalysisRequest):
    """Analyze test execution history to detect flaky tests."""
    from app.engines.flaky_detector.detector import (
        FlakyTestDetector, TestExecution, TestStatus
    )

    # Convert request to TestExecution objects
    executions = []
    for exec_req in request.executions:
        try:
            status = TestStatus(exec_req.status.lower())
        except ValueError:
            status = TestStatus.ERROR

        executions.append(TestExecution(
            test_id=exec_req.test_id,
            test_name=exec_req.test_name,
            status=status,
            duration_seconds=exec_req.duration_seconds,
            timestamp=datetime.fromisoformat(exec_req.timestamp.replace('Z', '+00:00')),
            simulation_id=exec_req.simulation_id,
            project_id=exec_req.project_id,
            error_message=exec_req.error_message,
            stack_trace=exec_req.stack_trace,
            logs=exec_req.logs,
            metadata=exec_req.metadata,
        ))

    detector = FlakyTestDetector(
        flaky_threshold=request.flaky_threshold,
        min_runs=request.min_runs
    )

    profiles = detector.analyze_test_history(executions)

    return FlakyAnalysisResponse(
        flaky_tests=[
            FlakyProfileResponse(
                test_id=p.test_id,
                test_name=p.test_name,
                total_runs=p.total_runs,
                pass_count=p.pass_count,
                fail_count=p.fail_count,
                flaky_score=p.flaky_score,
                classification=p.classification.value,
                first_seen=p.first_seen.isoformat(),
                last_seen=p.last_seen.isoformat(),
                avg_duration=p.avg_duration,
                duration_stddev=p.duration_stddev,
                failure_patterns=p.failure_patterns,
                common_failure_times=p.common_failure_times,
                associated_signals=p.associated_signals,
                associated_modules=p.associated_modules,
                recent_trend=p.recent_trend,
            )
            for p in profiles
        ],
        total_analyzed=len(set(e.test_id for e in executions)),
        flaky_count=len(profiles),
    )


@router.post("/regression", response_model=RegressionAnalysisResponse)
async def analyze_regressions(request: RegressionAnalysisRequest):
    """Analyze test regressions between current and baseline executions."""
    from app.engines.flaky_detector.detector import (
        RegressionAnalyzer, TestExecution, TestStatus
    )

    # Convert requests to TestExecution objects
    def convert_execs(execs: List[TestExecutionRequest]) -> List[TestExecution]:
        result = []
        for e in execs:
            try:
                status = TestStatus(e.status.lower())
            except ValueError:
                status = TestStatus.ERROR
            result.append(TestExecution(
                test_id=e.test_id,
                test_name=e.test_name,
                status=status,
                duration_seconds=e.duration_seconds,
                timestamp=datetime.fromisoformat(e.timestamp.replace('Z', '+00:00')),
                simulation_id=e.simulation_id,
                project_id=e.project_id,
                error_message=e.error_message,
                stack_trace=e.stack_trace,
                logs=e.logs,
                metadata=e.metadata,
            ))
        return result

    current = convert_execs(request.current_executions)
    baseline = convert_execs(request.baseline_executions)

    analyzer = RegressionAnalyzer()
    alerts = analyzer.analyze_regressions(current, baseline, request.rtl_changes)

    critical = sum(1 for a in alerts if a.severity == "critical")
    high = sum(1 for a in alerts if a.severity == "high")

    return RegressionAnalysisResponse(
        regression_alerts=[
            RegressionAlertResponse(
                alert_id=a.alert_id,
                regression_type=a.regression_type.value,
                test_id=a.test_id,
                test_name=a.test_name,
                detected_at=a.detected_at.isoformat(),
                severity=a.severity,
                description=a.description,
                affected_simulations=a.affected_simulations,
                suggested_actions=a.suggested_actions,
                related_changes=a.related_changes,
            )
            for a in alerts
        ],
        total_alerts=len(alerts),
        critical_count=critical,
        high_count=high,
    )


@router.post("/report", response_model=RegressionReportResponse)
async def generate_regression_report(request: RegressionAnalysisRequest):
    """Generate comprehensive regression report."""
    from app.engines.flaky_detector.detector import (
        TestExecution, TestStatus, generate_regression_report
    )

    def convert_execs(execs: List[TestExecutionRequest]) -> List[TestExecution]:
        result = []
        for e in execs:
            try:
                status = TestStatus(e.status.lower())
            except ValueError:
                status = TestStatus.ERROR
            result.append(TestExecution(
                test_id=e.test_id,
                test_name=e.test_name,
                status=status,
                duration_seconds=e.duration_seconds,
                timestamp=datetime.fromisoformat(e.timestamp.replace('Z', '+00:00')),
                simulation_id=e.simulation_id,
                project_id=e.project_id,
                error_message=e.error_message,
                stack_trace=e.stack_trace,
                logs=e.logs,
                metadata=e.metadata,
            ))
        return result

    current = convert_execs(request.current_executions)
    baseline = convert_execs(request.baseline_executions)

    report = generate_regression_report(current, baseline, request.rtl_changes)

    return RegressionReportResponse(
        report_id=report.report_id,
        generated_at=report.generated_at.isoformat(),
        period_start=report.period_start.isoformat(),
        period_end=report.period_end.isoformat(),
        total_tests=report.total_tests,
        total_runs=report.total_runs,
        flaky_tests=[
            FlakyProfileResponse(
                test_id=p.test_id,
                test_name=p.test_name,
                total_runs=p.total_runs,
                pass_count=p.pass_count,
                fail_count=p.fail_count,
                flaky_score=p.flaky_score,
                classification=p.classification.value,
                first_seen=p.first_seen.isoformat(),
                last_seen=p.last_seen.isoformat(),
                avg_duration=p.avg_duration,
                duration_stddev=p.duration_stddev,
                failure_patterns=p.failure_patterns,
                common_failure_times=p.common_failure_times,
                associated_signals=p.associated_signals,
                associated_modules=p.associated_modules,
                recent_trend=p.recent_trend,
            )
            for p in report.flaky_tests
        ],
        regression_alerts=[
            RegressionAlertResponse(
                alert_id=a.alert_id,
                regression_type=a.regression_type.value,
                test_id=a.test_id,
                test_name=a.test_name,
                detected_at=a.detected_at.isoformat(),
                severity=a.severity,
                description=a.description,
                affected_simulations=a.affected_simulations,
                suggested_actions=a.suggested_actions,
                related_changes=a.related_changes,
            )
            for a in report.regression_alerts
        ],
        pass_rate_trend=[
            {"date": d.isoformat(), "pass_rate": r} for d, r in report.pass_rate_trend
        ],
        duration_trend=[
            {"date": d.isoformat(), "avg_duration": d} for d, d in report.duration_trend
        ],
        top_flaky_tests=[
            FlakyProfileResponse(
                test_id=p.test_id,
                test_name=p.test_name,
                total_runs=p.total_runs,
                pass_count=p.pass_count,
                fail_count=p.fail_count,
                flaky_score=p.flaky_score,
                classification=p.classification.value,
                first_seen=p.first_seen.isoformat(),
                last_seen=p.last_seen.isoformat(),
                avg_duration=p.avg_duration,
                duration_stddev=p.duration_stddev,
                failure_patterns=p.failure_patterns,
                common_failure_times=p.common_failure_times,
                associated_signals=p.associated_signals,
                associated_modules=p.associated_modules,
                recent_trend=p.recent_trend,
            )
            for p in report.top_flaky_tests
        ],
        summary=report.summary,
    )


@router.get("/health")
async def health():
    return {"status": "ok", "service": "flaky-detector"}