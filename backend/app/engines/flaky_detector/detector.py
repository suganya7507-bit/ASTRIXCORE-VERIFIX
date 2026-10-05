"""Flaky Test Detection & ML Regression Analytics Engine.

Analyzes test execution history to identify flaky tests, predict failures,
and provide regression analytics for continuous verification.
"""

import json
import statistics
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any, Set, Tuple
from enum import Enum
from datetime import datetime, timedelta
from collections import defaultdict
import hashlib


class TestStatus(str, Enum):
    PASSED = "passed"
    FAILED = "failed"
    ERROR = "error"
    SKIPPED = "skipped"
    FLAKY = "flaky"


class FlakyClassification(str, Enum):
    NOT_FLAKY = "not_flaky"
    LOW_FLAKINESS = "low_flakiness"
    MEDIUM_FLAKINESS = "medium_flakiness"
    HIGH_FLAKINESS = "high_flakiness"
    CRITICAL_FLAKINESS = "critical_flakiness"


class RegressionType(str, Enum):
    NEW_FAILURE = "new_failure"
    REGRESSION = "regression"
    FLAPPY = "flappy"
    PERFORMANCE_DEGRADATION = "performance_degradation"
    NEW_TEST = "new_test"
    FIXED = "fixed"


@dataclass
class TestExecution:
    test_id: str
    test_name: str
    status: TestStatus
    duration_seconds: float
    timestamp: datetime
    simulation_id: Optional[str] = None
    project_id: Optional[str] = None
    error_message: Optional[str] = None
    stack_trace: Optional[str] = None
    logs: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FlakyTestProfile:
    test_id: str
    test_name: str
    total_runs: int
    pass_count: int
    fail_count: int
    flaky_score: float  # 0-100
    classification: FlakyClassification
    first_seen: datetime
    last_seen: datetime
    avg_duration: float
    duration_stddev: float
    failure_patterns: List[str] = field(default_factory=list)
    common_failure_times: List[int] = field(default_factory=list)  # hours of day
    associated_signals: List[str] = field(default_factory=list)
    associated_modules: List[str] = field(default_factory=list)
    recent_trend: str = "stable"  # "improving", "degrading", "stable"


@dataclass
class RegressionAlert:
    alert_id: str
    regression_type: RegressionType
    test_id: str
    test_name: str
    detected_at: datetime
    severity: str  # "critical", "high", "medium", "low"
    description: str
    affected_simulations: List[str] = field(default_factory=list)
    suggested_actions: List[str] = field(default_factory=list)
    related_changes: List[str] = field(default_factory=list)  # RTL changes, commits


@dataclass
class RegressionReport:
    report_id: str
    generated_at: datetime
    period_start: datetime
    period_end: datetime
    total_tests: int
    total_runs: int
    flaky_tests: List[FlakyTestProfile]
    regression_alerts: List[RegressionAlert]
    pass_rate_trend: List[Tuple[datetime, float]]
    duration_trend: List[Tuple[datetime, float]]
    top_flaky_tests: List[FlakyTestProfile]
    summary: str


class FlakyTestDetector:
    """Detects and classifies flaky tests using statistical analysis."""

    def __init__(self, flaky_threshold: float = 0.05, min_runs: int = 10):
        self.flaky_threshold = flaky_threshold  # failure rate threshold
        self.min_runs = min_runs

    def analyze_test_history(self, executions: List[TestExecution]) -> List[FlakyTestProfile]:
        """Analyze test execution history and identify flaky tests."""
        # Group executions by test
        test_groups = defaultdict(list)
        for exec in executions:
            test_groups[exec.test_id].append(exec)

        profiles = []
        for test_id, runs in test_groups.items():
            if len(runs) < self.min_runs:
                continue

            profile = self._build_profile(test_id, runs)
            if profile.flaky_score > self.flaky_threshold * 100:
                profiles.append(profile)

        return sorted(profiles, key=lambda p: p.flaky_score, reverse=True)

    def _build_profile(self, test_id: str, runs: List[TestExecution]) -> FlakyTestProfile:
        test_name = runs[0].test_name
        total_runs = len(runs)
        pass_count = sum(1 for r in runs if r.status == TestStatus.PASSED)
        fail_count = sum(1 for r in runs if r.status in [TestStatus.FAILED, TestStatus.ERROR])

        # Calculate flaky score (0-100)
        failure_rate = fail_count / total_runs
        flaky_score = failure_rate * 100

        # Adjust score based on pattern consistency
        # If failures are clustered, it's more likely a real bug
        # If failures are scattered, it's more likely flaky
        failure_timestamps = [r.timestamp for r in runs if r.status in [TestStatus.FAILED, TestStatus.ERROR]]
        pass_timestamps = [r.timestamp for r in runs if r.status == TestStatus.PASSED]

        pattern_score = self._analyze_failure_pattern(failure_timestamps, pass_timestamps)
        flaky_score = (flaky_score + pattern_score) / 2

        # Classify
        if flaky_score >= 50:
            classification = FlakyClassification.CRITICAL_FLAKINESS
        elif flaky_score >= 25:
            classification = FlakyClassification.HIGH_FLAKINESS
        elif flaky_score >= 10:
            classification = FlakyClassification.MEDIUM_FLAKINESS
        elif flaky_score >= 5:
            classification = FlakyClassification.LOW_FLAKINESS
        else:
            classification = FlakyClassification.NOT_FLAKY

        # Duration stats
        durations = [r.duration_seconds for r in runs if r.duration_seconds > 0]
        avg_duration = statistics.mean(durations) if durations else 0
        duration_stddev = statistics.stdev(durations) if len(durations) > 1 else 0

        # Failure patterns
        failure_patterns = self._extract_failure_patterns(runs)

        # Common failure times
        failure_hours = [ts.hour for ts in failure_timestamps]
        hour_counts = defaultdict(int)
        for h in failure_hours:
            hour_counts[h] += 1
        common_failure_times = sorted(hour_counts.keys(), key=lambda h: -hour_counts[h])[:3]

        # Associated signals/modules from error messages
        associated_signals, associated_modules = self._extract_associations(runs)

        # Recent trend
        recent_trend = self._calculate_trend(runs)

        return FlakyTestProfile(
            test_id=test_id,
            test_name=test_name,
            total_runs=total_runs,
            pass_count=pass_count,
            fail_count=fail_count,
            flaky_score=round(flaky_score, 2),
            classification=classification,
            first_seen=min(r.timestamp for r in runs),
            last_seen=max(r.timestamp for r in runs),
            avg_duration=round(avg_duration, 2),
            duration_stddev=round(duration_stddev, 2),
            failure_patterns=failure_patterns,
            common_failure_times=common_failure_times,
            associated_signals=associated_signals[:10],
            associated_modules=associated_modules[:10],
            recent_trend=recent_trend,
        )

    def _analyze_failure_pattern(self, failure_times: List[datetime], pass_times: List[datetime]) -> float:
        """Analyze if failures are clustered (real bug) or scattered (flaky)."""
        if len(failure_times) < 2:
            return 0.0

        # Sort timestamps
        all_times = sorted(failure_times + pass_times)
        if len(all_times) < 3:
            return 0.0

        # Calculate runs between failures
        gaps = []
        for i in range(1, len(failure_times)):
            gap = (failure_times[i] - failure_times[i-1]).total_seconds() / 3600  # hours
            gaps.append(gap)

        if not gaps:
            return 0.0

        # If failures are very regular (consistent gaps), likely flaky
        # If failures are clustered, likely real bug
        avg_gap = statistics.mean(gaps)
        gap_stddev = statistics.stdev(gaps) if len(gaps) > 1 else 0

        # Coefficient of variation - low means regular (flaky), high means irregular (bug)
        if avg_gap > 0:
            cv = gap_stddev / avg_gap
            # High CV = irregular = likely real bug = lower flaky score
            # Low CV = regular = likely flaky = higher flaky score
            return max(0, 100 - cv * 50)

        return 0.0

    def _extract_failure_patterns(self, runs: List[TestExecution]) -> List[str]:
        """Extract common patterns from failure messages."""
        patterns = []
        error_messages = [r.error_message for r in runs if r.error_message]

        # Simple keyword extraction from error messages
        keywords = defaultdict(int)
        for msg in error_messages:
            # Extract potential signal/module names
            words = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', msg)
            for word in words:
                if len(word) > 3 and word.lower() not in {
                    'error', 'failed', 'assert', 'assertion', 'test', 'time',
                    'out', 'timeout', 'expected', 'received', 'actual', 'value'
                }:
                    keywords[word] += 1

        # Return top keywords
        top_keywords = sorted(keywords.items(), key=lambda x: -x[1])[:5]
        return [k for k, v in top_keywords if v >= 2]

    def _extract_associations(self, runs: List[TestExecution]) -> Tuple[List[str], List[str]]:
        """Extract associated signals and modules from test metadata and errors."""
        signals = set()
        modules = set()

        for run in runs:
            # From metadata
            if run.metadata:
                signals.update(run.metadata.get("signals", []))
                modules.update(run.metadata.get("modules", []))

            # From error messages
            if run.error_message:
                # Look for signal-like patterns
                words = re.findall(r'\b[a-z_][a-z0-9_]*\b', run.error_message.lower())
                for word in words:
                    if any(kw in word for kw in ['sig', 'data', 'addr', 'ctrl', 'clk', 'rst', 'valid', 'ready']):
                        signals.add(word)
                    if any(kw in word for kw in ['fifo', 'ctrl', 'proc', 'mem', 'arb', 'dec', 'enc']):
                        modules.add(word)

        return list(signals)[:20], list(modules)[:20]

    def _calculate_trend(self, runs: List[TestExecution]) -> str:
        """Calculate recent trend of test stability."""
        if len(runs) < 5:
            return "stable"

        # Sort by timestamp
        runs = sorted(runs, key=lambda r: r.timestamp)

        # Compare first half vs second half failure rates
        mid = len(runs) // 2
        first_half = runs[:mid]
        second_half = runs[mid:]

        first_fail_rate = sum(1 for r in first_half if r.status in [TestStatus.FAILED, TestStatus.ERROR]) / len(first_half)
        second_fail_rate = sum(1 for r in second_half if r.status in [TestStatus.FAILED, TestStatus.ERROR]) / len(second_half)

        if second_fail_rate > first_fail_rate * 1.5:
            return "degrading"
        elif second_fail_rate < first_fail_rate * 0.5:
            return "improving"
        return "stable"


class RegressionAnalyzer:
    """Analyzes test regressions and detects new failures."""

    def __init__(self):
        self.flaky_detector = FlakyTestDetector()

    def analyze_regressions(
        self,
        current_executions: List[TestExecution],
        baseline_executions: List[TestExecution],
        rtl_changes: List[Dict] = None
    ) -> List[RegressionAlert]:
        """Compare current executions against baseline to detect regressions."""
        alerts = []

        # Group by test
        current_groups = defaultdict(list)
        baseline_groups = defaultdict(list)

        for exec in current_executions:
            current_groups[exec.test_id].append(exec)
        for exec in baseline_executions:
            baseline_groups[exec.test_id].append(exec)

        all_test_ids = set(current_groups.keys()) | set(baseline_groups.keys())

        for test_id in all_test_ids:
            current_runs = current_groups.get(test_id, [])
            baseline_runs = baseline_groups.get(test_id, [])

            if not current_runs:
                continue

            # Get latest run
            latest_run = max(current_runs, key=lambda r: r.timestamp)
            latest_status = latest_run.status

            # Determine baseline status
            baseline_status = None
            if baseline_runs:
                # Use most recent baseline run
                latest_baseline = max(baseline_runs, key=lambda r: r.timestamp)
                baseline_status = latest_baseline.status

            # Detect regression
            alert = self._detect_regression(test_id, latest_run, baseline_status, rtl_changes)
            if alert:
                alerts.append(alert)

        return alerts

    def _detect_regression(
        self,
        test_id: str,
        latest_run: TestExecution,
        baseline_status: Optional[TestStatus],
        rtl_changes: List[Dict] = None
    ) -> Optional[RegressionAlert]:
        """Detect if a test represents a regression."""
        latest_status = latest_run.status

        # New test
        if baseline_status is None:
            if latest_status in [TestStatus.FAILED, TestStatus.ERROR]:
                return RegressionAlert(
                    alert_id=f"ALERT-{hashlib.md5(f'{test_id}{latest_run.timestamp}'.encode()).hexdigest()[:8]}",
                    regression_type=RegressionType.NEW_TEST,
                    test_id=test_id,
                    test_name=latest_run.test_name,
                    detected_at=latest_run.timestamp,
                    severity="high" if latest_status == TestStatus.FAILED else "medium",
                    description=f"New test '{latest_run.test_name}' is failing",
                    affected_simulations=[latest_run.simulation_id] if latest_run.simulation_id else [],
                    suggested_actions=["Investigate new test failure", "Check if test is valid"],
                )
            return None

        # Fixed test
        if baseline_status in [TestStatus.FAILED, TestStatus.ERROR] and latest_status == TestStatus.PASSED:
            return RegressionAlert(
                alert_id=f"ALERT-{hashlib.md5(f'{test_id}{latest_run.timestamp}'.encode()).hexdigest()[:8]}",
                regression_type=RegressionType.FIXED,
                test_id=test_id,
                test_name=latest_run.test_name,
                detected_at=latest_run.timestamp,
                severity="info",
                description=f"Previously failing test '{latest_run.test_name}' now passes",
                affected_simulations=[latest_run.simulation_id] if latest_run.simulation_id else [],
                suggested_actions=["Verify fix is correct", "Close related issue"],
            )

        # Regression: was passing, now failing
        if baseline_status == TestStatus.PASSED and latest_status in [TestStatus.FAILED, TestStatus.ERROR]:
            severity = "critical"
            if rtl_changes:
                # Check if related RTL changes
                related = self._find_related_changes(latest_run, rtl_changes)
                if related:
                    severity = "critical"
            return RegressionAlert(
                alert_id=f"ALERT-{hashlib.md5(f'{test_id}{latest_run.timestamp}'.encode()).hexdigest()[:8]}",
                regression_type=RegressionType.REGRESSION,
                test_id=test_id,
                test_name=latest_run.test_name,
                detected_at=latest_run.timestamp,
                severity=severity,
                description=f"Test '{latest_run.test_name}' regressed from passed to {latest_status.value}",
                affected_simulations=[latest_run.simulation_id] if latest_run.simulation_id else [],
                suggested_actions=[
                    "Investigate recent RTL changes",
                    "Run test in isolation",
                    "Check for flakiness",
                ],
                related_changes=rtl_changes[:5] if rtl_changes else [],
            )

        # Flaky test detected
        if baseline_status != latest_status and latest_status in [TestStatus.FAILED, TestStatus.ERROR]:
            return RegressionAlert(
                alert_id=f"ALERT-{hashlib.md5(f'{test_id}{latest_run.timestamp}'.encode()).hexdigest()[:8]}",
                regression_type=RegressionType.FLAPPY,
                test_id=test_id,
                test_name=latest_run.test_name,
                detected_at=latest_run.timestamp,
                severity="medium",
                description=f"Test '{latest_run.test_name}' status changed from {baseline_status.value} to {latest_status.value}",
                affected_simulations=[latest_run.simulation_id] if latest_run.simulation_id else [],
                suggested_actions=["Check for flakiness", "Run test multiple times"],
            )

        # Performance degradation
        if latest_status == TestStatus.PASSED and baseline_status == TestStatus.PASSED:
            # Compare durations
            baseline_runs = [r for r in []]  # Would need baseline durations
            # This would need more context

        return None

    def _find_related_changes(self, test_run: TestExecution, rtl_changes: List[Dict]) -> List[str]:
        """Find RTL changes related to a test failure."""
        related = []
        test_signals = set()
        test_modules = set()

        # Extract signals/modules from test metadata
        if test_run.metadata:
            test_signals.update(test_run.metadata.get("signals", []))
            test_modules.update(test_run.metadata.get("modules", []))

        # Extract from error message
        if test_run.error_message:
            words = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', test_run.error_message)
            for word in words:
                if any(kw in word.lower() for kw in ['sig', 'data', 'addr', 'ctrl', 'clk', 'rst']):
                    test_signals.add(word.lower())
                if any(kw in word.lower() for kw in ['fifo', 'ctrl', 'proc', 'mem']):
                    test_modules.add(word.lower())

        for change in rtl_changes:
            # Check if change affects signals/modules this test uses
            change_signals = set(change.get("affected_signals", []))
            change_modules = set(change.get("affected_modules", []))
            change_ports = set(change.get("affected_ports", []))

            if (test_signals & change_signals) or (test_modules & change_modules) or (test_signals & change_ports):
                related.append(change.get("change_id", ""))

        return related


def generate_regression_report(
    executions: List[TestExecution],
    baseline_executions: List[TestExecution],
    rtl_changes: List[Dict] = None
) -> RegressionReport:
    """Generate comprehensive regression report."""
    detector = FlakyTestDetector()
    analyzer = RegressionAnalyzer()

    flaky_tests = detector.analyze_test_history(executions)
    alerts = analyzer.analyze_regressions(executions, baseline_executions, rtl_changes)

    # Calculate trends
    pass_rate_trend = _calculate_pass_rate_trend(executions)
    duration_trend = _calculate_duration_trend(executions)

    # Top flaky tests
    top_flaky = sorted(flaky_tests, key=lambda f: -f.flaky_score)[:10]

    # Summary
    total_tests = len(set(e.test_id for e in executions))
    total_runs = len(executions)
    passed_runs = sum(1 for e in executions if e.status == TestStatus.PASSED)
    pass_rate = passed_runs / total_runs if total_runs > 0 else 0

    critical_flaky = sum(1 for f in flaky_tests if f.classification == FlakyClassification.CRITICAL_FLAKINESS)
    high_flaky = sum(1 for f in flaky_tests if f.classification == FlakyClassification.HIGH_FLAKINESS)

    summary = (
        f"Regression Analysis Report\n"
        f"Period: {min(e.timestamp for e in executions).date()} to {max(e.timestamp for e in executions).date()}\n"
        f"Total Tests: {total_tests}, Total Runs: {total_runs}\n"
        f"Pass Rate: {pass_rate:.1%}\n"
        f"Flaky Tests: {len(flaky_tests)} (Critical: {critical_flaky}, High: {high_flaky})\n"
        f"Regression Alerts: {len(alerts)}"
    )

    return RegressionReport(
        report_id=f"regression_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        generated_at=datetime.utcnow(),
        period_start=min(e.timestamp for e in executions),
        period_end=max(e.timestamp for e in executions),
        total_tests=total_tests,
        total_runs=total_runs,
        flaky_tests=flaky_tests,
        regression_alerts=alerts,
        pass_rate_trend=pass_rate_trend,
        duration_trend=duration_trend,
        top_flaky_tests=top_flaky,
        summary=summary,
    )


def _calculate_pass_rate_trend(executions: List[TestExecution]) -> List[Tuple[datetime, float]]:
    """Calculate daily pass rate trend."""
    daily = defaultdict(lambda: {"passed": 0, "total": 0})
    for exec in executions:
        day = exec.timestamp.date()
        daily[day]["total"] += 1
        if exec.status == TestStatus.PASSED:
            daily[day]["passed"] += 1

    trend = []
    for day in sorted(daily.keys()):
        d = daily[day]
        trend.append((datetime.combine(day, datetime.min.time()), d["passed"] / d["total"] if d["total"] > 0 else 0))
    return trend


def _calculate_duration_trend(executions: List[TestExecution]) -> List[Tuple[datetime, float]]:
    """Calculate average test duration trend."""
    daily = defaultdict(list)
    for exec in executions:
        if exec.duration_seconds > 0:
            day = exec.timestamp.date()
            daily[day].append(exec.duration_seconds)

    trend = []
    for day in sorted(daily.keys()):
        avg_dur = statistics.mean(daily[day])
        trend.append((datetime.combine(day, datetime.min.time()), avg_dur))
    return trend